import Constants from 'expo-constants';

/**
 * Google Maps Routes API key — set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in .env (and in
 * the EAS "production" environment for TestFlight builds). Ships in the app, so
 * restrict it in Cloud Console to iOS app ca.stumbl.app + Routes API only.
 */
export function getGoogleMapsApiKey(): string | null {
  const fromExtra = Constants.expoConfig?.extra?.googleMapsApiKey;
  if (typeof fromExtra === 'string' && fromExtra.trim()) return fromExtra.trim();
  const fromEnv = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (typeof fromEnv === 'string' && fromEnv.trim()) return fromEnv.trim();
  return null;
}

/** Sent with each request so an iOS-app-restricted key accepts it. */
export function iosBundleIdentifier(): string {
  return Constants.expoConfig?.ios?.bundleIdentifier ?? 'ca.stumbl.app';
}
