import { useEffect } from 'react';
import { AppState } from 'react-native';

import { refreshWidgetTimeline } from '@/services/widget/widgetTimelineService';
import { useCommuteStore } from '@/store/commuteStore';

/**
 * Keeps the Home Screen widget timeline fresh for the **saved** commute only.
 * Draft/onboarding edits update the in-app preview separately and must not push
 * to the widget until the user taps "Add to Home" (or Done on an edit).
 */
export function useCommuteCountdownRefresh() {
  const savedCommute = useCommuteStore((s) => s.savedCommute);
  const hasHydrated = useCommuteStore((s) => s.hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;

    const refresh = () => {
      const { savedCommute } = useCommuteStore.getState();
      void refreshWidgetTimeline(savedCommute);
    };

    refresh();
    const id = setInterval(refresh, 30_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });

    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [savedCommute, hasHydrated]);
}
