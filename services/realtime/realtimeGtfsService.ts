import GtfsRealtimeBindings from 'gtfs-realtime-bindings';

import { USE_MOCK_REALTIME, REALTIME_FETCH_TIMEOUT_MS } from '@/lib/config';
import { resolveIonStopIds } from '@/lib/grtIonStopMap';
import { getTransitAgency } from '@/lib/transitAgencies';
import {
  fetchGoNextServiceRealtime,
  fetchGoTripUpdatesProtobuf,
} from '@/services/go/goApiService';
import { getStaticGtfsService } from '@/services/gtfs/staticGtfsService';
import type { SavedCommute } from '@/types/commute';
import type { ArrivalPrediction, RealtimeFetchResult } from '@/types/realtime';

type TripUpdateJson = {
  trip?: { tripId?: string; routeId?: string };
  stopTimeUpdate?: {
    stopId?: string;
    arrival?: { time?: string | number; delay?: string | number };
    departure?: { time?: string | number; delay?: string | number };
  }[];
};

type FeedJson = {
  header?: { timestamp?: string | number };
  entity?: { tripUpdate?: TripUpdateJson }[];
};

type NumericLike = string | number | { toNumber?: () => number } | null | undefined;

function parseTimeSec(v: NumericLike): number | null {
  if (v === undefined || v === null) return null;
  if (typeof v === 'object' && typeof v.toNumber === 'function') {
    const n = v.toNumber();
    return Number.isFinite(n) ? n : null;
  }
  const n = typeof v === 'string' ? parseInt(v, 10) : typeof v === 'number' ? v : null;
  return n !== null && Number.isFinite(n) ? n : null;
}

export function parseTripUpdatesJson(text: string): RealtimeFetchResult {
  let data: FeedJson;
  try {
    data = JSON.parse(text) as FeedJson;
  } catch {
    return { predictions: [], feedTimestampSec: null, source: 'unavailable' };
  }

  const headerTs = parseTimeSec(data.header?.timestamp);
  const predictions: ArrivalPrediction[] = [];

  for (const ent of data.entity ?? []) {
    const tu = ent.tripUpdate;
    if (!tu) continue;
    const tripId = tu.trip?.tripId ?? null;
    const routeId = tu.trip?.routeId;
    if (!routeId) continue;
    for (const stu of tu.stopTimeUpdate ?? []) {
      const stopId = stu.stopId;
      if (!stopId) continue;
      const t =
        parseTimeSec(stu.arrival?.time) ??
        parseTimeSec(stu.departure?.time);
      if (t !== null) {
        predictions.push({ stopId, routeId, tripId, arrivalTimeSec: t });
      }
    }
  }

  return {
    predictions,
    feedTimestampSec: headerTs,
    source: 'live',
  };
}

export function parseTripUpdatesProtobuf(bytes: ArrayBuffer | Uint8Array): RealtimeFetchResult {
  try {
    const buffer = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buffer);
    const headerTs = parseTimeSec(feed.header?.timestamp as NumericLike);
    const predictions: ArrivalPrediction[] = [];

    for (const ent of feed.entity ?? []) {
      const tu = ent.tripUpdate;
      if (!tu) continue;
      const tripId = tu.trip?.tripId ?? null;
      const routeId = tu.trip?.routeId;
      if (!routeId) continue;
      for (const stu of tu.stopTimeUpdate ?? []) {
        const stopId = stu.stopId;
        if (!stopId) continue;
        const t =
          parseTimeSec(stu.arrival?.time as NumericLike) ??
          parseTimeSec(stu.departure?.time as NumericLike);
        if (t !== null) {
          predictions.push({ stopId, routeId, tripId, arrivalTimeSec: t });
        }
      }
    }

    return {
      predictions,
      feedTimestampSec: headerTs,
      source: 'live',
    };
  } catch {
    return { predictions: [], feedTimestampSec: null, source: 'unavailable' };
  }
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

function mergeRealtimeResults(results: RealtimeFetchResult[]): RealtimeFetchResult {
  const predictions = results.flatMap((r) => r.predictions);
  const timestamps = results
    .map((r) => r.feedTimestampSec)
    .filter((t): t is number => t !== null);
  const feedTimestampSec = timestamps.length > 0 ? Math.min(...timestamps) : null;
  const anyLive = results.some((r) => r.source === 'live');
  return {
    predictions,
    feedTimestampSec,
    source: anyLive ? 'live' : 'unavailable',
  };
}

async function fetchTripUpdatesFromEndpoints(urls: readonly string[]): Promise<RealtimeFetchResult> {
  const settled = await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetchWithTimeout(url, REALTIME_FETCH_TIMEOUT_MS);
        if (!res.ok) return null;
        const bytes = await res.arrayBuffer();
        return parseTripUpdatesProtobuf(bytes);
      } catch {
        return null;
      }
    })
  );
  const ok = settled.filter((r): r is RealtimeFetchResult => r !== null && r.source === 'live');
  if (ok.length === 0) {
    return { predictions: [], feedTimestampSec: null, source: 'unavailable' };
  }
  return mergeRealtimeResults(ok);
}

/** Deterministic mock arrivals for development (shifts with `now`). */
export function mockRealtimeForCommute(commute: SavedCommute, now: Date): RealtimeFetchResult {
  const nowSec = Math.floor(now.getTime() / 1000);
  return {
    predictions: [
      {
        stopId: commute.stopId,
        routeId: commute.routeId,
        tripId: 'MOCK_TRIP',
        arrivalTimeSec: nowSec + 11 * 60,
      },
      {
        stopId: commute.stopId,
        routeId: commute.routeId,
        tripId: 'MOCK_TRIP_2',
        arrivalTimeSec: nowSec + 28 * 60,
      },
    ],
    feedTimestampSec: nowSec,
    source: 'mock',
  };
}

export async function matchStopIdsForCommute(commute: SavedCommute): Promise<Set<string>> {
  const agency = getTransitAgency(commute.agencyId);
  if (!agency.ionSupport) {
    return new Set([commute.stopId]);
  }
  const staticGtfs = await getStaticGtfsService(commute.agencyId);
  return resolveIonStopIds({
    stopId: commute.stopId,
    stopName: commute.stopName,
    staticStopIdsByIonKey: staticGtfs.ionStopIdsByStationKey(),
  });
}

export class RealtimeGtfsService {
  async fetchTripUpdatesForCommute(commute: SavedCommute, now: Date): Promise<RealtimeFetchResult> {
    if (USE_MOCK_REALTIME) {
      return mockRealtimeForCommute(commute, now);
    }
    try {
      const agency = getTransitAgency(commute.agencyId);
      if (agency.metrolinxApi) {
        const bytes = await fetchGoTripUpdatesProtobuf();
        if (bytes) {
          const parsed = parseTripUpdatesProtobuf(bytes);
          if (parsed.predictions.length > 0) return parsed;
        }
        return fetchGoNextServiceRealtime(commute, now);
      }
      if (agency.realtime.tripUpdates.length === 0) {
        return { predictions: [], feedTimestampSec: null, source: 'unavailable' };
      }
      return await fetchTripUpdatesFromEndpoints(agency.realtime.tripUpdates);
    } catch {
      return { predictions: [], feedTimestampSec: null, source: 'unavailable' };
    }
  }

  filterForCommute(
    result: RealtimeFetchResult,
    commute: SavedCommute,
    nowMs: number = Date.now(),
    matchStopIds: Set<string> = new Set([commute.stopId])
  ): ArrivalPrediction[] {
    const agency = getTransitAgency(commute.agencyId);
    return result.predictions
      .filter((p) => {
        if (!matchStopIds.has(p.stopId)) return false;
        if (p.routeId === commute.routeId) return true;
        if (agency.metrolinxApi && p.routeId === commute.routeShortName) return true;
        return false;
      })
      .filter((p) => p.arrivalTimeSec * 1000 > nowMs - 60 * 1000)
      .sort((a, b) => a.arrivalTimeSec - b.arrivalTimeSec);
  }
}

export const realtimeGtfsService = new RealtimeGtfsService();
