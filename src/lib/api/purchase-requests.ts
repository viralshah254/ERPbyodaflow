import { apiRequest, requireLiveApi } from "@/lib/api/client";
import type { PurchasingDocRow } from "@/lib/types/purchasing";

type BackendPurchaseRequest = {
  id: string;
  number: string;
  date?: string;
  partyId?: string;
  requesterName?: string;
  total?: number;
  currency?: string;
  exchangeRate?: number;
  status?: string;
};

type BackendPurchaseRequestsPage = {
  items: BackendPurchaseRequest[];
  limit?: number;
  offset?: number;
  hasMore?: boolean;
  nextCursor?: string | null;
};

function mapPurchaseRequestRow(item: BackendPurchaseRequest): PurchasingDocRow {
  return {
    id: item.id,
    number: item.number,
    date: item.date?.slice(0, 10) ?? "",
    party: item.requesterName ?? "—",
    total: item.total ?? 0,
    currency: item.currency ?? "KES",
    exchangeRate: item.exchangeRate,
    status: (item.status as PurchasingDocRow["status"]) ?? "DRAFT",
  };
}

export type FetchPurchaseRequestsPageOpts = {
  limit?: number;
  cursor?: string;
  status?: string;
  search?: string;
};

export type FetchPurchaseRequestsPageResult = {
  items: PurchasingDocRow[];
  limit: number;
  offset: number;
  hasMore: boolean;
  nextCursor: string | null;
};

export async function fetchPurchaseRequestsPageApi(
  opts?: FetchPurchaseRequestsPageOpts,
): Promise<FetchPurchaseRequestsPageResult> {
  requireLiveApi("Purchase requests");
  const params = new URLSearchParams();
  const lim = opts?.limit != null ? Math.min(Math.max(opts.limit, 1), 100) : 25;
  params.set("limit", String(lim));
  if (opts?.cursor != null && opts.cursor !== "") {
    params.set("cursor", opts.cursor);
  }
  if (opts?.status?.trim()) params.set("status", opts.status.trim());
  if (opts?.search?.trim()) params.set("search", opts.search.trim());

  const payload = await apiRequest<BackendPurchaseRequestsPage>("/api/purchasing/requests", {
    params,
  });
  const limit = typeof payload.limit === "number" ? payload.limit : lim;
  const parsedOffset =
    typeof payload.offset === "number"
      ? payload.offset
      : opts?.cursor != null && opts.cursor !== ""
        ? Number(opts.cursor) || 0
        : 0;
  const items = (payload.items ?? []).map(mapPurchaseRequestRow);
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
  };
}

/** Legacy: loads up to 500 rows (prefer paginated fetchPurchaseRequestsPageApi). */
export async function fetchPurchaseRequestsApi(): Promise<PurchasingDocRow[]> {
  const rows: PurchasingDocRow[] = [];
  let cursor: string | undefined;
  while (rows.length < 500) {
    const page = await fetchPurchaseRequestsPageApi({ limit: 100, cursor });
    rows.push(...page.items);
    if (!page.hasMore || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return rows;
}
