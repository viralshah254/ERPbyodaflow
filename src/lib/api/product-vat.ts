import { apiRequest, requireLiveApi } from "@/lib/api/client";

export type ProductVatCategory = "standard" | "zero" | "exempt";

export async function fetchProductVatCategoryApi(productId: string): Promise<ProductVatCategory> {
  requireLiveApi("Product VAT category");
  const payload = await apiRequest<{ productId: string; vatCategory: ProductVatCategory }>(
    `/api/settings/products/${encodeURIComponent(productId)}/vat-category`
  );
  return payload.vatCategory;
}

export async function updateProductVatCategoryApi(
  productId: string,
  vatCategory: ProductVatCategory
): Promise<void> {
  requireLiveApi("Update product VAT category");
  await apiRequest(`/api/settings/products/${encodeURIComponent(productId)}/vat-category`, {
    method: "PATCH",
    body: { vatCategory },
  });
}
