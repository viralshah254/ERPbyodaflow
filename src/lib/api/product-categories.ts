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
