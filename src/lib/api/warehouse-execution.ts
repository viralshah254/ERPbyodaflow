import { apiRequest, requireLiveApi } from "@/lib/api/client";

export type WarehousePickPackRow = {
  id: string;
  number: string;
  reference: string;
  sourceDocumentId?: string;
  sourceDocumentNumber?: string;
  sourceDocumentStatus?: string;
  customer?: string;
  warehouseId?: string;
  status: string;
  cartonsCount?: number;
  packingNote?: string;
  courier?: string;
  trackingRef?: string;
  vehicleId?: string;
  vehicleCode?: string;
  vehicleMode?: "LEASED" | "SPOT_HIRE";
  outboundTripId?: string;
  /** When true, fulfilment warehouse is main stock only (Cool Catch); PATCH pick-pack warehouse is rejected. */
  coolCatchFulfilmentLocked?: boolean;
  /** Server hint when pick lines do not align with StockLevel data (see copy in UI). */
  stockLookupHint?: string;
  /** Product IDs on pick lines with no StockLevel documents — use to compare with Inventory. */
  productIdsWithoutStockLevels?: string[];
  /** Optional better ACTIVE fulfilment site by available-stock coverage (non-destructive hint). */
  suggestedFulfilmentWarehouseId?: string;
  suggestedFulfilmentWarehouseLabel?: string;
  lines: Array<{
    id: string;
    productId: string;
    variantId?: string;
    sku?: string;
    productName?: string;
    /** Qty to pick/issue in warehouse base UOM (PCS for FMCG). */
    quantity: number;
    pickedQty?: number;
    /** Sales/DN UOM (e.g. CARTON) — display; stock uses `quantity`. */
    documentUnit?: string;
    documentQuantity?: number;
    unitsPer?: number;
    baseUom?: string;
    /** True when pack UOM has no unitsPer > 1 on packaging (FMCG). */
    packagingConversionMissing?: boolean;
    suggestedBin?: string;
    locationId?: string;
    /** Available quantity at fulfilment warehouse (on-hand minus reserved). */
    onHandWarehouse?: number;
    /** Available at suggested bin when locationId is set. */
    onHandBin?: number;
    /** Available in canonical MAIN / primary stock warehouse (may differ from fulfilment warehouse). */
    onHandPrimaryWarehouse?: number;
    /** Sum of available quantity across all warehouses (display only). */
    onHandOrgWide?: number;
    /** Extra line added at pick time — can be removed while PENDING. */
    addedAtPickPack?: boolean;
    /** Server-computed: show remove control while PENDING. */
    canRemove?: boolean;
  }>;
  /** Resolved primary stock warehouse (code MAIN); used for MAIN stock column. */
  primaryStockWarehouseId?: string;
};

export type WarehousePutawayRow = {
  id: string;
  grnNumber: string;
  sourceDocumentId?: string;
  sourceDocumentStatus?: string;
  date?: string;
  warehouse?: string;
  warehouseId?: string;
  poRef?: string;
  status: string;
  lines: Array<{
    id: string;
    productId?: string;
    sku?: string;
    productName?: string;
    receivedQty: number;
    receivedWeightKg?: number | null;
    putawayQty: number;
    allocatedBins?: Array<{ binCode: string; qty: number }>;
  }>;
};

export type WarehouseCycleCountRow = {
  id: string;
  number: string;
  warehouseId?: string;
  warehouse?: string;
  status: string;
  lines: Array<{
    id: string;
    productId: string;
    sku?: string;
    productName?: string;
    locationId?: string;
    locationCode?: string;
    systemQty: number;
    countedQty: number;
    variance: number;
  }>;
};

export type WarehouseLocationStockRow = {
  id: string;
  productId: string;
  sku?: string;
  productName: string;
  warehouseId: string;
  locationId?: string;
  locationCode?: string;
  locationName?: string;
  quantity: number;
  reservedQuantity: number;
  updatedAt?: string;
};

export async function fetchPickPackTasks(filters?: { status?: string; sourceDocumentId?: string }): Promise<WarehousePickPackRow[]> {
  requireLiveApi("Pick-pack tasks");
  const payload = await apiRequest<{ items: WarehousePickPackRow[] }>("/api/warehouse/pick-pack", {
    params: filters,
  });
  return payload.items ?? [];
}

export async function fetchPickPackTask(id: string): Promise<WarehousePickPackRow> {
  requireLiveApi("Pick-pack task detail");
  return apiRequest<WarehousePickPackRow>(`/api/warehouse/pick-pack/${encodeURIComponent(id)}`);
}

export type StagePickPackStockResponse = {
  transferId: string;
  number: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  lines: Array<{ productId: string; sku?: string; need: number; moved: number }>;
};

export async function stagePickPackStock(
  id: string,
  body?: { fromWarehouseId?: string }
): Promise<StagePickPackStockResponse> {
  requireLiveApi("Stage pick-pack stock");
  return apiRequest<StagePickPackStockResponse>(`/api/warehouse/pick-pack/${encodeURIComponent(id)}/stage-stock`, {
    method: "POST",
    body: body?.fromWarehouseId ? { fromWarehouseId: body.fromWarehouseId } : {},
  });
}

export async function runPickPackAction(
  id: string,
  payload: {
    action: "pick" | "pack" | "dispatch" | "complete";
    cartonsCount?: number;
    packingNote?: string;
    courier?: string;
    trackingRef?: string;
    lines?: Array<{ lineId: string; pickedQty?: number; locationId?: string }>;
    vehicleId?: string;
    vehicleMode?: "LEASED" | "SPOT_HIRE";
    carrier?: string;
    batchLabel?: string;
  }
): Promise<void> {
  await apiRequest(`/api/warehouse/pick-pack/${encodeURIComponent(id)}/action`, {
    method: "POST",
    body: payload,
  });
}

export async function patchPickPackWarehouse(id: string, warehouseId: string): Promise<void> {
  requireLiveApi("Pick-pack fulfilment warehouse");
  await apiRequest(`/api/warehouse/pick-pack/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: { warehouseId },
  });
}

export async function patchPickPackLines(
  id: string,
  body: {
    updates?: Array<{
      lineId: string;
      productId?: string;
      quantity?: number;
      pickedQty?: number;
      locationId?: string;
      remove?: boolean;
    }>;
    addLines?: Array<{
      productId: string;
      quantity: number;
      pickedQty?: number;
      substituteForLineId?: string;
    }>;
    replaceLineWithBreakdown?: {
      lineId: string;
      breakdown: Array<{ productId: string; quantity: number }>;
    };
  }
): Promise<void> {
  requireLiveApi("Pick-pack line edits");
  await apiRequest(`/api/warehouse/pick-pack/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
  });
}

export async function fetchPutawayTasks(filters?: { status?: string; sourceDocumentId?: string }): Promise<WarehousePutawayRow[]> {
  requireLiveApi("Putaway tasks");
  const payload = await apiRequest<{ items: WarehousePutawayRow[] }>("/api/warehouse/putaway", {
    params: filters,
  });
  return payload.items ?? [];
}

export async function fetchPutawayTask(id: string): Promise<WarehousePutawayRow | null> {
  requireLiveApi("Putaway task detail");
  try {
    return await apiRequest<WarehousePutawayRow>(`/api/warehouse/putaway/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export async function updatePutawayTask(id: string, lines: Array<{ lineId: string; putawayQty?: number; toLocationId?: string }>): Promise<void> {
  await apiRequest(`/api/warehouse/putaway/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: { lines },
  });
}

export async function confirmPutawayTask(id: string): Promise<void> {
  await apiRequest(`/api/warehouse/putaway/${encodeURIComponent(id)}/confirm`, {
    method: "POST",
  });
}

export async function fetchCycleCountTasks(warehouseId?: string): Promise<WarehouseCycleCountRow[]> {
  requireLiveApi("Cycle count tasks");
  const payload = await apiRequest<{ items: WarehouseCycleCountRow[] }>("/api/warehouse/cycle-counts", {
    params: warehouseId ? { warehouseId } : undefined,
  });
  return payload.items ?? [];
}

export async function fetchCycleCountTask(id: string): Promise<WarehouseCycleCountRow | null> {
  requireLiveApi("Cycle count task detail");
  try {
    return await apiRequest<WarehouseCycleCountRow>(`/api/warehouse/cycle-counts/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export async function createCycleCountTask(payload: { warehouseId: string; locationId?: string }): Promise<{ id: string; number: string }> {
  return apiRequest("/api/warehouse/cycle-counts", {
    method: "POST",
    body: payload,
  });
}

export async function updateCycleCountTaskLine(id: string, lineId: string, countedQty: number): Promise<void> {
  await apiRequest(`/api/warehouse/cycle-counts/${encodeURIComponent(id)}/lines/${encodeURIComponent(lineId)}`, {
    method: "PATCH",
    body: { countedQty },
  });
}

export async function submitCycleCountTask(id: string): Promise<void> {
  await apiRequest(`/api/warehouse/cycle-counts/${encodeURIComponent(id)}/submit`, {
    method: "POST",
  });
}

export async function fetchLocationStock(warehouseId?: string): Promise<WarehouseLocationStockRow[]> {
  requireLiveApi("Warehouse location stock");
  const payload = await apiRequest<{ items: WarehouseLocationStockRow[] }>("/api/warehouse/location-stock", {
    params: warehouseId ? { warehouseId } : undefined,
  });
  return payload.items ?? [];
}
