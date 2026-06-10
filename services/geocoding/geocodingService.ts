/**
 * Address search via OpenStreetMap Nominatim (free, no API key).
 * Results are bounded to the transit service area so "350 Cheapside St"
 * resolves inside the GTFS coverage instead of some other city.
 */

export type AddressResult = {
  id: string;
  label: string;
  lat: number;
  lon: number;
};

export type GeoBounds = {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
};

type NominatimRow = {
  place_id: number | string;
  display_name: string;
  lat: string;
  lon: string;
};

/** "350, Cheapside Street, London, Ontario, N6A 3X3, Canada" → "350 Cheapside Street, London". */
function shortenDisplayName(displayName: string): string {
  const parts = displayName.split(', ').filter(Boolean);
  if (parts.length === 0) return displayName;
  // House number comes back as its own comma-separated part; merge it with the street.
  if (/^\d+[a-z]?$/i.test(parts[0]) && parts.length > 1) {
    parts.splice(0, 2, `${parts[0]} ${parts[1]}`);
  }
  return parts.slice(0, 2).join(', ');
}

export async function searchAddresses(
  query: string,
  bounds: GeoBounds,
  limit = 2
): Promise<AddressResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // viewbox is left,top,right,bottom; bounded=1 restricts (not just biases) results.
  const viewbox = `${bounds.minLon},${bounds.maxLat},${bounds.maxLon},${bounds.minLat}`;
  const url =
    'https://nominatim.openstreetmap.org/search' +
    `?format=jsonv2&q=${encodeURIComponent(trimmed)}` +
    `&viewbox=${encodeURIComponent(viewbox)}&bounded=1` +
    `&limit=${limit}&countrycodes=ca`;

  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      // Nominatim usage policy requires an identifying User-Agent.
      'User-Agent': 'stumbl/1.0 (transit commute app)',
    },
  });
  if (!res.ok) return [];

  const rows = (await res.json()) as NominatimRow[];
  const seen = new Set<string>();
  const results: AddressResult[] = [];
  for (const r of rows) {
    const lat = parseFloat(r.lat);
    const lon = parseFloat(r.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const label = shortenDisplayName(r.display_name);
    if (seen.has(label)) continue;
    seen.add(label);
    results.push({ id: String(r.place_id), label, lat, lon });
  }
  return results;
}
