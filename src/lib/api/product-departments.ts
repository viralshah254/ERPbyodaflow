import { apiRequest, requireLiveApi } from "./client";

export interface ProductDepartmentCategoryRef {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface ProductDepartmentRow {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  categoryIds: string[];
  categories: ProductDepartmentCategoryRef[];
}

export async function fetchProductDepartmentsApi(): Promise<ProductDepartmentRow[]> {
  requireLiveApi("Product departments");
  const payload = await apiRequest<{ items: ProductDepartmentRow[] }>(
    "/api/master-data/product/departments"
  );
  return (payload.items ?? []).map((item) => ({
    ...item,
    categoryIds: item.categoryIds ?? [],
    categories: item.categories ?? [],
  }));
}

export async function createProductDepartmentApi(payload: {
  name: string;
  code?: string;
  description?: string;
  categoryIds?: string[];
  isActive?: boolean;
}): Promise<{ id: string; code: string }> {
  requireLiveApi("Create product department");
  return apiRequest<{ id: string; code: string }>("/api/master-data/product/departments", {
    method: "POST",
    body: payload,
  });
}

export async function updateProductDepartmentApi(
  id: string,
  payload: {
    name?: string;
    code?: string;
    description?: string;
    categoryIds?: string[];
    isActive?: boolean;
  }
): Promise<ProductDepartmentRow> {
  requireLiveApi("Update product department");
  return apiRequest<ProductDepartmentRow>(`/api/master-data/product/departments/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteProductDepartmentApi(id: string): Promise<{ ok: boolean }> {
  requireLiveApi("Delete product department");
  return apiRequest<{ ok: boolean }>(`/api/master-data/product/departments/${id}`, {
    method: "DELETE",
  });
}
