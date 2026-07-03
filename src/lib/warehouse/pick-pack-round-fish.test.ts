import { describe, expect, it } from "vitest";
import {
  breakdownCatalogSearchTerm,
  isRoundFishMixLine,
  sizeProductsForBreakdown,
} from "./pick-pack-round-fish";
import type { ProductRow } from "@/lib/types/masters";

function product(id: string, sku: string, name: string): ProductRow {
  return {
    id,
    sku,
    name,
    code: sku,
    uom: "KG",
    status: "ACTIVE",
  } as ProductRow;
}

describe("isRoundFishMixLine", () => {
  it("matches sourcing mix SKUs", () => {
    expect(isRoundFishMixLine({ sku: "TP-ROUND", productName: "Tilapia — Round Fish (Sourcing)" })).toBe(true);
    expect(isRoundFishMixLine({ sku: "TP-ROUND-MIX" })).toBe(true);
    expect(isRoundFishMixLine({ sku: "NP-ROUND" })).toBe(true);
  });

  it("does not match sized round grades", () => {
    expect(isRoundFishMixLine({ sku: "TP-ROUND-S5", productName: "Tilapia Round Fish — Size 5" })).toBe(false);
    expect(isRoundFishMixLine({ sku: "TP-ROUND-S10UP" })).toBe(false);
  });

  it("does not match franchise-sized finished products", () => {
    expect(isRoundFishMixLine({ sku: "TP-GUTTED-S3", productName: "Tilapia Gutted Whole — Size 3" })).toBe(
      false
    );
    expect(isRoundFishMixLine({ productName: "Fresh Tilapia Size 2" })).toBe(false);
  });

  it("matches uncategorized round fish names", () => {
    expect(isRoundFishMixLine({ productName: "Round fish (uncategorized)" })).toBe(true);
  });
});

describe("breakdownCatalogSearchTerm", () => {
  it("prefers gutted tilapia for tilapia mix lines", () => {
    expect(breakdownCatalogSearchTerm({ sku: "TP-ROUND" })).toBe("tilapia gutted");
  });

  it("prefers perch for perch mix lines", () => {
    expect(breakdownCatalogSearchTerm({ sku: "NP-ROUND" })).toBe("nile perch gutted");
  });
});

describe("sizeProductsForBreakdown", () => {
  const catalog = [
    product("1", "TP-ROUND", "Tilapia — Round Fish (Sourcing)"),
    product("2", "TP-ROUND-MIX", "Tilapia Round Fish — Mixed"),
    product("3", "TP-GUTTED-S1", "Tilapia Gutted Whole — Size 1"),
    product("4", "TP-GUTTED-S2", "Tilapia Gutted Whole — Size 2"),
    product("5", "TP-ROUND-S1", "Tilapia Round Fish — Size 1"),
    product("6", "NP-GUTTED-SM", "Nile Perch Gutted — Small"),
    product("7", "TP-FILLET-SM", "Tilapia Fillet — Small"),
  ];

  it("returns gutted and sized round grades for tilapia mix, not mix SKUs or fillets", () => {
    const out = sizeProductsForBreakdown(catalog, { sku: "TP-ROUND" });
    expect(out.map((p) => p.sku)).toEqual(["TP-GUTTED-S1", "TP-GUTTED-S2", "TP-ROUND-S1"]);
  });

  it("returns perch sizes for perch mix", () => {
    const out = sizeProductsForBreakdown(catalog, { sku: "NP-ROUND" });
    expect(out.map((p) => p.sku)).toEqual(["NP-GUTTED-SM"]);
  });
});
