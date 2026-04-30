import type { ProductRow } from "@/lib/types/masters";
import { apiRequest, requireLiveApi } from "./client";

type BackendProduct = {
  id: string;
  sku?: string;
  name: string;
  productFamily?: string | null;
  category?: string;
  unit?: string;
  baseUom?: string;
  productType?: "RAW" | "FINISHED" | "BOTH";
  defaultTaxCodeId?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  description?: string;
  currentStock?: number;
};

export type ProductPayload = {
  sku?: string;
  code?: string;
  name: string;
  productFamily?: string;
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
    productFamily: item.productFamily ?? undefined,
    category,
    unit: uom,
    baseUom: uom,
    productType: item.productType,
    defaultTaxCodeId: item.defaultTaxCodeId,
    status: item.status ?? "ACTIVE",
    description: item.description,
    currentStock: typeof item.currentStock === "number" ? item.currentStock : undefined,
  };
}

export type FetchProductsOptions = {
  search?: string;
  status?: string;
  purchasable?: boolean;
  sellable?: boolean;
  productType?: "RAW" | "FINISHED" | "BOTH";
  /** Server caps at 100; use for document line pickers. */
  limit?: number;
  /** Pagination offset (server skip). Omit for first page. */
  cursor?: string;
  /**
   * Whether to include on-hand stock totals in each row.
   * Pass false for document line pickers that don't display stock — this skips
   * a StockLevel aggregate and cuts search latency significantly.
   * Defaults to true when omitted (server decides based on whether search is present).
   */
  includeStock?: boolean;
};

export type FetchProductsPageResult = {
  items: ProductRow[];
  nextCursor: string | null;
};

export async function fetchProductsPageApi(opts: FetchProductsOptions): Promise<FetchProductsPageResult> {
  requireLiveApi("Products");
  const params = new URLSearchParams();
  if (opts.search?.trim()) params.set("search", opts.search.trim());
  if (opts.status) params.set("status", opts.status);
  if (opts.purchasable) params.set("purchasable", "true");
  if (opts.sellable) params.set("sellable", "true");
  if (opts.productType) params.set("productType", opts.productType);
  if (opts.includeStock !== undefined) params.set("includeStock", opts.includeStock ? "true" : "false");
  const lim = opts.limit != null && opts.limit > 0 ? Math.min(opts.limit, 100) : 100;
  params.set("limit", String(lim));
  if (opts.cursor != null && opts.cursor !== "") params.set("cursor", opts.cursor);
  const data = await apiRequest<{ items: BackendProduct[]; nextCursor?: string | null }>("/api/products", { params });
  return {
    items: data.items.map(mapProduct),
    nextCursor: data.nextCursor ?? null,
  };
}

export async function fetchProductsApi(
  searchOrOptions?: string | FetchProductsOptions,
  status?: string
): Promise<ProductRow[]> {
  if (typeof searchOrOptions === "object" && searchOrOptions != null) {
    const page = await fetchProductsPageApi(searchOrOptions);
    return page.items;
  }
  const page = await fetchProductsPageApi({
    search: searchOrOptions,
    status,
  } as FetchProductsOptions);
  return page.items;
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
      productFamily: payload.productFamily,
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

export type ProductPatchPayload = Partial<Pick<ProductPayload, "sku" | "code" | "name" | "productFamily" | "category" | "unit" | "baseUom" | "productType" | "defaultTaxCodeId" | "status" | "description">>;

export async function patchProductApi(id: string, payload: ProductPatchPayload): Promise<void> {
  requireLiveApi("Product patch");
  await apiRequest(`/api/products/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: {
      sku: payload.sku,
      code: payload.code,
      name: payload.name,
      productFamily: payload.productFamily,
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
