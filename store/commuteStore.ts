import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DEFAULT_TRANSIT_AGENCY } from '@/lib/transitAgencies';
import type { TransitAgencyId } from '@/lib/transitAgencies';
import { draftToSaved } from '@/lib/activeCommute';
import type { SavedCommute } from '@/types/commute';

export type OnboardingDraft = {
  agencyId?: TransitAgencyId;
  stopId?: string;
  stopName?: string;
  stopLat?: number;
  stopLon?: number;
  routeId?: string;
  routeShortName?: string;
  headsign?: string | null;
  /** Selected route on line screen; kept in sync with routeId for save/countdown. */
  selectedRouteIds?: string[];
  walkingMinutes?: number;
  bufferMinutes?: number;
};

type CommuteState = {
  savedCommute: SavedCommute | null;
  onboardingComplete: boolean;
  /**
   * False until `persist` finishes reading AsyncStorage. Guards against pushing a
   * transient null `savedCommute` (the "setup" state) to the Home Screen widget
   * before the saved commute has rehydrated on cold launch.
   */
  hasHydrated: boolean;
  draft: OnboardingDraft;
  setDraft: (patch: Partial<OnboardingDraft>) => void;
  resetDraft: () => void;
  beginEditSetup: () => void;
  saveCommute: (c: SavedCommute) => void;
  /** Persist the current draft when editing from the widget preview. */
  commitDraft: () => void;
  clearSaved: () => void;
};

export const useCommuteStore = create<CommuteState>()(
  persist(
    (set, get) => ({
      savedCommute: null,
      onboardingComplete: false,
      hasHydrated: false,
      draft: {},
      setDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
      resetDraft: () => set({ draft: {} }),
      beginEditSetup: () => {
        const c = get().savedCommute;
        if (!c) return;
        set({
          draft: {
            agencyId: c.agencyId ?? DEFAULT_TRANSIT_AGENCY,
            stopId: c.stopId,
            stopName: c.stopName,
            stopLat: c.stopLat,
            stopLon: c.stopLon,
            routeId: c.routeId,
            routeShortName: c.routeShortName,
            headsign: c.headsign,
            selectedRouteIds: [c.routeId],
            walkingMinutes: c.walkingMinutes,
            bufferMinutes: c.bufferMinutes,
          },
        });
      },
      saveCommute: (c) => set({ savedCommute: c, onboardingComplete: true, draft: {} }),
      commitDraft: () => {
        const saved = draftToSaved(get().draft);
        if (saved) set({ savedCommute: saved, onboardingComplete: true, draft: {} });
      },
      clearSaved: () => set({ savedCommute: null, onboardingComplete: false, draft: {} }),
    }),
    {
      name: 'stumbl-commute-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        savedCommute: s.savedCommute,
        onboardingComplete: s.onboardingComplete,
      }),
      /** Runs after the read attempt (even on empty/error) so the widget refresh can unblock. */
      onRehydrateStorage: () => () => {
        useCommuteStore.setState({ hasHydrated: true });
      },
    }
  )
);
