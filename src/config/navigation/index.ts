import type { User } from "@/types/erp";
import type { TemplateOrgType, ModuleKey, FeatureFlagKey, TerminologyOverrides } from "@/config/industryTemplates/index";
import { can } from "@/lib/rbac/can";
import { t } from "@/lib/terminology";
import type { NavSectionConfig, NavItemConfig } from "./types";
import { NAV_SECTIONS_CONFIG } from "./sections";

export type { NavSectionConfig, NavItemConfig, NavItemKey } from "./types";
export { NAV_SECTIONS_CONFIG } from "./sections";

export interface ResolvedNavItem {
  id: string;
  key: string;
  label: string;
  href?: string;
  icon: string;
  children?: ResolvedNavItem[];
  badge?: { type: "count" | "text"; value: string };
}

export interface ResolvedNavSection {
  id: string;
  key: string;
  label: string;
  items: ResolvedNavItem[];
}

export interface BuildVisibleNavInput {
  orgType: TemplateOrgType | null;
  enabledModules: ModuleKey[];
  featureFlags: Partial<Record<FeatureFlagKey, boolean>>;
  defaultNav: string[];
  terminology: TerminologyOverrides;
  user: User | null;
}

function itemPasses(
  item: NavItemConfig,
  input: BuildVisibleNavInput
): boolean {
  if (item.moduleKey && !input.enabledModules.includes(item.moduleKey)) return false;
  if (item.requiresOrgTypes?.length && input.orgType && !item.requiresOrgTypes.includes(input.orgType)) return false;
  if (item.requiresFlags?.length) {
    const allOn = item.requiresFlags.every((f) => input.featureFlags[f] === true);
    if (!allOn) return false;
  }
  if (item.requiresPermissions?.length) {
    const allPass = item.requiresPermissions.every((p) => can(input.user, p));
    if (!allPass) return false;
  }
  return true;
}

function resolveLabel(item: NavItemConfig, terminology: TerminologyOverrides): string {
  if (item.termKey) return t(item.termKey, terminology);
  return item.label;
}

function resolveItems(items: NavItemConfig[], input: BuildVisibleNavInput): ResolvedNavItem[] {
  const out: ResolvedNavItem[] = [];
  for (const item of items) {
    if (!itemPasses(item, input)) continue;
    const children = item.children?.length ? resolveItems(item.children, input) : undefined;
    if (item.children?.length && (!children || children.length === 0) && !item.href) continue;
    out.push({
      id: item.key,
      key: item.key,
      label: resolveLabel(item, input.terminology),
      href: item.href,
      icon: item.icon,
      children: children?.length ? children : undefined,
      badge: item.badge,
    });
  }
  return out;
}

/** Build visible nav sections ordered by template.defaultNav, with module/flag/orgType/permission gating and terminology applied */
export function buildVisibleNav(input: BuildVisibleNavInput): ResolvedNavSection[] {
  const order = input.defaultNav.length ? input.defaultNav : NAV_SECTIONS_CONFIG.map((s) => s.key);
  const byKey = new Map<string, NavSectionConfig>(NAV_SECTIONS_CONFIG.map((s) => [s.key, s]));
  const result: ResolvedNavSection[] = [];

  for (const sectionKey of order) {
    const section = byKey.get(sectionKey);
    if (!section) continue;
    if (section.moduleKey && !input.enabledModules.includes(section.moduleKey)) continue;
    if (section.requiresOrgTypes?.length && input.orgType && !section.requiresOrgTypes.includes(input.orgType)) continue;

    const items = resolveItems(section.items, input);
    if (items.length === 0) continue;

    result.push({
      id: section.key,
      key: section.key,
      label: section.label,
      items,
    });
  }

  return result;
}
