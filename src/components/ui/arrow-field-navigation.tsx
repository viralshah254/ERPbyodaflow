"use client";

import { useEffect } from "react";
import { arrowNavBlocked, focusArrowField, isArrowNavInput, nextArrowField } from "@/lib/ui/arrow-field-navigation";

/** Up and Down move between editable fields. Scrolling stays on the scrollbar. */
export function ArrowFieldNavigation() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (document.querySelector("[data-radix-select-content]")) return;
      const target = event.target;
      if (!isArrowNavInput(target) || arrowNavBlocked(target)) return;
      const next = nextArrowField(target, event.key === "ArrowDown" ? 1 : -1);
      if (!next) return;
      event.preventDefault();
      focusArrowField(next);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  return null;
}
