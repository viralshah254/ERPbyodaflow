import type { ProductRow } from "@/lib/types/masters";

/** Internal key for SKUs with no category (FMCG line picker grouping). */
export const NO_CATEGORY_KEY = "__no_category__";

/** Stable group key: prefer category id, else name, else none. */
export function productCategoryKey(p: ProductRow): string {
  const id = p.category?.trim();
  if (id) return id;
  const name = p.categoryName?.trim();
  if (name) return `name:${name.toLowerCase()}`;
  return NO_CATEGORY_KEY;
}

export function productCategoryLabel(p: ProductRow | undefined): string {
  if (!p) return "No category";
  const name = p.categoryName?.trim();
  if (name) return name;
  if (p.category?.trim()) return p.category.trim();
  return "No category";
}

export function productCategoryLabelFromKey(
  key: string,
  products: ProductRow[]
): string {
  if (key === NO_CATEGORY_KEY) return "No category";
  const sample = products.find((p) => productCategoryKey(p) === key);
  return productCategoryLabel(sample);
}

export function lineProductCategoryKey(
  productList: ProductRow[],
  productId: string
): string {
  const p = productList.find((x) => x.id === productId);
  return p ? productCategoryKey(p) : NO_CATEGORY_KEY;
}

export function compareProductCategoryKeys(
  a: string,
  b: string,
  products: ProductRow[]
): number {
  if (a === NO_CATEGORY_KEY && b !== NO_CATEGORY_KEY) return 1;
  if (b === NO_CATEGORY_KEY && a !== NO_CATEGORY_KEY) return -1;
  return productCategoryLabelFromKey(a, products).localeCompare(
    productCategoryLabelFromKey(b, products),
    undefined,
    { sensitivity: "base" }
  );
}
