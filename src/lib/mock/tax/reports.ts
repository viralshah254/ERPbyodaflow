/**
 * Mock VAT and WHT summary reports.
 */

export interface VatSummaryRow {
  period: string;
  output: number;
  input: number;
  net: number;
  currency: string;
}

export interface WhtSummaryRow {
  period: string;
  code: string;
  base: number;
  amount: number;
  currency: string;
}

export const MOCK_VAT_SUMMARY: VatSummaryRow[] = [
  { period: "2025-01", output: 256000, input: 128000, net: 128000, currency: "KES" },
  { period: "2024-12", output: 240000, input: 112000, net: 128000, currency: "KES" },
];

export const MOCK_WHT_SUMMARY: WhtSummaryRow[] = [
  { period: "2025-01", code: "WHT-5", base: 500000, amount: 25000, currency: "KES" },
  { period: "2025-01", code: "WHT-10", base: 100000, amount: 10000, currency: "KES" },
  { period: "2024-12", code: "WHT-5", base: 400000, amount: 20000, currency: "KES" },
];

export function getMockVatSummary(): VatSummaryRow[] {
  return [...MOCK_VAT_SUMMARY];
}

export function getMockWhtSummary(): WhtSummaryRow[] {
  return [...MOCK_WHT_SUMMARY];
}
