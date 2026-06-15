/** Swap to false to hit live LTC GTFS-RT endpoints (requires network). */
export const USE_MOCK_REALTIME = false;

/** LTC serves GTFS-RT as protobuf over HTTP; HTTPS resets and JSON is ~30MB. */
export const REALTIME_ENDPOINTS = {
  tripUpdates: 'http://gtfs.ltconline.ca/TripUpdate/TripUpdates.pb',
  alerts: 'http://gtfs.ltconline.ca/Alert/Alerts.pb',
  vehiclePositions: 'http://gtfs.ltconline.ca/Vehicle/VehiclePositions.pb',
} as const;

export const REALTIME_FETCH_TIMEOUT_MS = 25_000;

/** GTFS-RT header timestamp older than this is treated as stale. */
export const REALTIME_STALE_AFTER_SEC = 120;

export const GTFS_TIMEZONE = 'America/Toronto';
