/**
 * Mock inventory costing for /inventory/costing and /settings/inventory/costing.
 */

export type CostingMethod = "FIFO" | "WEIGHTED_AVERAGE" | "STANDARD_COST";

export interface ValuationSummaryRow {
  id: string;
  warehouse: string;
  category?: string;
  skuCount: number;
  totalQty: number;
  totalValue: number;
  currency: string;
}

export interface CostingSettings {
  method: CostingMethod;
  valuationAccountId?: string;
  valuationAccountCode?: string;
}

export const MOCK_VALUATION_SUMMARY: ValuationSummaryRow[] = [
  { id: "1", warehouse: "WH-Main", category: "Category A", skuCount: 2, totalQty: 270, totalValue: 125000, currency: "KES" },
  { id: "2", warehouse: "WH-Main", category: "Category B", skuCount: 1, totalQty: 75, totalValue: 45000, currency: "KES" },
  { id: "3", warehouse: "WH-East", skuCount: 2, totalQty: 60, totalValue: 32000, currency: "KES" },
];

export const DEFAULT_COSTING_SETTINGS: CostingSettings = {
  method: "FIFO",
  valuationAccountId: "3",
  valuationAccountCode: "1110",
};

export function getMockValuationSummary(filters?: { warehouse?: string }): ValuationSummaryRow[] {
  let out = [...MOCK_VALUATION_SUMMARY];
  if (filters?.warehouse) out = out.filter((r) => r.warehouse === filters.warehouse);
  return out;
}

export function getCostingSettings(): CostingSettings {
  return { ...DEFAULT_COSTING_SETTINGS };
}
