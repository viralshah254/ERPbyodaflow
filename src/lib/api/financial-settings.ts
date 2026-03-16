"use client";

import { apiRequest, requireLiveApi } from "@/lib/api/client";
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

export async function fetchFinancialSettingsApi(): Promise<FinancialSettingsPayload> {
  requireLiveApi("Financial settings");
  return apiRequest<FinancialSettingsPayload>("/api/settings/financial");
}

export async function updateFinancialSettingsApi(
  patch: Partial<FinancialSettings>
): Promise<FinancialSettingsPayload> {
  requireLiveApi("Update financial settings");
  return apiRequest<FinancialSettingsPayload>("/api/settings/financial", {
    method: "PATCH",
    body: patch,
  });
}

export async function fetchFinancialCurrenciesApi(): Promise<FinancialCurrencyRow[]> {
  requireLiveApi("Financial currencies");
  const payload = await apiRequest<{ items: FinancialCurrencyRow[] }>("/api/settings/financial/currencies");
  return payload.items ?? [];
}

export async function createFinancialCurrencyApi(input: {
  code: string;
  name?: string;
  symbol?: string;
}): Promise<FinancialCurrencyRow> {
  requireLiveApi("Create financial currency");
  return apiRequest<FinancialCurrencyRow>("/api/settings/financial/currencies", {
    method: "POST",
    body: input,
  });
}

export interface SupportedCurrencyRow {
  code: string;
  name: string;
}

export async function fetchSupportedCurrenciesApi(): Promise<{
  items: SupportedCurrencyRow[];
  fromApi: boolean;
}> {
  requireLiveApi("Supported currencies");
  return apiRequest<{ items: SupportedCurrencyRow[]; fromApi: boolean }>(
    "/api/settings/financial/currencies/supported-codes"
  );
}

export async function fetchFinancialExchangeRatesApi(filters?: {
  date?: string;
  fromCurrency?: string;
  toCurrency?: string;
  limit?: number;
}): Promise<FinancialExchangeRateRow[]> {
  requireLiveApi("Financial exchange rates");
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
  requireLiveApi("Save financial exchange rate");
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
  requireLiveApi("Sync financial exchange rates");
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
  requireLiveApi("Saved exchange rate");
  const params = new URLSearchParams({
    fromCurrency: input.fromCurrency,
    toCurrency: input.toCurrency,
  });
  if (input.date) params.set("date", input.date);
  return apiRequest<FinancialExchangeRateRow>("/api/settings/financial/exchange-rate", { params });
}

export function getInitialFinancialSettings(): FinancialSettings {
  return DEFAULT_FINANCIAL_SETTINGS;
}

export function applyLocalFinancialPatch(
  current: FinancialSettings,
  patch: Partial<FinancialSettings>
): FinancialSettings {
  return applyFinancialSettingsPatch(current, patch);
}
