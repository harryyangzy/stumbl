import { DEFAULT_TRANSIT_AGENCY } from '@/lib/transitAgencies';
import type { OnboardingDraft } from '@/store/commuteStore';
import type { SavedCommute } from '@/types/commute';

/** Convert an in-progress onboarding draft into a saved commute when complete. */
export function draftToSaved(d: OnboardingDraft): SavedCommute | null {
  if (
    !d.stopId ||
    !d.stopName ||
    d.stopLat === undefined ||
    d.stopLon === undefined ||
    !d.routeId ||
    !d.routeShortName ||
    d.walkingMinutes === undefined ||
    d.bufferMinutes === undefined
  ) {
    return null;
  }
  return {
    agencyId: d.agencyId ?? DEFAULT_TRANSIT_AGENCY,
    stopId: d.stopId,
    stopName: d.stopName,
    stopLat: d.stopLat,
    stopLon: d.stopLon,
    routeId: d.routeId,
    routeShortName: d.routeShortName,
    headsign: d.headsign ?? null,
    walkingMinutes: d.walkingMinutes,
    bufferMinutes: d.bufferMinutes,
  };
}

/**
 * Commute that should drive the in-app preview and countdown UI.
 * Prefers a complete draft during onboarding/editing; falls back to saved commute.
 */
export function getActiveCommute(
  draft: OnboardingDraft,
  savedCommute: SavedCommute | null
): SavedCommute | null {
  return draftToSaved(draft) ?? savedCommute;
}
