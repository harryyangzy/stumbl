import type { ExpoConfig } from 'expo/config';

const widgetPlugin = [
  'expo-widgets',
  {
    bundleIdentifier: 'ca.stumbl.app.widgets',
    groupIdentifier: 'group.ca.stumbl.app',
    widgets: [
      {
        name: 'StumblWidget',
        displayName: 'Stumbl',
        description: 'Leave for the bus on time',
        supportedFamilies: ['systemSmall'],
        contentMarginsDisabled: true,
      },
    ],
  },
] as const;

/** Omit with EXPO_NO_WIDGETS=1 so Expo Go gets a simpler manifest (see metro stub). */
const useNativeWidgets = process.env.EXPO_NO_WIDGETS !== '1';

const config: ExpoConfig = {
  name: 'Stumbl',
  slug: 'stumbl',
  version: '1.0.0',
  extra: {
    /** Set when `EXPO_NO_WIDGETS=1` (Expo Go); `loadStumblWidget` skips `@expo/ui` SwiftUI module. */
    disableNativeWidgets: !useNativeWidgets,
  },
  /** iOS-only: avoids advertising web in the CLI and matches product scope. Metro can still bundle web if something requests it; see README. */
  platforms: ['ios'],
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  scheme: 'stumbl',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#148240',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'ca.stumbl.app',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'ca.stumbl.app',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
  },
  experiments: {
    typedRoutes: true,
    tsconfigPaths: true,
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-asset',
    ...(useNativeWidgets ? [widgetPlugin] : []),
  ] as ExpoConfig['plugins'],
};

export default config;
