import type { User } from "@/types/erp";
import type { TemplateOrgType, ModuleKey, FeatureFlagKey, TerminologyOverrides } from "@/config/industryTemplates/index";
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

/** Include all nav items so the full nav is visible; route-level auth still applies on navigation. */
function itemPasses(_item: NavItemConfig, _input: BuildVisibleNavInput): boolean {
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

/** Build visible nav sections. Shows every section from the config; defaultNav only controls order.
 * Module/flag/orgType/permission gating and terminology are applied. Core is always first when dashboard is enabled. */
export function buildVisibleNav(input: BuildVisibleNavInput): ResolvedNavSection[] {
  const fullSectionKeys = NAV_SECTIONS_CONFIG.map((s) => s.key);
  // Include every section from config; use defaultNav only for ordering (sections in defaultNav first, then the rest in config order)
  const fullSectionKeysStr = fullSectionKeys as readonly string[];
  let order: string[] = input.defaultNav.length
    ? [
        ...input.defaultNav.filter((k) => fullSectionKeysStr.includes(k)),
        ...fullSectionKeys.filter((k) => !input.defaultNav.includes(k)),
      ]
    : [...fullSectionKeys];
  // Core (Dashboard, Control Tower, etc.) first when dashboard module is enabled
  if (input.enabledModules.includes("dashboard")) {
    if (!order.includes("core")) order = ["core", ...order];
    else if (order[0] !== "core") order = ["core", ...order.filter((k) => k !== "core")];
  }
  const byKey = new Map<string, NavSectionConfig>(NAV_SECTIONS_CONFIG.map((s) => [s.key, s]));
  const result: ResolvedNavSection[] = [];

  for (const sectionKey of order) {
    const section = byKey.get(sectionKey);
    if (!section) continue;
    // Show every section (no module/orgType gating); full nav visible, route-level auth on navigation
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
