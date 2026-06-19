import { REALTIME_STALE_AFTER_SEC } from '@/lib/config';
import type { SavedCommute } from '@/types/commute';
import type { ArrivalPrediction, RealtimeFetchResult } from '@/types/realtime';

export type CountdownKind =
  | 'leave_in'
  | 'leave_now'
  | 'due'
  | 'no_realtime'
  | 'no_setup';

export type CountdownState = {
  kind: CountdownKind;
  /** Minutes until recommended leave (when kind is leave_in). */
  leaveMinutes?: number;
  /** Minutes until bus arrives (when known). */
  busMinutes?: number;
  /** Seconds until bus arrives (when known). */
  busArrivalSec?: number;
  /** Seconds until the following bus after the countdown bus (for widget footer). */
  nextBusArrivalSec?: number;
  /** Minutes until leave for the following bus (same walk + buffer as primary countdown). */
  nextBusLeaveMinutes?: number;
  /** True when it's time to leave for the following bus. */
  nextBusLeaveNow?: boolean;
  /** True when the footer "next bus" timing comes from GTFS-RT (not static schedule). */
  nextBusFromRealtime?: boolean;
  routeShort: string;
  headsign: string;
  mapsUrl: string;
  realtimeOk: boolean;
};

/** Treat realtime + scheduled matches within this window as the same departure. */
const ARRIVAL_DEDUPE_MS = 60_000;

function collectUpcomingArrivals(
  predictions: ArrivalPrediction[],
  scheduled: Date[],
  nowMs: number
): { arrivalMs: number; fromRealtime: boolean }[] {
  const candidates: { arrivalMs: number; fromRealtime: boolean }[] = [];

  for (const p of predictions) {
    const ms = p.arrivalTimeSec * 1000;
    if (ms > nowMs) candidates.push({ arrivalMs: ms, fromRealtime: true });
  }
  for (const d of scheduled) {
    const ms = d.getTime();
    if (ms > nowMs) candidates.push({ arrivalMs: ms, fromRealtime: false });
  }

  candidates.sort((a, b) => a.arrivalMs - b.arrivalMs);

  const deduped: { arrivalMs: number; fromRealtime: boolean }[] = [];
  for (const candidate of candidates) {
    const previous = deduped[deduped.length - 1];
    if (!previous || candidate.arrivalMs - previous.arrivalMs > ARRIVAL_DEDUPE_MS) {
      deduped.push(candidate);
    } else if (candidate.fromRealtime && !previous.fromRealtime) {
      deduped[deduped.length - 1] = candidate;
    }
  }

  return deduped;
}

/** Earliest live prediction strictly after the countdown bus (never static schedule). */
function nextRealtimeArrivalAfter(
  predictions: ArrivalPrediction[],
  afterArrivalMs: number,
  nowMs: number
): number | null {
  let best: number | null = null;
  for (const p of predictions) {
    const ms = p.arrivalTimeSec * 1000;
    if (ms <= nowMs) continue;
    if (ms <= afterArrivalMs + ARRIVAL_DEDUPE_MS) continue;
    if (best === null || ms < best) best = ms;
  }
  return best;
}

export function computeCountdownState(params: {
  commute: SavedCommute | null;
  now: Date;
  realtime: RealtimeFetchResult;
  predictions: ArrivalPrediction[];
  nextScheduled: Date[];
  mapsUrl: string;
}): CountdownState {
  const { commute, now, realtime, predictions, nextScheduled, mapsUrl } = params;

  if (!commute) {
    return {
      kind: 'no_setup',
      routeShort: '',
      headsign: '',
      mapsUrl: '',
      realtimeOk: false,
    };
  }

  const nowMs = now.getTime();
  const nowSec = Math.floor(nowMs / 1000);
  const walkMs = commute.walkingMinutes * 60 * 1000;
  const bufferMs = commute.bufferMinutes * 60 * 1000;

  const feedStale =
    realtime.feedTimestampSec === null ||
    nowSec - realtime.feedTimestampSec > REALTIME_STALE_AFTER_SEC;

  const preds = feedStale ? [] : predictions;

  const arrivals = collectUpcomingArrivals(preds, nextScheduled, nowMs);
  const next = arrivals[0] ?? null;

  if (!next) {
    return {
      kind: 'no_realtime',
      routeShort: commute.routeShortName,
      headsign: commute.headsign ?? commute.routeShortName,
      mapsUrl,
      realtimeOk: false,
    };
  }

  const { arrivalMs, fromRealtime } = next;
  const leaveAt = arrivalMs - walkMs - bufferMs;
  const busArrivalSec = Math.max(0, Math.ceil((arrivalMs - nowMs) / 1000));
  const busMinutes = Math.max(0, Math.ceil((arrivalMs - nowMs) / 60_000));
  const leaveMinutes = Math.max(0, Math.ceil((leaveAt - nowMs) / 60_000));
  const nextBusArrivalMs =
    preds.length > 0 ? nextRealtimeArrivalAfter(preds, arrivalMs, nowMs) : null;
  const nextBusArrivalSec =
    nextBusArrivalMs == null
      ? undefined
      : Math.max(0, Math.ceil((nextBusArrivalMs - nowMs) / 1000));
  const nextBusFromRealtime = nextBusArrivalMs != null;
  let nextBusLeaveMinutes: number | undefined;
  let nextBusLeaveNow = false;
  if (nextBusArrivalMs != null) {
    const nextLeaveAt = nextBusArrivalMs - walkMs - bufferMs;
    nextBusLeaveNow = nowMs >= nextLeaveAt && nowMs < nextBusArrivalMs;
    nextBusLeaveMinutes = Math.max(0, Math.ceil((nextLeaveAt - nowMs) / 60_000));
  }

  if (arrivalMs - nowMs <= 90_000) {
    return {
      kind: 'due',
      busMinutes,
      busArrivalSec,
      nextBusArrivalSec,
      nextBusLeaveMinutes,
      nextBusLeaveNow,
      nextBusFromRealtime,
      routeShort: commute.routeShortName,
      headsign: commute.headsign ?? commute.routeShortName,
      mapsUrl,
      realtimeOk: fromRealtime,
    };
  }

  if (nowMs >= leaveAt && nowMs < arrivalMs) {
    return {
      kind: 'leave_now',
      leaveMinutes: 0,
      busMinutes,
      busArrivalSec,
      nextBusArrivalSec,
      nextBusLeaveMinutes,
      nextBusLeaveNow,
      nextBusFromRealtime,
      routeShort: commute.routeShortName,
      headsign: commute.headsign ?? commute.routeShortName,
      mapsUrl,
      realtimeOk: fromRealtime,
    };
  }

  return {
    kind: 'leave_in',
    leaveMinutes,
    busMinutes,
    busArrivalSec,
    nextBusArrivalSec,
    nextBusLeaveMinutes,
    nextBusLeaveNow,
    nextBusFromRealtime,
    routeShort: commute.routeShortName,
    headsign: commute.headsign ?? commute.routeShortName,
    mapsUrl,
    realtimeOk: fromRealtime,
  };
}
