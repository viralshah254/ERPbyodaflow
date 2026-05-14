import { apiRequest, requireLiveApi } from "@/lib/api/client";
import type { SalesDocRow } from "@/lib/types/sales";

type BackendSalesDoc = {
  id: string;
  number: string;
  date: string;
  party?: string;
  partyId?: string;
  total?: number;
  currency?: string;
  exchangeRate?: number;
  status?: string;
  orderChannel?: string;
  reference?: string;
};

type SalesDocType = "quote" | "sales-order" | "delivery-note" | "invoice";

function mapSalesDoc(item: BackendSalesDoc): SalesDocRow {
  return {
    id: item.id,
    number: item.number,
    date: item.date?.slice(0, 10) ?? "",
    party: item.party ?? item.partyId,
    partyId: item.partyId,
    total: item.total ?? 0,
    currency: item.currency,
    exchangeRate: item.exchangeRate,
    status: item.status ?? "DRAFT",
    orderChannel: item.orderChannel,
    reference: item.reference,
  };
}

export type SalesDocumentsPageResult = {
  items: SalesDocRow[];
  limit: number;
  offset: number;
  hasMore: boolean;
  nextCursor: string | null;
};

const SALES_AGGREGATE_CAP = 2000;

function endpointFor(type: SalesDocType): string {
  if (type === "quote") return "/api/sales/quotes";
  if (type === "sales-order") return "/api/sales/orders";
  if (type === "delivery-note") return "/api/sales/deliveries";
  return "/api/sales/invoices";
}

export async function fetchSalesDocumentsPageApi(
  type: SalesDocType,
  opts?: { limit?: number; cursor?: string }
): Promise<SalesDocumentsPageResult> {
  requireLiveApi("Sales documents");
  const params = new URLSearchParams();
  const lim = opts?.limit != null ? Math.min(Math.max(opts.limit, 1), 100) : 50;
  params.set("limit", String(lim));
  if (opts?.cursor != null && opts.cursor !== "") params.set("cursor", opts.cursor);
  const payload = await apiRequest<{
    items: BackendSalesDoc[];
    limit?: number;
    offset?: number;
    hasMore?: boolean;
    nextCursor?: string | null;
  }>(endpointFor(type), { params });
  const limit = typeof payload.limit === "number" ? payload.limit : lim;
  const offset =
    typeof payload.offset === "number"
      ? payload.offset
      : opts?.cursor != null && opts.cursor !== ""
        ? Number(opts.cursor) || 0
        : 0;
  const items = (payload.items ?? []).map(mapSalesDoc);
  const hasMore =
    typeof payload.hasMore === "boolean" ? payload.hasMore : items.length === limit && limit > 0;
  let nextCursor: string | null;
  if (payload.nextCursor !== undefined && payload.nextCursor !== null && String(payload.nextCursor) !== "") {
    nextCursor = String(payload.nextCursor);
  } else if (hasMore) {
    nextCursor = String(offset + items.length);
  } else {
    nextCursor = null;
  }
  return { items, limit, offset, hasMore, nextCursor };
}

export async function fetchSalesDocumentsApi(type: SalesDocType): Promise<SalesDocRow[]> {
  const rows: SalesDocRow[] = [];
  let cursor: string | undefined;
  while (rows.length < SALES_AGGREGATE_CAP) {
    const page = await fetchSalesDocumentsPageApi(type, { limit: 100, cursor });
    rows.push(...page.items);
    if (!page.hasMore || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return rows;
}
