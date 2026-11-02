import { describe, expect, it } from "vitest";
import type { ManufacturingWorkOrder } from "@/lib/api/manufacturing";
import { completionInputDefaults } from "./completion-inputs";
const order = { quantity: 100, materialLines: [{ lineId: "flour", plannedQuantity: 50, issuedQuantity: 0, returnedQuantity: 0, consumedQuantity: 0 }] } as ManufacturingWorkOrder;
describe("partial production actual suggestions", () => {
  it("scales consumption to this posting", () => {
    expect(completionInputDefaults(order, 20).flour).toEqual({ issue: "10", consume: "10", returnQty: "0" });
  });
  it("resets defaults after partial posting so the next click does not reuse previous actuals", () => {
    const next = { ...order, materialLines: [{ ...order.materialLines[0], issuedQuantity: 10, consumedQuantity: 10 }] };
    expect(completionInputDefaults(next, 80).flour).toEqual({ issue: "40", consume: "40", returnQty: "0" });
  });
  it("uses existing floor stock before suggesting another issue", () => {
    const next = { ...order, materialLines: [{ ...order.materialLines[0], issuedQuantity: 20, consumedQuantity: 10 }] };
    expect(completionInputDefaults(next, 20).flour).toEqual({ issue: "0", consume: "10", returnQty: "0" });
  });
  it.each([NaN, -1, 0])("does not suggest consumption for invalid quantity %s", (quantity) => {
    expect(completionInputDefaults(order, quantity).flour.consume).toBe("0");
  });
});
