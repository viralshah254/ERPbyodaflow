/**
 * Mock yield and mass balance (Cool Catch: per-batch input/output/loss).
 * See BACKEND_SPEC_COOL_CATCH.md §2.8, §3.9.
 */

export type YieldLineType = "PRIMARY" | "SECONDARY" | "WASTE";

export interface YieldLineRow {
  id: string;
  skuId: string;
  skuCode: string;
  productName: string;
  type: YieldLineType;
  quantityKg: number;
  uom: string;
}

export interface YieldRecordRow {
  id: string;
  workOrderId?: string;
  workOrderNumber?: string;
  subcontractOrderId?: string;
  batchId?: string;
  recordedAt: string;
  inputWeightKg: number;
  outputPrimaryKg: number;
  outputSecondaryKg: number;
  wasteKg: number;
  yieldPercent?: number;
  lines: YieldLineRow[];
}

export const MOCK_YIELD_RECORDS: YieldRecordRow[] = [
  {
    id: "y1",
    workOrderId: "wo1",
    workOrderNumber: "WO-001",
    recordedAt: "2025-01-18T16:00:00",
    inputWeightKg: 500,
    outputPrimaryKg: 420,
    outputSecondaryKg: 55,
    wasteKg: 25,
    yieldPercent: 84,
    lines: [
      { id: "yl1", skuId: "s1", skuCode: "FILLET-001", productName: "Fillet (primary)", type: "PRIMARY", quantityKg: 420, uom: "kg" },
      { id: "yl2", skuId: "s2", skuCode: "BYPROD-001", productName: "By-product", type: "SECONDARY", quantityKg: 55, uom: "kg" },
      { id: "yl3", skuId: "s3", skuCode: "WASTE", productName: "Waste", type: "WASTE", quantityKg: 25, uom: "kg" },
    ],
  },
  {
    id: "y2",
    subcontractOrderId: "sub1",
    recordedAt: "2025-01-19T10:00:00",
    inputWeightKg: 300,
    outputPrimaryKg: 255,
    outputSecondaryKg: 32,
    wasteKg: 13,
    yieldPercent: 85,
    lines: [
      { id: "yl1", skuId: "s1", skuCode: "GUTTED-001", productName: "Gutted fish (primary)", type: "PRIMARY", quantityKg: 255, uom: "kg" },
      { id: "yl2", skuId: "s2", skuCode: "BYPROD-002", productName: "Offal", type: "SECONDARY", quantityKg: 32, uom: "kg" },
      { id: "yl3", skuId: "s3", skuCode: "WASTE", productName: "Waste", type: "WASTE", quantityKg: 13, uom: "kg" },
    ],
  },
];

/** Mass balance summary row for report. */
export interface MassBalanceSummaryRow {
  id: string;
  period: string;
  workOrderNumber?: string;
  inputWeightKg: number;
  outputPrimaryKg: number;
  outputSecondaryKg: number;
  wasteKg: number;
  yieldPercent: number;
  varianceVsBom?: number; // % difference vs expected BOM yield
}

export const MOCK_MASS_BALANCE_SUMMARY: MassBalanceSummaryRow[] = [
  { id: "mb1", period: "Jan 2025", workOrderNumber: "WO-001", inputWeightKg: 500, outputPrimaryKg: 420, outputSecondaryKg: 55, wasteKg: 25, yieldPercent: 84, varianceVsBom: -1 },
  { id: "mb2", period: "Jan 2025", inputWeightKg: 800, outputPrimaryKg: 675, outputSecondaryKg: 87, wasteKg: 38, yieldPercent: 84.4, varianceVsBom: 0.4 },
];

export function getMockYieldRecords(params?: { workOrderId?: string; dateFrom?: string; dateTo?: string }): YieldRecordRow[] {
  let out = MOCK_YIELD_RECORDS.map((r) => ({ ...r, lines: [...r.lines] }));
  if (params?.workOrderId) out = out.filter((r) => r.workOrderId === params.workOrderId);
  return out;
}

export function getMockYieldById(id: string): YieldRecordRow | null {
  const r = MOCK_YIELD_RECORDS.find((x) => x.id === id);
  return r ? { ...r, lines: [...r.lines] } : null;
}

export function getMockMassBalanceReport(params?: { period?: string }): MassBalanceSummaryRow[] {
  return [...MOCK_MASS_BALANCE_SUMMARY];
}
