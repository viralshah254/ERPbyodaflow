/**
 * GRN (goods receipt) API.
 * See BACKEND_SPEC_COOL_CATCH.md §3.7 (GRN line weight).
 */

import { apiRequest, downloadFile, downloadTextFile, requireLiveApi } from "@/lib/api/client";
import { type GrnDetailRow, type PurchasingDocRow } from "@/lib/types/purchasing";

export type { GrnDetailRow };

type BackendGrnListItem = {
  id: string;
  number: string;
  date?: string;
  createdAt?: string;
  party?: string;
  poRef?: string;
  warehouse?: string;
  status?: string;
  total?: number;
  warehouseId?: string;
  partyId?: string;
  hasLandedCost?: boolean;
  [key: string]: unknown;
};

function mapGrnListRow(item: BackendGrnListItem): PurchasingDocRow {
  const { date, createdAt, ...rest } = item;
  return {
    ...(rest as PurchasingDocRow),
    date: typeof date === "string" ? date.slice(0, 10) : "",
    createdAt:
      typeof createdAt === "string"
        ? createdAt
        : createdAt != null
          ? String(createdAt)
          : undefined,
  };
}

type BackendGrnListPage = {
  items: BackendGrnListItem[];
  limit?: number;
  offset?: number;
  hasMore?: boolean;
  nextCursor?: string | null;
};

export type FetchInventoryReceiptsPageOpts = {
  limit?: number;
  cursor?: string;
  status?: string;
  search?: string;
  warehouseId?: string;
};

export type FetchInventoryReceiptsPageResult = {
  items: PurchasingDocRow[];
  limit: number;
  offset: number;
  hasMore: boolean;
  nextCursor: string | null;
};

export async function fetchInventoryReceiptsPageApi(
  opts?: FetchInventoryReceiptsPageOpts,
): Promise<FetchInventoryReceiptsPageResult> {
  requireLiveApi("Goods receipts");
  const params = new URLSearchParams();
  const lim = opts?.limit != null ? Math.min(Math.max(opts.limit, 1), 100) : 25;
  params.set("limit", String(lim));
  if (opts?.cursor != null && opts.cursor !== "") {
    params.set("cursor", opts.cursor);
  }
  if (opts?.status?.trim()) params.set("status", opts.status.trim());
  if (opts?.search?.trim()) params.set("search", opts.search.trim());
  if (opts?.warehouseId?.trim()) params.set("warehouseId", opts.warehouseId.trim());

  const payload = await apiRequest<BackendGrnListPage>("/api/inventory/receipts", { params });
  const limit = typeof payload.limit === "number" ? payload.limit : lim;
  const parsedOffset =
    typeof payload.offset === "number"
      ? payload.offset
      : opts?.cursor != null && opts.cursor !== ""
        ? Number(opts.cursor) || 0
        : 0;
  const items = (payload.items ?? []).map((item) => mapGrnListRow(item as BackendGrnListItem));
  const hasMore =
    typeof payload.hasMore === "boolean"
      ? payload.hasMore
      : items.length === limit && limit > 0;
  let nextCursor: string | null;
  if (
    payload.nextCursor !== undefined &&
    payload.nextCursor !== null &&
    String(payload.nextCursor) !== ""
  ) {
    nextCursor = String(payload.nextCursor);
  } else if (hasMore) {
    nextCursor = String(parsedOffset + items.length);
  } else {
    nextCursor = null;
  }
  return { items, limit, offset: parsedOffset, hasMore, nextCursor };
}

export async function fetchGRNs(opts?: { availableForProcessing?: boolean }): Promise<PurchasingDocRow[]> {
  requireLiveApi("Goods receipts");
  try {
    const params = opts?.availableForProcessing ? "?availableForProcessing=true" : "";
    const res = await apiRequest<{ items: BackendGrnListItem[] }>(`/api/purchasing/grn${params}`);
    return (res?.items ?? []).map(mapGrnListRow);
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
  | "GRN_NOT_FOUND"
  | "WAREHOUSE_CANNOT_RECEIVE"
  | "OPENING_COST_REQUIRED";

export type OpeningCostGap = { productId: string; code: string; name: string };

export type GrnPostError = Error & {
  code?: GrnPostErrorCode;
  grnId?: string;
  poId?: string | null;
  billId?: string | null;
  billNumber?: string | null;
  warehouseId?: string | null;
  products?: OpeningCostGap[];
};

export function openingCostsHref(products?: OpeningCostGap[] | null): string {
  const ids = (products ?? []).map((product) => product.productId).filter(Boolean);
  return ids.length
    ? `/inventory/opening-costs?products=${encodeURIComponent(ids.join(","))}`
    : "/inventory/opening-costs";
}

const OPENING_COST_FALLBACK = "A product on this receipt already has stock, but no opening cost. Enter the opening cost, then post this receipt.";

export function isOpeningCostPostError(error: { code?: string; message?: string }): boolean {
  return error.code === "OPENING_COST_REQUIRED" || /no opening cost|company-average opening value/i.test(error.message ?? "");
}

export function openingCostPostMessage(error: { code?: string; message?: string; products?: OpeningCostGap[] }): string {
  if (error.products?.length && error.message) return error.message;
  if (error.message && /no opening cost/i.test(error.message) && !/company-average opening value/i.test(error.message)) return error.message;
  return OPENING_COST_FALLBACK;
}

function readOpeningCostProducts(value: unknown): OpeningCostGap[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const products = value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as { productId?: unknown; code?: unknown; name?: unknown };
    const productId = String(row.productId ?? "").trim();
    if (!productId) return [];
    return [{ productId, code: String(row.code ?? ""), name: String(row.name ?? "") }];
  });
  return products.length ? products : undefined;
}

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
    typed.warehouseId = (body.warehouseId as string | null | undefined) ?? null;
    typed.products = readOpeningCostProducts(body.products);
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
  patch: {
    date?: string;
    notes?: string;
    reference?: string;
    warehouseId?: string;
    supplierInvoiceNumber?: string;
    linkedSupplierBillId?: string;
  }
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
  body: {
    receivedWeightKg?: number;
    paidWeightKg?: number;
    weightKg?: number;
    processedWeightKg?: number;
    orderedWeightKg?: number;
    varianceReasonCode?: string;
    varianceReason?: string;
    lotNumber?: string;
    expiryDate?: string;
    receivedUom?: string;
    uomToBaseFactor?: number;
  }
): Promise<GrnDetailRow> {
  requireLiveApi("Patch GRN line");
  return apiRequest<GrnDetailRow>(`/api/purchasing/grn/${encodeURIComponent(grnId)}/lines/${lineId}`, {
    method: "PATCH",
    body,
  });
}

export async function recordGRNLineQc(
  grnId: string,
  lineId: number,
  outcome: "ACCEPTED" | "REJECTED",
  note?: string,
): Promise<GrnDetailRow> {
  requireLiveApi("Record receipt quality control");
  return apiRequest<GrnDetailRow>(
    `/api/purchasing/grn/${encodeURIComponent(grnId)}/lines/${lineId}/qc`,
    { method: "POST", body: { outcome, note } },
  );
}

export async function recordGRNBulkQc(
  grnId: string,
  lines: Array<{ lineIndex: number; outcome: "ACCEPTED" | "REJECTED"; note?: string }>,
): Promise<{ recorded: number; grn: GrnDetailRow }> {
  requireLiveApi("Record bulk receipt quality control");
  return apiRequest<{ recorded: number; grn: GrnDetailRow }>(
    `/api/purchasing/grn/${encodeURIComponent(grnId)}/qc/bulk`,
    { method: "POST", body: { lines } },
  );
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
