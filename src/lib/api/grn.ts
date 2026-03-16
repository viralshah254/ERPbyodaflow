/**
 * GRN (goods receipt) API.
 * See BACKEND_SPEC_COOL_CATCH.md §3.7 (GRN line weight).
 */

import { apiRequest, downloadFile, downloadTextFile, requireLiveApi } from "@/lib/api/client";
import { type GrnDetailRow, type PurchasingDocRow } from "@/lib/types/purchasing";

export type { GrnDetailRow };

export async function fetchGRNs(): Promise<PurchasingDocRow[]> {
  requireLiveApi("Goods receipts");
  try {
    const res = await apiRequest<{ items: PurchasingDocRow[] }>("/api/purchasing/grn");
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

export async function postGRN(id: string): Promise<void> {
  requireLiveApi("Post goods receipt");
  await apiRequest(`/api/purchasing/grn/${encodeURIComponent(id)}/post`, { method: "POST", body: {} });
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
    }))
  );
  downloadTextFile(`${grn.number.toLowerCase()}.csv`, csv, "text/csv;charset=utf-8");
}

export function exportGRNPdf(id: string, onNotAvailable: (message: string) => void): void {
  requireLiveApi("Goods receipt PDF export");
  void downloadFile(`/api/purchasing/grn/${encodeURIComponent(id)}/pdf`, `grn-${id}.pdf`, onNotAvailable);
}
