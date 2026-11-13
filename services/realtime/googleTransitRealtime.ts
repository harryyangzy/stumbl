import { haversineMeters } from '@/lib/geo';
import { getGoogleMapsApiKey, iosBundleIdentifier } from '@/lib/googleMapsApiKey';
import { REALTIME_FETCH_TIMEOUT_MS } from '@/lib/config';
import { getStaticGtfsService } from '@/services/gtfs/staticGtfsService';
import type { SavedCommute } from '@/types/commute';
import type { ArrivalPrediction, RealtimeFetchResult } from '@/types/realtime';

/**
 * Google Maps Routes API as a live-times source. Google has no "departures at a
 * stop" endpoint, so we ask for transit trips from the commute stop to a stop
 * further along the route, keep the ones boarding our route at our stop, and step
 * the departure time forward to collect the next few buses.
 */

const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
/** Each refresh is billed; the app's 30s refresh reuses this result in between. */
const CACHE_MS = 2 * 60_000;
/** Calls per refresh — enough for the countdown bus plus the following one or two. */
const MAX_CALLS_PER_REFRESH = 3;
/** Google's stop location vs. our GTFS stop. */
const STOP_MATCH_METERS = 75;

function devLog(message: string) {
  if (__DEV__) console.log(`[google-realtime] ${message}`);
}

type CacheEntry = { fetchedAtMs: number; result: RealtimeFetchResult | null };
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<RealtimeFetchResult | null>>();

/** "2", "02", "2A" → "2" so Google's line names compare with GTFS short names. */
function routeKey(name: string | undefined | null): string {
  const digits = String(name ?? '').match(/\d+/)?.[0];
  return digits
    ? String(parseInt(digits, 10))
    : String(name ?? '')
        .trim()
        .toLowerCase();
}

type RoutesResponse = {
  routes?: {
    legs?: {
      steps?: {
        travelMode?: string;
        transitDetails?: {
          stopDetails?: {
            departureStop?: { location?: { latLng?: { latitude: number; longitude: number } } };
            departureTime?: string;
          };
          transitLine?: { nameShort?: string; name?: string };
        };
      }[];
    }[];
  }[];
};

async function computeRoutes(
  apiKey: string,
  commute: SavedCommute,
  dest: { lat: number; lon: number },
  departMs: number
): Promise<number[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REALTIME_FETCH_TIMEOUT_MS);
  try {
    const point = (latitude: number, longitude: number) => ({
      location: { latLng: { latitude, longitude } },
    });
    const res = await fetch(ROUTES_URL, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Ios-Bundle-Identifier': iosBundleIdentifier(),
        'X-Goog-FieldMask': 'routes.legs.steps.travelMode,routes.legs.steps.transitDetails',
      },
      body: JSON.stringify({
        origin: point(commute.stopLat, commute.stopLon),
        destination: point(dest.lat, dest.lon),
        travelMode: 'TRANSIT',
        departureTime: new Date(departMs).toISOString(),
        computeAlternativeRoutes: true,
        transitPreferences: { allowedTravelModes: ['BUS'] },
      }),
    });
    if (!res.ok) throw new Error(`Routes API HTTP ${res.status}`);
    const body = (await res.json()) as RoutesResponse;

    const wantRoute = routeKey(commute.routeShortName);
    const departures: number[] = [];
    for (const route of body.routes ?? []) {
      for (const leg of route.legs ?? []) {
        const step = (leg.steps ?? []).find((s) => s.travelMode === 'TRANSIT' && s.transitDetails);
        const td = step?.transitDetails;
        const loc = td?.stopDetails?.departureStop?.location?.latLng;
        const at = Date.parse(td?.stopDetails?.departureTime ?? '');
        if (!td || !loc || !Number.isFinite(at)) continue;
        const line = routeKey(td.transitLine?.nameShort ?? td.transitLine?.name);
        if (line !== wantRoute) continue;
        const meters = haversineMeters(
          commute.stopLat,
          commute.stopLon,
          loc.latitude,
          loc.longitude
        );
        if (meters > STOP_MATCH_METERS) continue;
        departures.push(at);
      }
    }
    return departures;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchUncached(
  commute: SavedCommute,
  now: Date
): Promise<RealtimeFetchResult | null> {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    devLog('no EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in this bundle — using agency feed');
    return null;
  }

  const gtfs = await getStaticGtfsService(commute.agencyId);
  const dest = gtfs.downstreamStop(commute.stopId, commute.routeId, commute.headsign);
  if (!dest) {
    devLog(`no downstream stop for ${commute.stopId} route ${commute.routeId} — using agency feed`);
    return null;
  }

  const seen = new Set<number>();
  let cursor = now.getTime();
  for (let call = 0; call < MAX_CALLS_PER_REFRESH; call++) {
    const found = (
      await computeRoutes(apiKey, commute, { lat: dest.stopLat, lon: dest.stopLon }, cursor)
    ).filter((ms) => ms >= cursor);
    if (found.length === 0) break;
    for (const ms of found) seen.add(Math.round(ms / 1000));
    cursor = Math.min(...found) + 60_000;
  }
  if (seen.size === 0) {
    devLog(
      `no route ${commute.routeShortName} departures at ${commute.stopId} via ${dest.stopId} — using agency feed`
    );
    return null;
  }
  devLog(
    `${seen.size} departures for route ${commute.routeShortName}: ` +
      [...seen]
        .sort((a, b) => a - b)
        .map((s) => new Date(s * 1000).toLocaleTimeString())
        .join(', ')
  );

  const predictions: ArrivalPrediction[] = [...seen]
    .sort((a, b) => a - b)
    .map((arrivalTimeSec) => ({
      stopId: commute.stopId,
      routeId: commute.routeId,
      tripId: null,
      arrivalTimeSec,
    }));
  return {
    predictions,
    feedTimestampSec: Math.floor(now.getTime() / 1000),
    source: 'live',
  };
}

/**
 * Live departures for the commute from Google, or null when Google is not
 * configured, fails, or has no matching buses (caller falls back to the agency feed).
 * Results — including failures — are cached for two minutes to bound billing.
 */
export async function fetchGoogleTransitPredictions(
  commute: SavedCommute,
  now: Date
): Promise<RealtimeFetchResult | null> {
  const key = `${commute.agencyId ?? ''}|${commute.stopId}|${commute.routeId}|${commute.headsign ?? ''}`;
  const hit = cache.get(key);
  if (hit && now.getTime() - hit.fetchedAtMs < CACHE_MS) return hit.result;

  let pending = inFlight.get(key);
  if (!pending) {
    pending = fetchUncached(commute, now)
      .catch((e: unknown) => {
        devLog(
          `request failed (${e instanceof Error ? e.message : String(e)}) — using agency feed`
        );
        return null;
      })
      .then((result) => {
        cache.set(key, { fetchedAtMs: Date.now(), result });
        inFlight.delete(key);
        return result;
      });
    inFlight.set(key, pending);
  }
  return pending;
}
