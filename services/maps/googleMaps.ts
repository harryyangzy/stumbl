/** Google Maps search at stop coordinates (works on iOS from the app and share sheets). */
export function buildGoogleMapsStopUrl(lat: number, lon: number, _stopName: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lon}`)}`;
}

export function buildGoogleMapsCoordinateUrl(lat: number, lon: number): string {
  return buildGoogleMapsStopUrl(lat, lon, '');
}
