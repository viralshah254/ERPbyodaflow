import { apiRequest, requireLiveApi } from "@/lib/api/client";
import type {
  MarginWaterfallRow,
  PackagingProfitRow,
  ChannelMarginRow,
} from "@/lib/types/analytics-intelligence";

type ProductsInsightsResponse = {
  module: string;
  marginWaterfall?: MarginWaterfallRow[];
  packagingProfit?: PackagingProfitRow[];
  channelMargin?: ChannelMarginRow[];
};

export async function fetchProductsIntelligenceApi(): Promise<{
  marginWaterfall: MarginWaterfallRow[];
  packagingProfit: PackagingProfitRow[];
  channelMargin: ChannelMarginRow[];
}> {
  requireLiveApi("Product intelligence");
  const payload = await apiRequest<ProductsInsightsResponse>("/api/analytics/insights/products");
  return {
    marginWaterfall: payload.marginWaterfall ?? [],
    packagingProfit: payload.packagingProfit ?? [],
    channelMargin: payload.channelMargin ?? [],
  };
}
