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
 * How far ahead the WidgetKit timeline is scheduled. One entry per minute keeps
 * the countdown ticking on the Home Screen while the app is backgrounded/closed.
 */
const TIMELINE_HORIZON_MIN = 60;

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
  /** Pre-fetched schedule for when this line has no live predictions. */
  fallbackSchedule: ScheduledArrival[];
};

type CountdownContext = {
  mapsUrl: string;
  matchStopIds: Set<string>;
  lines: LineContext[];
};

/** Live predictions for one line at `atMs`, tagged with the line's route id. */
function linePredictionsAt(
  line: LineContext,
  atMs: number,
  matchStopIds: Set<string>
): ArrivalPrediction[] {
  return realtimeGtfsService
    .filterForCommute(line.realtime, line.commute, atMs, matchStopIds)
    .map((p) => ({ ...p, routeId: line.commute.routeId }));
}

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
  const realtime = await realtimeGtfsService.fetchTripUpdatesForCommute(commute, at);
  const line: LineContext = { commute, realtime, fallbackSchedule: [] };
  if (linePredictionsAt(line, at.getTime(), matchStopIds).length === 0) {
    const times = await staticGtfs.getScheduledArrivalsForCommute(commute, at, 8);
    line.fallbackSchedule = times.map((t) => ({ at: t, routeId: commute.routeId }));
  }
  return line;
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
  return { mapsUrl, matchStopIds, lines };
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
    const linePreds = linePredictionsAt(line, atMs, ctx.matchStopIds);
    if (linePreds.length > 0) predictions.push(...linePreds);
    else nextScheduled.push(...line.fallbackSchedule);
  }
  predictions.sort((a, b) => a.arrivalTimeSec - b.arrivalTimeSec);
  nextScheduled.sort((a, b) => a.at.getTime() - b.at.getTime());

  const timestamps = ctx.lines
    .map((l) => l.realtime.feedTimestampSec)
    .filter((t): t is number => t !== null);
  const realtimeAt: RealtimeFetchResult = {
    predictions,
    /** Data was just fetched for this timeline; evaluate staleness relative to `at`. */
    feedTimestampSec: timestamps.length > 0 ? Math.floor(atMs / 1000) : null,
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

async function buildWidgetTimelineEntries(commute: SavedCommute): Promise<{
  entries: { date: Date; props: WidgetDisplayProps }[];
  nowState: CountdownState | null;
}> {
  const timelineStart = new Date();
  const ctx = await loadCountdownContext(commute, timelineStart);

  const entries: { date: Date; props: WidgetDisplayProps }[] = [];
  const nowState = countdownStateAt(commute, timelineStart, ctx);
  const nowProps = countdownToWidgetProps(nowState, timelineStart);
  const targetMs = nowProps.countdownTargetMs;

  const pushEntry = (at: Date) => {
    const state = countdownStateAt(commute, at, ctx);
    entries.push({
      date: at,
      props: timelineWidgetProps(countdownToWidgetProps(state, at)),
    });
  };

  if (targetMs != null && targetMs > timelineStart.getTime()) {
    const remainingSec = Math.ceil((targetMs - timelineStart.getTime()) / 1000);
    const baseProps = timelineWidgetProps(nowProps);
    const startSec = parseInt(baseProps.primaryValue, 10);
    const canTickSeconds = !Number.isNaN(startSec) && startSec > 0 && startSec <= remainingSec + 1;

    if (canTickSeconds) {
      for (let s = 0; s <= remainingSec; s++) {
        const secLeft = Math.max(0, startSec - s);
        entries.push({
          date: new Date(timelineStart.getTime() + s * 1000),
          props: {
            ...baseProps,
            primaryValue: String(secLeft).padStart(2, '0'),
          },
        });
      }
    } else {
      for (let s = 0; s <= remainingSec; s++) {
        pushEntry(new Date(timelineStart.getTime() + s * 1000));
      }
    }
    const minuteLoopStart = new Date(timelineStart.getTime() + remainingSec * 1000);
    for (let i = 1; i <= TIMELINE_HORIZON_MIN; i++) {
      pushEntry(new Date(minuteLoopStart.getTime() + i * 60_000));
    }
  } else {
    for (let i = 0; i <= TIMELINE_HORIZON_MIN; i++) {
      pushEntry(new Date(timelineStart.getTime() + i * 60_000));
    }
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
