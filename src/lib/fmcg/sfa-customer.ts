import { canonicalIndustryTemplateId, resolveIndustryCategoryFromTemplateId } from "@/config/industry";

export const SFA_SEGMENTS = [
  "MODERN_TRADE_HQ",
  "MODERN_TRADE_BRANCH",
  "GENERAL_TRADE_CLIENT",
  "DISTRIBUTOR",
  "VAN_SALES",
] as const;

export type SfaSegment = (typeof SFA_SEGMENTS)[number];

export type PartyChannel = "MODERN_TRADE" | "GENERAL_TRADE" | "E_COM" | "HORECA" | "OTHER";

export const FMCG_TEMPLATE_IDS = new Set(["fmcg-manufacturer", "fmcg-distributor", "fmcg-bakery"]);

export function isFmcgTemplateId(templateId?: string | null): boolean {
  const id = canonicalIndustryTemplateId(templateId);
  return Boolean(id && FMCG_TEMPLATE_IDS.has(id));
}

export function isFmcgOrg(templateId?: string | null): boolean {
  if (isFmcgTemplateId(templateId)) return true;
  return resolveIndustryCategoryFromTemplateId(templateId) === "FMCG";
}

export function sfaSegmentLabel(segment?: SfaSegment | null): string {
  switch (segment) {
    case "MODERN_TRADE_HQ":
      return "Multichain";
    case "MODERN_TRADE_BRANCH":
      return "Multichain branch";
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
    label: "Multichain",
    description:
      "Supermarket HQ or branch — syncs to the shared SFA catalog; tax ID and credit stay on this ERP org",
    sfaSegment: "MODERN_TRADE_HQ" as SfaSegment,
    channel: "MODERN_TRADE" as PartyChannel,
    customerType: "MULTICHAIN" as const,
  },
  /**
   * Branch under a supermarket HQ. Full AR customer (same stepper as HQ).
   * Not offered on the Type step — created via Branches → Add branch.
   */
  {
    id: "modern-trade-branch",
    label: "Multichain branch",
    description: "Outlet under a supermarket — orders and invoices like any customer",
    sfaSegment: "MODERN_TRADE_BRANCH" as SfaSegment,
    channel: "MODERN_TRADE" as PartyChannel,
    customerType: "MULTICHAIN" as const,
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
      return "Multichain";
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

/** Joy Superbakers has no van-sales book. Other FMCG orgs keep the tab. */
export const JOY_SUPERBAKERS_ORG_ID = "org-sfa-6a890b7765042fb41c9d89a6";

export const CUSTOMER_DIRECTORY_TABS = [
  { id: "all", label: "All customers", directory: "all" as const },
  { id: "modern-trade", label: "Multichain", directory: "multichain" as const },
  { id: "general-trade", label: "General trade", directory: "general-trade" as const },
  { id: "distributors", label: "Distributors", directory: "distributors" as const },
  { id: "van-sales", label: "Van sales", directory: "van-sales" as const },
] as const;

export function customerDirectoryTabsForOrg(orgId?: string | null) {
  if (orgId === JOY_SUPERBAKERS_ORG_ID) {
    return CUSTOMER_DIRECTORY_TABS.filter((tab) => tab.id !== "van-sales");
  }
  return CUSTOMER_DIRECTORY_TABS;
}
