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
  /** Stock already in the receiving store. Present when a receiving store was given. */
  destination?: { quantity: number; available: number };
};

export type TransferStockQuery = {
  warehouseId: string;
  toWarehouseId?: string;
  search?: string;
  /** Only these products. Used to refresh the products already in a transfer. */
  productIds?: string[];
  /** With productIds: return them even when the store holds none, so the transfer can show the gap. */
  includeEmpty?: boolean;
  /** Only products of this material type. */
  itemRole?: "FINISHED" | "RAW" | "PACKAGING" | "SEMI";
  limit?: number;
  offset?: number;
};

export async function fetchTransferStock(query: TransferStockQuery): Promise<{ items: TransferStockRow[]; total: number; hasMore: boolean }> {
  requireLiveApi("Transfer stock");
  const result = await apiRequest<{ items: TransferStockRow[]; total?: number; hasMore?: boolean }>("/api/warehouse/transfers/stock", {
    params: listParams({
      warehouseId: query.warehouseId,
      toWarehouseId: query.toWarehouseId,
      search: query.search?.trim(),
      productIds: query.productIds?.join(","),
      includeEmpty: query.includeEmpty && query.productIds?.length ? "1" : undefined,
      itemRole: query.itemRole,
      limit: String(query.limit ?? 25),
      offset: String(query.offset ?? 0),
    }),
  });
  const items = result.items ?? [];
  if (result.total !== undefined) return { items, total: result.total, hasMore: Boolean(result.hasMore) };
  // Older API versions return the whole store at once.
  const needle = query.search?.trim().toLowerCase();
  const matching = items.filter((row) =>
    (!query.productIds || query.productIds.includes(row.productId))
    && (!needle || [row.name, row.sku, row.code, row.barcode].some((value) => value?.toLowerCase().includes(needle))))
    .sort((a, b) => (a.sku || a.name).localeCompare(b.sku || b.name, undefined, { numeric: true }));
  const offset = query.offset ?? 0;
  const limit = query.limit ?? 25;
  return { items: matching.slice(offset, offset + limit), total: matching.length, hasMore: offset + limit < matching.length };
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

export type TransferHistoryQuery = {
  status?: string;
  search?: string;
  warehouseId?: string;
  direction?: "in" | "out";
  dateFrom?: string;
  dateTo?: string;
  offset?: number;
};

export async function fetchTransferHistory(query: TransferHistoryQuery): Promise<{ items: TransferRow[]; hasMore: boolean }> {
  requireLiveApi("Warehouse transfers");
  const { offset, ...rest } = query;
  const res = await apiRequest<{ items: TransferRow[]; hasMore?: boolean }>("/api/warehouse/transfers", {
    params: { ...listParams(rest), limit: "100", offset: String(offset ?? 0) },
  });
  return { items: res.items ?? [], hasMore: Boolean(res.hasMore) };
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
  /** Move the stock now instead of saving a draft for approval. */
  post?: boolean;
}): Promise<{ id: string; number?: string; status?: TransferStatus }> {
  requireLiveApi("Create warehouse transfer");
  return apiRequest<{ id: string; number?: string; status?: TransferStatus }>("/api/warehouse/transfers", {
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
  const headers = ["number", "date", "fromWarehouse", "toWarehouse", "status", "lineCount", "products", "createdBy", "reference"];
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
        row.lines.map((line) => `${line.productName} ${line.quantity} ${line.unit ?? ""}`.trim()).join("; "),
        row.createdBy ?? "",
        row.reference ?? "",
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

