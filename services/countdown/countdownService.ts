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
  routeShort: string;
  headsign: string;
  mapsUrl: string;
  realtimeOk: boolean;
};

function nextArrivalAfterPredictions(
  predictions: ArrivalPrediction[],
  scheduled: Date[],
  nowMs: number
): { arrivalMs: number; fromRealtime: boolean } | null {
  let bestRt: number | null = null;
  for (const p of predictions) {
    const ms = p.arrivalTimeSec * 1000;
    if (ms > nowMs && (bestRt === null || ms < bestRt)) {
      bestRt = ms;
    }
  }
  let bestSched: number | null = null;
  for (const d of scheduled) {
    const ms = d.getTime();
    if (ms > nowMs && (bestSched === null || ms < bestSched)) {
      bestSched = ms;
    }
  }

  if (bestRt !== null && bestSched !== null) {
    return bestRt <= bestSched
      ? { arrivalMs: bestRt, fromRealtime: true }
      : { arrivalMs: bestSched, fromRealtime: false };
  }
  if (bestRt !== null) return { arrivalMs: bestRt, fromRealtime: true };
  if (bestSched !== null) return { arrivalMs: bestSched, fromRealtime: false };
  return null;
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

  const next = nextArrivalAfterPredictions(preds, nextScheduled, nowMs);

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
  const busMinutes = Math.max(0, Math.ceil((arrivalMs - nowMs) / 60_000));
  const leaveMinutes = Math.max(0, Math.ceil((leaveAt - nowMs) / 60_000));

  if (arrivalMs - nowMs <= 90_000) {
    return {
      kind: 'due',
      busMinutes,
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
    routeShort: commute.routeShortName,
    headsign: commute.headsign ?? commute.routeShortName,
    mapsUrl,
    realtimeOk: fromRealtime,
  };
}
