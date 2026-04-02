import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { SavedCommute } from '@/types/commute';

export type OnboardingDraft = {
  stopId?: string;
  stopName?: string;
  stopLat?: number;
  stopLon?: number;
  routeId?: string;
  routeShortName?: string;
  headsign?: string | null;
  walkingMinutes?: number;
  bufferMinutes?: number;
};

type CommuteState = {
  savedCommute: SavedCommute | null;
  onboardingComplete: boolean;
  draft: OnboardingDraft;
  setDraft: (patch: Partial<OnboardingDraft>) => void;
  resetDraft: () => void;
  beginEditSetup: () => void;
  saveCommute: (c: SavedCommute) => void;
  clearSaved: () => void;
};

export const useCommuteStore = create<CommuteState>()(
  persist(
    (set, get) => ({
      savedCommute: null,
      onboardingComplete: false,
      draft: {},
      setDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
      resetDraft: () => set({ draft: {} }),
      beginEditSetup: () => {
        const c = get().savedCommute;
        if (!c) return;
        set({
          draft: {
            stopId: c.stopId,
            stopName: c.stopName,
            stopLat: c.stopLat,
            stopLon: c.stopLon,
            routeId: c.routeId,
            routeShortName: c.routeShortName,
            headsign: c.headsign,
            walkingMinutes: c.walkingMinutes,
            bufferMinutes: c.bufferMinutes,
          },
        });
      },
      saveCommute: (c) => set({ savedCommute: c, onboardingComplete: true, draft: {} }),
      clearSaved: () => set({ savedCommute: null, onboardingComplete: false, draft: {} }),
    }),
    {
      name: 'stumbl-commute-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        savedCommute: s.savedCommute,
        onboardingComplete: s.onboardingComplete,
      }),
    }
  )
);
