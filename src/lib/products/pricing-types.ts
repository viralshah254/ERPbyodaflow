/**
 * Product packaging & multi-pricing types.
 * SAP-level: UOM conversions, price lists, tiered pricing, validity.
 */

export type UomCode = string; // EA, CTN, BDL, KG, etc.

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
  /** Inner pack count (e.g. 6 per carton). Optional. */
  innerPackCount?: number;
  /** Carton count. Optional. */
  cartonCount?: number;
}

export type PriceListChannel =
  | "Retail"
  | "Wholesale"
  | "Distributor"
  | "ModernTrade"
  | "Export"
  | string;

export interface PriceList {
  id: string;
  name: string;
  currency: string;
  channel: PriceListChannel;
  isDefault?: boolean;
}

export interface PricingTier {
  minQty: number;
  maxQty?: number;
  price: number;
  uom: UomCode;
}

export interface ProductPrice {
  productId: string;
  priceListId: string;
  tiers: PricingTier[];
  startDate?: string;
  endDate?: string;
  notes?: string;
}

/** Customer-specific price override (special pricing). */
export interface CustomerPriceOverride {
  id: string;
  customerId: string;
  productId: string;
  priceListId: string;
  /** Fixed price, or tier override. */
  type: "fixed" | "tier";
  fixedPrice?: number;
  fixedUom?: UomCode;
  tierAdjustmentPercent?: number;
  startDate?: string;
  endDate?: string;
}

/** Discount policy (stub). Linked to approvals. */
export interface DiscountPolicy {
  id: string;
  name: string;
  /** e.g. volume, promo, channel */
  type: string;
  /** Approval required before apply. */
  requiresApproval?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface ProductWithPricing {
  id: string;
  sku: string;
  name: string;
  baseUom: UomCode;
  packaging: ProductPackaging[];
  /** Effective now, for display. */
  defaultPriceListId?: string;
}

/** Validation result for pricing tiers. */
export interface PricingValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
}
