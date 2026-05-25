import type { ProductRow } from "@/lib/types/masters";

/** Canonical CoolCatch family order: Tilapia first, Nile Perch second. */
export function productFamilySortRank(family: string | null | undefined): number {
  const n = (family ?? "").trim().toLowerCase();
  if (!n) return 900;
  if (n.includes("tilapia") || n.startsWith("tp")) return 0;
  if (n.includes("nile") || n.startsWith("np")) return 1;
  return 100;
}

export function compareProductFamilyKeys(a: string, b: string): number {
  const aLabel = a === UNCATEGORIZED_FAMILY ? "" : a;
  const bLabel = b === UNCATEGORIZED_FAMILY ? "" : b;
  const ra = productFamilySortRank(aLabel);
  const rb = productFamilySortRank(bLabel);
  if (ra !== rb) return ra - rb;
  if (a === UNCATEGORIZED_FAMILY && b !== UNCATEGORIZED_FAMILY) return 1;
  if (b === UNCATEGORIZED_FAMILY && a !== UNCATEGORIZED_FAMILY) return -1;
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

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
