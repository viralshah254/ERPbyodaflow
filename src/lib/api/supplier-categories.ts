import { apiRequest, requireLiveApi } from "./client";

export type SupplierCategoryRow = {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
};

export async function fetchSupplierCategoriesApi(): Promise<SupplierCategoryRow[]> {
  requireLiveApi("Supplier categories");
  const payload = await apiRequest<{ items: SupplierCategoryRow[] }>("/api/settings/supplier-categories");
  return payload.items ?? [];
}

export async function createSupplierCategoryApi(input: {
  code: string;
  name: string;
  description?: string;
}): Promise<SupplierCategoryRow> {
  requireLiveApi("Supplier categories");
  return apiRequest<SupplierCategoryRow>("/api/settings/supplier-categories", {
    method: "POST",
    body: input,
  });
}

export async function updateSupplierCategoryApi(
  id: string,
  patch: Partial<{ code: string; name: string; description: string; isActive: boolean }>
): Promise<SupplierCategoryRow> {
  requireLiveApi("Supplier categories");
  return apiRequest<SupplierCategoryRow>(`/api/settings/supplier-categories/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: patch,
  });
}
