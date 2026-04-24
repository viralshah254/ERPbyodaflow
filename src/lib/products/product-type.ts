/** Aligns with backend `product.productType` (masters / products API). */

export type ProductKind = "RAW" | "FINISHED" | "BOTH";

export function productTypeLabel(type: ProductKind | string | undefined | null): string {
  if (type === "RAW") return "Purchased product";
  if (type === "FINISHED") return "Finished product";
  if (type === "BOTH") return "Stock product";
  return "Stock product";
}

/** Stable sort: purchased → finished → stock → unset (legacy). */
export function productTypeSortKey(type: ProductKind | string | undefined | null): number {
  if (type === "RAW") return 0;
  if (type === "FINISHED") return 1;
  if (type === "BOTH") return 2;
  return 3;
}

/** Client-side filter: legacy missing type is treated like stock (buy & sell). */
export function rowMatchesProductTypeFilter(
  type: ProductKind | string | undefined | null,
  filter: "all" | ProductKind
): boolean {
  if (filter === "all") return true;
  if (filter === "BOTH") return type === "BOTH" || type == null || type === "";
  return type === filter;
}
