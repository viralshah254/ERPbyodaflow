"use client";

import * as React from "react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import type { TourDef } from "@/config/tutorial-tours";
import { useTutorialProgressStore } from "@/stores/tutorial-progress-store";
import { emitTutorialEvent } from "@/lib/api/tutorial-events";

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

    let lastStepReached = false;

    const driverObj = driver({
      showProgress: true,
      steps,
      onHighlighted: (_element, _step, index) => {
        if (index === steps.length - 1) lastStepReached = true;
      },
      onDestroyStarted: () => {
        driverObj.destroy();
      },
      onDestroyed: () => {
        markTourCompleted(tour.tourId);
        emitTutorialEvent({
          event: lastStepReached ? "tour_completed" : "tour_skipped",
          tourId: tour.tourId,
          page: tour.route,
        });
        onComplete?.();
      },
    });

    emitTutorialEvent({ event: "tour_started", tourId: tour.tourId, page: tour.route });
    driverObj.drive();
  }, [tour, markTourCompleted, onComplete]);

  return { startTour, hasCompleted: tour ? hasCompletedTour(tour.tourId) : false };
}
