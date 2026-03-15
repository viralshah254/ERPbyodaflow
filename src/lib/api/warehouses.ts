import { apiRequest, requireLiveApi } from "@/lib/api/client";
import type { WarehouseRow } from "@/lib/mock/masters";

type BackendWarehouse = {
  id: string;
  code?: string;
  name: string;
  branchId?: string;
  status?: string;
};

export type WarehouseUpsertInput = {
  code: string;
  name: string;
  branchId?: string;
  status?: string;
};

export async function fetchWarehousesApi(): Promise<BackendWarehouse[]> {
  requireLiveApi("Warehouses");
  const payload = await apiRequest<{ items: BackendWarehouse[] }>("/api/master/warehouses");
  return payload.items ?? [];
}

export async function createWarehouseApi(payload: WarehouseUpsertInput): Promise<{ id: string; name: string }> {
  requireLiveApi("Create warehouse");
  return apiRequest<{ id: string; name: string }>("/api/master/warehouses", {
    method: "POST",
    body: payload,
  });
}

export async function updateWarehouseApi(id: string, payload: Partial<WarehouseUpsertInput>): Promise<BackendWarehouse> {
  requireLiveApi("Update warehouse");
  return apiRequest<BackendWarehouse>(`/api/master/warehouses/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: payload,
  });
}

export function mapWarehouseRow(
  warehouse: BackendWarehouse,
  branchLabels?: Map<string, string>
): WarehouseRow {
  return {
    id: warehouse.id,
    code: warehouse.code ?? "",
    name: warehouse.name,
    branch: warehouse.branchId ? branchLabels?.get(warehouse.branchId) ?? warehouse.branchId : undefined,
    status: warehouse.status ?? "ACTIVE",
  };
}
