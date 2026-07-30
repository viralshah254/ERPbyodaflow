/** SFA → ERP order channel codes. */
export type OdaflowChannel = "modern_trade" | "distributor" | "direct" | "van_sales";

/** How the buyer appears in FMCG terms (outlet, distributor, etc.). */
export function odaflowBuyerTypeLabel(channel?: string | null): string {
  switch (channel) {
    case "modern_trade":
      return "Outlet";
    case "distributor":
      return "Distributor";
    case "direct":
      return "Customer";
    case "van_sales":
      return "Van sales";
    default:
      return "SFA order";
  }
}

export function odaflowBuyerTypeHint(channel?: string | null): string {
  switch (channel) {
    case "modern_trade":
      return "Modern trade supermarket or branch outlet";
    case "distributor":
      return "General trade order from a distributor";
    case "direct":
      return "General trade order from a retailer customer";
    case "van_sales":
      return "Van sales route order";
    default:
      return "Order synced from Odaflow SFA";
  }
}

export function odaflowChannelLabel(channel?: string | null): string {
  switch (channel) {
    case "modern_trade":
      return "Modern Trade";
    case "distributor":
      return "Distributor";
    case "direct":
      return "General Trade";
    case "van_sales":
      return "Van Sales";
    default:
      return channel?.replace(/_/g, " ") ?? "Odaflow";
  }
}

export const ODAFLOW_SALES_REP_ROLE = "Sales rep";
