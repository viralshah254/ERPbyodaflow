"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTutorialProgressStore } from "@/stores/tutorial-progress-store";

/**
 * Marks the current page as visited after a short delay.
 * Used for progress tracking ("You've explored X of Y modules").
 * Does not affect FirstVisitBanner visibility (that uses dismissedHints).
 */
export function TutorialProgressTracker() {
  const pathname = usePathname();
  const markPageVisited = useTutorialProgressStore((s) => s.markPageVisited);

  useEffect(() => {
    if (!pathname) return;
    const normalized = pathname.replace(/\/$/, "") || "/";
    const t = setTimeout(() => {
      markPageVisited(normalized);
    }, 2000);
    return () => clearTimeout(t);
  }, [pathname, markPageVisited]);

  return null;
}
