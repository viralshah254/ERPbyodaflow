import { expect, it } from "vitest";
import { usesInlineQuantitySheet, sameEditableLines, storedEditableUnitPrice } from "./inline-quantity-sheet";
import { JOY_SUPERBAKERS_ORG_ID } from "@/lib/fmcg/sfa-customer";
import type { DocumentLine } from "@/components/docs/DocumentLineEditor";
it.each(["sales-order", "invoice"])("uses the same inline sheet when creating and editing Joybakers %s", (type) => {
  expect(usesInlineQuantitySheet({ type, orgId: JOY_SUPERBAKERS_ORG_ID })).toBe(true);
  expect(usesInlineQuantitySheet({ type, orgId: JOY_SUPERBAKERS_ORG_ID, editing: true })).toBe(true);
  expect(usesInlineQuantitySheet({ type, orgId: "other", editing: true })).toBe(false);
});
it("retains other companies' configured create flow without widening editing or other document types", () => {
  expect(usesInlineQuantitySheet({ type: "sales-order", orgId: "other", prefillSalesOrders: true })).toBe(true);
  expect(usesInlineQuantitySheet({ type: "bill", orgId: JOY_SUPERBAKERS_ORG_ID, editing: true })).toBe(false);
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
