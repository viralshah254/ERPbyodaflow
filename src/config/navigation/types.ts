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
  children?: NavItemConfig[];
  badge?: { type: "count" | "text"; value: string };
  /** Terminology key for label override when t() is used */
  termKey?: TerminologyKey;
}

export interface NavSectionConfig {
  key: NavSectionKey;
  label: string;
  moduleKey?: ModuleKey;
  requiresOrgTypes?: TemplateOrgType[];
  order: number;
  items: NavItemConfig[];
}
