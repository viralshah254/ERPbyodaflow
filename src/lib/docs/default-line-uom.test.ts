import { describe, expect, it } from "vitest";
import { defaultDocumentLineUom } from "./default-line-uom";

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

  it("does not replace KG with a carton pack default", () => {
    expect(
      defaultDocumentLineUom({
        packaging: [{ uom: "CARTON", unitsPer: 10, baseUom: "KG", isDefaultPurchaseUom: true }],
        mode: "purchasing",
        baseUom: "KG",
        fmcgOrg: true,
      })
    ).toBe("KG");
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

  it("uses the FMCG size unit when the catalogue unit is still pieces", () => {
    expect(
      defaultDocumentLineUom({
        packaging: [{ uom: "CARTON", unitsPer: 10, baseUom: "PCS", isDefaultPurchaseUom: true }],
        mode: "purchasing",
        baseUom: "PCS",
        unit: "PCS",
        size: "35kg",
        fmcgOrg: true,
      })
    ).toBe("KG");
  });

  it("leaves a piece-sized product on its pack", () => {
    expect(
      defaultDocumentLineUom({
        packaging: [],
        mode: "sales",
        baseUom: "PCS",
        size: "12 pcs",
        fmcgOrg: true,
      })
    ).toBe("PCS");
  });
});
