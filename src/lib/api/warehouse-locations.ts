import { apiRequest, isApiConfigured } from "@/lib/api/client";

export type WarehouseLocationRow = {
  id: string;
  warehouseId: string;
  type: "BIN" | "ZONE" | "RACK";
  name: string;
  code?: string;
  parentId?: string;
  status?: "ACTIVE" | "INACTIVE";
};

export async function fetchWarehouseLocations(warehouseId: string): Promise<WarehouseLocationRow[]> {
  if (!isApiConfigured() || !warehouseId) return [];
  const payload = await apiRequest<{ items: WarehouseLocationRow[] }>(
    `/api/master/warehouses/${encodeURIComponent(warehouseId)}/locations`
  );
  return payload.items ?? [];
}

export async function createWarehouseLocation(
  warehouseId: string,
  payload: { type: "BIN" | "ZONE" | "RACK"; name: string; code?: string; parentId?: string }
): Promise<{ id: string; name: string }> {
  return apiRequest(`/api/master/warehouses/${encodeURIComponent(warehouseId)}/locations`, {
    method: "POST",
    body: payload,
  });
}

export async function updateWarehouseLocation(
  warehouseId: string,
  id: string,
  payload: Partial<{ type: "BIN" | "ZONE" | "RACK"; name: string; code: string; parentId: string; status: "ACTIVE" | "INACTIVE" }>
): Promise<WarehouseLocationRow> {
  return apiRequest(`/api/master/warehouses/${encodeURIComponent(warehouseId)}/locations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: payload,
  });
}
