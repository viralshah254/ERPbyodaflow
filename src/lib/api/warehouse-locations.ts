import { apiRequest, requireLiveApi } from "@/lib/api/client";

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
  if (!warehouseId) return [];
  requireLiveApi("Warehouse locations");
  const payload = await apiRequest<{ items: WarehouseLocationRow[] }>(
    `/api/master/warehouses/${encodeURIComponent(warehouseId)}/locations`
  );
  return payload.items ?? [];
}

export async function createWarehouseLocation(
  warehouseId: string,
  payload: { type: "BIN" | "ZONE" | "RACK"; name: string; code?: string; parentId?: string }
): Promise<{ id: string; name: string }> {
  requireLiveApi("Create warehouse location");
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
  requireLiveApi("Update warehouse location");
  return apiRequest(`/api/master/warehouses/${encodeURIComponent(warehouseId)}/locations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: payload,
  });
}
