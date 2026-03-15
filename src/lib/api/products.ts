import type { ProductRow } from "@/lib/mock/masters";
import { apiRequest, requireLiveApi } from "./client";

type BackendProduct = {
  id: string;
  sku?: string;
  name: string;
  category?: string;
  unit?: string;
  baseUom?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  description?: string;
};

export type ProductPayload = {
  sku?: string;
  name: string;
  category?: string;
  unit?: string;
  baseUom?: string;
  status?: "ACTIVE" | "INACTIVE";
  description?: string;
};

function mapProduct(item: BackendProduct): ProductRow {
  return {
    id: item.id,
    sku: item.sku ?? item.id,
    name: item.name,
    category: item.category,
    unit: item.unit ?? item.baseUom,
    baseUom: item.baseUom ?? item.unit,
    status: item.status ?? "ACTIVE",
  };
}

export async function fetchProductsApi(search?: string, status?: string): Promise<ProductRow[]> {
  requireLiveApi("Products");
  const params = new URLSearchParams();
  if (search?.trim()) params.set("search", search.trim());
  if (status) params.set("status", status);
  const data = await apiRequest<{ items: BackendProduct[] }>("/api/products", { params });
  return data.items.map(mapProduct);
}

export async function fetchProductApi(id: string): Promise<ProductRow | null> {
  requireLiveApi("Product detail");
  const data = await apiRequest<BackendProduct>(`/api/products/${id}`);
  return mapProduct(data);
}

export async function createProductApi(payload: ProductPayload): Promise<{ id: string }> {
  requireLiveApi("Product creation");
  return apiRequest<{ id: string }>("/api/products", {
    method: "POST",
    body: {
      sku: payload.sku,
      name: payload.name,
      category: payload.category,
      unit: payload.unit,
      baseUom: payload.baseUom,
      status: payload.status,
      description: payload.description,
    },
  });
}
