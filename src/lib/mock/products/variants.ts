/**
 * Mock product variants.
 */

import type { ProductVariant, ProductAttributeDef } from "@/lib/products/types";

export const MOCK_ATTRIBUTE_DEFS: ProductAttributeDef[] = [
  { id: "ad1", name: "Size", kind: "size", options: ["1kg", "5kg", "25kg", "50kg"] },
  { id: "ad2", name: "Grade", kind: "grade", options: ["A", "B", "C"] },
  { id: "ad3", name: "Packaging type", kind: "packagingType", options: ["bag", "carton", "bale"] },
  { id: "ad4", name: "Flavor", kind: "flavor", options: ["Natural", "Vanilla", "Chocolate"] },
];

export const MOCK_VARIANTS: Record<string, ProductVariant[]> = {
  p1: [
    {
      id: "v1",
      productId: "p1",
      sku: "SKU-001-1KG",
      name: "Product Alpha 1kg",
      attributes: [{ key: "size", value: "1kg" }, { key: "packagingType", value: "bag" }],
      size: "1kg",
      packagingType: "bag",
      status: "ACTIVE",
    },
    {
      id: "v2",
      productId: "p1",
      sku: "SKU-001-5KG",
      name: "Product Alpha 5kg",
      attributes: [{ key: "size", value: "5kg" }, { key: "packagingType", value: "bag" }],
      size: "5kg",
      packagingType: "bag",
      status: "ACTIVE",
    },
    {
      id: "v3",
      productId: "p1",
      sku: "SKU-001-CTN",
      name: "Product Alpha Carton",
      attributes: [{ key: "packagingType", value: "carton" }],
      packagingType: "carton",
      status: "ACTIVE",
    },
  ],
  p2: [
    {
      id: "v4",
      productId: "p2",
      sku: "SKU-002-EA",
      attributes: [],
      status: "ACTIVE",
    },
  ],
};

export function getMockVariants(productId: string): ProductVariant[] {
  return [...(MOCK_VARIANTS[productId] ?? [])];
}

export function getMockAttributeDefs(): ProductAttributeDef[] {
  return [...MOCK_ATTRIBUTE_DEFS];
}
