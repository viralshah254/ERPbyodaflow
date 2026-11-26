import { apiRequest, requireLiveApi } from "@/lib/api/client";
import type { WarehouseRow } from "@/lib/types/masters";

export type BackendWarehouse = {
  id: string;
  code?: string;
  name: string;
  branchId?: string;
  purpose?: WarehouseUpsertInput["purpose"];
  capabilities?: string[];
  status?: string;
  stockDisposition?: string;
  dispositionPending?: string;
};

export type WarehouseUpsertInput = {
  code: string;
  name: string;
  branchId?: string;
  purpose: "STORAGE" | "RECEIVING" | "QUARANTINE" | "DISPATCH" | "TRANSIT";
  capabilities: string[];
  status?: string;
};

export type WarehouseListView = "all" | "active" | "purpose" | "approval";

export type WarehouseCatalogueCounts = Record<WarehouseListView, number>;

export type WarehouseCatalogue = {
  items: BackendWarehouse[];
  total: number;
  counts: WarehouseCatalogueCounts;
};

export async function fetchWarehousesApi(opts?: { limit?: number; offset?: number }): Promise<BackendWarehouse[]> {
  requireLiveApi("Warehouses");
  const params = new URLSearchParams();
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.offset) params.set("offset", String(opts.offset));
  const query = params.toString();
  const payload = await apiRequest<{ items: BackendWarehouse[] }>(`/api/master/warehouses${query ? `?${query}` : ""}`);
  return payload.items ?? [];
}

/**
 * Stores setup asks the server for the search and the review filter, then reads every matching page.
 * The browser does not decide which stores exist.
 */
export async function fetchWarehouseCatalogueApi(query: { search?: string; view: WarehouseListView }): Promise<WarehouseCatalogue> {
  requireLiveApi("Warehouses");
  const pageSize = 200;
  const search = query.search?.trim() ?? "";
  const items: BackendWarehouse[] = [];
  let total = 0;
  let counts: WarehouseCatalogueCounts = { all: 0, active: 0, purpose: 0, approval: 0 };
  for (let offset = 0; offset < 5000; offset += pageSize) {
    const params: Record<string, string> = { view: query.view, limit: String(pageSize), offset: String(offset) };
    if (search) params.search = search;
    if (offset === 0) params.counts = "1";
    const page = await apiRequest<{ items?: BackendWarehouse[]; total?: number; counts?: WarehouseCatalogueCounts }>("/api/master/warehouses", { params });
    if (!Array.isArray(page.items) || typeof page.total !== "number") {
      throw new Error("Stores could not be loaded completely. Refresh and search again.");
    }
    if (page.counts) counts = page.counts;
    total = page.total;
    items.push(...page.items);
    if (items.length >= total || page.items.length < pageSize) break;
  }
  if (items.length < total) throw new Error("Stores could not be loaded completely. Refresh and search again.");
  return { items, total, counts };
}

export async function fetchWarehouseApi(id: string): Promise<BackendWarehouse> {
  requireLiveApi("Warehouse");
  return apiRequest<BackendWarehouse>(`/api/master/warehouses/${encodeURIComponent(id)}`);
}

/** The warehouse list defaults to 50 rows. Preparation must see the store that holds the ingredients. */
export async function fetchAllWarehousesApi(): Promise<BackendWarehouse[]> {
  const pageSize = 100;
  const rows: BackendWarehouse[] = [];
  for (let offset = 0; offset < 1000; offset += pageSize) {
    const page = await fetchWarehousesApi({ limit: pageSize, offset });
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

/** Fetch all warehouse codes in the org. Used by New Warehouse form to suggest the next sequential code. */
export async function fetchWarehouseCodesApi(): Promise<string[]> {
  requireLiveApi("Warehouse codes");
  const data = await apiRequest<{ codes: string[] }>("/api/master/warehouses/codes");
  return data.codes ?? [];
}

export async function createWarehouseApi(payload: WarehouseUpsertInput): Promise<{ id: string; name: string }> {
  requireLiveApi("Create warehouse");
  return apiRequest<{ id: string; name: string }>("/api/master/warehouses", {
    method: "POST",
    body: payload,
  });
}

export async function approveWarehouseDispositionApi(id: string): Promise<{ id: string; stockDisposition?: string }> {
  requireLiveApi("Approve warehouse disposition");
  return apiRequest(`/api/master/warehouses/${encodeURIComponent(id)}/disposition/approve`, { method: "POST" });
}

export async function updateWarehouseApi(id: string, payload: Partial<WarehouseUpsertInput> & { stockDisposition?: string }): Promise<BackendWarehouse> {
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
    branchId: warehouse.branchId,
    branch: warehouse.branchId ? branchLabels?.get(warehouse.branchId) ?? warehouse.branchId : undefined,
    purpose: warehouse.purpose,
    capabilities: warehouse.capabilities ?? [],
    status: warehouse.status ?? "ACTIVE",
    stockDisposition: warehouse.stockDisposition,
    dispositionPending: warehouse.dispositionPending,
  };
}
