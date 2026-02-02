/**
 * Product master types: variants, attributes, UOM catalog.
 * Manufacturer-grade: base UOM, sale/purchase UOMs, conversions, variants.
 */

export type UomCode = string;

/** Global UOM catalog entry. */
export interface UomDefinition {
  id: string;
  code: UomCode;
  name: string;
  /** base | weight | volume | count */
  category: "base" | "weight" | "volume" | "count";
  /** For derived UOMs: factor to base. e.g. TON → KG: 1000. */
  factorToBase?: number;
  baseUom?: UomCode;
  /** Base UOMs (KG, EA, etc.) have no factor/baseUom. */
  isBase?: boolean;
  decimals: number;
}

/** Global conversion rule: 1 {to} = factor × {from}. */
export interface UomConversion {
  id: string;
  fromUom: UomCode;
  toUom: UomCode;
  factor: number;
}

/** Product packaging / UOM conversion (per product). */
export interface ProductPackaging {
  uom: UomCode;
  unitsPer: number;
  baseUom: UomCode;
  barcode?: string;
  dimensions?: { l: number; w: number; h: number; unit: "cm" | "in" };
  weight?: { value: number; unit: "kg" | "g" };
  isDefaultOrderUom?: boolean;
  isDefaultSalesUom?: boolean;
  isDefaultPurchaseUom?: boolean;
  innerPackCount?: number;
  cartonCount?: number;
}

/** Attribute definition (size, grade, flavor, etc.). */
export interface ProductAttributeDef {
  id: string;
  name: string;
  /** size | grade | flavor | packagingType | spec | custom */
  kind: "size" | "grade" | "flavor" | "packagingType" | "spec" | "custom";
  options: string[];
}

/** Variant attribute value. */
export interface VariantAttribute {
  key: string;
  value: string;
}

/** Product variant: size, packaging, grade, SKU. */
export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  /** Optional display name override. */
  name?: string;
  attributes: VariantAttribute[];
  /** Convenience: size (e.g. 1kg, 5kg, 25kg). */
  size?: string;
  /** Convenience: packaging type (bag, carton, etc.). */
  packagingType?: string;
  /** Convenience: grade/spec. */
  grade?: string;
  status: "ACTIVE" | "INACTIVE";
}

/** Validation result for packaging / UOM. */
export interface PackagingValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export interface UomValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
}
