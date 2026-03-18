"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

const STORAGE_KEY = "erp-tutorial-progress";

interface TutorialProgressState {
  visitedPages: Record<string, boolean>;
  completedTours: string[];
  dismissedTours: Record<string, boolean>;
  dismissedHints: Record<string, boolean>;
  markPageVisited: (pathname: string) => void;
  hasCompletedTour: (tourId: string) => boolean;
  markTourCompleted: (tourId: string) => void;
  isTourDismissed: (tourId: string) => boolean;
  dismissTour: (tourId: string) => void;
  isHintDismissed: (key: string) => boolean;
  dismissHint: (key: string) => void;
  reset: () => void;
}

const initialState: Pick<TutorialProgressState, "visitedPages" | "completedTours" | "dismissedTours" | "dismissedHints"> = {
  visitedPages: {},
  completedTours: [],
  dismissedTours: {},
  dismissedHints: {},
};

export const useTutorialProgressStore = create<TutorialProgressState>()(
  persist(
    (set, get) => ({
      ...initialState,
      markPageVisited: (pathname) =>
        set((state) => ({
          visitedPages: { ...state.visitedPages, [pathname]: true },
        })),
      hasCompletedTour: (tourId: string): boolean =>
        get().completedTours.includes(tourId),
      markTourCompleted: (tourId: string) =>
        set((state) => ({
          completedTours: state.completedTours.includes(tourId)
            ? state.completedTours
            : [...state.completedTours, tourId],
        })),
      isTourDismissed: (tourId: string): boolean =>
        !!(get().dismissedTours ?? {})[tourId],
      dismissTour: (tourId: string) =>
        set((state) => ({
          dismissedTours: { ...(state.dismissedTours ?? {}), [tourId]: true },
        })),
      isHintDismissed: (key: string): boolean =>
        !!get().dismissedHints[key],
      dismissHint: (key: string) =>
        set((state) => ({
          dismissedHints: { ...state.dismissedHints, [key]: true },
        })),
      reset: () => set({ visitedPages: {}, completedTours: [], dismissedTours: {}, dismissedHints: {} }),
    }),
    {
      name: STORAGE_KEY,
      partialize: (s) => ({
        visitedPages: s.visitedPages,
        completedTours: s.completedTours,
        dismissedTours: s.dismissedTours ?? {},
        dismissedHints: s.dismissedHints,
      }),
    }
  )
);
