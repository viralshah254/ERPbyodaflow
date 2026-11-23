import { describe, expect, it } from "vitest";
import { compareItems, describeChanges, diffItems } from "./recipe-changes";

const names = { product: (id: string) => ({ flour: "Flour", egg: "Egg", vanilla: "Vanilla" })[id] ?? id, warehouse: (id: string) => id };

describe("recipe changes", () => {
  it("matches ingredients by product and ignores equivalent scrap storage", () => {
    const before = [
      { productId: "flour", quantity: 0.2397, uom: "KG", scrapFactor: 2, scrapFactorMode: "PERCENT" as const },
      { productId: "egg", quantity: 5.7, uom: "EA" },
    ];
    const after = [
      { productId: "flour", quantity: 0.25, uom: "KG", scrapFactor: 0.02, scrapFactorMode: "RATIO" as const },
      { productId: "vanilla", quantity: 0.0057, uom: "KG" },
    ];
    expect(compareItems(before, after).map((row) => row.status)).toEqual(["changed", "removed", "added"]);
    expect(diffItems(before, after)).toEqual([
      { kind: "changed", productId: "flour", field: "quantity", from: 0.2397, to: 0.25 },
      { kind: "removed", productId: "egg", field: "quantity", from: 5.7, to: null },
      { kind: "added", productId: "vanilla", field: "quantity", from: null, to: 0.0057 },
    ]);
  });

  it("describes changes in reading order: added, changed, removed", () => {
    const described = describeChanges([
      { kind: "removed", productId: "egg", field: "quantity", from: 5.7, to: null },
      { kind: "changed", productId: "flour", field: "quantity", from: 0.2397, to: 0.25 },
      { kind: "changed", productId: "flour", field: "uom", from: "KG", to: "G" },
      { kind: "added", productId: "vanilla", field: "quantity", from: null, to: 0.0057 },
    ], names);
    expect(described).toEqual([
      { tone: "added", subject: "Vanilla", detail: "0.0057" },
      { tone: "changed", subject: "Flour", detail: "0.2397 → 0.25, unit KG → G" },
      { tone: "removed", subject: "Egg" },
    ]);
  });
});
