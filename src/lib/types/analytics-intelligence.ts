export type MarginWaterfallRow = {
  stage: string;
  amount: number;
  cumulative: number;
};

export type PackagingProfitRow = {
  productId: string;
  sku: string;
  uom: string;
  marginPct: number;
  volume: number;
};

export type ChannelMarginRow = {
  channel: string;
  revenue: number;
  cogs: number;
  marginPct: number;
};
