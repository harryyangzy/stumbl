export type SavedCommute = {
  stopId: string;
  stopName: string;
  stopLat: number;
  stopLon: number;
  routeId: string;
  routeShortName: string;
  headsign: string | null;
  walkingMinutes: number;
  bufferMinutes: number;
};
