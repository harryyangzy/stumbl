import type { CountdownState } from '@/services/countdown/countdownService';

/** Whether the countdown is still ticking down to leave, or it's already time to go. */
export type LiveActivityStage = 'soon' | 'now';

export type LiveActivityDisplayProps = {
  /** Route short name, e.g. "2B". */
  routeBadge: string;
  /** Destination/headsign for the chosen bus. */
  headsign: string;
  /** Epoch ms of the recommended leave moment — drives the auto-ticking timer. */
  leaveAtMs: number;
  /** Epoch ms the chosen bus arrives — timer target once it's time to leave. */
  busAtMs: number;
  /** `soon` counts down to leave; `now` means leave immediately / catch the bus. */
  stage: LiveActivityStage;
  /** Maps URL for the stop, used for the Live Activity deep link. */
  mapsUrl: string;
};

/**
 * Show the Dynamic Island / Live Activity countdown once the recommended leave
 * moment is this close (in seconds). The product requirement is "2 or less
 * minutes to leave", so the threshold is 120 seconds.
 */
export const LIVE_ACTIVITY_LEAVE_THRESHOLD_SEC = 120;

/**
 * Builds Live Activity content for the current countdown, or `null` when no
 * activity should be shown (too early, no live bus, or nothing to catch).
 * Returning `null` is the signal for the lifecycle service to end an activity.
 */
export function liveActivityPropsFor(
  state: CountdownState,
  now: Date
): LiveActivityDisplayProps | null {
  if (state.kind !== 'leave_in' && state.kind !== 'leave_now') return null;
  // Only surface live, trustworthy arrivals in the Dynamic Island.
  if (!state.realtimeOk) return null;

  const busSec = state.busArrivalSec ?? 0;
  // The bus has effectively arrived — nothing left to count down to.
  if (busSec <= 0) return null;

  const leaveInSec = state.leaveInSec ?? 0;
  // Too far out: don't crowd the Dynamic Island until within the threshold.
  if (leaveInSec > LIVE_ACTIVITY_LEAVE_THRESHOLD_SEC) return null;

  const nowMs = now.getTime();
  return {
    routeBadge: state.routeShort || '—',
    headsign: state.headsign || state.routeShort || '',
    leaveAtMs: nowMs + leaveInSec * 1000,
    busAtMs: nowMs + busSec * 1000,
    stage: leaveInSec > 0 ? 'soon' : 'now',
    mapsUrl: state.mapsUrl,
  };
}
