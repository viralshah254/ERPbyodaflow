import { resolveIndustryCategoryFromTemplateId } from "@/config/industry";

export const SFA_SEGMENTS = [
  "MODERN_TRADE_HQ",
  "MODERN_TRADE_BRANCH",
  "GENERAL_TRADE_CLIENT",
  "DISTRIBUTOR",
  "VAN_SALES",
] as const;

export type SfaSegment = (typeof SFA_SEGMENTS)[number];

export type PartyChannel = "MODERN_TRADE" | "GENERAL_TRADE" | "E_COM" | "HORECA" | "OTHER";

export const FMCG_TEMPLATE_IDS = new Set(["fmcg-manufacturer", "fmcg-distributor"]);

export function isFmcgTemplateId(templateId?: string | null): boolean {
  return Boolean(templateId && FMCG_TEMPLATE_IDS.has(templateId));
}

export function isFmcgOrg(templateId?: string | null): boolean {
  if (isFmcgTemplateId(templateId)) return true;
  return resolveIndustryCategoryFromTemplateId(templateId) === "FMCG";
}

export function sfaSegmentLabel(segment?: SfaSegment | null): string {
  switch (segment) {
    case "MODERN_TRADE_HQ":
      return "Modern trade";
    case "MODERN_TRADE_BRANCH":
      return "Modern trade branch";
    case "GENERAL_TRADE_CLIENT":
      return "General trade";
    case "DISTRIBUTOR":
      return "Distributor";
    case "VAN_SALES":
      return "Van sales";
    default:
      return "—";
  }
}

/** Customer kinds shown when creating/filtering FMCG customers (ERP-first labels). */
export const CUSTOMER_KIND_OPTIONS = [
  {
    id: "modern-trade",
    label: "Modern trade",
    description: "Supermarket or chain HQ — branches are separate customers that can order too",
    sfaSegment: "MODERN_TRADE_HQ" as SfaSegment,
    channel: "MODERN_TRADE" as PartyChannel,
    customerType: "RETAILER" as const,
  },
  /**
   * Branch under a supermarket HQ. Full AR customer (same stepper as HQ).
   * Not offered on the Type step — created via Branches → Add branch.
   */
  {
    id: "modern-trade-branch",
    label: "Modern trade branch",
    description: "Outlet under a supermarket — orders and invoices like any customer",
    sfaSegment: "MODERN_TRADE_BRANCH" as SfaSegment,
    channel: "MODERN_TRADE" as PartyChannel,
    customerType: "RETAILER" as const,
  },
  {
    id: "general-trade",
    label: "General trade",
    description: "Retailers, kiosks, and wholesalers you sell to directly",
    sfaSegment: "GENERAL_TRADE_CLIENT" as SfaSegment,
    channel: "GENERAL_TRADE" as PartyChannel,
    customerType: "RETAILER" as const,
  },
  {
    id: "distributors",
    label: "Distributor",
    description: "Trade partner who buys from you and resells",
    sfaSegment: "DISTRIBUTOR" as SfaSegment,
    channel: "GENERAL_TRADE" as PartyChannel,
    customerType: "DISTRIBUTOR" as const,
  },
  {
    id: "van-sales",
    label: "Van sales",
    description: "Route / van customers served from the field",
    sfaSegment: "VAN_SALES" as SfaSegment,
    channel: "GENERAL_TRADE" as PartyChannel,
    customerType: "WHOLESALER" as const,
  },
] as const;

export type CustomerKindId = (typeof CUSTOMER_KIND_OPTIONS)[number]["id"];

/** Kinds shown on the New customer Type step (branches use Add branch under a supermarket). */
export const CUSTOMER_KIND_OPTIONS_FOR_CREATE = CUSTOMER_KIND_OPTIONS.filter(
  (k) => k.id !== "modern-trade-branch"
);

export function channelLabel(channel?: PartyChannel | null): string {
  switch (channel) {
    case "MODERN_TRADE":
      return "Modern trade";
    case "GENERAL_TRADE":
      return "General trade";
    case "E_COM":
      return "E-commerce";
    case "HORECA":
      return "HoReCa";
    case "OTHER":
      return "Other";
    default:
      return "—";
  }
}

export const CUSTOMER_DIRECTORY_TABS = [
  { id: "modern-trade", label: "Modern trade", sfaSegment: "MODERN_TRADE_HQ" as SfaSegment, channel: "MODERN_TRADE" as PartyChannel },
  { id: "general-trade", label: "General trade", sfaSegment: "GENERAL_TRADE_CLIENT" as SfaSegment, channel: "GENERAL_TRADE" as PartyChannel },
  { id: "distributors", label: "Distributors", sfaSegment: "DISTRIBUTOR" as SfaSegment },
  { id: "van-sales", label: "Van sales", sfaSegment: "VAN_SALES" as SfaSegment },
] as const;
