import { DEFAULT_TRANSIT_AGENCY, type TransitAgencyId } from '@/lib/transitAgencies';
import { useCommuteStore } from '@/store/commuteStore';

/** Active agency for onboarding draft, saved commute, or default. */
export function useTransitAgencyId(): TransitAgencyId {
  const draftAgency = useCommuteStore((s) => s.draft.agencyId);
  const savedAgency = useCommuteStore((s) => s.savedCommute?.agencyId);
  return draftAgency ?? savedAgency ?? DEFAULT_TRANSIT_AGENCY;
}
