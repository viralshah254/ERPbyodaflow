/**
 * QA Route Registry — comprehensive list of all app routes.
 * Used by /dev/route-check and /dev/link-check.
 */

export interface RouteInfo {
  path: string;
  module: string;
  description: string;
  inNav: boolean;
  dynamic?: boolean;
}

export const ROUTE_REGISTRY: RouteInfo[] = [
  // Core
  { path: "/dashboard", module: "core", description: "Main dashboard", inNav: true },
  { path: "/approvals", module: "core", description: "Approvals hub", inNav: true },
  { path: "/approvals/inbox", module: "core", description: "Approval inbox", inNav: true },
  { path: "/approvals/requests", module: "core", description: "My requests", inNav: true },
  { path: "/tasks", module: "core", description: "Tasks / Work queue", inNav: true },
  { path: "/inbox", module: "core", description: "Inbox (internal)", inNav: false },
  { path: "/onboarding", module: "core", description: "Onboarding wizard", inNav: false },

  // Document Center
  { path: "/docs", module: "docs", description: "Document center hub", inNav: true },
  { path: "/docs/sales-order", module: "docs", description: "Sales orders list", inNav: true },
  { path: "/docs/purchase-order", module: "docs", description: "Purchase orders list", inNav: true },
  { path: "/docs/grn", module: "docs", description: "Goods receipts list", inNav: true },
  { path: "/docs/invoice", module: "docs", description: "Invoices list", inNav: true },
  { path: "/docs/journal", module: "docs", description: "Journal entries list", inNav: true },
  { path: "/docs/invoice/new", module: "docs", description: "New invoice wizard", inNav: false, dynamic: true },
  { path: "/docs/invoice/1", module: "docs", description: "Invoice detail (sample)", inNav: false, dynamic: true },

  // Masters
  { path: "/master", module: "masters", description: "Masters hub", inNav: true },
  { path: "/master/products", module: "masters", description: "Products list", inNav: true },
  { path: "/master/products/p1", module: "masters", description: "Product detail (sample)", inNav: false, dynamic: true },
  { path: "/master/products/p1/packaging", module: "masters", description: "Product packaging", inNav: false, dynamic: true },
  { path: "/master/products/p1/pricing", module: "masters", description: "Product pricing", inNav: false, dynamic: true },
  { path: "/master/products/p1/variants", module: "masters", description: "Product variants", inNav: false, dynamic: true },
  { path: "/master/products/p1/attributes", module: "masters", description: "Product attributes", inNav: false, dynamic: true },
  { path: "/master/parties", module: "masters", description: "Parties (customers/suppliers)", inNav: true },
  { path: "/master/warehouses", module: "masters", description: "Warehouses", inNav: true },

  // Inventory
  { path: "/inventory/products", module: "inventory", description: "Inventory products", inNav: true },
  { path: "/inventory/stock-levels", module: "inventory", description: "Stock levels", inNav: true },
  { path: "/inventory/stock", module: "inventory", description: "Stock (duplicate?)", inNav: false },
  { path: "/inventory/movements", module: "inventory", description: "Stock movements", inNav: true },
  { path: "/inventory/receipts", module: "inventory", description: "Receipts (GRN)", inNav: true },
  { path: "/inventory/costing", module: "inventory", description: "Costing", inNav: true },
  { path: "/inventory/warehouses", module: "inventory", description: "Warehouses", inNav: true },

  // Warehouse
  { path: "/warehouse/overview", module: "warehouse", description: "Warehouse overview", inNav: true },
  { path: "/warehouse/transfers", module: "warehouse", description: "Transfers list", inNav: true },
  { path: "/warehouse/transfers/1", module: "warehouse", description: "Transfer detail (sample)", inNav: false, dynamic: true },
  { path: "/warehouse/pick-pack", module: "warehouse", description: "Pick & pack list", inNav: true },
  { path: "/warehouse/pick-pack/1", module: "warehouse", description: "Pick & pack detail (sample)", inNav: false, dynamic: true },
  { path: "/warehouse/putaway", module: "warehouse", description: "Putaway list", inNav: true },
  { path: "/warehouse/putaway/1", module: "warehouse", description: "Putaway detail (sample)", inNav: false, dynamic: true },
  { path: "/warehouse/bin-locations", module: "warehouse", description: "Bin locations", inNav: true },
  { path: "/warehouse/cycle-counts", module: "warehouse", description: "Cycle counts list", inNav: true },
  { path: "/warehouse/cycle-counts/1", module: "warehouse", description: "Cycle count detail (sample)", inNav: false, dynamic: true },

  // Sales
  { path: "/sales/overview", module: "sales", description: "Sales overview", inNav: true },
  { path: "/sales/quotes", module: "sales", description: "Quotes", inNav: true },
  { path: "/sales/orders", module: "sales", description: "Sales orders", inNav: true },
  { path: "/sales/deliveries", module: "sales", description: "Deliveries", inNav: true },
  { path: "/sales/invoices", module: "sales", description: "Invoices", inNav: true },
  { path: "/sales/customers", module: "sales", description: "Customers", inNav: true },
  { path: "/sales/returns", module: "sales", description: "Returns / Credit notes", inNav: true },

  // Purchasing
  { path: "/purchasing/requests", module: "purchasing", description: "Purchase requests", inNav: true },
  { path: "/purchasing/orders", module: "purchasing", description: "Purchase orders", inNav: true },
  { path: "/purchasing/purchase-orders", module: "purchasing", description: "PO (duplicate?)", inNav: false },
  { path: "/purchasing/goods-receipt", module: "purchasing", description: "Goods receipt", inNav: false },
  { path: "/purchasing/supplier-invoices", module: "purchasing", description: "Supplier invoices", inNav: false },
  { path: "/purchasing/purchase-returns", module: "purchasing", description: "Purchase returns", inNav: true },

  // AP
  { path: "/ap/suppliers", module: "finance", description: "AP Suppliers", inNav: true },
  { path: "/ap/bills", module: "finance", description: "AP Bills", inNav: true },
  { path: "/ap/payments", module: "finance", description: "AP Payments", inNav: true },
  { path: "/ap/three-way-match", module: "finance", description: "3-way match", inNav: true },

  // AR
  { path: "/ar/customers", module: "finance", description: "AR Customers", inNav: true },
  { path: "/ar/payments", module: "finance", description: "AR Payments", inNav: true },

  // Finance
  { path: "/pricing/overview", module: "pricing", description: "Pricing overview", inNav: true },
  { path: "/pricing/price-lists", module: "pricing", description: "Price lists", inNav: true },
  { path: "/pricing/rules", module: "pricing", description: "Pricing rules", inNav: true },
  { path: "/finance", module: "finance", description: "Finance dashboard", inNav: true },
  { path: "/finance/gl", module: "finance", description: "General ledger", inNav: true },
  { path: "/finance/chart-of-accounts", module: "finance", description: "Chart of accounts", inNav: true },
  { path: "/finance/journals", module: "finance", description: "Journal entries", inNav: true },
  { path: "/finance/ar", module: "finance", description: "AR overview", inNav: true },
  { path: "/finance/ap", module: "finance", description: "AP overview", inNav: true },
  { path: "/finance/payments", module: "finance", description: "Payments & receipts", inNav: true },
  { path: "/finance/tax", module: "finance", description: "Tax / VAT", inNav: true },
  { path: "/finance/statements", module: "finance", description: "Financial statements", inNav: true },
  { path: "/finance/statements/pnl", module: "finance", description: "P&L", inNav: true },
  { path: "/finance/statements/balance-sheet", module: "finance", description: "Balance sheet", inNav: true },
  { path: "/finance/statements/cash-flow", module: "finance", description: "Cash flow", inNav: true },
  { path: "/finance/period-close", module: "finance", description: "Period close", inNav: true },
  { path: "/finance/audit", module: "finance", description: "Audit log", inNav: true },
  { path: "/finance/bank-recon", module: "finance", description: "Bank reconciliation", inNav: true },
  { path: "/finance/budgets", module: "finance", description: "Budgets", inNav: false },
  { path: "/finance/fixed-assets", module: "finance", description: "Fixed assets", inNav: false },
  { path: "/finance/ledger", module: "finance", description: "Ledger", inNav: false },

  // Treasury
  { path: "/treasury/overview", module: "treasury", description: "Treasury overview", inNav: true },
  { path: "/treasury/payment-runs", module: "treasury", description: "Payment runs", inNav: true },
  { path: "/treasury/payment-runs/1", module: "treasury", description: "Payment run detail (sample)", inNav: false, dynamic: true },
  { path: "/treasury/collections", module: "treasury", description: "Collections", inNav: true },
  { path: "/treasury/bank-accounts", module: "treasury", description: "Bank accounts", inNav: true },
  { path: "/treasury/cashflow", module: "treasury", description: "Cashflow", inNav: true },

  // Assets
  { path: "/assets/overview", module: "assets", description: "Assets overview", inNav: true },
  { path: "/assets/register", module: "assets", description: "Asset register", inNav: true },
  { path: "/assets/register/1", module: "assets", description: "Asset detail (sample)", inNav: false, dynamic: true },
  { path: "/assets/depreciation", module: "assets", description: "Depreciation", inNav: true },
  { path: "/assets/disposals", module: "assets", description: "Disposals", inNav: true },

  // Projects
  { path: "/projects/overview", module: "projects", description: "Projects overview", inNav: true },
  { path: "/projects/list", module: "projects", description: "Projects list", inNav: true },
  { path: "/projects/1", module: "projects", description: "Project detail (sample)", inNav: false, dynamic: true },
  { path: "/timesheets", module: "projects", description: "Timesheets", inNav: true },

  // Payroll
  { path: "/payroll/overview", module: "payroll", description: "Payroll overview", inNav: true },
  { path: "/payroll/employees", module: "payroll", description: "Employees", inNav: true },
  { path: "/payroll/pay-runs", module: "payroll", description: "Pay runs", inNav: true },
  { path: "/payroll/pay-runs/1", module: "payroll", description: "Pay run detail (sample)", inNav: false, dynamic: true },
  { path: "/payroll/payslips", module: "payroll", description: "Payslips", inNav: true },
  { path: "/payroll/statutories", module: "payroll", description: "Statutories", inNav: true },

  // Intercompany
  { path: "/intercompany/overview", module: "intercompany", description: "Intercompany overview", inNav: true },
  { path: "/intercompany/transactions", module: "intercompany", description: "IC transactions", inNav: true },

  // Manufacturing
  { path: "/manufacturing/boms", module: "manufacturing", description: "Bills of material", inNav: true },
  { path: "/manufacturing/boms/new", module: "manufacturing", description: "New BOM", inNav: false },
  { path: "/manufacturing/boms/bom1", module: "manufacturing", description: "BOM detail", inNav: false, dynamic: true },
  { path: "/manufacturing/routing", module: "manufacturing", description: "Routing (work centers, routes, ops)", inNav: true },
  { path: "/manufacturing/work-orders", module: "manufacturing", description: "Work orders", inNav: true },
  { path: "/manufacturing/mrp", module: "manufacturing", description: "MRP planning", inNav: true },

  // Distribution
  { path: "/distribution/routes", module: "distribution", description: "Routes", inNav: true },
  { path: "/distribution/deliveries", module: "distribution", description: "Deliveries", inNav: true },
  { path: "/distribution/collections", module: "distribution", description: "Collections", inNav: true },

  // Retail
  { path: "/retail/replenishment", module: "retail", description: "Replenishment", inNav: true },
  { path: "/retail/promotions", module: "retail", description: "Promotions", inNav: true },
  { path: "/retail/store-performance", module: "retail", description: "Store performance", inNav: true },

  // CRM
  { path: "/crm/accounts", module: "crm", description: "CRM accounts", inNav: true },
  { path: "/crm/activities", module: "crm", description: "Activities / notes", inNav: true },
  { path: "/crm/deals", module: "crm", description: "Deals / opportunities", inNav: true },
  { path: "/crm/tickets", module: "crm", description: "Support tickets", inNav: true },

  // Reports
  { path: "/reports", module: "reports", description: "Report library", inNav: true },
  { path: "/reports/saved", module: "reports", description: "Saved views", inNav: true },
  { path: "/reports/scheduled", module: "reports", description: "Scheduled reports", inNav: true },
  { path: "/reports/exports", module: "reports", description: "Exports", inNav: true },
  { path: "/reports/vat-summary", module: "reports", description: "VAT summary", inNav: false },
  { path: "/reports/wht-summary", module: "reports", description: "WHT summary", inNav: false },

  // Analytics
  { path: "/analytics", module: "analytics", description: "Analytics hub", inNav: true },
  { path: "/analytics/explore", module: "analytics", description: "Explore", inNav: true },
  { path: "/analytics/insights", module: "analytics", description: "Insights", inNav: true },
  { path: "/analytics/anomalies", module: "analytics", description: "Anomalies", inNav: true },
  { path: "/analytics/simulations", module: "analytics", description: "Simulations", inNav: true },
  { path: "/analytics/products", module: "analytics", description: "Products intelligence", inNav: true },
  { path: "/analytics/pricing", module: "analytics", description: "Pricing intelligence", inNav: true },
  { path: "/analytics/inventory", module: "analytics", description: "Inventory intelligence", inNav: true },
  { path: "/analytics/finance", module: "analytics", description: "Finance intelligence", inNav: true },
  { path: "/analytics/payroll", module: "analytics", description: "Payroll intelligence", inNav: true },
  { path: "/analytics/settings", module: "analytics", description: "Analytics settings", inNav: true },

  // Automation
  { path: "/automation", module: "automation", description: "Automation dashboard", inNav: true },
  { path: "/automation/rules", module: "automation", description: "Rules engine", inNav: true },
  { path: "/automation/alerts", module: "automation", description: "Alerts & notifications", inNav: true },
  { path: "/automation/schedules", module: "automation", description: "Scheduled jobs", inNav: true },
  { path: "/automation/workflows", module: "automation", description: "Approval workflows", inNav: true },
  { path: "/automation/integrations", module: "automation", description: "Integrations", inNav: true },
  { path: "/automation/ai-insights", module: "automation", description: "AI insights", inNav: true },
  { path: "/work/queue", module: "automation", description: "Work queue", inNav: true },

  // Settings
  { path: "/settings/org", module: "settings", description: "Organization profile", inNav: true },
  { path: "/settings/organization/entities", module: "settings", description: "Entities", inNav: true },
  { path: "/settings/branches", module: "settings", description: "Branches", inNav: true },
  { path: "/settings/users-roles", module: "settings", description: "Users & roles", inNav: true },
  { path: "/settings/preferences", module: "settings", description: "Preferences", inNav: true },
  { path: "/settings/sequences", module: "settings", description: "Numbering sequences", inNav: true },
  { path: "/settings/compliance", module: "settings", description: "Compliance", inNav: true },
  { path: "/settings/notifications", module: "settings", description: "Notifications", inNav: true },
  { path: "/settings/payroll", module: "settings", description: "Payroll settings", inNav: true },
  { path: "/settings/audit-log", module: "settings", description: "Audit log", inNav: true },
  { path: "/settings/financial", module: "settings", description: "Financial settings", inNav: true },
  { path: "/settings/financial/currencies", module: "settings", description: "Currencies", inNav: true },
  { path: "/settings/financial/exchange-rates", module: "settings", description: "Exchange rates", inNav: true },
  { path: "/settings/financial/chart-of-accounts", module: "settings", description: "Chart of accounts", inNav: true },
  { path: "/settings/financial/taxes", module: "settings", description: "Taxes", inNav: true },
  { path: "/settings/financial/fiscal-years", module: "settings", description: "Fiscal years", inNav: true },
  { path: "/settings/inventory/costing", module: "settings", description: "Inventory costing", inNav: true },
  { path: "/settings/uom", module: "settings", description: "UOM catalog", inNav: true },
  { path: "/settings/products/pricing-rules", module: "settings", description: "Pricing rules", inNav: true },
  { path: "/settings/tax/kenya", module: "settings", description: "Kenya profile", inNav: true },
  { path: "/settings/tax/vat", module: "settings", description: "VAT settings", inNav: true },
  { path: "/settings/tax/withholding", module: "settings", description: "Withholding tax", inNav: true },
  { path: "/settings/tax/tax-mappings", module: "settings", description: "Tax mappings", inNav: true },
  { path: "/settings/customization", module: "settings", description: "Customization", inNav: false },
  { path: "/settings/customizer/modules", module: "settings", description: "Customizer modules", inNav: true },
  { path: "/settings/customizer/fields", module: "settings", description: "Custom fields", inNav: true },
  { path: "/settings/customizer/workflows", module: "settings", description: "Customizer workflows", inNav: true },
  { path: "/settings/customizer/dashboards", module: "settings", description: "Customizer dashboards", inNav: true },

  // Dev
  { path: "/dev", module: "dev", description: "Dev hub", inNav: false },
  { path: "/dev/route-check", module: "dev", description: "Route check", inNav: false },
  { path: "/dev/action-audit", module: "dev", description: "Action audit", inNav: false },
  { path: "/dev/data-health", module: "dev", description: "Data health", inNav: false },
  { path: "/dev/link-check", module: "dev", description: "Link check", inNav: false },
];

export function getRoutesByModule(): Record<string, RouteInfo[]> {
  const byModule: Record<string, RouteInfo[]> = {};
  for (const r of ROUTE_REGISTRY) {
    if (!byModule[r.module]) byModule[r.module] = [];
    byModule[r.module].push(r);
  }
  return byModule;
}

export function getNavRoutes(): RouteInfo[] {
  return ROUTE_REGISTRY.filter((r) => r.inNav);
}

export function getOrphanRoutes(): RouteInfo[] {
  return ROUTE_REGISTRY.filter((r) => !r.inNav && !r.dynamic);
}
