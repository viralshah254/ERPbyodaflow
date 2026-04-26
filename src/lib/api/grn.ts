/**
 * GRN (goods receipt) API.
 * See BACKEND_SPEC_COOL_CATCH.md §3.7 (GRN line weight).
 */

import { apiRequest, downloadFile, downloadTextFile, requireLiveApi } from "@/lib/api/client";
import { type GrnDetailRow, type PurchasingDocRow } from "@/lib/types/purchasing";

export type { GrnDetailRow };

export async function fetchGRNs(opts?: { availableForProcessing?: boolean }): Promise<PurchasingDocRow[]> {
  requireLiveApi("Goods receipts");
  try {
    const params = opts?.availableForProcessing ? "?availableForProcessing=true" : "";
    const res = await apiRequest<{ items: PurchasingDocRow[] }>(`/api/purchasing/grn${params}`);
    return res?.items ?? [];
  } catch {
    return [];
  }
}

export async function fetchGRNById(id: string): Promise<GrnDetailRow | null> {
  requireLiveApi("Goods receipt detail");
  try {
    const res = await apiRequest<GrnDetailRow>(`/api/purchasing/grn/${encodeURIComponent(id)}`);
    return res;
  } catch {
    return null;
  }
}

export type GrnPostErrorCode =
  | "GRN_ALREADY_POSTED"
  | "GRN_CONVERTED_TO_BILL"
  | "GRN_CANCELLED"
  | "GRN_MISSING_WEIGHT"
  | "GRN_OPEN_VARIANCE"
  | "GRN_POST_FAILED"
  | "GRN_NOT_FOUND";

export type GrnPostError = Error & {
  code?: GrnPostErrorCode;
  grnId?: string;
  poId?: string | null;
  billId?: string | null;
  billNumber?: string | null;
};

export interface GrnPostResult {
  id: string;
  status: string;
  stockAdded: Array<{ productId: string; productName?: string; qty: number; warehouseId: string }>;
}

export async function postGRN(id: string): Promise<GrnPostResult> {
  requireLiveApi("Post goods receipt");
  try {
    const res = await apiRequest<GrnPostResult>(`/api/purchasing/grn/${encodeURIComponent(id)}/post`, { method: "POST", body: {} });
    return res ?? { id, status: "POSTED", stockAdded: [] };
  } catch (raw) {
    const base = raw as Error & { body?: Record<string, unknown> };
    const body = base.body ?? {};
    const typed = base as GrnPostError;
    typed.code = (body.code as GrnPostErrorCode | undefined) ?? "GRN_POST_FAILED";
    typed.grnId = (body.grnId as string | undefined) ?? id;
    typed.poId = (body.poId as string | null | undefined) ?? null;
    typed.billId = (body.billId as string | null | undefined) ?? null;
    typed.billNumber = (body.billNumber as string | null | undefined) ?? null;
    throw typed;
  }
}

export async function confirmGRNProcessing(id: string): Promise<{ adjustedLines: number; processingConfirmed: boolean }> {
  requireLiveApi("Confirm GRN processing");
  return apiRequest<{ adjustedLines: number; processingConfirmed: boolean }>(
    `/api/purchasing/grn/${encodeURIComponent(id)}/confirm-processing`,
    { method: "POST", body: {} }
  );
}

/** Patch GRN header fields (date, notes, reference, warehouseId). Only creator or ADMIN. */
export async function patchGrnHeaderApi(
  id: string,
  patch: { date?: string; notes?: string; reference?: string; warehouseId?: string }
): Promise<GrnDetailRow> {
  requireLiveApi("Patch GRN header");
  return apiRequest<GrnDetailRow>(`/api/purchasing/grn/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: patch,
  });
}

/** Patch GRN line weight (receivedWeightKg, paidWeightKg, weightKg, processedWeightKg). lineId is 0-based index. */
export async function patchGRNLine(
  grnId: string,
  lineId: number,
  body: { receivedWeightKg?: number; paidWeightKg?: number; weightKg?: number; processedWeightKg?: number }
): Promise<GrnDetailRow> {
  requireLiveApi("Patch GRN line");
  return apiRequest<GrnDetailRow>(`/api/purchasing/grn/${encodeURIComponent(grnId)}/lines/${lineId}`, {
    method: "PATCH",
    body,
  });
}

function toCsv(rows: Array<Record<string, string | number | null | undefined>>): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number | null | undefined) =>
    `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\n");
}

export function exportGRNsCsv(rows: PurchasingDocRow[]): void {
  const csv = toCsv(
    rows.map((row) => ({
      number: row.number,
      date: row.date,
      poRef: row.poRef ?? "",
      warehouse: row.warehouse ?? "",
      status: row.status,
    }))
  );
  downloadTextFile(`grns-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv;charset=utf-8");
}

export function exportGRNDetailCsv(grn: GrnDetailRow): void {
  const csv = toCsv(
    grn.lines.map((line) => ({
      grnNumber: grn.number,
      poRef: grn.poRef ?? "",
      sku: line.sku,
      productName: line.productName,
      qty: line.qty,
      uom: line.uom,
      value: line.value,
      receivedWeightKg: line.receivedWeightKg ?? "",
      paidWeightKg: line.paidWeightKg ?? "",
      processedWeightKg: line.processedWeightKg ?? "",
    }))
  );
  downloadTextFile(`${grn.number.toLowerCase()}.csv`, csv, "text/csv;charset=utf-8");
}

export function exportGRNPdf(id: string, onNotAvailable: (message: string) => void): void {
  requireLiveApi("Goods receipt PDF export");
  void downloadFile(`/api/docs/grn/${encodeURIComponent(id)}/pdf`, `grn-${id}.pdf`, onNotAvailable);
}
