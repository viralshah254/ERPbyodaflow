"use client";

import { useEffect } from "react";
import { applyAccessibilityEffects, clearAccessibilityEffects } from "@/lib/accessibility/apply-effects";
import { useAccessibilityStore } from "@/stores/accessibility-store";
import { SkipToMainLink } from "./SkipToMainLink";

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const tools = useAccessibilityStore((s) => s.tools);
  const screenReader = tools.screenReader;
  const hydrated = useAccessibilityStore((s) => s.hydrated);
  const hydrate = useAccessibilityStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    clearAccessibilityEffects();
    applyAccessibilityEffects({ tools });
  }, [tools, hydrated]);

  return (
    <>
      {screenReader ? <SkipToMainLink /> : null}
      {children}
    </>
  );
}
