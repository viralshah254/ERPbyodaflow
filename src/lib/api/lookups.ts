import { apiRequest, isApiConfigured } from "@/lib/api/client";
import { getMockWarehouses } from "@/lib/mock/masters";

export interface LookupOption {
  id: string;
  label: string;
}

export async function fetchBranchOptions(): Promise<LookupOption[]> {
  if (!isApiConfigured()) {
    return [
      { id: "main-branch", label: "MAIN - Main Branch" },
    ];
  }
  const payload = await apiRequest<{ items: Array<{ id: string; name: string; code?: string }> }>("/api/branches");
  return (payload.items ?? []).map((item) => ({
    id: item.id,
    label: item.code ? `${item.code} - ${item.name}` : item.name,
  }));
}

export async function fetchWarehouseOptions(): Promise<LookupOption[]> {
  if (!isApiConfigured()) {
    return getMockWarehouses().map((item) => ({
      id: item.id,
      label: item.code ? `${item.code} - ${item.name}` : item.name,
    }));
  }
  const payload = await apiRequest<{ items: Array<{ id: string; name: string; code?: string }> }>("/api/master/warehouses");
  return (payload.items ?? []).map((item) => ({
    id: item.id,
    label: item.code ? `${item.code} - ${item.name}` : item.name,
  }));
}
