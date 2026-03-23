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
  lines: Array<{
    id: string;
    productId: string;
    sku?: string;
    productName?: string;
    quantity: number;
    pickedQty?: number;
    suggestedBin?: string;
    locationId?: string;
  }>;
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

export async function fetchPickPackTask(id: string): Promise<WarehousePickPackRow | null> {
  requireLiveApi("Pick-pack task detail");
  try {
    return await apiRequest<WarehousePickPackRow>(`/api/warehouse/pick-pack/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
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
  }
): Promise<void> {
  await apiRequest(`/api/warehouse/pick-pack/${encodeURIComponent(id)}/action`, {
    method: "POST",
    body: payload,
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
