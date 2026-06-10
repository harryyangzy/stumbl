import { useEffect } from 'react';
import { AppState } from 'react-native';

import { refreshWidgetTimeline } from '@/services/widget/widgetTimelineService';
import { useCommuteStore } from '@/store/commuteStore';

/**
 * Keeps the Home Screen widget timeline fresh: on launch, when the saved commute
 * changes, when the app returns to the foreground, and every minute while open.
 * The pushed timeline covers the next hour, so the widget keeps counting down
 * after the app is backgrounded or closed.
 */
export function useCommuteCountdownRefresh() {
  const savedCommute = useCommuteStore((s) => s.savedCommute);

  useEffect(() => {
    const refresh = () => {
      void refreshWidgetTimeline(useCommuteStore.getState().savedCommute);
    };

    refresh();
    const id = setInterval(refresh, 60_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });

    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [savedCommute]);
}
