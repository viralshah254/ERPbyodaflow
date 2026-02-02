/**
 * Mock financial settings — persistence via localStorage.
 */

import type { FinancialSettings } from "@/lib/org/financial-settings";
import { DEFAULT_FINANCIAL_SETTINGS } from "@/lib/org/financial-settings";

export const CURRENCY_META: Record<
  string,
  { name: string; symbol: string; decimals: number }
> = {
  KES: { name: "Kenyan Shilling", symbol: "KES", decimals: 2 },
  USD: { name: "US Dollar", symbol: "$", decimals: 2 },
  EUR: { name: "Euro", symbol: "€", decimals: 2 },
  GBP: { name: "British Pound", symbol: "£", decimals: 2 },
};

const STORAGE_KEY = "odaflow_financial_settings";

function load(): FinancialSettings {
  if (typeof window === "undefined") return DEFAULT_FINANCIAL_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FINANCIAL_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<FinancialSettings>;
    return { ...DEFAULT_FINANCIAL_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_FINANCIAL_SETTINGS;
  }
}

let cache: FinancialSettings | null = null;

export function getMockFinancialSettings(): FinancialSettings {
  if (cache) return cache;
  cache = load();
  return cache;
}

export function updateMockFinancialSettings(
  patch: Partial<FinancialSettings>
): FinancialSettings {
  const next = { ...getMockFinancialSettings(), ...patch };
  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}
