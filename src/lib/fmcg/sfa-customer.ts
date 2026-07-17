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
      return "Modern trade HQ";
    case "MODERN_TRADE_BRANCH":
      return "Modern trade branch";
    case "GENERAL_TRADE_CLIENT":
      return "General trade client";
    case "DISTRIBUTOR":
      return "Distributor";
    case "VAN_SALES":
      return "Van sales";
    default:
      return "—";
  }
}

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
  { id: "general-trade", label: "Clients", sfaSegment: "GENERAL_TRADE_CLIENT" as SfaSegment, channel: "GENERAL_TRADE" as PartyChannel },
  { id: "distributors", label: "Distributors", sfaSegment: "DISTRIBUTOR" as SfaSegment },
  { id: "van-sales", label: "Van sales", sfaSegment: "VAN_SALES" as SfaSegment },
] as const;
