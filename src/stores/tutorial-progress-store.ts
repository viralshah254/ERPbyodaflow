"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

const STORAGE_KEY = "erp-tutorial-progress";

interface TutorialProgressState {
  visitedPages: Record<string, boolean>;
  completedTours: string[];
  dismissedHints: Record<string, boolean>;
  markPageVisited: (pathname: string) => void;
  hasCompletedTour: (tourId: string) => boolean;
  markTourCompleted: (tourId: string) => void;
  isHintDismissed: (key: string) => boolean;
  dismissHint: (key: string) => void;
  reset: () => void;
}

const initialState: Pick<TutorialProgressState, "visitedPages" | "completedTours" | "dismissedHints"> = {
  visitedPages: {},
  completedTours: [],
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
      isHintDismissed: (key: string): boolean =>
        !!get().dismissedHints[key],
      dismissHint: (key: string) =>
        set((state) => ({
          dismissedHints: { ...state.dismissedHints, [key]: true },
        })),
      reset: () => set({ visitedPages: {}, completedTours: [], dismissedHints: {} }),
    }),
    { name: STORAGE_KEY }
  )
);
