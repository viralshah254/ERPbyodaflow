"use client";

import { useState, useCallback } from "react";
import {
  getMockFinancialSettings,
  updateMockFinancialSettings,
} from "@/lib/mock/financial-settings";
import type { FinancialSettings } from "./financial-settings";

/** Minimal getter + updater hook for financial settings. Used by Settings pages. */
export function useFinancialSettings() {
  const [settings, setSettings] = useState<FinancialSettings>(
    () => getMockFinancialSettings()
  );
  const update = useCallback((patch: Partial<FinancialSettings>) => {
    const next = updateMockFinancialSettings(patch);
    setSettings(next);
    return next;
  }, []);
  return { settings, update };
}
