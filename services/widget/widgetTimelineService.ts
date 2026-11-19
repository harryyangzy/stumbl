import { loadStumblWidget } from '@/lib/stumblWidgetLoader';
import { widgetMapsUrlBridge } from '@/lib/widgetBridge';
import { DEFAULT_TRANSIT_AGENCY } from '@/lib/transitAgencies';
import { commuteForRoute, commuteRoutes } from '@/lib/commuteRoutes';
import {
  computeCountdownState,
  type CountdownState,
  type ScheduledArrival,
} from '@/services/countdown/countdownService';
import { syncLiveActivity } from '@/services/liveActivity/liveActivityService';
import { buildGoogleMapsCoordinateUrl } from '@/services/maps/googleMaps';
import { getStaticGtfsService, type StaticGtfsService } from '@/services/gtfs/staticGtfsService';
import {
  realtimeGtfsService,
  matchStopIdsForCommute,
} from '@/services/realtime/realtimeGtfsService';
import { countdownToWidgetProps, type WidgetDisplayProps } from '@/services/widget/widgetViewModel';
import type { ArrivalPrediction, RealtimeFetchResult } from '@/types/realtime';
import type { SavedCommute } from '@/types/commute';

/**
 * How far ahead the WidgetKit timeline is scheduled. The app can only fetch new
 * data while it runs, so the timeline has to carry the widget until the next
 * launch. Live predictions cover the near term; the static schedule fills the rest.
 */
const TIMELINE_HORIZON_MS = 12 * 60 * 60_000;
/** Hard cap so the shared-defaults payload stays small for the widget extension. */
const MAX_TIMELINE_ENTRIES = 1500;
/** Scheduled departures loaded per line — enough to span the horizon on frequent routes. */
const SCHEDULE_LOOKAHEAD = 150;
/** Re-check cadence when nothing on screen is counting toward a known moment. */
const IDLE_ENTRY_MS = 15 * 60_000;
/** `filterForCommute` keeps a prediction this long past its arrival. */
const PREDICTION_GRACE_MS = 60_000;

/** Widget renders static primary/unit text; strip timer target so it never switches to MM:SS. */
function timelineWidgetProps(props: WidgetDisplayProps): WidgetDisplayProps {
  const { countdownTargetMs: _removed, ...rest } = props;
  return rest;
}

const emptyRealtime: RealtimeFetchResult = {
  predictions: [],
  feedTimestampSec: null,
  source: 'unavailable',
};

/** Live + fallback data for one selected line. */
type LineContext = {
  /** Single-line view of the commute (see `commuteForRoute`). */
  commute: SavedCommute;
  realtime: RealtimeFetchResult;
  /** This line's live predictions at the stop, tagged with its route id, soonest first. */
  predictions: ArrivalPrediction[];
  /** Static schedule, used whenever this line has no live predictions. */
  schedule: ScheduledArrival[];
};

type CountdownContext = {
  mapsUrl: string;
  lines: LineContext[];
};

function emptyProps(now: Date): WidgetDisplayProps {
  return countdownToWidgetProps(
    computeCountdownState({
      commute: null,
      now,
      realtime: emptyRealtime,
      predictions: [],
      nextScheduled: [],
      mapsUrl: '',
    }),
    now
  );
}

async function loadLineContext(
  commute: SavedCommute,
  staticGtfs: StaticGtfsService,
  at: Date,
  matchStopIds: Set<string>
): Promise<LineContext> {
  const [realtime, times] = await Promise.all([
    realtimeGtfsService.fetchTripUpdatesForCommute(commute, at),
    staticGtfs.getScheduledArrivalsForCommute(commute, at, SCHEDULE_LOOKAHEAD).catch(() => []),
  ]);
  /** Filter the feed once; every timeline entry then only needs a time check. */
  const predictions = realtimeGtfsService
    .filterForCommute(realtime, commute, at.getTime(), matchStopIds)
    .map((p) => ({ ...p, routeId: commute.routeId }));
  return {
    commute,
    realtime,
    predictions,
    schedule: times.map((t) => ({ at: t, routeId: commute.routeId })),
  };
}

async function loadCountdownContext(commute: SavedCommute, at: Date): Promise<CountdownContext> {
  const mapsUrl = buildGoogleMapsCoordinateUrl(commute.stopLat, commute.stopLon);
  const agencyId = commute.agencyId ?? DEFAULT_TRANSIT_AGENCY;
  const [staticGtfs, matchStopIds] = await Promise.all([
    getStaticGtfsService(agencyId),
    matchStopIdsForCommute(commute),
  ]);
  const lines = await Promise.all(
    commuteRoutes(commute).map((route) =>
      loadLineContext(commuteForRoute(commute, route), staticGtfs, at, matchStopIds)
    )
  );
  return { mapsUrl, lines };
}

/**
 * Countdown at `at` across every selected line: live predictions where a line has
 * them, that line's static schedule where it doesn't.
 */
function countdownStateAt(commute: SavedCommute, at: Date, ctx: CountdownContext): CountdownState {
  const atMs = at.getTime();
  const predictions: ArrivalPrediction[] = [];
  const nextScheduled: ScheduledArrival[] = [];
  for (const line of ctx.lines) {
    const linePreds = line.predictions.filter(
      (p) => p.arrivalTimeSec * 1000 > atMs - PREDICTION_GRACE_MS
    );
    if (linePreds.length > 0) predictions.push(...linePreds);
    else nextScheduled.push(...line.schedule.filter((s) => s.at.getTime() > atMs));
  }
  predictions.sort((a, b) => a.arrivalTimeSec - b.arrivalTimeSec);
  nextScheduled.sort((a, b) => a.at.getTime() - b.at.getTime());

  const hasTimestamp = ctx.lines.some((l) => l.realtime.feedTimestampSec !== null);
  const realtimeAt: RealtimeFetchResult = {
    predictions,
    /** Data was just fetched for this timeline; evaluate staleness relative to `at`. */
    feedTimestampSec: hasTimestamp ? Math.floor(atMs / 1000) : null,
    source: ctx.lines.some((l) => l.realtime.source === 'live')
      ? 'live'
      : ctx.lines.some((l) => l.realtime.source === 'mock')
        ? 'mock'
        : 'unavailable',
  };
  return computeCountdownState({
    commute,
    now: at,
    realtime: realtimeAt,
    predictions,
    nextScheduled,
    mapsUrl: ctx.mapsUrl,
  });
}

async function computeCountdownNow(
  commute: SavedCommute,
  now = new Date()
): Promise<CountdownState> {
  const ctx = await loadCountdownContext(commute, now);
  return countdownStateAt(commute, now, ctx);
}

/**
 * First moment after `t` when a countdown to `target` shows a different value:
 * whole-minute steps (ceil), then per-second steps inside the final minute.
 * Includes `target` itself, where the countdown rolls to the next bus.
 */
function nextTickAfter(target: number, t: number): number | null {
  const remaining = target - t;
  if (remaining <= 0) return null;
  if (remaining > 60_000) return target - (Math.ceil(remaining / 60_000) - 1) * 60_000;
  return target - (Math.ceil(remaining / 1000) - 1) * 1000;
}

/** When the widget's content next changes, given the state shown at `t`. */
function nextChangeAfter(state: CountdownState, t: number): number {
  let next = t + IDLE_ENTRY_MS;
  for (const target of [
    state.leaveAtMs,
    state.busArrivalMs,
    state.nextBusArrivalMs,
    state.nextBusLeaveAtMs,
    state.nextScheduledArrivalMs,
  ]) {
    if (target == null) continue;
    const tick = nextTickAfter(target, t);
    if (tick != null && tick < next) next = tick;
  }
  return next;
}

/**
 * Builds timeline entries only at the moments the widget's text changes, so the
 * number flips exactly on the minute (and every second in the final minute)
 * instead of lagging up to a minute behind a fixed one-minute grid.
 */
async function buildWidgetTimelineEntries(commute: SavedCommute): Promise<{
  entries: { date: Date; props: WidgetDisplayProps }[];
  nowState: CountdownState | null;
}> {
  const timelineStart = new Date();
  const ctx = await loadCountdownContext(commute, timelineStart);
  const startMs = timelineStart.getTime();
  const endMs = startMs + TIMELINE_HORIZON_MS;

  const entries: { date: Date; props: WidgetDisplayProps }[] = [];
  let nowState: CountdownState | null = null;
  let lastKey = '';
  let t = startMs;
  while (t <= endMs && entries.length < MAX_TIMELINE_ENTRIES) {
    const at = new Date(t);
    const state = countdownStateAt(commute, at, ctx);
    nowState ??= state;
    const props = timelineWidgetProps(countdownToWidgetProps(state, at));
    const key = JSON.stringify(props);
    if (key !== lastKey) {
      entries.push({ date: at, props });
      lastKey = key;
    }
    t = nextChangeAfter(state, t);
  }

  return { entries, nowState };
}

/**
 * Fetches the latest realtime + scheduled data for a commute and returns the
 * widget props for "now". Shared by the in-app preview.
 */
export async function computeWidgetDisplayProps(
  commute: SavedCommute | null,
  now = new Date()
): Promise<WidgetDisplayProps> {
  if (!commute) {
    return emptyProps(now);
  }

  const mapsUrl = buildGoogleMapsCoordinateUrl(commute.stopLat, commute.stopLon);

  try {
    const state = await computeCountdownNow(commute, now);
    return countdownToWidgetProps(state, now);
  } catch {
    return countdownToWidgetProps(
      computeCountdownState({
        commute,
        now,
        realtime: emptyRealtime,
        predictions: [],
        nextScheduled: [],
        mapsUrl,
      }),
      now
    );
  }
}

let refreshChain: Promise<WidgetDisplayProps | null> = Promise.resolve(null);

async function runRefreshWidgetTimeline(
  commute: SavedCommute | null
): Promise<WidgetDisplayProps | null> {
  const widget = await loadStumblWidget();
  if (!widget) return null;

  if (!commute) {
    const now = new Date();
    widgetMapsUrlBridge.current = '';
    const empty = emptyProps(now);
    widget.updateSnapshot(empty);
    widget.updateTimeline([{ date: now, props: empty }]);
    void syncLiveActivity(null);
    return empty;
  }

  const mapsUrl = buildGoogleMapsCoordinateUrl(commute.stopLat, commute.stopLon);
  widgetMapsUrlBridge.current = mapsUrl;

  try {
    const { entries, nowState } = await buildWidgetTimelineEntries(commute);
    const snapshot = entries[0]?.props;
    if (snapshot) {
      widget.updateSnapshot(snapshot);
    }
    widget.updateTimeline(entries);
    void syncLiveActivity(nowState);
    return snapshot ?? null;
  } catch {
    const now = new Date();
    const fallback = countdownToWidgetProps(
      computeCountdownState({
        commute,
        now,
        realtime: emptyRealtime,
        predictions: [],
        nextScheduled: [],
        mapsUrl,
      }),
      now
    );
    widget.updateSnapshot(fallback);
    widget.updateTimeline([{ date: now, props: fallback }]);
    void syncLiveActivity(null);
    return fallback;
  }
}

/**
 * Fetches the latest realtime + scheduled data once, then pushes a minute-by-minute
 * timeline to the Home Screen widget so the countdown keeps updating without the app.
 * Serialized so overlapping refreshes cannot apply stale data out of order.
 */
export function refreshWidgetTimeline(
  commute: SavedCommute | null
): Promise<WidgetDisplayProps | null> {
  const run = refreshChain.then(() => runRefreshWidgetTimeline(commute));
  refreshChain = run.catch(() => null);
  return run;
}
