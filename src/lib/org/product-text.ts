/** CSS class. Capitals apply only while the organisation has `capsOnProduct` on. */
export const CAPS_ON_PRODUCT_CLASS = "capsOnProduct";

export function orgUsesCapsOnProduct(
  org: {
    capsOnProduct?: boolean | null;
    featureFlags?: Record<string, boolean> | null;
  } | null | undefined
): boolean {
  if (!org) return false;
  return org.capsOnProduct === true || org.featureFlags?.capsOnProduct === true;
}

const PRODUCT_NAME_HEADERS = new Set(["product", "products", "product name", "item", "item name"]);
const PRODUCT_NAME_IDS = new Set(["product", "productname", "product_name", "products"]);

/** Table columns whose cells are product names, not product type or family. */
export function isProductNameColumn(column: { id?: string | null; header?: string | null }): boolean {
  const header = String(column.header ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (header) return PRODUCT_NAME_HEADERS.has(header);
  const id = String(column.id ?? "")
    .trim()
    .toLowerCase();
  return PRODUCT_NAME_IDS.has(id);
}
