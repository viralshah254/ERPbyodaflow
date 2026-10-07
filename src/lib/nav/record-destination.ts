/** Catalogue and directory pages. A record recent must not stay on these. */
const LIST_PATHS = new Set(["/master/products", "/master/parties", "/sales/customers"]);

export function pathOnly(href: string): string {
  const path = href.split("?")[0]?.split("#")[0]?.replace(/\/$/, "") ?? "";
  return path || "/";
}

export function isRecordListHref(href: string): boolean {
  return LIST_PATHS.has(pathOnly(href));
}

/** Open the product or customer, even when search still returns the parent list. */
export function recordHref(entityType: string, id: string, fallbackHref: string): string {
  const clean = id.trim();
  if (!clean) return fallbackHref;
  const encoded = encodeURIComponent(clean);
  if (entityType === "product") return `/master/products/${encoded}`;
  if (entityType === "customer") return `/sales/customers/${encoded}`;
  return fallbackHref;
}
