import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import { refreshWidgetTimeline } from '@/services/widget/widgetTimelineService';
import { useCommuteStore } from '@/store/commuteStore';

const WIDGET_REFRESH_TASK = 'stumbl-widget-refresh';

/**
 * iOS treats this as a floor, not a schedule: 15 minutes is the shortest interval
 * BGTaskScheduler accepts, and the system runs the task when it sees fit (usage
 * patterns, battery, Low Power Mode), often less frequently.
 */
const MINIMUM_INTERVAL_MIN = 15;

/** Resolves once the persisted commute has been read from AsyncStorage. */
function waitForHydration(): Promise<void> {
  if (useCommuteStore.getState().hasHydrated) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = useCommuteStore.subscribe((s) => {
      if (s.hasHydrated) {
        unsub();
        resolve();
      }
    });
  });
}

/** Must be defined at module scope so a background-only launch can find the task. */
TaskManager.defineTask(WIDGET_REFRESH_TASK, async () => {
  try {
    await waitForHydration();
    const commute = useCommuteStore.getState().savedCommute;
    if (commute) await refreshWidgetTimeline(commute);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/** Registers the periodic refresh (idempotent). No-op where background tasks are unavailable (e.g. Expo Go). */
export async function registerWidgetBackgroundRefresh(): Promise<void> {
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
    if (await TaskManager.isTaskRegisteredAsync(WIDGET_REFRESH_TASK)) return;
    await BackgroundTask.registerTaskAsync(WIDGET_REFRESH_TASK, {
      minimumInterval: MINIMUM_INTERVAL_MIN,
    });
  } catch {
    // Background tasks unsupported in this runtime — foreground refresh still works.
  }
}
