import type { ProductRow } from "@/lib/types/masters";

export type PickerTypeFilter = "" | "RAW" | "FINISHED" | "BOTH" | "PACKAGING" | "SEMI";

/** Sales orders start on finished goods. Purchase orders on a plant start on everything that can be bought. */
export function defaultPickerTypeFilter(
  productFilter: "purchasable" | "sellable" | "all",
  plantCatalogue: boolean
): PickerTypeFilter {
  if (plantCatalogue && productFilter === "purchasable") return "";
  if (productFilter === "sellable") return "FINISHED";
  if (productFilter === "purchasable") return "RAW";
  return "";
}

/**
 * Plant catalogues (Top Food and bakery) classify with item role.
 * A finished good may still be stored as BOTH, or with no product type.
 * Packaging and semi-finished are roles, not the old RAW/FINISHED flag.
 */
export function matchesPickerTypeFilter(
  product: Pick<ProductRow, "productType" | "itemRole">,
  filter: PickerTypeFilter,
  plantCatalogue: boolean
): boolean {
  if (!filter) return true;
  if (plantCatalogue) {
    if (filter === "PACKAGING") return product.itemRole === "PACKAGING";
    if (filter === "SEMI") return product.itemRole === "SEMI";
    if (filter === "RAW") {
      if (product.itemRole === "RAW") return true;
      if (product.itemRole) return false;
      return product.productType === "RAW";
    }
    if (filter === "FINISHED") {
      if (product.itemRole === "FINISHED") return true;
      if (product.itemRole) return false;
      return product.productType === "FINISHED" || product.productType === "BOTH";
    }
  }
  if (filter === "PACKAGING" || filter === "SEMI") return false;
  if (filter === "BOTH") return !product.productType || product.productType === "BOTH";
  if (product.productType && product.productType !== filter) return false;
  return true;
}
