import { useEffect } from 'react';

import { loadStumblWidget } from '@/lib/stumblWidgetLoader';
import { widgetMapsUrlBridge } from '@/lib/widgetBridge';
import { computeCountdownState } from '@/services/countdown/countdownService';
import { buildGoogleMapsCoordinateUrl } from '@/services/maps/googleMaps';
import { getStaticGtfsService } from '@/services/gtfs/staticGtfsService';
import { realtimeGtfsService } from '@/services/realtime/realtimeGtfsService';
import { countdownToWidgetProps } from '@/services/widget/widgetViewModel';
import { useCommuteStore } from '@/store/commuteStore';

/** Keeps widget snapshot aligned with countdown logic (30s refresh). */
export function useCommuteCountdownRefresh() {
  const savedCommute = useCommuteStore((s) => s.savedCommute);

  useEffect(() => {
    let alive = true;

    const refresh = async () => {
      const widget = await loadStumblWidget();
      if (!widget) return;

      const now = new Date();
      const commute = useCommuteStore.getState().savedCommute;

      if (!commute) {
        const empty = countdownToWidgetProps(
          computeCountdownState({
            commute: null,
            now,
            realtime: { predictions: [], feedTimestampSec: null, source: 'unavailable' },
            predictions: [],
            nextScheduled: [],
            mapsUrl: '',
          })
        );
        widgetMapsUrlBridge.current = '';
        widget.updateSnapshot(empty);
        return;
      }

      const mapsUrl = buildGoogleMapsCoordinateUrl(commute.stopLat, commute.stopLon);
      widgetMapsUrlBridge.current = mapsUrl;

      try {
        const staticGtfs = await getStaticGtfsService();
        const realtime = await realtimeGtfsService.fetchTripUpdatesForCommute(commute, now);
        const predictions = realtimeGtfsService.filterForCommute(realtime, commute, now.getTime());
        const nextScheduled = staticGtfs.getScheduledArrivalsAfter(
          commute.stopId,
          commute.routeId,
          now,
          8
        );

        if (!alive) return;

        const state = computeCountdownState({
          commute,
          now,
          realtime,
          predictions,
          nextScheduled,
          mapsUrl,
        });
        widget.updateSnapshot(countdownToWidgetProps(state));
      } catch {
        if (!alive) return;
        widget.updateSnapshot(
          countdownToWidgetProps(
            computeCountdownState({
              commute,
              now,
              realtime: { predictions: [], feedTimestampSec: null, source: 'unavailable' },
              predictions: [],
              nextScheduled: [],
              mapsUrl,
            })
          )
        );
      }
    };

    refresh();
    const id = setInterval(refresh, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [savedCommute]);
}
