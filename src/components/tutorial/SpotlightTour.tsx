"use client";

import * as React from "react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import type { TourDef } from "@/config/tutorial-tours";
import { useTutorialProgressStore } from "@/stores/tutorial-progress-store";

export interface SpotlightTourProps {
  tour: TourDef | null;
  onComplete?: () => void;
}

/**
 * Starts a spotlight tour when tour is provided and startTour() is called.
 * Call startTour() from a button click. On complete, marks the tour as completed.
 */
export function useSpotlightTour(tour: TourDef | null, onComplete?: () => void) {
  const markTourCompleted = useTutorialProgressStore((s) => s.markTourCompleted);
  const hasCompletedTour = useTutorialProgressStore((s) => s.hasCompletedTour);

  const startTour = React.useCallback(() => {
    if (!tour || tour.steps.length === 0) return;

    const steps: DriveStep[] = tour.steps.map((s) => ({
      element: s.element,
      popover: {
        title: s.title,
        description: s.description,
      },
    }));

    const driverObj = driver({
      showProgress: true,
      steps,
      onDestroyStarted: () => {
        driverObj.destroy();
        markTourCompleted(tour.tourId);
        onComplete?.();
      },
      onDestroyed: () => {
        markTourCompleted(tour.tourId);
        onComplete?.();
      },
    });

    driverObj.drive();
  }, [tour, markTourCompleted, onComplete]);

  return { startTour, hasCompleted: tour ? hasCompletedTour(tour.tourId) : false };
}
