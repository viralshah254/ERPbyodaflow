import { fetchSavedExchangeRateApi } from "@/lib/api/financial-settings";
import { isApiConfigured } from "@/lib/api/client";

export interface LiveRateResult {
  from: string;
  to: string;
  rate: number;
  fetchedAt: string;
  source: "exchangerate-api" | "open.er-api";
}

export async function fetchLiveExchangeRate(from: string, to: string): Promise<LiveRateResult> {
  const sourceCurrency = from.toUpperCase();
  const targetCurrency = to.toUpperCase();
  if (sourceCurrency === targetCurrency) {
    return {
      from: sourceCurrency,
      to: targetCurrency,
      rate: 1,
      fetchedAt: new Date().toISOString(),
      source: "exchangerate-api",
    };
  }

  if (isApiConfigured()) {
    try {
      const saved = await fetchSavedExchangeRateApi({
        fromCurrency: sourceCurrency,
        toCurrency: targetCurrency,
      });
      return {
        from: saved.from,
        to: saved.to,
        rate: saved.rate,
        fetchedAt: saved.fetchedAt ?? new Date().toISOString(),
        source: "exchangerate-api",
      };
    } catch {
      // Backend may be misconfigured or temporarily failing; fall back to public FX feed.
    }
  }

  const response = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(sourceCurrency)}`);
  if (!response.ok) throw new Error("Unable to fetch live FX rate.");
  const json = (await response.json()) as { result?: string; rates?: Record<string, number>; time_last_update_utc?: string };
  const rate = json?.rates?.[targetCurrency];
  if (json?.result !== "success" || typeof rate !== "number") {
    throw new Error("Live FX provider did not return the requested pair.");
  }
  return {
    from: sourceCurrency,
    to: targetCurrency,
    rate,
    fetchedAt: json.time_last_update_utc ?? new Date().toISOString(),
    source: "open.er-api",
  };
}

