import {
  loadStumblLiveActivity,
  type StumblLiveActivityInstance,
} from '@/lib/stumblLiveActivityLoader';
import type { CountdownState } from '@/services/countdown/countdownService';
import {
  liveActivityPropsFor,
  type LiveActivityDisplayProps,
} from '@/services/liveActivity/liveActivityViewModel';

let currentInstance: StumblLiveActivityInstance | null = null;
let lastSignature: string | null = null;
/** Serializes overlapping syncs so start/update/end never race. */
let chain: Promise<void> = Promise.resolve();

/**
 * Identity of the displayed content. Timer targets are bucketed to ~2s so tiny
 * clock drift between refreshes doesn't trigger redundant native updates (the OS
 * ticks the countdown itself); a real prediction shift still changes the bucket.
 */
function signature(p: LiveActivityDisplayProps): string {
  const leaveBucket = Math.round(p.leaveAtMs / 2000);
  const busBucket = Math.round(p.busAtMs / 2000);
  return `${p.stage}|${p.routeBadge}|${p.headsign}|${leaveBucket}|${busBucket}`;
}

async function runSync(state: CountdownState | null): Promise<void> {
  const factory = await loadStumblLiveActivity();
  if (!factory) return;

  // Re-adopt an activity that outlived the app process (relaunch / cold start).
  if (!currentInstance) {
    try {
      const existing = factory.getInstances();
      if (existing.length > 0) currentInstance = existing[0];
    } catch {
      // ignore — treat as no active instance
    }
  }

  const props = state ? liveActivityPropsFor(state, new Date()) : null;

  if (!props) {
    if (currentInstance) {
      const ending = currentInstance;
      currentInstance = null;
      lastSignature = null;
      try {
        await ending.end('immediate');
      } catch {
        // ignore — activity may already be gone
      }
    }
    return;
  }

  const sig = signature(props);

  if (!currentInstance) {
    try {
      currentInstance = factory.start(props, props.mapsUrl || undefined);
      lastSignature = sig;
    } catch {
      currentInstance = null;
      lastSignature = null;
    }
    return;
  }

  if (sig !== lastSignature) {
    lastSignature = sig;
    try {
      await currentInstance.update(props);
    } catch {
      // ignore — next tick retries
    }
  }
}

/**
 * Starts, updates, or ends the "time to leave" Live Activity based on the latest
 * countdown. Pass `null` (e.g. no saved commute) to tear down any active one.
 * Safe to call every refresh tick — calls are queued and de-duplicated.
 */
export function syncLiveActivity(state: CountdownState | null): Promise<void> {
  chain = chain.then(() => runSync(state)).catch(() => {});
  return chain;
}
