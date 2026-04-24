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
  /** Subheading label shown above this item when it starts a new nav group */
  navGroupLabel?: string;
}

export interface ResolvedNavSection {
  id: string;
  key: string;
  label: string;
  items: ResolvedNavItem[];
  tier: "primary" | "secondary";
}

export interface BuildVisibleNavInput {
  orgType: TemplateOrgType | null;
  enabledModules: ModuleKey[];
  featureFlags: Partial<Record<FeatureFlagKey, boolean>>;
  defaultNav: string[];
  terminology: TerminologyOverrides;
  user: User | null;
  permissions: string[];
  /** Current org role (e.g. "STANDARD", "FRANCHISOR", "FRANCHISEE") for role-gated nav items. */
  orgRole?: string;
  /** When true, only sections listed in defaultNav are rendered; no extra sections are appended. */
  strictSections?: boolean;
}

function hasRuntimePermission(permissions: string[], required: string): boolean {
  if (permissions.includes("*")) return true;
  if (permissions.includes(required)) return true;
  const wildcardPrefixes = permissions
    .filter((entry) => entry.endsWith(".*"))
    .map((entry) => entry.slice(0, -2));
  return wildcardPrefixes.some((prefix) => required.startsWith(`${prefix}.`));
}

function itemPasses(item: NavItemConfig, input: BuildVisibleNavInput): boolean {
  if (item.moduleKey && !input.enabledModules.includes(item.moduleKey)) return false;
  if (item.requiresOrgTypes?.length) {
    if (!input.orgType || !item.requiresOrgTypes.includes(input.orgType)) return false;
  }
  if (item.requiresFlags?.length) {
    const hasFlags = item.requiresFlags.every((flag) => input.featureFlags[flag] === true);
    if (!hasFlags) return false;
  }
  if (item.requiresPermissions?.length) {
    const hasPermission = item.requiresPermissions.some((perm) => hasRuntimePermission(input.permissions, perm));
    if (!hasPermission) return false;
  }
  if (item.requiresOrgRole && input.orgRole !== item.requiresOrgRole) return false;
  return true;
}

function sectionPasses(section: NavSectionConfig, input: BuildVisibleNavInput): boolean {
  if (section.moduleKey && !input.enabledModules.includes(section.moduleKey)) return false;
  if (section.requiresOrgTypes?.length) {
    if (!input.orgType || !section.requiresOrgTypes.includes(input.orgType)) return false;
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
      navGroupLabel: item.navGroupTermKey ? t(item.navGroupTermKey, input.terminology) : undefined,
    });
  }
  return out;
}

/** Build visible nav sections with module/flag/orgType/permission gating applied. */
export function buildVisibleNav(input: BuildVisibleNavInput): ResolvedNavSection[] {
  const fullSectionKeys = NAV_SECTIONS_CONFIG.map((s) => s.key);
  const fullSectionKeysStr = fullSectionKeys as readonly string[];
  // When strictSections is true (e.g. franchisee persona), only include sections listed in defaultNav.
  // Otherwise, append all remaining sections after the defaultNav ones (legacy behaviour).
  let order: string[] = input.defaultNav.length
    ? input.strictSections
      ? input.defaultNav.filter((k) => fullSectionKeysStr.includes(k))
      : [
          ...input.defaultNav.filter((k) => fullSectionKeysStr.includes(k)),
          ...fullSectionKeys.filter((k) => !input.defaultNav.includes(k)),
        ]
    : [...fullSectionKeys];
  // Core (Dashboard, Control Tower, etc.) first when dashboard module is enabled
  if (input.enabledModules.includes("dashboard")) {
    if (!order.includes("core")) order = ["core", ...order];
    else if (order[0] !== "core") order = ["core", ...order.filter((k) => k !== "core")];
  }
  // Org-stored defaultNav may predate the "processing" section; insert after Core so manufacturing areas still appear (incl. strict nav).
  if (input.enabledModules.includes("manufacturing") && !order.includes("processing")) {
    const hasProcessingSection = NAV_SECTIONS_CONFIG.some((s) => s.key === "processing");
    if (hasProcessingSection) {
      const coreIdx = order.indexOf("core");
      if (coreIdx >= 0) {
        order.splice(coreIdx + 1, 0, "processing");
      } else {
        order.splice(0, 0, "processing");
      }
    }
  }
  // Payroll is nested under Finance; map legacy "payroll" section key to "finance" and de-dupe.
  {
    const seen = new Set<string>();
    order = order
      .map((k) => (k === "payroll" ? "finance" : k))
      .filter((k) => (seen.has(k) ? false : (seen.add(k), true)));
  }
  const byKey = new Map<string, NavSectionConfig>(NAV_SECTIONS_CONFIG.map((s) => [s.key, s]));
  const result: ResolvedNavSection[] = [];

  for (const sectionKey of order) {
    const section = byKey.get(sectionKey);
    if (!section) continue;
    if (!sectionPasses(section, input)) continue;
    const items = resolveItems(section.items, input);
    if (items.length === 0) continue;

    result.push({
      id: section.key,
      key: section.key,
      label: section.labelTermKey ? t(section.labelTermKey, input.terminology) : section.label,
      items,
      tier: section.tier ?? "secondary",
    });
  }

  return result;
}
