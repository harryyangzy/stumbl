import type { TransitAgencyId } from '@/lib/transitAgencies';

/** One line the commute tracks at its stop. */
export type CommuteRoute = {
  routeId: string;
  routeShortName: string;
  headsign: string | null;
};

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
  /**
   * Every selected line (primary first). The countdown follows whichever of these
   * leaves soonest. Omitted on commutes saved before multi-line support — the
   * primary `routeId` fields are then the only line.
   */
  routes?: CommuteRoute[];
  /** May be fractional (seconds/60) when set via 20s time ruler. */
  walkingMinutes: number;
  bufferMinutes: number;
};
