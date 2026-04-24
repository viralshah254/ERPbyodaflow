import { apiRequest, requireLiveApi } from "./client";

export type CustomerCategoryRow = {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  /** Default price list for all customers in this category. Per-customer override takes priority. */
  defaultPriceListId?: string | null;
};

export async function fetchCustomerCategoriesApi(): Promise<CustomerCategoryRow[]> {
  requireLiveApi("Customer categories");
  const payload = await apiRequest<{ items: CustomerCategoryRow[] }>("/api/settings/customer-categories");
  return payload.items ?? [];
}

export async function createCustomerCategoryApi(input: {
  code: string;
  name: string;
  description?: string;
  defaultPriceListId?: string | null;
}): Promise<CustomerCategoryRow> {
  requireLiveApi("Customer categories");
  return apiRequest<CustomerCategoryRow>("/api/settings/customer-categories", {
    method: "POST",
    body: input,
  });
}

export async function updateCustomerCategoryApi(
  id: string,
  patch: Partial<{ code: string; name: string; description: string; isActive: boolean; defaultPriceListId: string | null }>
): Promise<CustomerCategoryRow> {
  requireLiveApi("Customer categories");
  return apiRequest<CustomerCategoryRow>(`/api/settings/customer-categories/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: patch,
  });
}

