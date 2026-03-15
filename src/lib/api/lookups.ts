import { apiRequest, requireLiveApi } from "@/lib/api/client";

export interface LookupOption {
  id: string;
  label: string;
}

export async function fetchBranchOptions(): Promise<LookupOption[]> {
  requireLiveApi("Branch options");
  const payload = await apiRequest<{ items: Array<{ id: string; name: string; code?: string }> }>("/api/branches");
  return (payload.items ?? []).map((item) => ({
    id: item.id,
    label: item.code ? `${item.code} - ${item.name}` : item.name,
  }));
}

export async function fetchWarehouseOptions(): Promise<LookupOption[]> {
  requireLiveApi("Warehouse options");
  const payload = await apiRequest<{ items: Array<{ id: string; name: string; code?: string }> }>("/api/master/warehouses");
  return (payload.items ?? []).map((item) => ({
    id: item.id,
    label: item.code ? `${item.code} - ${item.name}` : item.name,
  }));
}
