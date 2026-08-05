import { apiRequest, requireLiveApi } from "@/lib/api/client";
import type { ProductPackaging, ProductPrice } from "@/lib/products/pricing-types";
import type { ProductAttributeDef, ProductVariant } from "@/lib/products/types";

export type ProductPackagingPayload = {
  items: ProductPackaging[];
  hasProductOverride: boolean;
  defaults: ProductPackaging[];
  source: "product" | "defaults";
};

/** Packs defined on this product only (no org-wide defaults). */
export async function fetchProductPackagingApi(productId: string): Promise<ProductPackaging[]> {
  const payload = await fetchProductPackagingDetailApi(productId);
  return payload.items ?? [];
}

export async function fetchProductPackagingDetailApi(
  productId: string,
): Promise<ProductPackagingPayload> {
  requireLiveApi("Product packaging");
  const payload = await apiRequest<ProductPackagingPayload>(
    `/api/settings/products/${encodeURIComponent(productId)}/packaging`,
  );
  return {
    items: payload.items ?? [],
    hasProductOverride: Boolean(payload.hasProductOverride),
    defaults: payload.defaults ?? [],
    source: payload.source === "product" ? "product" : "defaults",
  };
}

export async function saveProductPackagingApi(productId: string, items: ProductPackaging[]): Promise<void> {
  requireLiveApi("Save product packaging");
  await apiRequest(`/api/settings/products/${encodeURIComponent(productId)}/packaging`, {
    method: "PUT",
    body: { items },
  });
}

export async function fetchPackagingDefaultsApi(): Promise<ProductPackaging[]> {
  requireLiveApi("Packaging defaults");
  const payload = await apiRequest<{ items: ProductPackaging[] }>(
    "/api/settings/products/packaging-defaults",
  );
  return payload.items ?? [];
}

export async function savePackagingDefaultsApi(items: ProductPackaging[]): Promise<ProductPackaging[]> {
  requireLiveApi("Save packaging defaults");
  const payload = await apiRequest<{ items: ProductPackaging[] }>(
    "/api/settings/products/packaging-defaults",
    {
      method: "PUT",
      body: { items },
    },
  );
  return payload.items ?? [];
}

export async function fetchProductPricingApi(productId: string, priceListId?: string): Promise<ProductPrice[]> {
  requireLiveApi("Product pricing");
  const params = new URLSearchParams();
  if (priceListId) params.set("priceListId", priceListId);
  const payload = await apiRequest<{ items: ProductPrice[] }>(`/api/settings/products/${encodeURIComponent(productId)}/pricing`, {
    params,
  });
  return payload.items ?? [];
}

export async function saveProductPricingApi(productId: string, items: ProductPrice[]): Promise<void> {
  requireLiveApi("Save product pricing");
  await apiRequest(`/api/settings/products/${encodeURIComponent(productId)}/pricing`, {
    method: "PUT",
    body: { items },
  });
}

export async function fetchProductVariantsApi(productId: string): Promise<ProductVariant[]> {
  requireLiveApi("Product variants");
  const payload = await apiRequest<{ items: ProductVariant[] }>(`/api/settings/products/${encodeURIComponent(productId)}/variants`);
  return payload.items ?? [];
}

export async function createProductVariantApi(
  productId: string,
  input: Omit<ProductVariant, "id" | "productId">
): Promise<ProductVariant> {
  requireLiveApi("Create product variant");
  return apiRequest<ProductVariant>(`/api/settings/products/${encodeURIComponent(productId)}/variants`, {
    method: "POST",
    body: input,
  });
}

export async function updateProductVariantApi(
  productId: string,
  variantId: string,
  patch: Partial<Omit<ProductVariant, "id" | "productId">>
): Promise<ProductVariant> {
  requireLiveApi("Update product variant");
  return apiRequest<ProductVariant>(
    `/api/settings/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variantId)}`,
    {
      method: "PATCH",
      body: patch,
    }
  );
}

export async function deleteProductVariantApi(productId: string, variantId: string): Promise<void> {
  requireLiveApi("Delete product variant");
  await apiRequest(`/api/settings/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variantId)}`, {
    method: "DELETE",
  });
}

export async function fetchProductAttributeDefsApi(): Promise<ProductAttributeDef[]> {
  requireLiveApi("Product attributes");
  const payload = await apiRequest<{ items: ProductAttributeDef[] }>("/api/settings/products/attributes");
  return payload.items ?? [];
}

export async function createProductAttributeDefApi(
  input: Omit<ProductAttributeDef, "id">
): Promise<ProductAttributeDef> {
  requireLiveApi("Create product attribute");
  return apiRequest<ProductAttributeDef>("/api/settings/products/attributes", {
    method: "POST",
    body: input,
  });
}

export async function updateProductAttributeDefApi(
  id: string,
  patch: Partial<Omit<ProductAttributeDef, "id">>
): Promise<ProductAttributeDef> {
  requireLiveApi("Update product attribute");
  return apiRequest<ProductAttributeDef>(`/api/settings/products/attributes/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: patch,
  });
}

export async function deleteProductAttributeDefApi(id: string): Promise<void> {
  requireLiveApi("Delete product attribute");
  await apiRequest(`/api/settings/products/attributes/${encodeURIComponent(id)}`, { method: "DELETE" });
}
