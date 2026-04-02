import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Stumbl',
  slug: 'stumbl',
  version: '1.0.0',
  /** iOS-only: avoids advertising web in the CLI and matches product scope. Metro can still bundle web if something requests it; see README. */
  platforms: ['ios'],
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  scheme: 'stumbl',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#2D6A4F',
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
    'expo-asset',
    [
      'expo-widgets',
      {
        bundleIdentifier: 'ca.stumbl.app.widgets',
        groupIdentifier: 'group.ca.stumbl.app',
        widgets: [
          {
            name: 'StumblWidget',
            displayName: 'Stumbl',
            description: 'Leave for the bus on time',
            supportedFamilies: ['systemSmall', 'systemMedium'],
          },
        ],
      },
    ],
  ],
};

export default config;
