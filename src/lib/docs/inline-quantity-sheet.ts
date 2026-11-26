import type { DocumentDetailRecord } from "@/lib/types/documents";
import type { DocumentLine } from "@/components/docs/DocumentLineEditor";

/**
 * Catalogue entry for sales orders and invoices: search or browse finished goods, then keep the selected lines.
 * Joy’s credit notes use that same finished-goods sheet. Settings → Sales document flow.
 */
export function usesInlineQuantitySheet(args: { type: string; editing?: boolean; prefillSalesOrders?: boolean; fullCatalogueSheet?: boolean; bakery?: boolean }): boolean {
  const types = args.bakery ? ["sales-order", "invoice", "credit-note"] : ["sales-order", "invoice"];
  if (args.fullCatalogueSheet && types.includes(args.type)) return true;
  return !args.editing && args.type === "sales-order" && Boolean(args.prefillSalesOrders);
}

/** Recover a legacy stored price without treating exclusive VAT as part of the unit price. */
export function storedEditableUnitPrice(line: DocumentDetailRecord["lines"][number], inclusive: boolean): number {
  if (line.unitPrice != null) return line.unitPrice;
  const qty = line.qty ?? 1;
  return qty > 0 ? ((line.amount ?? 0) - (inclusive ? 0 : (line.tax ?? 0))) / qty : 0;
}

/** Compare commercial input, ignoring zero-quantity catalogue rows and recalculated display amounts. */
export function sameEditableLines(existing: DocumentDetailRecord["lines"], current: DocumentLine[], inclusive = false): boolean {
  const before = existing.filter((l) => (l.qty ?? 1) > 0);
  const after = current.filter((l) => l.qty > 0);
  return before.length === after.length && before.every((old, i) => {
    const line = after[i];
    return old.productId === line.productId && (old.qty ?? 1) === line.qty &&
      (old.unit ?? "EA") === line.uom && storedEditableUnitPrice(old, inclusive) === line.price &&
      (old.taxCodeId ?? old.effectiveTaxCodeId ?? null) === (line.taxCodeId ?? null) &&
      (old.discount ?? null) === (line.discount ?? null);
  });
}
