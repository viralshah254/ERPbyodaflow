import { describe, expect, it } from "vitest";
import { defaultPickerTypeFilter, matchesPickerTypeFilter, pickerListQuery } from "./picker-type-filter";

describe("document product picker type filter", () => {
  it("starts sales on finished goods and plant purchase orders on every buyable type", () => {
    expect(defaultPickerTypeFilter("sellable", true)).toBe("FINISHED");
    expect(defaultPickerTypeFilter("purchasable", true)).toBe("");
    expect(defaultPickerTypeFilter("purchasable", false)).toBe("RAW");
  });

  it("keeps bakery finished goods that are not stored as a plain finished type", () => {
    expect(
      matchesPickerTypeFilter({ itemRole: "FINISHED", productType: "RAW" }, "FINISHED", true)
    ).toBe(true);
    expect(
      matchesPickerTypeFilter({ itemRole: undefined, productType: "BOTH" }, "FINISHED", true)
    ).toBe(true);
    expect(
      matchesPickerTypeFilter({ itemRole: "PACKAGING", productType: "RAW" }, "FINISHED", true)
    ).toBe(false);
    expect(matchesPickerTypeFilter({ itemRole: undefined, productType: undefined }, "FINISHED", true)).toBe(
      false
    );
  });

  it("splits raw materials and packaging on a plant purchase list", () => {
    expect(
      matchesPickerTypeFilter({ itemRole: "PACKAGING", productType: "RAW" }, "PACKAGING", true)
    ).toBe(true);
    expect(
      matchesPickerTypeFilter({ itemRole: "PACKAGING", productType: "RAW" }, "RAW", true)
    ).toBe(false);
    expect(matchesPickerTypeFilter({ itemRole: "RAW", productType: "RAW" }, "", true)).toBe(true);
  });

  it("asks the catalogue for the chosen plant role instead of only purchasable raw materials", () => {
    expect(pickerListQuery({ productFilter: "purchasable", plantCatalogue: true, typeFilter: "" })).toEqual({});
    expect(
      pickerListQuery({ productFilter: "purchasable", plantCatalogue: true, typeFilter: "FINISHED" })
    ).toEqual({ itemRole: "FINISHED" });
    expect(
      pickerListQuery({ productFilter: "purchasable", plantCatalogue: true, typeFilter: "PACKAGING" })
    ).toEqual({ itemRole: "PACKAGING" });
    expect(
      pickerListQuery({ productFilter: "purchasable", plantCatalogue: false, typeFilter: "RAW" })
    ).toEqual({ purchasable: true, sellable: undefined, productType: "RAW" });
  });
});
