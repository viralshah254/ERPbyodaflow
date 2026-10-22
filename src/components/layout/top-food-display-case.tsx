"use client";

import { isTopFoodOrg } from "@/lib/org/top-food-display";
import { useAuthStore } from "@/stores/auth-store";
import { useLayoutEffect } from "react";

/** Top Food screens draw in capitals. Other organisations keep their own case. */
export function TopFoodDisplayCase() {
  const org = useAuthStore((s) => s.org);
  const caps = isTopFoodOrg(org);

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (caps) root.dataset.displayCase = "upper";
    else delete root.dataset.displayCase;
    return () => {
      delete root.dataset.displayCase;
    };
  }, [caps]);

  return null;
}
