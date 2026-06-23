import type { TransitAgencyId } from '@/lib/transitAgencies';

export type SavedCommute = {
  /** Omitted on commutes saved before multi-city support — treated as GRT. */
  agencyId?: TransitAgencyId;
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
