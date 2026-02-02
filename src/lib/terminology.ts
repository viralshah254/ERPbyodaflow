import type { TerminologyKey, TerminologyOverrides } from "@/config/industryTemplates/index";

const FALLBACK: Record<TerminologyKey, string> = {
  customer: "Customer",
  supplier: "Supplier",
  product: "Product",
  warehouse: "Warehouse",
  branch: "Branch",
  outlet: "Outlet",
  salesOrder: "Sales Order",
  purchaseOrder: "Purchase Order",
  goodsReceipt: "Goods Receipt",
  invoice: "Invoice",
  journalEntry: "Journal Entry",
  workOrder: "Work Order",
  bom: "BOM",
  route: "Route",
  delivery: "Delivery",
  collection: "Collection",
  replenishment: "Replenishment",
  promotion: "Promotion",
  store: "Store",
  quote: "Quote",
  deliveryNote: "Delivery Note",
  purchaseRequest: "Purchase Request",
  bill: "Bill",
};

/**
 * Resolve a terminology key to display label.
 * If terminology override exists, use it; otherwise fall back to key (or built-in default).
 */
export function t(
  key: TerminologyKey,
  terminology?: TerminologyOverrides | null
): string {
  const term = terminology ?? {};
  if (term[key] != null && term[key] !== "") {
    return term[key]!;
  }
  return FALLBACK[key] ?? key;
}
