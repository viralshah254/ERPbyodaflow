import {
  getMockYieldRecords,
  type MassBalanceSummaryRow,
  type YieldRecordRow,
} from "@/lib/mock/manufacturing/yield";
import { appendStoredItem, loadStoredValue } from "@/lib/data/persisted-store";

const KEY = "odaflow_yield_records";

function seedYieldRecords(): YieldRecordRow[] {
  return getMockYieldRecords().map((row) => ({
    ...row,
    lines: row.lines.map((line) => ({ ...line })),
  }));
}

export function listYieldRecords(): YieldRecordRow[] {
  return loadStoredValue(KEY, seedYieldRecords).map((row) => ({
    ...row,
    lines: row.lines.map((line) => ({ ...line })),
  }));
}

export function getYieldRecordById(id: string): YieldRecordRow | null {
  return listYieldRecords().find((row) => row.id === id) ?? null;
}

export function createYieldRecordEntry(body: {
  workOrderId?: string;
  subcontractOrderId?: string;
  inputWeightKg: number;
  lines: { skuId: string; type: "PRIMARY" | "SECONDARY" | "WASTE"; quantityKg: number }[];
}): YieldRecordRow {
  const id = `yield-${Date.now()}`;
  const primary = body.lines.filter((line) => line.type === "PRIMARY").reduce((sum, line) => sum + line.quantityKg, 0);
  const secondary = body.lines.filter((line) => line.type === "SECONDARY").reduce((sum, line) => sum + line.quantityKg, 0);
  const waste = body.lines.filter((line) => line.type === "WASTE").reduce((sum, line) => sum + line.quantityKg, 0);
  const created: YieldRecordRow = {
    id,
    workOrderId: body.workOrderId,
    workOrderNumber: body.workOrderId,
    subcontractOrderId: body.subcontractOrderId,
    recordedAt: new Date().toISOString(),
    inputWeightKg: body.inputWeightKg,
    outputPrimaryKg: primary,
    outputSecondaryKg: secondary,
    wasteKg: waste,
    yieldPercent: Number((((primary + secondary) / Math.max(1, body.inputWeightKg)) * 100).toFixed(1)),
    lines: body.lines.map((line, index) => ({
      id: `${id}-line-${index}`,
      skuId: line.skuId,
      skuCode: line.skuId.toUpperCase(),
      productName: line.skuId,
      type: line.type,
      quantityKg: line.quantityKg,
      uom: "kg",
    })),
  };
  appendStoredItem(KEY, seedYieldRecords, created, true);
  return created;
}

export function buildMassBalanceSummary(rows: YieldRecordRow[]): MassBalanceSummaryRow[] {
  return rows.map((row) => ({
    id: row.id,
    period: new Date(row.recordedAt).toLocaleString("en-US", { month: "short", year: "numeric" }),
    workOrderNumber: row.workOrderNumber,
    inputWeightKg: row.inputWeightKg,
    outputPrimaryKg: row.outputPrimaryKg,
    outputSecondaryKg: row.outputSecondaryKg,
    wasteKg: row.wasteKg,
    yieldPercent:
      row.yieldPercent ??
      Number((((row.outputPrimaryKg + row.outputSecondaryKg) / Math.max(1, row.inputWeightKg)) * 100).toFixed(1)),
    varianceVsBom: undefined,
  }));
}

