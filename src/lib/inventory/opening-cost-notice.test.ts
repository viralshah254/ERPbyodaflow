import { describe, expect, it } from "vitest";
import { openingCostNotice } from "./opening-cost-notice";

describe("opening cost notice", () => {
  it("names the ingredient on the batch and links to its opening cost", () => {
    const notice = openingCostNotice(
      new Error("Opening company-average valuation is not reconciled for 3299be83-baee-446f-8306-b5f93bc12f61. Complete the reviewed opening setup before moving stock."),
      [{ productId: "3299be83-baee-446f-8306-b5f93bc12f61", productName: "CROMA IN KGS", sku: "RM006" }],
    );
    expect(notice?.message).toBe("CROMA IN KGS (RM006) already has stock, but no opening cost. Enter the opening cost before moving it.");
    expect(notice?.href).toBe("/inventory/opening-costs?products=3299be83-baee-446f-8306-b5f93bc12f61");
  });

  it("uses the named products the server returns", () => {
    const error = Object.assign(new Error("CROMA IN KGS (RM006) already has stock, but no opening cost. Enter the opening cost, then move this stock."), {
      code: "OPENING_COST_REQUIRED",
      products: [{ productId: "croma", code: "RM006", name: "CROMA IN KGS" }],
    });
    expect(openingCostNotice(error)?.href).toBe("/inventory/opening-costs?products=croma");
  });
});
