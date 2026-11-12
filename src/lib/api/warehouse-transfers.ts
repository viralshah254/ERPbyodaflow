/**
 * Warehouse transfers API — inter-warehouse stock transfers.
 */

import { apiRequest, downloadTextFile, requireLiveApi } from "@/lib/api/client";
import type { TransferRow, TransferStatus } from "@/lib/types/warehouse";

export type { TransferRow, TransferStatus };

export type TransferStockRow = {
  productId: string;
  name: string;
  sku?: string;
  code?: string;
  barcode?: string;
  uom: string;
  quantity: number;
  reserved: number;
  available: number;
};

export async function fetchTransferStock(warehouseId: string): Promise<TransferStockRow[]> {
  requireLiveApi("Transfer stock");
  const result = await apiRequest<{ items: TransferStockRow[] }>("/api/warehouse/transfers/stock", { params: { warehouseId } });
  return result.items;
}

function listParams(p?: Record<string, string | undefined>): Record<string, string> {
  if (!p) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(p)) if (v != null && v !== "") out[k] = v;
  return out;
}

export async function fetchTransfers(params?: { status?: string; search?: string }): Promise<TransferRow[]> {
  requireLiveApi("Warehouse transfers");
  const res = await apiRequest<{ items: TransferRow[] }>("/api/warehouse/transfers", {
    params: listParams(params),
  });
  return res.items ?? [];
}

export async function fetchTransferById(id: string): Promise<TransferRow | null> {
  requireLiveApi("Warehouse transfer detail");
  try {
    return await apiRequest<TransferRow>(`/api/warehouse/transfers/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export async function createTransfer(body: {
  date: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  reference?: string;
  lines: { productId?: string; sku: string; productName?: string; quantity: number; unit?: string }[];
  transferCostKes?: number;
  costNotes?: string;
  sourceGrnId?: string;
}): Promise<{ id: string }> {
  requireLiveApi("Create warehouse transfer");
  return apiRequest<{ id: string }>("/api/warehouse/transfers", {
    method: "POST",
    body,
  });
}

export async function updateTransferStatus(
  id: string,
  status: TransferStatus
): Promise<void> {
  requireLiveApi("Update warehouse transfer status");
  const actionMap: Record<Exclude<TransferStatus, "CANCELLED">, string> = {
    DRAFT: "approve",
    APPROVED: "approve",
    IN_TRANSIT: "dispatch",
    RECEIVED: "receive",
  };
  if (status === "CANCELLED") throw new Error("Cancellation is not available here.");
  await apiRequest(`/api/warehouse/transfers/${encodeURIComponent(id)}/action`, {
    method: "POST",
    body: { action: actionMap[status] },
  });
}

export async function saveTransferReceiptCounts(
  id: string,
  lines: Array<{ lineIndex: number; receivedQuantity: number; reason?: string; missingLots?: Array<{ lotId: string; quantity: number }> }>,
): Promise<void> {
  requireLiveApi("Transfer receipt counts");
  await apiRequest(`/api/warehouse/transfers/${encodeURIComponent(id)}/receipt-lines`, { method: "PATCH", body: { lines } });
}

export async function approveTransferShortage(id: string, reviewVersion: string): Promise<void> {
  requireLiveApi("Transfer shortage approval");
  await apiRequest(`/api/warehouse/transfers/${encodeURIComponent(id)}/approve-shortage`, { method: "POST", body: { reviewVersion } });
}

export function exportTransfersCsv(rows: TransferRow[]): void {
  const headers = ["number", "date", "fromWarehouse", "toWarehouse", "status", "lineCount"];
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      [
        row.number,
        row.date,
        row.fromWarehouse,
        row.toWarehouse,
        row.status,
        row.lines.length,
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(",")
    ),
  ].join("\n");
  downloadTextFile(
    `warehouse-transfers-${new Date().toISOString().slice(0, 10)}.csv`,
    csv,
    "text/csv;charset=utf-8"
  );
}

