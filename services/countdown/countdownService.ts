import { REALTIME_STALE_AFTER_SEC } from '@/lib/config';
import type { SavedCommute } from '@/types/commute';
import type { ArrivalPrediction, RealtimeFetchResult } from '@/types/realtime';

export type CountdownKind =
  | 'leave_in'
  /**
   * Every known bus is already past its leave time (end-of-service edge). The
   * widget shows a live "until bus" countdown for the soonest arrival rather
   * than a static "leave now". In normal operation we roll to the next bus and
   * stay in `leave_in`, so this is rarely emitted.
   */
  | 'leave_now'
  | 'no_realtime'
  | 'no_setup';

export type CountdownState = {
  kind: CountdownKind;
  /** Minutes until recommended leave (when kind is leave_in and >= 60s remain). */
  leaveMinutes?: number;
  /** Seconds until leave when under one minute. */
  leaveSeconds?: number;
  /** Minutes until bus arrives (when known). */
  busMinutes?: number;
  /** Seconds until bus arrives (when known). */
  busArrivalSec?: number;
  /** Seconds until the following bus after the countdown bus (for widget footer). */
  nextBusArrivalSec?: number;
  /** Minutes until leave for the following bus (same walk + buffer as primary countdown). */
  nextBusLeaveMinutes?: number;
  /** Seconds until leave for the following bus when under one minute. */
  nextBusLeaveSeconds?: number;
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

  /**
   * Only discard predictions when the feed carries a timestamp that is genuinely
   * old (a frozen publisher). A missing timestamp on an otherwise-live fetch is
   * trusted — the arrivals are absolute future times we just retrieved — so a
   * headerless feed never blanks the countdown.
   */
  const feedStale =
    realtime.feedTimestampSec !== null &&
    nowSec - realtime.feedTimestampSec > REALTIME_STALE_AFTER_SEC;

  const preds = feedStale ? [] : predictions;

  const arrivals = collectUpcomingArrivals(preds, nextScheduled, nowMs);
  const leadMs = walkMs + bufferMs;

  /**
   * Pick the soonest bus we can still leave on time for. Once the leave moment
   * for a bus passes, we roll forward to the next departure instead of freezing
   * at "00 / leave now". Only when every known bus is already un-catchable do we
   * fall back to the soonest arrival (end-of-service edge) as a live "until bus"
   * countdown — the number always keeps moving, never a static 00.
   */
  let chosenIdx = arrivals.findIndex((a) => a.arrivalMs - leadMs > nowMs);
  const missedLeaveWindow = chosenIdx === -1 && arrivals.length > 0;
  if (missedLeaveWindow) chosenIdx = 0;

  const chosen = chosenIdx >= 0 ? arrivals[chosenIdx] : null;

  if (!chosen) {
    return {
      kind: 'no_realtime',
      routeShort: commute.routeShortName,
      headsign: commute.headsign ?? commute.routeShortName,
      mapsUrl,
      realtimeOk: false,
    };
  }

  const { arrivalMs, fromRealtime } = chosen;
  const leaveAt = arrivalMs - walkMs - bufferMs;
  const busArrivalSec = Math.max(0, Math.ceil((arrivalMs - nowMs) / 1000));
  const busMinutes = Math.max(0, Math.ceil((arrivalMs - nowMs) / 60_000));
  const leaveSecRemaining = Math.max(0, Math.ceil((leaveAt - nowMs) / 1000));
  const leaveMinutes = leaveSecRemaining >= 60 ? Math.ceil(leaveSecRemaining / 60) : 0;
  const leaveSeconds = leaveSecRemaining > 0 && leaveSecRemaining < 60 ? leaveSecRemaining : undefined;
  const nextBusArrivalMs =
    preds.length > 0 ? nextRealtimeArrivalAfter(preds, arrivalMs, nowMs) : null;
  const nextBusArrivalSec =
    nextBusArrivalMs == null
      ? undefined
      : Math.max(0, Math.ceil((nextBusArrivalMs - nowMs) / 1000));
  const nextBusFromRealtime = nextBusArrivalMs != null;
  let nextBusLeaveMinutes: number | undefined;
  let nextBusLeaveSeconds: number | undefined;
  let nextBusLeaveNow = false;
  if (nextBusArrivalMs != null) {
    const nextLeaveAt = nextBusArrivalMs - walkMs - bufferMs;
    nextBusLeaveNow = nowMs >= nextLeaveAt && nowMs < nextBusArrivalMs;
    const nextLeaveSecRemaining = Math.max(0, Math.ceil((nextLeaveAt - nowMs) / 1000));
    if (nextLeaveSecRemaining > 0 && nextLeaveSecRemaining < 60) {
      nextBusLeaveSeconds = nextLeaveSecRemaining;
    } else {
      nextBusLeaveMinutes = Math.max(0, Math.ceil(nextLeaveSecRemaining / 60));
    }
  }

  const sharedNext = {
    nextBusArrivalSec,
    nextBusLeaveMinutes,
    nextBusLeaveSeconds,
    nextBusLeaveNow,
    nextBusFromRealtime,
  };

  if (missedLeaveWindow) {
    return {
      kind: 'leave_now',
      leaveMinutes: 0,
      busMinutes,
      busArrivalSec,
      ...sharedNext,
      routeShort: commute.routeShortName,
      headsign: commute.headsign ?? commute.routeShortName,
      mapsUrl,
      realtimeOk: fromRealtime,
    };
  }

  return {
    kind: 'leave_in',
    leaveMinutes,
    leaveSeconds,
    busMinutes,
    busArrivalSec,
    ...sharedNext,
    routeShort: commute.routeShortName,
    headsign: commute.headsign ?? commute.routeShortName,
    mapsUrl,
    realtimeOk: fromRealtime,
  };
}
