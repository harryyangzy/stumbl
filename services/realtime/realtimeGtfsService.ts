import GtfsRealtimeBindings from 'gtfs-realtime-bindings';

import { REALTIME_ENDPOINTS, REALTIME_FETCH_TIMEOUT_MS, USE_MOCK_REALTIME } from '@/lib/config';
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

export class RealtimeGtfsService {
  async fetchTripUpdatesForCommute(commute: SavedCommute, now: Date): Promise<RealtimeFetchResult> {
    if (USE_MOCK_REALTIME) {
      return mockRealtimeForCommute(commute, now);
    }
    try {
      return await fetchTripUpdatesFromEndpoints(REALTIME_ENDPOINTS.tripUpdates);
    } catch {
      return { predictions: [], feedTimestampSec: null, source: 'unavailable' };
    }
  }

  filterForCommute(
    result: RealtimeFetchResult,
    commute: SavedCommute,
    nowMs: number = Date.now()
  ): ArrivalPrediction[] {
    return result.predictions
      .filter((p) => p.stopId === commute.stopId && p.routeId === commute.routeId)
      .filter((p) => p.arrivalTimeSec * 1000 > nowMs - 60 * 1000)
      .sort((a, b) => a.arrivalTimeSec - b.arrivalTimeSec);
  }
}

export const realtimeGtfsService = new RealtimeGtfsService();
