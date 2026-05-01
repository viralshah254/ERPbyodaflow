import { buildVisibleNav, NAV_SECTIONS_CONFIG } from "@/config/navigation";
import type { ResolvedNavSection } from "@/config/navigation";
import type {
  FeatureFlagKey,
  IndustryTemplateDefinition,
  ModuleKey,
  TemplateOrgType,
} from "@/config/industryTemplates/index";
import type { User } from "@/types/erp";

const ALL_MODULES: ModuleKey[] = [
  "dashboard",
  "inventory",
  "sales",
  "purchasing",
  "pricing",
  "finance",
  "manufacturing",
  "distribution",
  "franchise",
  "retail",
  "crm",
  "projects",
  "payroll",
  "reports",
  "automation",
  "analytics",
  "settings",
  "docs",
];

const DEFAULT_NAV_ORDER = NAV_SECTIONS_CONFIG.map((s) => s.key);

const FRANCHISEE_MODULES: ModuleKey[] = [
  "dashboard",
  "sales",
  "purchasing",
  "inventory",
  "franchise",
  "reports",
  "settings",
  "docs",
];

function toTemplateOrgType(orgType: string | undefined): TemplateOrgType | null {
  if (!orgType) return null;
  if (orgType === "SHOP") return "RETAIL";
  return orgType as TemplateOrgType;
}

export type ComputeDashboardSidebarSectionsParams = {
  ctxOrgType: TemplateOrgType | null;
  orgOrgType: string | undefined;
  enabledModules: ModuleKey[];
  featureFlags: Partial<Record<FeatureFlagKey, boolean>>;
  template: IndustryTemplateDefinition | null;
  user: User | null;
  permissions: string[];
  orgRole: string | undefined;
  franchisePersona: "STANDARD" | "LIGHT_ERP";
};

/** Resolved nav sections for the main ERP sidebar (before badges and sidebar layout prefs). */
export function computeDashboardSidebarSections(params: ComputeDashboardSidebarSectionsParams): ResolvedNavSection[] {
  const {
    ctxOrgType,
    orgOrgType,
    enabledModules,
    featureFlags,
    template,
    user,
    permissions,
    orgRole,
    franchisePersona,
  } = params;

  const orgType = toTemplateOrgType(ctxOrgType ?? orgOrgType ?? undefined);
  const isFranchiseePersona = franchisePersona === "LIGHT_ERP" || orgRole === "FRANCHISEE";
  const baseModules = enabledModules.length > 0 ? enabledModules : [...ALL_MODULES];
  const resolvedModules = isFranchiseePersona
    ? FRANCHISEE_MODULES
    : template?.enabledModules?.length
      ? [...new Set([...baseModules, ...template.enabledModules])]
      : baseModules;

  const personaNav = isFranchiseePersona ? ["core", "sales", "purchasing", "inventory", "franchise", "docs"] : null;

  const sections = buildVisibleNav({
    orgType,
    enabledModules: resolvedModules,
    featureFlags: featureFlags ?? {},
    defaultNav: personaNav ?? (template?.defaultNav?.length ? template.defaultNav : DEFAULT_NAV_ORDER),
    terminology: template?.terminology ?? {},
    user,
    permissions,
    orgRole: orgRole ?? undefined,
    strictSections: isFranchiseePersona || template?.strictNavSections === true,
  });

  if (!isFranchiseePersona) return sections;

  const PURCHASING_ALLOWED = new Set(["purchasing-requests", "purchasing-orders"]);
  const INVENTORY_ALLOWED = new Set([
    "inventory-products",
    "inventory-stock-levels",
    "inventory-movements",
    "inventory-receipts",
  ]);

  return sections
    .map((section) => {
      if (section.key === "purchasing") {
        return { ...section, items: section.items.filter((i) => PURCHASING_ALLOWED.has(i.key)) };
      }
      if (section.key === "inventory") {
        return { ...section, items: section.items.filter((i) => INVENTORY_ALLOWED.has(i.key)) };
      }
      return section;
    })
    .filter((section) => section.items.length > 0);
}

/** Modules used for sidebar pin rules (dashboard first section, processing placement). */
export function computeDashboardSidebarModules(params: ComputeDashboardSidebarSectionsParams): ModuleKey[] {
  const { enabledModules, template, orgRole, franchisePersona } = params;

  const isFranchiseePersona = franchisePersona === "LIGHT_ERP" || orgRole === "FRANCHISEE";
  const baseModules = enabledModules.length > 0 ? enabledModules : [...ALL_MODULES];
  const resolvedModules = isFranchiseePersona
    ? FRANCHISEE_MODULES
    : template?.enabledModules?.length
      ? [...new Set([...baseModules, ...template.enabledModules])]
      : baseModules;

  return resolvedModules;
}
