import { apiRequest, downloadFile, requireLiveApi } from "@/lib/api/client";

export type PurchaseReturnRow = {
  id: string;
  number: string;
  date: string;
  status: string;
  supplierId?: string;
  supplierName?: string;
  party?: string;
  grnRef?: string;
  warehouseId?: string;
  total?: number;
  currency?: string;
};

type BackendPurchaseReturn = {
  id: string;
  number: string;
  date?: string;
  status?: string;
  supplierId?: string;
  supplierName?: string;
  party?: string;
  grnRef?: string;
  warehouseId?: string;
  total?: number;
  currency?: string;
};

type BackendPurchaseReturnsPage = {
  items: BackendPurchaseReturn[];
  limit?: number;
  offset?: number;
  hasMore?: boolean;
  nextCursor?: string | null;
};

function mapPurchaseReturnRow(item: BackendPurchaseReturn): PurchaseReturnRow {
  return {
    id: item.id,
    number: item.number,
    date: typeof item.date === "string" ? item.date.slice(0, 10) : String(item.date ?? ""),
    status: item.status ?? "DRAFT",
    supplierId: item.supplierId,
    supplierName: item.supplierName,
    party: item.party ?? item.supplierName ?? item.supplierId,
    grnRef: item.grnRef,
    warehouseId: item.warehouseId,
    total: item.total,
    currency: item.currency ?? "KES",
  };
}

export type FetchPurchaseReturnsPageOpts = {
  limit?: number;
  cursor?: string;
  status?: string;
  search?: string;
};

export type FetchPurchaseReturnsPageResult = {
  items: PurchaseReturnRow[];
  limit: number;
  offset: number;
  hasMore: boolean;
  nextCursor: string | null;
};

export async function fetchPurchaseReturnsPageApi(
  opts?: FetchPurchaseReturnsPageOpts,
): Promise<FetchPurchaseReturnsPageResult> {
  requireLiveApi("Purchase returns");
  const params = new URLSearchParams();
  const lim = opts?.limit != null ? Math.min(Math.max(opts.limit, 1), 100) : 25;
  params.set("limit", String(lim));
  if (opts?.cursor != null && opts.cursor !== "") {
    params.set("cursor", opts.cursor);
  }
  if (opts?.status?.trim()) params.set("status", opts.status.trim());
  if (opts?.search?.trim()) params.set("search", opts.search.trim());

  const payload = await apiRequest<BackendPurchaseReturnsPage>("/api/purchasing/purchase-returns", {
    params,
  });
  const limit = typeof payload.limit === "number" ? payload.limit : lim;
  const parsedOffset =
    typeof payload.offset === "number"
      ? payload.offset
      : opts?.cursor != null && opts.cursor !== ""
        ? Number(opts.cursor) || 0
        : 0;
  const items = (payload.items ?? []).map(mapPurchaseReturnRow);
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

/** Legacy: loads up to 500 rows (prefer paginated fetchPurchaseReturnsPageApi). */
export async function fetchPurchaseReturns(status?: string, search?: string): Promise<PurchaseReturnRow[]> {
  const rows: PurchaseReturnRow[] = [];
  let cursor: string | undefined;
  while (rows.length < 500) {
    const page = await fetchPurchaseReturnsPageApi({ limit: 100, cursor, status, search });
    rows.push(...page.items);
    if (!page.hasMore || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return rows;
}

export async function createPurchaseReturnApi(): Promise<{ id: string; number: string }> {
  return apiRequest("/api/purchasing/purchase-returns", {
    method: "POST",
    body: { lines: [] },
  });
}

export async function approvePurchaseReturnApi(id: string): Promise<void> {
  await apiRequest(`/api/purchasing/purchase-returns/${encodeURIComponent(id)}/approve`, {
    method: "POST",
  });
}

export function exportPurchaseReturnsApi(onError: (message: string) => void): void {
  requireLiveApi("Purchase returns export");
  void downloadFile("/api/purchasing/purchase-returns/export?format=csv", "purchase-returns.csv", onError);
}
