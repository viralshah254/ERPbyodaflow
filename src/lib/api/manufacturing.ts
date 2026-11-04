import { requireManufacturingCapability } from "./manufacturing-capabilities";
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
  scrapFactorMode?: "RATIO" | "PERCENT";
  unitCost?: number;
  /** Store this component is issued from. Empty means the work order input store. */
  warehouseId?: string;
  warehouseName?: string;
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
  yieldTolerancePercent?: number;
  type: "bom" | "formula" | "disassembly";
  direction?: "STANDARD" | "REVERSE";
  isActive: boolean;
  lifecycle?: "DRAFT" | "EFFECTIVE" | "RETIRED" | "LEGACY";
  releaseChangeId?: string;
  parentRevisionId?: string;
  routeId?: string;
  outputWarehouseId?: string;
  outputWarehouseName?: string;
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
    critical?: boolean;
  qcRequired?: boolean;
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
  productBarcode?: string;
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
  updatedAt?: string;
  preparationStatus?: "READY" | "REQUIRED";
  preparationRevision?: number;
  preparationDefaults?: { inputWarehouseIds: string[]; outputWarehouseId?: string };
  bomSnapshot?: { name?: string; version?: string; yieldTolerancePercent?: number; quantity?: number; uom?: string };
  routingSnapshot?: { name?: string; updatedAt?: string; operations?: Array<{ operationId?: string; name: string; order: number; workCenter?: string; workCenterId?: string; durationMinutes?: number; setupMinutes?: number; runMinutesPerUnit?: number }> };
  dueDate?: string;
  plannedDate?: string;
  releasedAt?: string;
  startedAt?: string;
  completedAt?: string;
  measurementMode: "COUNT_ONLY" | "MANUAL_SCALE" | "DEVICE_SCALE" | "WEIGHBRIDGE";
  weighingRequired: boolean;
  measuredWeight?: number;
  deviceReadingId?: string;
  materialLines: Array<{
    lineId: string;
    productId: string;
    productName?: string;
    sku?: string;
    barcode?: string;
    uom?: string;
    plannedQuantity: number;
    issuedQuantity: number;
    returnedQuantity: number;
    consumedQuantity: number;
    warehouseId: string;
    warehouseName?: string;
    recipeQuantity?: number;
    recipeUom?: string;
    recipeToBaseFactor?: number;
    wipLotSplits?: Array<{ lotId: string; lotNumber?: string; quantity: number }>;
  }>;
  outputLines: Array<{
    lineId: string;
    productId: string;
    productName?: string;
    sku?: string;
    barcode?: string;
    uom?: string;
    plannedQuantity: number;
    producedQuantity: number;
    warehouseId: string;
    warehouseName?: string;
    recipeQuantity?: number;
    recipeUom?: string;
    recipeToBaseFactor?: number;
    wipLotSplits?: Array<{ lotId: string; lotNumber?: string; quantity: number }>;
  }>;
  productionLots?: Array<{ _id: string; productId: string; warehouseId: string; lotNumber: string; status: string; qcStatus: string; expiryDate?: string; remainingQuantity: number }>;
  operationExecution?: Array<{ operationId: string; name: string; order: number; critical: boolean; qcRequired: boolean; workCenter?: string; status: "PENDING" | "IN_PROGRESS" | "COMPLETED"; startedAt?: string; completedAt?: string; operatorId?: string; qcOutcome?: string }>;
  completions: Array<{ idempotencyKey: string; quantity: number; postedAt: string; measuredWeight?: number; measurementMode?: string; deviceReadingId?: string; inputLines?: Array<{ productId: string; uom?: string; quantity: number; consumedQuantity?: number; returnedQuantity?: number; consumedLotSplits?: Array<{ lotId: string; quantity: number }>; lotSplits?: Array<{ lotId: string; quantity: number }> }> }>;
  wipQuantity: number;
  reconciliation: {
    inputMass: number;
    outputMass: number;
    massVariance: number;
    countVariance: number;
    inputCost: number;
    outputCost: number;
    costVariance: number;
  };
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

export type ManufacturingPlanRun = {
  id: string;
  number: string;
  status: "OPEN" | "APPLIED";
  savedAt: string;
  suggestionCount: number;
  raisedCount: number;
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
  planRun?: ManufacturingPlanRun;
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
  outputWarehouseId?: string;
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

export async function fetchManufacturingWorkOrder(id: string): Promise<ManufacturingWorkOrder> {
  requireLiveApi("Manufacturing work order");
  return apiRequest(`/api/manufacturing/work-orders/${encodeURIComponent(id)}`);
}

export async function createManufacturingWorkOrder(payload: {
  productId?: string;
  bomId?: string;
  routingId?: string;
  grnId?: string;
  inputWarehouseId?: string;
  inputWarehouseIds?: string[];
  outputWarehouseId: string;
  measurementMode?: ManufacturingWorkOrder["measurementMode"];
  weighingRequired?: boolean;
  quantity: number;
  dueDate?: string;
  plannedDate?: string;
  notes?: string;
}): Promise<{ id: string; number: string }> {
  return apiRequest("/api/manufacturing/work-orders", { method: "POST", body: payload });
}

export async function runManufacturingWorkOrderAction(
  id: string,
  payload: {
    action: "release" | "start" | "complete" | "cancel";
    producedQuantity?: number;
    scrapQuantity?: number;
    idempotencyKey?: string;
    varianceReason?: string;
    measuredWeight?: number;
    deviceReadingId?: string;
    inputLines?: Array<{
      lineId: string;
      productId: string;
      warehouseId: string;
      quantity: number;
      consumedQuantity: number;
      returnedQuantity: number;
    }>;
    outputLines?: Array<{
      lineId: string;
      productId: string;
      warehouseId: string;
      quantity: number;
    }>;
  }
): Promise<ManufacturingWorkOrder> {
  await requireManufacturingCapability("outputActuals", "primary-base-output-v1");
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
    planRun: payload.planRun,
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

export async function applyManufacturingMrp(
  suggestionIds?: string[],
  planRunId?: string
): Promise<{
  applied: boolean;
  created: Array<{ id: string; number: string; productId: string; reused?: boolean }>;
  purchases?: Array<{ id: string; number: string; productId: string; reused?: boolean }>;
  purchasesNotRaised?: Array<{ id: string; productId: string; shortageQty: number }>;
  planRun?: ManufacturingPlanRun;
}> {
  return apiRequest("/api/manufacturing/mrp/apply", {
    method: "POST",
    body: { suggestionIds, planRunId },
  });
}

export type ProductionPlanRow = {
  productId: string;
  productName: string;
  productSku?: string;
  uom: string;
  bomId?: string;
  routingId?: string;
  requiredQty: number;
  onHandQty: number;
  incomingQty: number;
  shortageQty: number;
  warehouseShortfallQty?: number;
  suggestedQty?: number;
};

export type ProductionPlanTreeNode = {
  productId: string;
  productName: string;
  quantity: number;
  uom: string;
  kind: "pack" | "make" | "buy";
  children: ProductionPlanTreeNode[];
};

export type ExplodedProductionPlan = {
  packLines: ProductionPlanRow[];
  make: ProductionPlanRow[];
  buy: ProductionPlanRow[];
  tree: ProductionPlanTreeNode[];
};

export type ProductionPlanLineInput = {
  productId: string;
  quantity: number;
};

export async function fetchProductionPlanDefaults(opts?: {
  search?: string;
  limit?: number;
  cursor?: string;
  suggestedOnly?: boolean;
  scope?: "pack" | "makeable";
}): Promise<{
  items: ProductionPlanRow[];
  totalCount?: number;
  limit?: number;
  offset?: number;
  hasMore?: boolean;
}> {
  requireLiveApi("Production plan");
  const params: Record<string, string> = {};
  if (opts?.search?.trim()) params.search = opts.search.trim();
  if (opts?.limit != null) params.limit = String(opts.limit);
  if (opts?.cursor != null && opts.cursor !== "") params.cursor = opts.cursor;
  if (opts?.suggestedOnly) params.suggestedOnly = "true";
  if (opts?.scope) params.scope = opts.scope;
  return apiRequest("/api/manufacturing/production-plan/defaults", { params });
}

export async function explodeProductionPlan(lines: ProductionPlanLineInput[]): Promise<ExplodedProductionPlan> {
  requireLiveApi("Production plan");
  return apiRequest("/api/manufacturing/production-plan/explode", {
    method: "POST",
    body: { lines },
  });
}

export async function applyProductionPlan(lines: ProductionPlanLineInput[], requestId: string, measurementMode: "COUNT_ONLY" | "MANUAL_SCALE" | "DEVICE_SCALE" | "WEIGHBRIDGE" = "COUNT_ONLY"): Promise<{
  applied: boolean;
  created: Array<{ id: string; number: string; productId: string; quantity: number; reused?: boolean }>;
  explode: ExplodedProductionPlan;
}> {
  requireLiveApi("Production plan");
  await requireManufacturingCapability("productionPlan", "active-products-weighing-v1");
  return apiRequest("/api/manufacturing/production-plan/apply", {
    method: "POST",
    body: { lines, requestId, measurementMode },
  });
}

export type MaterialAvailabilityLine = {
  productId: string;
  productName: string;
  productSku?: string;
  barcode?: string;
  requiredQty: number;
  onHandQty: number;
  shortfall: number;
  uom: string;
  type: string;
  warehouseId?: string;
  warehouseName?: string;
};

export async function checkWorkOrderAvailability(
  bomId: string,
  quantity: number,
  warehouseIds: string | string[]
): Promise<{ lines: MaterialAvailabilityLine[] }> {
  requireLiveApi("Work order availability check");
  const ids = (Array.isArray(warehouseIds) ? warehouseIds : [warehouseIds]).map((id) => id.trim()).filter(Boolean);
  const params = new URLSearchParams({
    bomId,
    quantity: String(quantity),
    warehouseIds: ids.join(","),
  });
  if (ids[0]) params.set("warehouseId", ids[0]);
  return apiRequest<{ lines: MaterialAvailabilityLine[] }>(`/api/manufacturing/work-orders/availability?${params.toString()}`);
}

export async function checkExistingWorkOrderAvailability(id: string): Promise<{ lines: MaterialAvailabilityLine[] }> {
  try {
    return await apiRequest<{ lines: MaterialAvailabilityLine[] }>(`/api/manufacturing/work-orders/${encodeURIComponent(id)}/availability`);
  } catch (error) {
    if ((error as { status?: number }).status === 404) {
      throw new Error("Warehouse availability is unavailable. Refresh the work order; if it still opens, the connected backend may need the work-order availability release. No stock has been changed.");
    }
    throw error;
  }
}

export type WorkOrderPreparationPreview = {
  eligibleLots?: Array<{ _id: string; productId: string; warehouseId: string; lotNumber: string; expiryDate: string; remainingQuantity: number }>;
  availability?: Array<{ productId: string; warehouseId: string; quantity: number }>;
  version: string;
  previewToken: string;
  prepared: Pick<ManufacturingWorkOrder, "materialLines" | "outputLines" | "bomSnapshot" | "routingSnapshot">;
};
export async function previewWorkOrderPreparation(id: string, stores: { inputWarehouseIds: string[]; outputWarehouseId: string }) {
  await requireManufacturingCapability("preparation", "work-order-preparation-v1");
  return apiRequest<WorkOrderPreparationPreview>(`/api/manufacturing/work-orders/${encodeURIComponent(id)}/prepare`, { method: "POST", body: stores });
}
export async function saveWorkOrderPreparation(id: string, stores: { inputWarehouseIds: string[]; outputWarehouseId: string }, preview: WorkOrderPreparationPreview) {
  await requireManufacturingCapability("preparation", "work-order-preparation-v1");
  return apiRequest<ManufacturingWorkOrder>(`/api/manufacturing/work-orders/${encodeURIComponent(id)}/prepare`, { method: "POST", body: { ...stores, commit: true, version: preview.version, previewToken: preview.previewToken } });
}

export async function postWorkOrderMaterials(id: string, body: { action: "issue" | "return"; idempotencyKey: string; reason: string; lines: Array<{ lineId: string; quantity: number }> }) {
  await requireManufacturingCapability("floorMaterials", "work-order-materials-v1");
  return apiRequest<ManufacturingWorkOrder>(`/api/manufacturing/work-orders/${encodeURIComponent(id)}/materials`, { method: "POST", body });
}
export async function postWorkOrderOperation(id: string, operationId: string, body: { status: "IN_PROGRESS" | "COMPLETED"; qcOutcome?: string; qcReason?: string }) {
  await requireManufacturingCapability("operations", "critical-operation-gates-v1");
  return apiRequest<ManufacturingWorkOrder>(`/api/manufacturing/work-orders/${encodeURIComponent(id)}/operations/${encodeURIComponent(operationId)}`, { method: "POST", body });
}
