import { describe, expect, it } from "vitest";
import { activeDocumentAlternates, defaultDocumentLineUom } from "./default-line-uom";

describe("defaultDocumentLineUom", () => {
  it("keeps a kilogram product on KG when the order line is created", () => {
    expect(
      defaultDocumentLineUom({
        packaging: [],
        mode: "purchasing",
        baseUom: "KG",
        fmcgOrg: true,
      })
    ).toBe("KG");
  });

  it("honors a configured purchase pack for a kilogram product", () => {
    expect(
      defaultDocumentLineUom({
        packaging: [{ uom: "CARTON", unitsPer: 10, baseUom: "KG", isDefaultPurchaseUom: true }],
        mode: "purchasing",
        baseUom: "KG",
        fmcgOrg: true,
      })
    ).toBe("CARTON");
  });

  it("still opens a piece product on its purchase pack", () => {
    expect(
      defaultDocumentLineUom({
        packaging: [{ uom: "CARTON", unitsPer: 24, baseUom: "PCS", isDefaultPurchaseUom: true }],
        mode: "purchasing",
        baseUom: "PCS",
        fmcgOrg: true,
      })
    ).toBe("CARTON");
  });

  it("uses the stock unit when there is no configured alternate", () => {
    expect(
      defaultDocumentLineUom({
        packaging: [],
        mode: "purchasing",
        baseUom: "PCS",
        unit: "PCS",
        fmcgOrg: true,
      })
    ).toBe("PCS");
  });

  it("leaves a piece-sized product on its pack", () => {
    expect(
      defaultDocumentLineUom({
        packaging: [],
        mode: "sales",
        baseUom: "PCS",
        fmcgOrg: true,
      })
    ).toBe("PCS");
  });
});

it("offers only active SKU alternates, including fractional and one-to-one conversions", () => {
  const packaging = [
    { uom: "G", unitsPer: 0.001, baseUom: "KG" },
    { uom: "BAG", unitsPer: 1, baseUom: "KG" },
    { uom: "PCS", unitsPer: 0, baseUom: "KG" },
    { uom: "CTN", unitsPer: 12, baseUom: "KG", status: "inactive" as const, isDefaultSalesUom: true },
  ];
  expect(activeDocumentAlternates(packaging).map((row) => row.uom)).toEqual(["G", "BAG"]);
  expect(defaultDocumentLineUom({ packaging, mode: "sales", baseUom: "KG", fmcgOrg: false })).toBe("KG");
});
