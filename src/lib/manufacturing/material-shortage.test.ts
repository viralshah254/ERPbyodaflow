import { describe, expect, it } from "vitest";
import { materialShortagesFromError, readableProductName } from "./material-shortage";

describe("material shortage messages", () => {
  it("keeps company ids off the name", () => {
    expect(readableProductName("org-sfa-6a890b7765042fb41c9d89a6:prd:FLOUR")).toBe("Ingredient");
    expect(readableProductName("Flour")).toBe("Flour");
  });

  it("reads a structured shortage without showing the id", () => {
    const error = Object.assign(new Error("Not enough stock in the store on this batch. Flour is short 0.719 KG."), {
      body: {
        code: "INSUFFICIENT_MATERIALS",
        shortages: [{ productId: "org-sfa-6a890b7765042fb41c9d89a6:prd:FLOUR", productName: "Flour", warehouseId: "org-sfa-6a890b7765042fb41c9d89a6:wh:PRD", short: 0.719, uom: "KG" }],
      },
    });
    expect(materialShortagesFromError(error)?.[0]).toEqual(expect.objectContaining({ productName: "Flour", short: 0.719, uom: "KG" }));
    expect(materialShortagesFromError(error)?.[0]?.productName).not.toContain("org-sfa");
  });
});
