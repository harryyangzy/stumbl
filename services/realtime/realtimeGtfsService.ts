import { REALTIME_ENDPOINTS, REALTIME_FETCH_TIMEOUT_MS, USE_MOCK_REALTIME } from '@/lib/config';
import type { SavedCommute } from '@/types/commute';
import type { ArrivalPrediction, RealtimeFetchResult } from '@/types/realtime';

type TripUpdateJson = {
  trip?: { tripId?: string; routeId?: string };
  stopTimeUpdate?: {
    stopId?: string;
    arrival?: { time?: string | number; delay?: string | number };
  }[];
};

type FeedJson = {
  header?: { timestamp?: string | number };
  entity?: { tripUpdate?: TripUpdateJson }[];
};

function parseTimeSec(v: string | number | undefined): number | null {
  if (v === undefined) return null;
  const n = typeof v === 'string' ? parseInt(v, 10) : v;
  return Number.isFinite(n) ? n : null;
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
      const t = parseTimeSec(stu.arrival?.time);
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

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
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
      const res = await fetchWithTimeout(REALTIME_ENDPOINTS.tripUpdates, REALTIME_FETCH_TIMEOUT_MS);
      if (!res.ok) {
        return { predictions: [], feedTimestampSec: null, source: 'unavailable' };
      }
      const text = await res.text();
      const parsed = parseTripUpdatesJson(text);
      return { ...parsed, source: 'live' };
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
