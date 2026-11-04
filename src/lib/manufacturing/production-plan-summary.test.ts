import { describe, expect, it } from "vitest";
import type { ProductionPlanTreeNode } from "@/lib/api/manufacturing";
import { matchesProductionSearch, totalFormulaIngredients } from "./production-plan-summary";

const ingredient = (id: string, quantity: number, uom = "KG"): ProductionPlanTreeNode => ({ productId: id, productName: id, quantity, uom, kind: "buy", children: [] });
describe("full formula totals", () => {
  it("totals shared ingredients across packs and nested recipes without mixing units or adding intermediates", () => {
    const plan: ProductionPlanTreeNode[] = [{ productId: "pack", productName: "Pack", quantity: 10, uom: "EA", kind: "pack", children: [ingredient("flour", 1.125), { productId: "cake", productName: "Cake", quantity: 3, uom: "KG", kind: "make", children: [ingredient("flour", 2.25), ingredient("flour", 1, "BAG"), ingredient("sugar", 0.5)] }] }, { productId: "pack2", productName: "Other", quantity: 5, uom: "EA", kind: "pack", children: [ingredient("flour", 0.125)] }];
    expect(totalFormulaIngredients(plan)).toEqual([
      { productId: "flour", productName: "flour", uom: "BAG", quantity: 1 },
      { productId: "flour", productName: "flour", uom: "KG", quantity: 3.5 },
      { productId: "sugar", productName: "sugar", uom: "KG", quantity: 0.5 },
    ]);
  });
  it("searches by words in SKU and name without hiding matches due to case", () => {
    expect(matchesProductionSearch({ productSku: "RM-26", productName: "Wheat Flour" }, "26 WHEAT")).toBe(true);
    expect(matchesProductionSearch({ productName: "Wheat Flour" }, "sugar")).toBe(false);
  });
});
