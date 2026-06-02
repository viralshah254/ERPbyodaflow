import { apiRequest, requireLiveApi } from "./client";

export interface ItemCategoryRow {
  id: string;
  code: string;
  name: string;
  description?: string;
  parentId?: string;
  isActive: boolean;
}

export async function fetchProductCategoriesApi(): Promise<ItemCategoryRow[]> {
  requireLiveApi("Product categories");
  const payload = await apiRequest<{ items: ItemCategoryRow[] }>(
    "/api/master-data/product/item-categories"
  );
  return payload.items ?? [];
}

export async function createProductCategoryApi(payload: {
  code: string;
  name: string;
  description?: string;
  parentId?: string;
  isActive?: boolean;
}): Promise<{ id: string }> {
  requireLiveApi("Create product category");
  return apiRequest<{ id: string }>(
    "/api/master-data/product/item-categories",
    {
      method: "POST",
      body: payload,
    }
  );
}

export async function updateProductCategoryApi(
  id: string,
  payload: { name?: string; code?: string; description?: string; isActive?: boolean }
): Promise<ItemCategoryRow> {
  requireLiveApi("Update product category");
  return apiRequest<ItemCategoryRow>(
    `/api/master-data/product/item-categories/${id}`,
    { method: "PATCH", body: payload }
  );
}

export async function deleteProductCategoryApi(
  id: string
): Promise<{ ok: boolean; detachedProducts: number }> {
  requireLiveApi("Delete product category");
  return apiRequest<{ ok: boolean; detachedProducts: number }>(
    `/api/master-data/product/item-categories/${id}`,
    { method: "DELETE" }
  );
}
