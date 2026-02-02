/**
 * Industry template schema — config-driven, scalable.
 * Adding a new industry = add one entry to the registry; no nav rewrites.
 */

export type TemplateOrgType = "MANUFACTURER" | "DISTRIBUTOR" | "RETAIL";

export type ModuleKey =
  | "dashboard"
  | "masters"
  | "inventory"
  | "sales"
  | "purchasing"
  | "pricing"
  | "finance"
  | "manufacturing"
  | "distribution"
  | "retail"
  | "crm"
  | "projects"
  | "payroll"
  | "reports"
  | "automation"
  | "analytics"
  | "settings"
  | "docs";

/** Feature flags gating nav items and capabilities */
export type FeatureFlagKey =
  | "batchExpiry"
  | "approvals"
  | "costing"
  | "bomMrpWorkOrders"
  | "routesPromotionsPos"
  | "multiWarehouse"
  | "workOrders"
  | "deliveries"
  | "collections"
  | "replenishment"
  | "promotions"
  | "storePerformance";

export type NavSectionKey =
  | "core"
  | "masters"
  | "inventory"
  | "warehouse"
  | "treasury"
  | "assets"
  | "projects"
  | "payroll"
  | "intercompany"
  | "sales"
  | "purchasing"
  | "pricing"
  | "manufacturing"
  | "distribution"
  | "retail"
  | "finance"
  | "crm"
  | "reports"
  | "automation"
  | "analytics"
  | "settings"
  | "docs";

/** Terminology keys — t(key) resolves from template.terminology */
export type TerminologyKey =
  | "customer"
  | "supplier"
  | "product"
  | "warehouse"
  | "branch"
  | "outlet"
  | "salesOrder"
  | "purchaseOrder"
  | "goodsReceipt"
  | "invoice"
  | "journalEntry"
  | "workOrder"
  | "bom"
  | "route"
  | "delivery"
  | "collection"
  | "replenishment"
  | "promotion"
  | "store"
  | "quote"
  | "deliveryNote"
  | "purchaseRequest"
  | "bill";

export type TerminologyOverrides = Partial<Record<TerminologyKey, string>>;

export interface DefaultKpiConfig {
  kpiId: string;
  label: string;
  order: number;
}

export interface DefaultRoleDashboardConfig {
  roleId: string;
  widgetIds: string[];
}

export interface OnboardingDefaults {
  currency: string;
  taxMode: "inclusive" | "exclusive";
  fiscalYearStartMonth: number; // 1-12
  warehouseMode: "single" | "multi";
  defaultCountry?: string;
  defaultTimezone?: string;
}

export interface IndustryTemplateDefinition {
  id: string;
  name: string;
  description: string;
  orgType: TemplateOrgType;
  /** Module keys enabled for this template */
  enabledModules: ModuleKey[];
  /** Section keys in display order; omitted sections are hidden */
  defaultNav: NavSectionKey[];
  featureFlags: Partial<Record<FeatureFlagKey, boolean>>;
  terminology: TerminologyOverrides;
  defaultKPIs: DefaultKpiConfig[];
  defaultRoleDashboards: DefaultRoleDashboardConfig[];
  onboardingDefaults: OnboardingDefaults;
  /** Icon key for lucide */
  icon: string;
}

export type TemplateId = string;
