/**
 * Financial settings model — types and minimal hook for Settings pages.
 * Does NOT refactor orgContext. Reads from mock.
 */

export type CurrencyCode = "KES" | "USD" | "EUR" | "GBP" | (string & Record<never, never>);

export type RoundingMode = "HALF_UP" | "HALF_EVEN";

export type RateSource = "MANUAL" | "API_STUB" | "CSV_IMPORT" | "EXCHANGERATE_API_FREE";

export interface FinancialSettings {
  baseCurrency: CurrencyCode;
  enabledCurrencies: CurrencyCode[];
  roundingMode: RoundingMode;
  rateSource: RateSource;
  allowForeignCurrencyDocs: boolean;
}

export const DEFAULT_FINANCIAL_SETTINGS: FinancialSettings = {
  baseCurrency: "KES",
  enabledCurrencies: ["KES", "USD"],
  roundingMode: "HALF_UP",
  rateSource: "EXCHANGERATE_API_FREE",
  allowForeignCurrencyDocs: true,
};

export function applyFinancialSettingsPatch(
  current: FinancialSettings,
  patch: Partial<FinancialSettings>
): FinancialSettings {
  const baseCurrency = (patch.baseCurrency ?? current.baseCurrency).trim().toUpperCase();
  const enabledCurrencies = [
    ...new Set(
      [baseCurrency, ...(patch.enabledCurrencies ?? current.enabledCurrencies)]
        .map((currency) => currency.trim().toUpperCase())
        .filter(Boolean)
    ),
  ];
  return {
    ...current,
    ...patch,
    baseCurrency,
    enabledCurrencies,
  };
}
