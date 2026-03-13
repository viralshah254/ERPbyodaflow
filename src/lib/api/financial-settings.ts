"use client";

import { apiRequest, isApiConfigured } from "@/lib/api/client";
import {
  CURRENCY_META,
  getMockFinancialSettings,
  updateMockFinancialSettings,
} from "@/lib/mock/financial-settings";
import {
  getMockExchangeRates,
  upsertMockExchangeRate,
} from "@/lib/mock/exchange-rates";
import {
  DEFAULT_FINANCIAL_SETTINGS,
  applyFinancialSettingsPatch,
  type FinancialSettings,
  type RateSource,
} from "@/lib/org/financial-settings";

export interface FinancialSettingsPayload extends FinancialSettings {
  providerConfigured: boolean;
  lastSyncedAt?: string;
}

export interface FinancialCurrencyRow {
  id: string;
  code: string;
  name: string;
  symbol?: string;
  enabled: boolean;
  isBaseCurrency: boolean;
}

export interface FinancialExchangeRateRow {
  id: string;
  date: string;
  from: string;
  to: string;
  rate: number;
  source: RateSource | string;
  provider?: string;
  fetchedAt?: string;
}

function buildMockCurrencyRows(settings: FinancialSettings): FinancialCurrencyRow[] {
  const allCodes = [
    ...new Set([
      ...Object.keys(CURRENCY_META),
      ...settings.enabledCurrencies,
      settings.baseCurrency,
    ]),
  ].sort();
  return allCodes.map((code) => ({
    id: code,
    code,
    name: CURRENCY_META[code]?.name ?? code,
    symbol: CURRENCY_META[code]?.symbol,
    enabled: settings.enabledCurrencies.includes(code),
    isBaseCurrency: settings.baseCurrency === code,
  }));
}

export async function fetchFinancialSettingsApi(): Promise<FinancialSettingsPayload> {
  if (!isApiConfigured()) {
    return {
      ...getMockFinancialSettings(),
      providerConfigured: false,
    };
  }
  return apiRequest<FinancialSettingsPayload>("/api/settings/financial");
}

export async function updateFinancialSettingsApi(
  patch: Partial<FinancialSettings>
): Promise<FinancialSettingsPayload> {
  if (!isApiConfigured()) {
    return {
      ...updateMockFinancialSettings(patch),
      providerConfigured: false,
    };
  }
  return apiRequest<FinancialSettingsPayload>("/api/settings/financial", {
    method: "PATCH",
    body: patch,
  });
}

export async function fetchFinancialCurrenciesApi(): Promise<FinancialCurrencyRow[]> {
  if (!isApiConfigured()) {
    return buildMockCurrencyRows(getMockFinancialSettings());
  }
  const payload = await apiRequest<{ items: FinancialCurrencyRow[] }>("/api/settings/financial/currencies");
  return payload.items ?? [];
}

export async function createFinancialCurrencyApi(input: {
  code: string;
  name?: string;
  symbol?: string;
}): Promise<FinancialCurrencyRow> {
  if (!isApiConfigured()) {
    const settings = updateMockFinancialSettings({
      enabledCurrencies: [...new Set([...getMockFinancialSettings().enabledCurrencies, input.code.trim().toUpperCase()])],
    });
    return buildMockCurrencyRows(settings).find((row) => row.code === input.code.trim().toUpperCase()) ?? {
      id: input.code.trim().toUpperCase(),
      code: input.code.trim().toUpperCase(),
      name: input.name?.trim() || input.code.trim().toUpperCase(),
      symbol: input.symbol?.trim(),
      enabled: true,
      isBaseCurrency: settings.baseCurrency === input.code.trim().toUpperCase(),
    };
  }
  return apiRequest<FinancialCurrencyRow>("/api/settings/financial/currencies", {
    method: "POST",
    body: input,
  });
}

export async function fetchFinancialExchangeRatesApi(filters?: {
  date?: string;
  fromCurrency?: string;
  toCurrency?: string;
  limit?: number;
}): Promise<FinancialExchangeRateRow[]> {
  if (!isApiConfigured()) {
    return getMockExchangeRates({ date: filters?.date });
  }
  const params = new URLSearchParams();
  if (filters?.date) params.set("date", filters.date);
  if (filters?.fromCurrency) params.set("fromCurrency", filters.fromCurrency);
  if (filters?.toCurrency) params.set("toCurrency", filters.toCurrency);
  if (filters?.limit != null) params.set("limit", String(filters.limit));
  const payload = await apiRequest<{ items: FinancialExchangeRateRow[] }>("/api/settings/financial/exchange-rates", { params });
  return payload.items ?? [];
}

export async function saveFinancialExchangeRateApi(input: {
  date: string;
  from: string;
  to: string;
  rate: number;
}): Promise<void> {
  if (!isApiConfigured()) {
    upsertMockExchangeRate({
      date: input.date,
      from: input.from.toUpperCase(),
      to: input.to.toUpperCase(),
      rate: input.rate,
      source: "MANUAL",
    });
    return;
  }
  await apiRequest("/api/settings/financial/exchange-rates", {
    method: "POST",
    body: input,
  });
}

export async function syncFinancialExchangeRatesApi(): Promise<{
  date: string;
  fetchedAt: string;
  saved: number;
}> {
  if (!isApiConfigured()) {
    return {
      date: new Date().toISOString().slice(0, 10),
      fetchedAt: new Date().toISOString(),
      saved: 0,
    };
  }
  return apiRequest<{ date: string; fetchedAt: string; saved: number }>(
    "/api/settings/financial/exchange-rates/sync",
    { method: "POST" }
  );
}

export async function fetchSavedExchangeRateApi(input: {
  fromCurrency: string;
  toCurrency: string;
  date?: string;
}): Promise<FinancialExchangeRateRow> {
  if (!isApiConfigured()) {
    const sameCurrency = input.fromCurrency.trim().toUpperCase() === input.toCurrency.trim().toUpperCase();
    if (sameCurrency) {
      return {
        id: `${input.fromCurrency}_${input.toCurrency}`,
        date: input.date ?? new Date().toISOString().slice(0, 10),
        from: input.fromCurrency.trim().toUpperCase(),
        to: input.toCurrency.trim().toUpperCase(),
        rate: 1,
        source: "MANUAL",
      };
    }
    const rate = getMockExchangeRates({ date: input.date }).find(
      (row) =>
        row.from === input.fromCurrency.trim().toUpperCase() &&
        row.to === input.toCurrency.trim().toUpperCase()
    );
    if (rate) return rate;
    throw new Error("Exchange rate not found");
  }
  const params = new URLSearchParams({
    fromCurrency: input.fromCurrency,
    toCurrency: input.toCurrency,
  });
  if (input.date) params.set("date", input.date);
  return apiRequest<FinancialExchangeRateRow>("/api/settings/financial/exchange-rate", { params });
}

export function getInitialFinancialSettings(): FinancialSettings {
  return isApiConfigured() ? DEFAULT_FINANCIAL_SETTINGS : getMockFinancialSettings();
}

export function applyLocalFinancialPatch(
  current: FinancialSettings,
  patch: Partial<FinancialSettings>
): FinancialSettings {
  return applyFinancialSettingsPatch(current, patch);
}
