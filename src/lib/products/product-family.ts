import type { ProductRow } from "@/lib/types/masters";

/** Internal key for SKUs with no `productFamily` set (picker grouping). */
export const UNCATEGORIZED_FAMILY = "__uncategorized__";

export function productFamilyKey(p: ProductRow): string {
  const t = p.productFamily?.trim();
  return t || UNCATEGORIZED_FAMILY;
}

export function productFamilyLabel(key: string): string {
  return key === UNCATEGORIZED_FAMILY ? "Uncategorized" : key;
}

export function lineProductFamilyKey(productList: ProductRow[], productId: string): string {
  const p = productList.find((x) => x.id === productId);
  return p ? productFamilyKey(p) : UNCATEGORIZED_FAMILY;
}
