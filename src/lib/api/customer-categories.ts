import { apiRequest, requireLiveApi } from "./client";

export type CustomerCategoryRow = {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
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
}): Promise<CustomerCategoryRow> {
  requireLiveApi("Customer categories");
  return apiRequest<CustomerCategoryRow>("/api/settings/customer-categories", {
    method: "POST",
    body: input,
  });
}

