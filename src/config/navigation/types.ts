import type { TemplateOrgType, ModuleKey, FeatureFlagKey, NavSectionKey, TerminologyKey } from "@/config/industryTemplates/index";

export type NavItemKey = string;

export interface NavItemConfig {
  key: NavItemKey;
  label: string;
  href?: string;
  icon: string;
  moduleKey?: ModuleKey;
  requiresFlags?: FeatureFlagKey[];
  requiresOrgTypes?: TemplateOrgType[];
  requiresPermissions?: string[];
  /** Restricts this nav item to a specific org role (e.g. "FRANCHISOR", "FRANCHISEE"). */
  requiresOrgRole?: string;
  children?: NavItemConfig[];
  badge?: { type: "count" | "text"; value: string };
  /** Terminology key for label override when t() is used */
  termKey?: TerminologyKey;
  /** Optional sidebar subheading (resolved via t(key)); consecutive items with the same key share one heading */
  navGroupTermKey?: TerminologyKey;
}

export interface NavSectionConfig {
  key: NavSectionKey;
  label: string;
  /** If set, sidebar section title is t(labelTermKey) (template overrides). */
  labelTermKey?: TerminologyKey;
  moduleKey?: ModuleKey;
  requiresOrgTypes?: TemplateOrgType[];
  order: number;
  items: NavItemConfig[];
  /** Determines render group: primary sections appear first, secondary sections appear below the divider sorted A–Z */
  tier?: "primary" | "secondary";
}
