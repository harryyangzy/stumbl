import Constants from 'expo-constants';

import type { LiveActivityDisplayProps } from '@/services/liveActivity/liveActivityViewModel';

import { isExpoGo } from '@/lib/isExpoGo';

/** Subset of the expo-widgets `LiveActivity` instance the app drives. */
export type StumblLiveActivityInstance = {
  update: (props: LiveActivityDisplayProps) => Promise<void>;
  end: (
    dismissalPolicy?: 'default' | 'immediate',
    props?: LiveActivityDisplayProps
  ) => Promise<void>;
};

/** Subset of the expo-widgets `LiveActivityFactory` returned by `createLiveActivity`. */
export type StumblLiveActivityFactory = {
  start: (props: LiveActivityDisplayProps, url?: string) => StumblLiveActivityInstance;
  getInstances: () => StumblLiveActivityInstance[];
};

let loadPromise: Promise<StumblLiveActivityFactory | null> | null = null;

/**
 * Loads the SwiftUI Live Activity module only when not running in Expo Go.
 * Expo Go does not ship the `ExpoUI` / `ExpoWidgets` native modules — use a dev
 * build (`expo run:ios`). Mirrors `loadStumblWidget`.
 */
export function loadStumblLiveActivity(): Promise<StumblLiveActivityFactory | null> {
  if (Constants.expoConfig?.extra?.disableNativeWidgets === true) {
    return Promise.resolve(null);
  }
  if (isExpoGo()) {
    return Promise.resolve(null);
  }

  if (!loadPromise) {
    loadPromise = import('@/features/liveActivity/StumblLiveActivity')
      .then((m) => m.default as unknown as StumblLiveActivityFactory)
      .catch(() => null);
  }

  return loadPromise;
}
