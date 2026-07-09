import { loadStumblWidget } from '@/lib/stumblWidgetLoader';
import { widgetMapsUrlBridge } from '@/lib/widgetBridge';
import { DEFAULT_TRANSIT_AGENCY } from '@/lib/transitAgencies';
import { computeCountdownState } from '@/services/countdown/countdownService';
import { buildGoogleMapsCoordinateUrl } from '@/services/maps/googleMaps';
import { getStaticGtfsService } from '@/services/gtfs/staticGtfsService';
import { realtimeGtfsService, matchStopIdsForCommute } from '@/services/realtime/realtimeGtfsService';
import {
  countdownToWidgetProps,
  type WidgetDisplayProps,
} from '@/services/widget/widgetViewModel';
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

function emptyProps(now: Date): WidgetDisplayProps {
  return countdownToWidgetProps(
    computeCountdownState({
      commute: null,
      now,
      realtime: emptyRealtime,
      predictions: [],
      nextScheduled: [],
      mapsUrl: '',
    })
  );
}

async function buildWidgetTimelineEntries(
  commute: SavedCommute,
  now: Date
): Promise<{ date: Date; props: WidgetDisplayProps }[]> {
  const mapsUrl = buildGoogleMapsCoordinateUrl(commute.stopLat, commute.stopLon);
  const staticGtfs = await getStaticGtfsService(commute.agencyId ?? DEFAULT_TRANSIT_AGENCY);
  const realtime = await realtimeGtfsService.fetchTripUpdatesForCommute(commute, now);
  const matchStopIds = await matchStopIdsForCommute(commute);

  const entries: { date: Date; props: WidgetDisplayProps }[] = [];
  for (let i = 0; i <= TIMELINE_HORIZON_MIN; i++) {
    const at = new Date(now.getTime() + i * 60_000);
    /**
     * Data fetched now is the best information for the whole horizon; pin the feed
     * timestamp to each entry so the staleness check doesn't discard predictions
     * for entries a few minutes out. Genuinely unavailable feeds stay unavailable.
     */
    const realtimeAt: RealtimeFetchResult =
      realtime.feedTimestampSec === null
        ? realtime
        : { ...realtime, feedTimestampSec: Math.floor(at.getTime() / 1000) };
    const predictions = realtimeGtfsService.filterForCommute(
      realtime,
      commute,
      at.getTime(),
      matchStopIds
    );
    /**
     * Static timetable is always fetched for the "no buses" footer even when
     * USE_SCHEDULE_FALLBACK is off — live data alone drives the main countdown.
     */
    const nextScheduled = await staticGtfs.getScheduledArrivalsForCommute(commute, at, 8);
    const state = computeCountdownState({
      commute,
      now: at,
      realtime: realtimeAt,
      predictions,
      nextScheduled,
      mapsUrl,
    });
    entries.push({ date: at, props: countdownToWidgetProps(state) });
  }

  return entries;
}

/**
 * Fetches the latest realtime + scheduled data for a commute and returns the
 * widget props for "now". Shared by the in-app preview and the Home Screen widget.
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
    const entries = await buildWidgetTimelineEntries(commute, now);
    return entries[0]?.props ?? emptyProps(now);
  } catch {
    return countdownToWidgetProps(
      computeCountdownState({
        commute,
        now,
        realtime: emptyRealtime,
        predictions: [],
        nextScheduled: [],
        mapsUrl,
      })
    );
  }
}

/**
 * Fetches the latest realtime + scheduled data once, then pushes a minute-by-minute
 * timeline to the Home Screen widget so the countdown keeps updating without the app.
 * Returns the entry for "now" (useful for in-app previews), or null when the native
 * widget module is unavailable (Expo Go).
 */
export async function refreshWidgetTimeline(
  commute: SavedCommute | null
): Promise<WidgetDisplayProps | null> {
  const widget = await loadStumblWidget();
  if (!widget) return null;

  const now = new Date();

  if (!commute) {
    widgetMapsUrlBridge.current = '';
    const empty = emptyProps(now);
    widget.updateSnapshot(empty);
    return empty;
  }

  const mapsUrl = buildGoogleMapsCoordinateUrl(commute.stopLat, commute.stopLon);
  widgetMapsUrlBridge.current = mapsUrl;

  try {
    const entries = await buildWidgetTimelineEntries(commute, now);
    widget.updateTimeline(entries);
    return entries[0]?.props ?? null;
  } catch {
    const fallback = countdownToWidgetProps(
      computeCountdownState({
        commute,
        now,
        realtime: emptyRealtime,
        predictions: [],
        nextScheduled: [],
        mapsUrl,
      })
    );
    widget.updateSnapshot(fallback);
    return fallback;
  }
}
