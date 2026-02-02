/**
 * Mock cycle count data for /warehouse/cycle-counts.
 */

export type CycleCountStatus = "OPEN" | "IN_PROGRESS" | "REVIEW" | "POSTED";

export interface CycleCountLineRow {
  id: string;
  sku: string;
  productName: string;
  binCode?: string;
  systemQty: number;
  countedQty: number;
  variance: number;
  unit?: string;
}

export interface CycleCountSessionRow {
  id: string;
  number: string;
  warehouse: string;
  scope: "bin" | "category" | "full";
  scopeDetail?: string;
  status: CycleCountStatus;
  countedAt?: string;
  lines: CycleCountLineRow[];
}

export const MOCK_CYCLE_COUNTS: CycleCountSessionRow[] = [
  {
    id: "1",
    number: "CC-2025-001",
    warehouse: "WH-Main",
    scope: "bin",
    scopeDetail: "Zone A",
    status: "REVIEW",
    countedAt: "2025-01-28T08:00:00Z",
    lines: [
      { id: "ccl1", sku: "SKU-001", productName: "Product Alpha", binCode: "WH-Main-A-01-01", systemQty: 150, countedQty: 148, variance: -2, unit: "pcs" },
      { id: "ccl2", sku: "SKU-002", productName: "Product Beta", binCode: "WH-Main-A-01-02", systemQty: 75, countedQty: 75, variance: 0, unit: "pcs" },
    ],
  },
  {
    id: "2",
    number: "CC-2025-002",
    warehouse: "WH-Main",
    scope: "category",
    scopeDetail: "Category A",
    status: "OPEN",
    lines: [],
  },
];

export function getMockCycleCounts(): CycleCountSessionRow[] {
  return [...MOCK_CYCLE_COUNTS];
}
