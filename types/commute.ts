export type SavedCommute = {
  stopId: string;
  stopName: string;
  stopLat: number;
  stopLon: number;
  routeId: string;
  routeShortName: string;
  headsign: string | null;
  /** May be fractional (seconds/60) when set via 20s time ruler. */
  walkingMinutes: number;
  bufferMinutes: number;
};
