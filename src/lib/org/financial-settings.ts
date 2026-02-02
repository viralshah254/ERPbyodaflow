/**
 * Financial settings model — types and minimal hook for Settings pages.
 * Does NOT refactor orgContext. Reads from mock.
 */

export type CurrencyCode = "KES" | "USD" | "EUR" | "GBP" | (string & Record<never, never>);

export type RoundingMode = "HALF_UP" | "HALF_EVEN";

export type RateSource = "MANUAL" | "API_STUB";

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
  rateSource: "MANUAL",
  allowForeignCurrencyDocs: true,
};
