import { apiRequest, requireLiveApi } from "@/lib/api/client";

export type ManufacturingBomItem = {
  id: string;
  productId: string;
  productName?: string;
  productSku?: string;
  quantity: number;
  uom: string;
  type?: string;
  isOptional?: boolean;
  scrapFactor?: number;
};

export type ManufacturingBom = {
  id: string;
  code: string;
  name: string;
  finishedProductId: string;
  finishedProductName?: string;
  finishedProductSku?: string;
  quantity: number;
  uom: string;
  version: string;
  type: "bom" | "formula" | "disassembly";
  direction?: "STANDARD" | "REVERSE";
  isActive: boolean;
  routeId?: string;
  items: ManufacturingBomItem[];
};

export type ManufacturingRoute = {
  id: string;
  code: string;
  name: string;
  description?: string;
  productId?: string;
  /** Set on list responses when operations are omitted */
  operationCount?: number;
  operations: Array<{
    id: string;
    sequence: number;
    name: string;
    workCenterId?: string;
    workCenter?: string;
    setupMinutes: number;
    runMinutesPerUnit: number;
  }>;
};

export type ManufacturingWorkOrder = {
  id: string;
  number: string;
  productId: string;
  productName?: string;
  productSku?: string;
  bomId?: string;
  bomName?: string;
  routingId?: string;
  routingName?: string;
  /** GRN (receipt batch) this work order processes. */
  grnId?: string;
  grnNumber?: string;
  quantity: number;
  plannedQuantity: number;
  releasedQuantity: number;
  producedQuantity: number;
  scrapQuantity: number;
  openQuantity: number;
  status: string;
  dueDate?: string;
  plannedDate?: string;
  releasedAt?: string;
  startedAt?: string;
  completedAt?: string;
  notes?: string;
};

export type ManufacturingMrpSuggestion = {
  id: string;
  type: "WORK_ORDER" | "PURCHASE";
  productId: string;
  productName: string;
  productSku?: string;
  requiredQty: number;
  onHandQty: number;
  incomingQty: number;
  shortageQty: number;
  reason: string;
  bomId?: string;
};

export type ManufacturingMrpSummary = {
  workOrderSuggestions: number;
  purchaseSuggestions: number;
  totalShortageQty: number;
};

export type ManufacturingMrpResponse = {
  items: ManufacturingMrpSuggestion[];
  suggestions: ManufacturingMrpSuggestion[];
  summary: ManufacturingMrpSummary;
  totalCount?: number;
  limit?: number;
  offset?: number;
  hasMore?: boolean;
  nextCursor?: string | null;
};

export type FetchManufacturingMrpOpts = {
  limit?: number;
  cursor?: string;
  search?: string;
  type?: "" | "WORK_ORDER" | "PURCHASE";
};

export type FetchManufacturingBomsOpts = {
  limit?: number;
  cursor?: string;
  search?: string;
  direction?: string;
  type?: string;
  status?: "" | "active" | "inactive";
  activeOnly?: boolean;
  includeItems?: boolean;
};

export type FetchManufacturingBomsPageResult = {
  items: ManufacturingBom[];
  limit: number;
  offset: number;
  hasMore: boolean;
  nextCursor: string | null;
};

export async function fetchManufacturingBomsPage(
  opts?: FetchManufacturingBomsOpts
): Promise<FetchManufacturingBomsPageResult> {
  requireLiveApi("Manufacturing BOMs");
  const params = new URLSearchParams();
  const lim = opts?.limit != null ? Math.min(Math.max(opts.limit, 1), 200) : 25;
  params.set("limit", String(lim));
  if (opts?.cursor) params.set("cursor", opts.cursor);
  if (opts?.search?.trim()) params.set("search", opts.search.trim());
  if (opts?.direction) params.set("direction", opts.direction);
  if (opts?.type) params.set("type", opts.type);
  if (opts?.status === "active") params.set("status", "active");
  if (opts?.status === "inactive") params.set("status", "inactive");
  if (opts?.activeOnly) params.set("activeOnly", "true");
  if (opts?.includeItems) params.set("includeItems", "true");

  const payload = await apiRequest<{
    items: ManufacturingBom[];
    limit?: number;
    offset?: number;
    hasMore?: boolean;
    nextCursor?: string | null;
  }>("/api/manufacturing/boms", { params });

  const limit = typeof payload.limit === "number" ? payload.limit : lim;
  const parsedOffset =
    typeof payload.offset === "number"
      ? payload.offset
      : opts?.cursor
        ? Number(opts.cursor) || 0
        : 0;
  const items = payload.items ?? [];
  const hasMore =
    typeof payload.hasMore === "boolean" ? payload.hasMore : items.length === limit && limit > 0;
  const nextCursor =
    payload.nextCursor != null && String(payload.nextCursor) !== ""
      ? String(payload.nextCursor)
      : hasMore
        ? String(parsedOffset + items.length)
        : null;

  return { items, limit, offset: parsedOffset, hasMore, nextCursor };
}

/** Loads all pages (cap 500) — prefer fetchManufacturingBomsPage for list UIs. */
export async function fetchManufacturingBoms(opts?: FetchManufacturingBomsOpts): Promise<ManufacturingBom[]> {
  const rows: ManufacturingBom[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < 10; i++) {
    const page = await fetchManufacturingBomsPage({ ...opts, limit: 50, cursor });
    rows.push(...page.items);
    if (!page.hasMore || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return rows;
}

export async function fetchManufacturingBom(id: string): Promise<ManufacturingBom | null> {
  requireLiveApi("Manufacturing BOM detail");
  try {
    return await apiRequest<ManufacturingBom>(`/api/manufacturing/boms/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export async function fetchNextManufacturingBomCode(): Promise<string> {
  requireLiveApi("Manufacturing BOM next code");
  const payload = await apiRequest<{ code: string }>("/api/manufacturing/boms/next-code");
  return payload.code ?? "";
}

export async function createManufacturingBom(payload: {
  code?: string;
  name: string;
  productId: string;
  quantity: number;
  uom: string;
  type: "bom" | "formula" | "disassembly";
}): Promise<{ id: string; code?: string }> {
  return apiRequest("/api/manufacturing/boms", { method: "POST", body: payload });
}

export async function updateManufacturingBom(id: string, payload: Partial<ManufacturingBom>): Promise<ManufacturingBom> {
  return apiRequest(`/api/manufacturing/boms/${encodeURIComponent(id)}`, { method: "PATCH", body: payload });
}

export async function deleteManufacturingBom(id: string): Promise<{ deleted: boolean }> {
  return apiRequest(`/api/manufacturing/boms/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export type FetchManufacturingRoutesOpts = {
  limit?: number;
  cursor?: string;
  search?: string;
  includeOperations?: boolean;
};

export type FetchManufacturingRoutesPageResult = {
  items: ManufacturingRoute[];
  limit: number;
  offset: number;
  hasMore: boolean;
  nextCursor: string | null;
};

export async function fetchManufacturingRoutesPage(
  opts?: FetchManufacturingRoutesOpts
): Promise<FetchManufacturingRoutesPageResult> {
  requireLiveApi("Manufacturing routes");
  const params = new URLSearchParams();
  const lim = opts?.limit != null ? Math.min(Math.max(opts.limit, 1), 200) : 25;
  params.set("limit", String(lim));
  if (opts?.cursor) params.set("cursor", opts.cursor);
  if (opts?.search?.trim()) params.set("search", opts.search.trim());
  if (opts?.includeOperations) params.set("includeOperations", "true");

  const payload = await apiRequest<{
    items: ManufacturingRoute[];
    limit?: number;
    offset?: number;
    hasMore?: boolean;
    nextCursor?: string | null;
  }>("/api/manufacturing/routing", { params });

  const limit = typeof payload.limit === "number" ? payload.limit : lim;
  const parsedOffset =
    typeof payload.offset === "number" ? payload.offset : opts?.cursor ? Number(opts.cursor) || 0 : 0;
  const items = payload.items ?? [];
  const hasMore =
    typeof payload.hasMore === "boolean" ? payload.hasMore : items.length === limit && limit > 0;
  const nextCursor =
    payload.nextCursor != null && String(payload.nextCursor) !== ""
      ? String(payload.nextCursor)
      : hasMore
        ? String(parsedOffset + items.length)
        : null;

  return { items, limit, offset: parsedOffset, hasMore, nextCursor };
}

export async function fetchManufacturingRouteById(id: string): Promise<ManufacturingRoute | null> {
  requireLiveApi("Manufacturing route detail");
  try {
    return await apiRequest<ManufacturingRoute>(`/api/manufacturing/routing/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export async function fetchManufacturingRoutes(opts?: FetchManufacturingRoutesOpts): Promise<ManufacturingRoute[]> {
  const rows: ManufacturingRoute[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < 10; i++) {
    const page = await fetchManufacturingRoutesPage({
      ...opts,
      limit: 50,
      cursor,
      includeOperations: opts?.includeOperations ?? true,
    });
    rows.push(...page.items);
    if (!page.hasMore || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return rows;
}

export async function createManufacturingRoute(payload: {
  code: string;
  name: string;
  description?: string;
  operations?: ManufacturingRoute["operations"];
}): Promise<{ id: string }> {
  return apiRequest("/api/manufacturing/routing", { method: "POST", body: payload });
}

export async function updateManufacturingRoute(id: string, payload: Partial<ManufacturingRoute>): Promise<ManufacturingRoute> {
  return apiRequest(`/api/manufacturing/routing/${encodeURIComponent(id)}`, { method: "PATCH", body: payload });
}

export type FetchManufacturingWorkOrdersOpts = {
  limit?: number;
  cursor?: string;
  search?: string;
  status?: string;
};

export type FetchManufacturingWorkOrdersPageResult = {
  items: ManufacturingWorkOrder[];
  limit: number;
  offset: number;
  hasMore: boolean;
  nextCursor: string | null;
};

export async function fetchManufacturingWorkOrdersPage(
  opts?: FetchManufacturingWorkOrdersOpts
): Promise<FetchManufacturingWorkOrdersPageResult> {
  requireLiveApi("Manufacturing work orders");
  const params = new URLSearchParams();
  const lim = opts?.limit != null ? Math.min(Math.max(opts.limit, 1), 100) : 25;
  params.set("limit", String(lim));
  if (opts?.cursor) params.set("cursor", opts.cursor);
  if (opts?.search?.trim()) params.set("search", opts.search.trim());
  if (opts?.status?.trim()) params.set("status", opts.status.trim());

  const payload = await apiRequest<{
    items: ManufacturingWorkOrder[];
    limit?: number;
    offset?: number;
    hasMore?: boolean;
    nextCursor?: string | null;
  }>("/api/manufacturing/work-orders", { params });

  const limit = typeof payload.limit === "number" ? payload.limit : lim;
  const parsedOffset =
    typeof payload.offset === "number" ? payload.offset : opts?.cursor ? Number(opts.cursor) || 0 : 0;
  const items = payload.items ?? [];
  const hasMore =
    typeof payload.hasMore === "boolean" ? payload.hasMore : items.length === limit && limit > 0;
  const nextCursor =
    payload.nextCursor != null && String(payload.nextCursor) !== ""
      ? String(payload.nextCursor)
      : hasMore
        ? String(parsedOffset + items.length)
        : null;

  return { items, limit, offset: parsedOffset, hasMore, nextCursor };
}

export async function fetchManufacturingWorkOrders(
  opts?: FetchManufacturingWorkOrdersOpts
): Promise<ManufacturingWorkOrder[]> {
  const rows: ManufacturingWorkOrder[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < 20; i++) {
    const page = await fetchManufacturingWorkOrdersPage({ ...opts, limit: 50, cursor });
    rows.push(...page.items);
    if (!page.hasMore || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return rows;
}

export async function createManufacturingWorkOrder(payload: {
  productId?: string;
  bomId?: string;
  routingId?: string;
  grnId?: string;
  quantity: number;
  dueDate?: string;
  plannedDate?: string;
  notes?: string;
}): Promise<{ id: string; number: string }> {
  return apiRequest("/api/manufacturing/work-orders", { method: "POST", body: payload });
}

export async function runManufacturingWorkOrderAction(
  id: string,
  payload: { action: "release" | "start" | "complete" | "cancel"; producedQuantity?: number; scrapQuantity?: number }
): Promise<ManufacturingWorkOrder> {
  return apiRequest(`/api/manufacturing/work-orders/${encodeURIComponent(id)}/action`, {
    method: "POST",
    body: payload,
  });
}

export async function fetchManufacturingMrpPage(
  opts?: FetchManufacturingMrpOpts
): Promise<ManufacturingMrpResponse> {
  requireLiveApi("Manufacturing MRP");
  const params = new URLSearchParams();
  const lim = opts?.limit != null ? Math.min(Math.max(opts.limit, 1), 100) : 25;
  params.set("limit", String(lim));
  if (opts?.cursor) params.set("cursor", opts.cursor);
  if (opts?.search?.trim()) params.set("search", opts.search.trim());
  if (opts?.type === "WORK_ORDER" || opts?.type === "PURCHASE") params.set("type", opts.type);

  const payload = await apiRequest<ManufacturingMrpResponse>("/api/manufacturing/mrp", { params });
  const limit = typeof payload.limit === "number" ? payload.limit : lim;
  const parsedOffset =
    typeof payload.offset === "number" ? payload.offset : opts?.cursor ? Number(opts.cursor) || 0 : 0;
  const suggestions = payload.suggestions ?? payload.items ?? [];
  const hasMore =
    typeof payload.hasMore === "boolean"
      ? payload.hasMore
      : suggestions.length === limit && limit > 0;
  const nextCursor =
    payload.nextCursor != null && String(payload.nextCursor) !== ""
      ? String(payload.nextCursor)
      : hasMore
        ? String(parsedOffset + suggestions.length)
        : null;

  return {
    items: suggestions,
    suggestions,
    summary: payload.summary ?? {
      workOrderSuggestions: 0,
      purchaseSuggestions: 0,
      totalShortageQty: 0,
    },
    totalCount: payload.totalCount,
    limit,
    offset: parsedOffset,
    hasMore,
    nextCursor,
  };
}

export async function fetchManufacturingMrp(opts?: FetchManufacturingMrpOpts): Promise<ManufacturingMrpResponse> {
  const rows: ManufacturingMrpSuggestion[] = [];
  let cursor: string | undefined;
  let summary: ManufacturingMrpSummary = {
    workOrderSuggestions: 0,
    purchaseSuggestions: 0,
    totalShortageQty: 0,
  };
  for (let i = 0; i < 20; i++) {
    const page = await fetchManufacturingMrpPage({ ...opts, limit: 50, cursor });
    rows.push(...(page.suggestions ?? []));
    summary = page.summary;
    if (!page.hasMore || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return { items: rows, suggestions: rows, summary, totalCount: rows.length };
}

export async function applyManufacturingMrp(suggestionIds?: string[]): Promise<{ applied: boolean; created: Array<{ id: string; number: string; productId: string }> }> {
  return apiRequest("/api/manufacturing/mrp/apply", {
    method: "POST",
    body: { suggestionIds },
  });
}

export type MaterialAvailabilityLine = {
  productId: string;
  productName: string;
  productSku?: string;
  requiredQty: number;
  onHandQty: number;
  shortfall: number;
  uom: string;
  type: string;
};

export async function checkWorkOrderAvailability(
  bomId: string,
  quantity: number
): Promise<{ lines: MaterialAvailabilityLine[] }> {
  requireLiveApi("Work order availability check");
  const params = new URLSearchParams({ bomId, quantity: String(quantity) });
  return apiRequest<{ lines: MaterialAvailabilityLine[] }>(`/api/manufacturing/work-orders/availability?${params.toString()}`);
}
