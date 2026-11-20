import { describe, expect, it } from "vitest";
import { recommendInputStore } from "./recommend-input-store";

const needs = [
  { productId: "croma", productName: "Croma", requiredQty: 0.021, uom: "EA" },
  { productId: "sugar", productName: "Icing sugar", requiredQty: 0.029, uom: "EA" },
];

describe("create work order store recommendation", () => {
  it("chooses the store that already holds the ingredients", () => {
    const recommendation = recommendInputStore(needs, [
      { warehouseId: "friday", productId: "croma", quantity: 0 },
      { warehouseId: "prd", productId: "croma", quantity: 355 },
      { warehouseId: "prd", productId: "sugar", quantity: 73432 },
    ], [
      { id: "friday", code: "C4 FRIDAY", name: "C4 FRIDAY" },
      { id: "prd", code: "PRD", name: "PRODUCTION WARE HOUSE" },
    ]);
    expect(recommendation).toMatchObject({ warehouseId: "prd", linesCovered: 2, linesNeeded: 2 });
  });
});
