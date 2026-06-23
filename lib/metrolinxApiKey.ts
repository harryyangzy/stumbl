import Constants from 'expo-constants';

/** Metrolinx Open Data access key — set EXPO_PUBLIC_METROLINX_API_KEY in .env */
export function getMetrolinxApiKey(): string | null {
  const fromExtra = Constants.expoConfig?.extra?.metrolinxApiKey;
  if (typeof fromExtra === 'string' && fromExtra.trim()) return fromExtra.trim();
  const fromEnv = process.env.EXPO_PUBLIC_METROLINX_API_KEY;
  if (typeof fromEnv === 'string' && fromEnv.trim()) return fromEnv.trim();
  return null;
}

export const METROLINX_API_BASE = 'https://api.openmetrolinx.com/OpenDataAPI';

/** Metrolinx GO API expects the access key as a `key` query parameter, not a header. */
export function metrolinxApiUrl(path: string, apiKey: string): string {
  const normalized = path.replace(/^\//, '');
  const base = `${METROLINX_API_BASE}/${normalized}`;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}key=${encodeURIComponent(apiKey)}`;
}
