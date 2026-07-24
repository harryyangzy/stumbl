import { loadStumblWidget } from '@/lib/stumblWidgetLoader';
import { widgetMapsUrlBridge } from '@/lib/widgetBridge';
import { DEFAULT_TRANSIT_AGENCY } from '@/lib/transitAgencies';
import { computeCountdownState, type CountdownState } from '@/services/countdown/countdownService';
import { syncLiveActivity } from '@/services/liveActivity/liveActivityService';
import { buildGoogleMapsCoordinateUrl } from '@/services/maps/googleMaps';
import {
  getStaticGtfsService,
  type StaticGtfsService,
} from '@/services/gtfs/staticGtfsService';
import {
  realtimeGtfsService,
  matchStopIdsForCommute,
} from '@/services/realtime/realtimeGtfsService';
import { countdownToWidgetProps, type WidgetDisplayProps } from '@/services/widget/widgetViewModel';
import type { RealtimeFetchResult } from '@/types/realtime';
import type { SavedCommute } from '@/types/commute';

/**
 * How far ahead the WidgetKit timeline is scheduled. One entry per minute keeps
 * the countdown ticking on the Home Screen while the app is backgrounded/closed.
 */
const TIMELINE_HORIZON_MIN = 60;

const emptyRealtime: RealtimeFetchResult = {
  predictions: [],
  feedTimestampSec: null,
  source: 'unavailable',
};

type CountdownContext = {
  mapsUrl: string;
  realtime: RealtimeFetchResult;
  matchStopIds: Set<string>;
  /** Pre-fetched schedule for "no buses" footer when live predictions are empty. */
  fallbackSchedule: Date[];
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

async function loadCountdownContext(commute: SavedCommute, at: Date): Promise<CountdownContext> {
  const mapsUrl = buildGoogleMapsCoordinateUrl(commute.stopLat, commute.stopLon);
  const agencyId = commute.agencyId ?? DEFAULT_TRANSIT_AGENCY;
  const staticGtfs: StaticGtfsService = await getStaticGtfsService(agencyId);
  const [realtime, matchStopIds] = await Promise.all([
    realtimeGtfsService.fetchTripUpdatesForCommute(commute, at),
    matchStopIdsForCommute(commute),
  ]);
  const nowPredictions = realtimeGtfsService.filterForCommute(
    realtime,
    commute,
    at.getTime(),
    matchStopIds
  );
  const fallbackSchedule =
    nowPredictions.length === 0
      ? await staticGtfs.getScheduledArrivalsForCommute(commute, at, 8)
      : [];
  return { mapsUrl, realtime, matchStopIds, fallbackSchedule };
}

function countdownStateAt(
  commute: SavedCommute,
  at: Date,
  ctx: CountdownContext,
  nextScheduled: Date[]
): CountdownState {
  const realtimeAt: RealtimeFetchResult =
    ctx.realtime.feedTimestampSec === null
      ? ctx.realtime
      : { ...ctx.realtime, feedTimestampSec: Math.floor(at.getTime() / 1000) };
  const predictions = realtimeGtfsService.filterForCommute(
    ctx.realtime,
    commute,
    at.getTime(),
    ctx.matchStopIds
  );
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
  return countdownStateAt(commute, now, ctx, ctx.fallbackSchedule);
}

async function buildWidgetTimelineEntries(commute: SavedCommute): Promise<{
  entries: { date: Date; props: WidgetDisplayProps }[];
  nowState: CountdownState | null;
}> {
  const timelineStart = new Date();
  const ctx = await loadCountdownContext(commute, timelineStart);

  const entries: { date: Date; props: WidgetDisplayProps }[] = [];
  let nowState: CountdownState | null = null;
  for (let i = 0; i <= TIMELINE_HORIZON_MIN; i++) {
    const at = new Date(timelineStart.getTime() + i * 60_000);
    const predictions = realtimeGtfsService.filterForCommute(
      ctx.realtime,
      commute,
      at.getTime(),
      ctx.matchStopIds
    );
    const nextScheduled = predictions.length === 0 ? ctx.fallbackSchedule : [];
    const state = countdownStateAt(commute, at, ctx, nextScheduled);
    if (i === 0) nowState = state;
    entries.push({ date: at, props: countdownToWidgetProps(state, at) });
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
