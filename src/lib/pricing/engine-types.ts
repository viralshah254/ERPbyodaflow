/** Mirrors backend `src/types/pricing-engine.ts` — keep enums in sync. */

export const PRICING_ENGINE_CHANNELS = [
  "RETAIL",
  "DISTRIBUTOR",
  "FRANCHISE",
  "INSTITUTIONAL",
  "BULK_EXPORT",
] as const;
export type PricingEngineChannel = (typeof PRICING_ENGINE_CHANNELS)[number];

export const PRICING_MARKET_TIERS = ["TIER_1", "TIER_2", "TIER_3"] as const;
export type PricingMarketTier = (typeof PRICING_MARKET_TIERS)[number];

export type EnginePriceStatus =
  | "UP_TO_DATE"
  | "NEEDS_UPDATE"
  | "PENDING_APPROVAL"
  | "PUBLISHED"
  | "MANUAL_OVERRIDE"
  | "LOSS_MAKING"
  | "LOW_MARGIN"
  | "ABOVE_MARKET_CEILING"
  | "NEEDS_REVIEW";

export interface PricingEngineSettings {
  priceChangeWarningPct: number;
  priceChangeCriticalPct: number;
  minMarginPctByTier: Record<PricingMarketTier, number>;
  defaultRoundingMode: string;
  useReceivedWeightForFinalCost: boolean;
}

export interface PriceListEngineItemDto {
  id: string;
  orgId?: string;
  priceListId: string;
  productId: string;
  batchId?: string;
  baseCostPerKg?: number | null;
  deliveryCostPerKg?: number | null;
  lossAdjustmentPerKg?: number | null;
  finalCostPerKg?: number | null;
  markupPercentage?: number | null;
  suggestedPrice?: number | null;
  activePrice?: number | null;
  status: EnginePriceStatus;
  updatedAt?: string;
}
