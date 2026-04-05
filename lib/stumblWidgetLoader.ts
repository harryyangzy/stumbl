import Constants from 'expo-constants';

import type { WidgetDisplayProps } from '@/services/widget/widgetViewModel';

import { isExpoGo } from '@/lib/isExpoGo';

/** Matches `createWidget` return (updateSnapshot only used here). */
export type StumblWidgetHandle = {
  updateSnapshot: (props: WidgetDisplayProps) => void;
};

let loadPromise: Promise<StumblWidgetHandle | null> | null = null;

/**
 * Loads the SwiftUI widget module only when not running in Expo Go.
 * Expo Go does not ship the `ExpoUI` native module — use a dev build (`expo run:ios`).
 */
export function loadStumblWidget(): Promise<StumblWidgetHandle | null> {
  if (Constants.expoConfig?.extra?.disableNativeWidgets === true) {
    return Promise.resolve(null);
  }
  if (isExpoGo()) {
    return Promise.resolve(null);
  }

  if (!loadPromise) {
    loadPromise = import('@/features/widget/StumblWidget')
      .then((m) => m.default as StumblWidgetHandle)
      .catch(() => null);
  }

  return loadPromise;
}
