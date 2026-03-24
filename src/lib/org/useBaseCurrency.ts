"use client";

import { useFinancialSettings } from "./useFinancialSettings";
import { DEFAULT_FINANCIAL_SETTINGS } from "./financial-settings";

/**
 * Organization base / reporting currency from Settings → Financial (e.g. KES, UGX).
 * Use for GL, statements, finance dashboards, and converting foreign amounts to base.
 */
export function useBaseCurrency(): string {
  const { settings } = useFinancialSettings();
  return (settings.baseCurrency || DEFAULT_FINANCIAL_SETTINGS.baseCurrency).toUpperCase();
}
