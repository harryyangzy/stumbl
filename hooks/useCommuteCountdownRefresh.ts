import { useEffect } from 'react';
import { AppState } from 'react-native';

import { getActiveCommute } from '@/lib/activeCommute';
import { refreshWidgetTimeline } from '@/services/widget/widgetTimelineService';
import { useCommuteStore } from '@/store/commuteStore';

/**
 * Keeps the Home Screen widget timeline fresh: on launch, when the active commute
 * changes (saved commute or in-progress draft), when the app returns to the
 * foreground, and every minute while open.
 * The pushed timeline covers the next hour, so the widget keeps counting down
 * after the app is backgrounded or closed.
 */
export function useCommuteCountdownRefresh() {
  const savedCommute = useCommuteStore((s) => s.savedCommute);
  const draft = useCommuteStore((s) => s.draft);
  const hasHydrated = useCommuteStore((s) => s.hasHydrated);

  useEffect(() => {
    /**
     * Wait for the persisted store to rehydrate before touching the widget.
     * Refreshing while `savedCommute` is still the initial null would push the
     * "setup" placeholder over a real saved commute on cold launch.
     */
    if (!hasHydrated) return;

    const refresh = () => {
      const { draft, savedCommute } = useCommuteStore.getState();
      const commute = getActiveCommute(draft, savedCommute);
      void refreshWidgetTimeline(commute);
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
  }, [savedCommute, draft, hasHydrated]);
}
