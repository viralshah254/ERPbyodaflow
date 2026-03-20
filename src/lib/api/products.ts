import type { ProductRow } from "@/lib/types/masters";
import { apiRequest, requireLiveApi } from "./client";

type BackendProduct = {
  id: string;
  sku?: string;
  name: string;
  category?: string;
  unit?: string;
  baseUom?: string;
  productType?: "RAW" | "FINISHED" | "BOTH";
  defaultTaxCodeId?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  description?: string;
};

export type ProductPayload = {
  sku?: string;
  code?: string;
  name: string;
  category?: string;
  unit?: string;
  baseUom?: string;
  productType?: "RAW" | "FINISHED" | "BOTH";
  defaultTaxCodeId?: string;
  status?: "ACTIVE" | "INACTIVE";
  description?: string;
};

function mapProduct(item: BackendProduct & { categoryId?: string; uom?: string }): ProductRow {
  const category = item.category ?? item.categoryId;
  const uom = item.unit ?? item.baseUom ?? item.uom;
  return {
    id: item.id,
    sku: item.sku ?? item.id,
    name: item.name,
    category,
    unit: uom,
    baseUom: uom,
    productType: item.productType,
    defaultTaxCodeId: item.defaultTaxCodeId,
    status: item.status ?? "ACTIVE",
  };
}

export type FetchProductsOptions = {
  search?: string;
  status?: string;
  purchasable?: boolean;
  sellable?: boolean;
  productType?: "RAW" | "FINISHED" | "BOTH";
};

export async function fetchProductsApi(
  searchOrOptions?: string | FetchProductsOptions,
  status?: string
): Promise<ProductRow[]> {
  requireLiveApi("Products");
  const params = new URLSearchParams();
  let search: string | undefined;
  let purchasable: boolean | undefined;
  let sellable: boolean | undefined;
  let productType: "RAW" | "FINISHED" | "BOTH" | undefined;
  if (typeof searchOrOptions === "object" && searchOrOptions != null) {
    search = searchOrOptions.search;
    status = searchOrOptions.status ?? status;
    purchasable = searchOrOptions.purchasable;
    sellable = searchOrOptions.sellable;
    productType = searchOrOptions.productType;
  } else {
    search = searchOrOptions;
  }
  if (search?.trim()) params.set("search", search.trim());
  if (status) params.set("status", status);
  if (purchasable) params.set("purchasable", "true");
  if (sellable) params.set("sellable", "true");
  if (productType) params.set("productType", productType);
  const data = await apiRequest<{ items: BackendProduct[] }>("/api/products", { params });
  return data.items.map(mapProduct);
}

/** Fetch all SKUs in the org (no pagination). Use for Existing SKUs list when creating products. */
export async function fetchProductSkusApi(): Promise<string[]> {
  requireLiveApi("Product SKUs");
  const data = await apiRequest<{ skus: string[] }>("/api/products/skus");
  return data.skus ?? [];
}

/** Fetch all product codes in the org. Used by New Product form to suggest the next sequential code. */
export async function fetchProductCodesApi(): Promise<string[]> {
  requireLiveApi("Product codes");
  const data = await apiRequest<{ codes: string[] }>("/api/products/codes");
  return data.codes ?? [];
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
      code: payload.code,
      name: payload.name,
      category: payload.category,
      unit: payload.unit,
      baseUom: payload.baseUom,
      productType: payload.productType,
      defaultTaxCodeId: payload.defaultTaxCodeId,
      status: payload.status,
      description: payload.description,
    },
  });
}

export type ProductPatchPayload = Partial<Pick<ProductPayload, "sku" | "code" | "name" | "category" | "unit" | "baseUom" | "productType" | "defaultTaxCodeId" | "status" | "description">>;

export async function patchProductApi(id: string, payload: ProductPatchPayload): Promise<void> {
  requireLiveApi("Product patch");
  await apiRequest(`/api/products/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: {
      sku: payload.sku,
      code: payload.code,
      name: payload.name,
      category: payload.category,
      unit: payload.unit,
      baseUom: payload.baseUom,
      productType: payload.productType,
      defaultTaxCodeId: payload.defaultTaxCodeId,
      status: payload.status,
      description: payload.description,
    },
  });
}

export async function deleteProductApi(id: string): Promise<void> {
  requireLiveApi("Product delete");
  await apiRequest(`/api/products/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function applyProductPricingTemplateApi(productId: string, templateId: string): Promise<void> {
  requireLiveApi("Apply product pricing template");
  await apiRequest(`/api/products/${encodeURIComponent(productId)}/pricing/apply-template`, {
    method: "POST",
    body: { templateId },
  });
}
