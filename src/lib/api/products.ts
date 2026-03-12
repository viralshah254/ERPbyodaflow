import { createProduct, getProductById, listProducts } from "@/lib/data/products.repo";
import type { ProductRow } from "@/lib/mock/masters";
import { apiRequest, isApiConfigured } from "./client";

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

function mapLocalProduct(item: ProductRow): ProductRow {
  return {
    id: item.id,
    sku: item.sku,
    name: item.name,
    category: item.category,
    unit: item.unit,
    baseUom: item.baseUom,
    status: item.status,
    currentStock: item.currentStock,
  };
}

export async function fetchProductsApi(search?: string, status?: string): Promise<ProductRow[]> {
  if (!isApiConfigured()) {
    let rows = listProducts().map(mapLocalProduct);
    if (search?.trim()) {
      const query = search.trim().toLowerCase();
      rows = rows.filter(
        (row) =>
          row.sku.toLowerCase().includes(query) ||
          row.name.toLowerCase().includes(query) ||
          row.category?.toLowerCase().includes(query)
      );
    }
    if (status) rows = rows.filter((row) => row.status === status);
    return rows;
  }
  const params = new URLSearchParams();
  if (search?.trim()) params.set("search", search.trim());
  if (status) params.set("status", status);
  const data = await apiRequest<{ items: BackendProduct[] }>("/api/products", { params });
  return data.items.map(mapProduct);
}

export async function fetchProductApi(id: string): Promise<ProductRow | null> {
  if (!isApiConfigured()) {
    const product = getProductById(id);
    return product ? mapLocalProduct(product) : null;
  }
  const data = await apiRequest<BackendProduct>(`/api/products/${id}`);
  return mapProduct(data);
}

export async function createProductApi(payload: ProductPayload): Promise<{ id: string }> {
  if (!isApiConfigured()) {
    const created = createProduct({
      sku: payload.sku ?? `SKU-${Date.now()}`,
      name: payload.name,
      category: payload.category,
      unit: payload.unit,
      baseUom: payload.baseUom ?? payload.unit,
      status: payload.status ?? "ACTIVE",
      currentStock: 0,
    });
    return { id: created.id };
  }
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
