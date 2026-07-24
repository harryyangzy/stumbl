import { useEffect } from 'react';
import { AppState } from 'react-native';

import { scheduleWidgetTimelineRefresh } from '@/lib/scheduleWidgetRefresh';
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

    const schedule = () =>
      scheduleWidgetTimelineRefresh(() => useCommuteStore.getState().savedCommute);

    schedule();
    const id = setInterval(schedule, 30_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') schedule();
    });

    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    scheduleWidgetTimelineRefresh(() => useCommuteStore.getState().savedCommute);
  }, [savedCommute, hasHydrated]);
}
