import { describe, expect, it } from "vitest";
import { productMatchesSearch, preferExactProductIdentifiers, splitProductSearchQuantity } from "./product-search";
describe("accountant product identification", () => {
  it("searches short, long and zero-prefixed numeric identifiers without matching pack sizes", () => {
    for (const key of ["code", "sku", "barcode"]) for (const value of ["1", "0012", "12345", "6164000350382"]) {
      expect(productMatchesSearch({ [key]: value, name: "Loaf" }, value)).toBe(true);
    }
    expect(productMatchesSearch({ name: "Cake 250g", size: "250g" }, "250")).toBe(false);
    expect(productMatchesSearch({ name: "Cake", size: "250g" }, "cake 250g")).toBe(true);
  });
  it("prefers exact identifiers without losing leading zeros or prefix lookup", () => {
    const rows = [{ code: "1" }, { code: "12" }, { code: "001" }];
    expect(preferExactProductIdentifiers(rows, "1")).toEqual([rows[0]]);
    expect(preferExactProductIdentifiers(rows, "001")).toEqual([rows[2]]);
    expect(productMatchesSearch({ code: "12345" }, "123")).toBe(true);
    expect(productMatchesSearch({ sku: "FG-CAKE" }, "fg-cake")).toBe(true);
  });
  it("never interprets a product size or code as an implicit order quantity", () => {
    expect(splitProductSearchQuantity("cake 250").qty).toBeNull();
    expect(splitProductSearchQuantity("0012").qty).toBeNull();
    expect(splitProductSearchQuantity("0012 x 24")).toEqual({ text: "0012 x 24", stripped: "0012", qty: 24 });
    expect(splitProductSearchQuantity("cake x 0").qty).toBeNull();
  });
});
