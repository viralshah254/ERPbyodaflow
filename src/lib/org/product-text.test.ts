import { describe, expect, it } from "vitest";
import { isProductNameColumn, orgUsesCapsOnProduct } from "./product-text";

describe("orgUsesCapsOnProduct", () => {
  it("follows the organisation setting", () => {
    expect(orgUsesCapsOnProduct({ capsOnProduct: true })).toBe(true);
    expect(orgUsesCapsOnProduct({ featureFlags: { capsOnProduct: true } })).toBe(true);
    expect(orgUsesCapsOnProduct({ capsOnProduct: false })).toBe(false);
    expect(orgUsesCapsOnProduct(null)).toBe(false);
  });
});

describe("isProductNameColumn", () => {
  it("matches product name columns", () => {
    expect(isProductNameColumn({ id: "name", header: "Product" })).toBe(true);
    expect(isProductNameColumn({ id: "name", header: "Product name" })).toBe(true);
    expect(isProductNameColumn({ id: "name", header: "Product Name" })).toBe(true);
    expect(isProductNameColumn({ id: "products", header: "Products" })).toBe(true);
    expect(isProductNameColumn({ id: "product" })).toBe(true);
  });

  it("leaves type, family, and other name columns alone", () => {
    expect(isProductNameColumn({ id: "productType", header: "Type" })).toBe(false);
    expect(isProductNameColumn({ id: "productType", header: "Product type" })).toBe(false);
    expect(isProductNameColumn({ id: "productFamily", header: "Product family" })).toBe(false);
    expect(isProductNameColumn({ id: "name", header: "Name" })).toBe(false);
    expect(isProductNameColumn({ id: "customer", header: "Customer" })).toBe(false);
  });
});
