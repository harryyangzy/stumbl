export type TransitAgencyId = 'ltc' | 'grt' | 'go';

export type TransitAgencyConfig = {
  id: TransitAgencyId;
  label: string;
  region: string;
  /** GTFS calendar.txt + calendar_dates exceptions (LTC). */
  calendarMode: 'calendar' | 'calendar_dates_only';
  dedupeStopsByName: boolean;
  excludeParentStations: boolean;
  ionSupport: boolean;
  /** Uses Metrolinx Open Data API (requires EXPO_PUBLIC_METROLINX_API_KEY). */
  metrolinxApi: boolean;
  realtime: {
    tripUpdates: readonly string[];
  };
};

export const TRANSIT_AGENCIES: Record<TransitAgencyId, TransitAgencyConfig> = {
  ltc: {
    id: 'ltc',
    label: 'London Transit',
    region: 'London, ON',
    calendarMode: 'calendar',
    dedupeStopsByName: false,
    excludeParentStations: false,
    ionSupport: false,
    metrolinxApi: false,
    realtime: {
      tripUpdates: ['http://gtfs.ltconline.ca/TripUpdate/TripUpdates.pb'],
    },
  },
  grt: {
    id: 'grt',
    label: 'Grand River Transit',
    region: 'Waterloo Region',
    calendarMode: 'calendar_dates_only',
    dedupeStopsByName: true,
    excludeParentStations: true,
    ionSupport: true,
    metrolinxApi: false,
    realtime: {
      tripUpdates: [
        'https://webapps.regionofwaterloo.ca/api/grt-routes/api/tripupdates/1',
        'https://webapps.regionofwaterloo.ca/api/grt-routes/api/tripupdates/2',
      ],
    },
  },
  go: {
    id: 'go',
    label: 'GO Transit',
    region: 'Greater Golden Horseshoe',
    calendarMode: 'calendar_dates_only',
    dedupeStopsByName: true,
    excludeParentStations: false,
    ionSupport: false,
    metrolinxApi: true,
    realtime: {
      tripUpdates: [],
    },
  },
};

export const TRANSIT_AGENCY_LIST = Object.values(TRANSIT_AGENCIES);

export const DEFAULT_TRANSIT_AGENCY: TransitAgencyId = 'grt';

export function getTransitAgency(id: TransitAgencyId | undefined | null): TransitAgencyConfig {
  if (id && TRANSIT_AGENCIES[id]) return TRANSIT_AGENCIES[id];
  return TRANSIT_AGENCIES[DEFAULT_TRANSIT_AGENCY];
}

/** Swap to false to hit live GTFS-RT endpoints (requires network). */
export const USE_MOCK_REALTIME = false;

/**
 * Live data only. When false, the countdown never falls back to the bundled
 * static timetable — it shows exactly what the live GTFS-RT / NextService feeds
 * report, and "No buses right now" only when the live feed truly has nothing
 * upcoming. Flip to true to re-enable the (current) schedule as a gap-filler
 * beyond the live prediction horizon.
 */
export const USE_SCHEDULE_FALLBACK = false;

export const REALTIME_FETCH_TIMEOUT_MS = 25_000;

/**
 * GTFS-RT header timestamp older than this is treated as stale and its
 * predictions discarded. Feeds publish absolute future arrival times, so we
 * allow a generous window — a header that lags a couple of minutes still
 * carries valid upcoming departures and shouldn't blank the countdown.
 */
export const REALTIME_STALE_AFTER_SEC = 300;

export const GTFS_TIMEZONE = 'America/Toronto';
