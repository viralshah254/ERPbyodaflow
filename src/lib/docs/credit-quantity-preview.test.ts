import { expect, it } from "vitest";
import { creditQuantityPreview } from "./credit-quantity-preview";
const lines = [{ id: "one", description: "Cookies", qty: 50, amount: 4750.2, tax: 655.2, sourceQuantity: 50 }, { id: "two", description: "Cake", qty: 10, amount: 116, tax: 16, sourceQuantity: 10 }];
it("previews a partial credit and omits zero lines without changing the saved evidence", () => {
  expect(creditQuantityPreview(lines, { one: "25", two: "0" })).toEqual({ total: 2375.1, tax: 327.6, selected: 1, error: null });
  expect(lines[0].qty).toBe(50);
  expect(creditQuantityPreview(lines, {})).toEqual({ total: 4866.2, tax: 671.2, selected: 2, error: null });
});
it.each(["-1", "", "invalid", "Infinity", "51"])("rejects invalid or excessive quantity %s", (qty) => { expect(creditQuantityPreview(lines, { one: qty }).error).toBeTruthy(); });
