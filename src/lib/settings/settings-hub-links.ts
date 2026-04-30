export type SettingsHubLink = {
  href: string;
  label: string;
  description: string;
  icon: string;
  requiresPermissions?: string[];
};

export type SettingsHubGroup = {
  id: string;
  title: string;
  links: SettingsHubLink[];
};

export const SETTINGS_HUB_GROUPS: SettingsHubGroup[] = [
  {
    id: "organization",
    title: "Organization",
    links: [
      { href: "/settings/org", label: "Organization profile", description: "Org name, type, and core identity", icon: "Building", requiresPermissions: ["settings.org.read"] },
      { href: "/settings/platform", label: "Platform control", description: "Cross-tenant platform settings", icon: "Shield", requiresPermissions: ["platform.read"] },
      { href: "/settings/billing", label: "Billing", description: "Subscription and invoices", icon: "CreditCard", requiresPermissions: ["settings.org.read"] },
      { href: "/settings/organization/entities", label: "Entities", description: "Legal entities", icon: "Building2", requiresPermissions: ["settings.org.read"] },
      { href: "/settings/branches", label: "Branches", description: "Branches and locations", icon: "MapPin", requiresPermissions: ["settings.branches.read"] },
      { href: "/settings/compliance", label: "Compliance", description: "E-invoicing and regulatory options", icon: "ShieldCheck", requiresPermissions: ["settings.org.read"] },
      { href: "/settings/notifications", label: "Notifications", description: "Email and messaging preferences", icon: "Bell", requiresPermissions: ["settings.org.read"] },
      { href: "/settings/migrations", label: "Migration console", description: "Imports and data migration", icon: "DatabaseZap", requiresPermissions: ["settings.org.read"] },
      { href: "/settings/payroll", label: "Payroll", description: "Payroll configuration", icon: "CreditCard", requiresPermissions: ["settings.org.read"] },
      { href: "/settings/ops-runbook", label: "Operations runbook", description: "Retention and operational jobs", icon: "ClipboardList", requiresPermissions: ["settings.org.read"] },
    ],
  },
  {
    id: "people",
    title: "People & access",
    links: [
      { href: "/settings/users-roles", label: "Users & roles", description: "Users, roles, and permissions", icon: "Users", requiresPermissions: ["settings.users.read"] },
      { href: "/settings/preferences", label: "Preferences", description: "Org-wide preferences", icon: "Settings", requiresPermissions: ["settings.preferences.read"] },
      { href: "/settings/sequences", label: "Numbering sequences", description: "Document and reference numbering", icon: "Hash", requiresPermissions: ["settings.sequences.read"] },
      { href: "/settings/approval-policy", label: "Approval policy", description: "Maker-checker rules by document type", icon: "CheckCircle2", requiresPermissions: ["settings.org.read"] },
    ],
  },
  {
    id: "financial",
    title: "Financial",
    links: [
      { href: "/settings/financial", label: "Financial settings hub", description: "Currencies, COA, taxes, fiscal years, and more", icon: "Wallet", requiresPermissions: ["settings.financial.read"] },
      { href: "/settings/financial/currencies", label: "Currencies", description: "Base and enabled currencies", icon: "Banknote", requiresPermissions: ["settings.financial.read"] },
      { href: "/settings/financial/exchange-rates", label: "Exchange rates", description: "Manual and imported rates", icon: "TrendingUp", requiresPermissions: ["settings.financial.read"] },
      { href: "/settings/financial/chart-of-accounts", label: "Chart of accounts", description: "Account tree and types", icon: "ListTree", requiresPermissions: ["settings.financial.read"] },
      { href: "/settings/financial/taxes", label: "Taxes", description: "Tax codes and rates", icon: "Receipt", requiresPermissions: ["settings.financial.read"] },
      { href: "/settings/financial/fiscal-years", label: "Fiscal years", description: "Periods and year-end", icon: "Calendar", requiresPermissions: ["settings.financial.read"] },
      { href: "/settings/financial/posting-mappings", label: "Posting mappings", description: "Operational flows to ledger accounts", icon: "GitBranch", requiresPermissions: ["settings.financial.read"] },
      { href: "/settings/payment-terms", label: "Payment terms", description: "Customer and supplier terms", icon: "CalendarClock", requiresPermissions: ["settings.financial.read"] },
    ],
  },
  {
    id: "tax",
    title: "Tax (Kenya)",
    links: [
      { href: "/settings/tax/kenya", label: "Kenya profile", description: "Country tax profile", icon: "Globe", requiresPermissions: ["settings.financial.read"] },
      { href: "/settings/tax/vat", label: "VAT", description: "VAT configuration", icon: "Receipt", requiresPermissions: ["settings.financial.read"] },
      { href: "/settings/tax/withholding", label: "Withholding", description: "Withholding tax", icon: "Percent", requiresPermissions: ["settings.financial.read"] },
      { href: "/settings/tax/tax-mappings", label: "Tax mappings", description: "VAT and WHT mappings", icon: "Link", requiresPermissions: ["settings.financial.read"] },
    ],
  },
  {
    id: "inventory",
    title: "Inventory & products",
    links: [
      { href: "/settings/inventory/costing", label: "Costing", description: "Inventory costing policies", icon: "Calculator", requiresPermissions: ["settings.inventory.read"] },
      { href: "/settings/uom", label: "UOM catalog", description: "Units of measure", icon: "Ruler", requiresPermissions: ["settings.inventory.read"] },
      { href: "/settings/products/pricing-rules", label: "Pricing rules", description: "Product pricing rules", icon: "Tag", requiresPermissions: ["settings.inventory.read"] },
    ],
  },
  {
    id: "sales",
    title: "Sales & customers",
    links: [
      { href: "/settings/customer-categories", label: "Customer categories", description: "Segments and category rules", icon: "Tag", requiresPermissions: ["settings.org.read"] },
    ],
  },
  {
    id: "customizer",
    title: "Customizer (enterprise)",
    links: [
      { href: "/settings/customizer/modules", label: "Modules", description: "Enable modules and features", icon: "Grid", requiresPermissions: ["settings.customizer.read"] },
      { href: "/settings/customizer/fields", label: "Custom fields", description: "Field definitions", icon: "FileText", requiresPermissions: ["settings.customizer.read"] },
      { href: "/settings/customizer/workflows", label: "Workflows", description: "Workflow customization", icon: "Workflow", requiresPermissions: ["settings.customizer.read"] },
      { href: "/settings/customizer/dashboards", label: "Dashboards", description: "Dashboard layouts", icon: "LayoutDashboard", requiresPermissions: ["settings.customizer.read"] },
    ],
  },
  {
    id: "audit",
    title: "Audit & governance",
    links: [
      { href: "/settings/audit-log", label: "Audit log", description: "Security and change audit", icon: "FileSearch", requiresPermissions: ["settings.audit.read"] },
      { href: "/settings/master-data-governance", label: "Master data governance", description: "Approvals for master data changes", icon: "Shield", requiresPermissions: ["settings.org.read"] },
    ],
  },
];
