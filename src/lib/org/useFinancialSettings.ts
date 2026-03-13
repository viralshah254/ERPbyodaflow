"use client";

import { useState, useCallback, useEffect } from "react";
import {
  fetchFinancialSettingsApi,
  getInitialFinancialSettings,
  updateFinancialSettingsApi,
  applyLocalFinancialPatch,
} from "@/lib/api/financial-settings";
import type { FinancialSettings } from "./financial-settings";

/** Minimal getter + updater hook for financial settings. Used by Settings pages. */
export function useFinancialSettings() {
  const [settings, setSettings] = useState<FinancialSettings>(() => getInitialFinancialSettings());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchFinancialSettingsApi()
      .then((next) => {
        if (!cancelled) {
          setSettings(next);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback(async (patch: Partial<FinancialSettings>) => {
    const previous = settings;
    const optimistic = applyLocalFinancialPatch(previous, patch);
    setSettings(optimistic);
    try {
      const next = await updateFinancialSettingsApi(patch);
      setSettings(next);
      return next;
    } catch (error) {
      setSettings(previous);
      throw error;
    }
  }, [settings]);

  return { settings, update, loading };
}
