import { apiRequest, downloadTextFile, requireLiveApi } from "@/lib/api/client";
import type { PurchaseOrderDetailRow, PurchasingDocRow } from "@/lib/types/purchasing";

type BackendPurchaseOrder = {
  id: string;
  number: string;
  date?: string;
  partyId?: string;
  party?: string;
  total?: number;
  currency?: string;
  exchangeRate?: number;
  status?: string;
};

type BackendPurchaseOrdersPage = {
  items: BackendPurchaseOrder[];
  limit?: number;
  offset?: number;
  hasMore?: boolean;
  nextCursor?: string | null;
  summary?: {
    total: number;
    pendingApproval: number;
    approved: number;
    received: number;
  };
};

function mapPurchaseOrderRow(item: BackendPurchaseOrder): PurchasingDocRow {
  return {
    id: item.id,
    number: item.number,
    date: item.date?.slice(0, 10) ?? "",
    party: item.party ?? "—",
    total: item.total ?? 0,
    currency: item.currency ?? "KES",
    exchangeRate: item.exchangeRate,
    status: (item.status as PurchasingDocRow["status"]) ?? "DRAFT",
  };
}

export type FetchPurchaseOrdersPageOpts = {
  limit?: number;
  cursor?: string;
  status?: string;
  search?: string;
};

export type PurchaseOrdersSummary = {
  total: number;
  pendingApproval: number;
  approved: number;
  received: number;
};

export type FetchPurchaseOrdersPageResult = {
  items: PurchasingDocRow[];
  limit: number;
  offset: number;
  hasMore: boolean;
  nextCursor: string | null;
  summary?: PurchaseOrdersSummary;
};

export async function fetchPurchaseOrdersPageApi(
  opts?: FetchPurchaseOrdersPageOpts,
): Promise<FetchPurchaseOrdersPageResult> {
  requireLiveApi("Purchase orders");
  const params = new URLSearchParams();
  const lim = opts?.limit != null ? Math.min(Math.max(opts.limit, 1), 100) : 25;
  params.set("limit", String(lim));
  if (opts?.cursor != null && opts.cursor !== "") {
    params.set("cursor", opts.cursor);
  }
  if (opts?.status?.trim()) params.set("status", opts.status.trim());
  if (opts?.search?.trim()) params.set("search", opts.search.trim());

  const payload = await apiRequest<BackendPurchaseOrdersPage>("/api/purchasing/orders", {
    params,
  });
  const limit = typeof payload.limit === "number" ? payload.limit : lim;
  const parsedOffset =
    typeof payload.offset === "number"
      ? payload.offset
      : opts?.cursor != null && opts.cursor !== ""
        ? Number(opts.cursor) || 0
        : 0;
  const items = (payload.items ?? []).map(mapPurchaseOrderRow);
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
  return {
    items,
    limit,
    offset: parsedOffset,
    hasMore,
    nextCursor,
    summary: payload.summary,
  };
}

/** Legacy: loads up to 500 rows (prefer paginated fetchPurchaseOrdersPageApi). */
export async function fetchPurchaseOrders(): Promise<PurchasingDocRow[]> {
  const rows: PurchasingDocRow[] = [];
  let cursor: string | undefined;
  while (rows.length < 500) {
    const page = await fetchPurchaseOrdersPageApi({ limit: 100, cursor });
    rows.push(...page.items);
    if (!page.hasMore || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return rows;
}

export async function fetchPurchaseOrderById(id: string): Promise<PurchaseOrderDetailRow | null> {
  requireLiveApi("Purchase order detail");
  return apiRequest<PurchaseOrderDetailRow>(`/api/purchasing/orders/${encodeURIComponent(id)}`);
}

export async function approvePurchaseOrders(ids: string[]): Promise<void> {
  requireLiveApi("Approve purchase orders");
  await apiRequest("/api/purchasing/orders/approve-bulk", { method: "POST", body: { ids } });
}

export function exportPurchaseOrdersCsv(rows: PurchasingDocRow[]): void {
  const csv = [
    ["number", "date", "supplier", "total", "status"].join(","),
    ...rows.map((row) =>
      [row.number, row.date, row.party ?? "", row.total ?? "", row.status]
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(",")
    ),
  ].join("\n");
  downloadTextFile(`purchase-orders-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv;charset=utf-8");
}
