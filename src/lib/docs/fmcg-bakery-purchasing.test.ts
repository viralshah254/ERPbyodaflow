import { describe, expect, it } from "vitest";
import { isPlantCatalogueTemplate } from "@/config/industry";
import { isFmcgOrg } from "@/lib/fmcg/sfa-customer";
import { defaultDocumentLineUom } from "@/lib/docs/default-line-uom";
import { pickerListQuery } from "@/lib/products/picker-type-filter";

const BAKERY_TEMPLATE_IDS = ["fmcg-bakery", "bakery", "bakex"] as const;

describe("FMCG bakery purchasing uses the same screens as the manufacturer", () => {
  it.each(BAKERY_TEMPLATE_IDS)("turns on the shared purchase flags for %s", (templateId) => {
    expect(isFmcgOrg(templateId)).toBe(true);
    expect(isPlantCatalogueTemplate(templateId)).toBe(true);
  });

  it("opens a kilogram size on KG and loads finished goods for a plant purchase list", () => {
    const fmcgOrg = isFmcgOrg("fmcg-bakery");
    const plantCatalogue = isPlantCatalogueTemplate("fmcg-bakery");

    expect(
      defaultDocumentLineUom({
        packaging: [],
        mode: "purchasing",
        baseUom: "PCS",
        size: "35kg",
        fmcgOrg,
      })
    ).toBe("KG");

    expect(
      pickerListQuery({ productFilter: "purchasable", plantCatalogue, typeFilter: "FINISHED" })
    ).toEqual({ itemRole: "FINISHED" });
    expect(
      pickerListQuery({ productFilter: "purchasable", plantCatalogue, typeFilter: "" })
    ).toEqual({});
  });
});
