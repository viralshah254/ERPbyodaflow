import { expect, it } from "vitest";
import { usesInlineQuantitySheet, sameEditableLines, storedEditableUnitPrice } from "./inline-quantity-sheet";
import type { DocumentLine } from "@/components/docs/DocumentLineEditor";
it.each(["sales-order", "invoice"])("uses the same inline sheet when creating and editing Joybakers %s", (type) => {
  expect(usesInlineQuantitySheet({ type, fullCatalogueSheet: true })).toBe(true);
  expect(usesInlineQuantitySheet({ type, fullCatalogueSheet: true, editing: true })).toBe(true);
  expect(usesInlineQuantitySheet({ type, fullCatalogueSheet: false, editing: true })).toBe(false);
});
it("retains other companies' configured create flow without widening editing or other document types", () => {
  expect(usesInlineQuantitySheet({ type: "sales-order", fullCatalogueSheet: false, prefillSalesOrders: true })).toBe(true);
  expect(usesInlineQuantitySheet({ type: "bill", fullCatalogueSheet: true, editing: true })).toBe(false);
  expect(usesInlineQuantitySheet({ type: "credit-note", fullCatalogueSheet: true })).toBe(false);
});
it("gives Joy credit notes the same finished-goods sheet as sales orders and invoices", () => {
  expect(usesInlineQuantitySheet({ type: "credit-note", fullCatalogueSheet: true, bakery: true })).toBe(true);
  expect(usesInlineQuantitySheet({ type: "credit-note", fullCatalogueSheet: true, bakery: true, editing: true })).toBe(true);
  expect(usesInlineQuantitySheet({ type: "invoice", fullCatalogueSheet: true, bakery: true })).toBe(true);
  expect(usesInlineQuantitySheet({ type: "credit-note", fullCatalogueSheet: false, bakery: true })).toBe(false);
});
it("ignores untouched zero catalogue rows but detects quantity, price, tax-code and discount edits", () => {
  const old = [{ id: "id", productId: "queen", description: "Queen", qty: 2, unit: "PCS", unitPrice: 43.1, taxCodeId: "vat" }];
  const line = { id: "id", sourceLineId: "id", productId: "queen", name: "Queen", sku: "1", qty: 2, baseQty: 2, uom: "PCS", price: 43.1, priceReason: "Existing", amount: 86.2, taxCodeId: "vat" };
  expect(sameEditableLines(old, [line, { ...line, id: "new", productId: "cake", qty: 0 }])).toBe(true);
  for (const patch of [{ qty: 3 }, { price: 50 }, { discount: 10 }, { taxCodeId: "zero" }]) expect(sameEditableLines(old, [{ ...line, ...patch }] as DocumentLine[])).toBe(false);
});
it("recovers a legacy missing unit price without adding exclusive VAT twice", () => {
  const line = { description: "Queen", qty: 2, amount: 116, tax: 16 };
  expect(storedEditableUnitPrice(line, false)).toBe(50);
  expect(storedEditableUnitPrice(line, true)).toBe(58);
  expect(storedEditableUnitPrice({ ...line, unitPrice: 0 }, false)).toBe(0);
});
