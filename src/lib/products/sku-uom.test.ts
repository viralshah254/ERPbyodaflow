import { describe, expect, it } from "vitest";
import { physicalUnitChoices, prepareSkuAlternateUoms, resolveFactorToBase } from "./sku-uom";

describe("recipe unit conversions", () => {
  it("converts grams and kilograms without SKU setup", () => {
    expect(resolveFactorToBase("G", [], "KG")).toBe(0.001);
    expect(resolveFactorToBase("KG", [], "G")).toBe(1000);
    expect(physicalUnitChoices("KG")).toEqual(["G"]);
    expect(physicalUnitChoices("ML")).toEqual(["L"]);
    expect(physicalUnitChoices("EA")).toEqual([]);
  });

  it("never treats pieces as kilograms unless the SKU has that conversion", () => {
    expect(resolveFactorToBase("KG", [], "EA")).toBeNull();
    const eggs = prepareSkuAlternateUoms([{ uom: "KG", factor: 18.46, referenceUom: "EA" }], "EA").rows;
    expect(resolveFactorToBase("KG", eggs, "EA")).toBe(18.46);
    expect(resolveFactorToBase("G", eggs, "EA")).toBeNull();
  });
});
