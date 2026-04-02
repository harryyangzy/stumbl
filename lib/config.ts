/** Swap to false to hit live LTC GTFS-RT endpoints (requires network). */
export const USE_MOCK_REALTIME = true;

export const REALTIME_ENDPOINTS = {
  tripUpdates: 'https://gtfs.ltconline.ca/TripUpdate/TripUpdates.json',
  alerts: 'https://gtfs.ltconline.ca/Alert/Alerts.json',
  vehiclePositions: 'https://gtfs.ltconline.ca/Vehicle/VehiclePositions.json',
} as const;

export const REALTIME_FETCH_TIMEOUT_MS = 12_000;

/** GTFS-RT header timestamp older than this is treated as stale. */
export const REALTIME_STALE_AFTER_SEC = 120;

export const GTFS_TIMEZONE = 'America/Toronto';
