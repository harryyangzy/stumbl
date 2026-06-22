/** Swap to false to hit live GRT GTFS-RT endpoints (requires network). */
export const USE_MOCK_REALTIME = false;

/** Grand River Transit (Waterloo Region) GTFS-RT protobuf feeds over HTTPS. */
export const REALTIME_ENDPOINTS = {
  /** Bus + ION shuttle trip updates (feeds 1 and 2 are merged at fetch time). */
  tripUpdates: [
    'https://webapps.regionofwaterloo.ca/api/grt-routes/api/tripupdates/1',
    'https://webapps.regionofwaterloo.ca/api/grt-routes/api/tripupdates/2',
  ],
  alerts: [
    'https://webapps.regionofwaterloo.ca/api/grt-routes/api/servicealerts/1',
    'https://webapps.regionofwaterloo.ca/api/grt-routes/api/servicealerts/2',
  ],
  vehiclePositions: [
    'https://webapps.regionofwaterloo.ca/api/grt-routes/api/vehiclepositions/1',
    'https://webapps.regionofwaterloo.ca/api/grt-routes/api/vehiclepositions/2',
  ],
} as const;

export const REALTIME_FETCH_TIMEOUT_MS = 25_000;

/** GTFS-RT header timestamp older than this is treated as stale. */
export const REALTIME_STALE_AFTER_SEC = 120;

export const GTFS_TIMEZONE = 'America/Toronto';
