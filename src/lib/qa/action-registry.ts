/**
 * QA Action Registry — comprehensive list of CTAs across the app.
 * Used by /dev/action-audit.
 */

export interface ActionInfo {
  module: string;
  page: string;
  action: string;
  behavior: string;
  status: "ok" | "stub" | "dead";
}

export const ACTION_REGISTRY: ActionInfo[] = [
  // Masters
  { module: "masters", page: "/master/products", action: "Add product", behavior: "Opens drawer", status: "ok" },
  { module: "masters", page: "/master/products", action: "Row click", behavior: "Navigate to detail", status: "ok" },
  { module: "masters", page: "/master/products", action: "Export CSV", behavior: "Real download", status: "ok" },
  { module: "masters", page: "/master/products/[id]", action: "Edit", behavior: "Opens form", status: "ok" },
  { module: "masters", page: "/master/products/[id]", action: "Delete", behavior: "Deletes persisted product", status: "ok" },
  { module: "masters", page: "/master/products/[id]/packaging", action: "Add packaging", behavior: "Opens drawer", status: "ok" },
  { module: "masters", page: "/master/products/[id]/pricing", action: "Add tier", behavior: "Adds row", status: "ok" },
  { module: "masters", page: "/master/products/[id]/pricing", action: "Apply template", behavior: "Applies selected list template", status: "ok" },
  { module: "masters", page: "/master/parties", action: "Add party", behavior: "Opens drawer", status: "ok" },
  { module: "masters", page: "/master/warehouses", action: "Add warehouse", behavior: "Opens drawer", status: "ok" },

  // Docs
  { module: "docs", page: "/docs", action: "New document", behavior: "Navigate to wizard", status: "ok" },
  { module: "docs", page: "/docs/[type]", action: "Row click", behavior: "Navigate to detail", status: "ok" },
  { module: "docs", page: "/docs/[type]/new", action: "Add line", behavior: "Adds row", status: "ok" },
  { module: "docs", page: "/docs/[type]/new", action: "Generate with Copilot", behavior: "Opens Copilot", status: "ok" },
  { module: "docs", page: "/docs/[type]/new", action: "Save draft", behavior: "Toast + localStorage", status: "ok" },
  { module: "docs", page: "/docs/[type]/[id]", action: "Request approval", behavior: "Persistent document + approval workflow", status: "ok" },
  { module: "docs", page: "/docs/[type]/[id]", action: "Approve", behavior: "Persistent document approval", status: "ok" },
  { module: "docs", page: "/docs/[type]/[id]", action: "Post", behavior: "Persistent document posting", status: "ok" },
  { module: "docs", page: "/docs/[type]/[id]", action: "Print", behavior: "Opens drawer", status: "ok" },
  { module: "docs", page: "/docs/[type]/[id]", action: "Export PDF", behavior: "Local preview export in demo mode", status: "ok" },

  // Inventory
  { module: "inventory", page: "/inventory/stock-levels", action: "Export CSV", behavior: "Real download", status: "ok" },
  { module: "inventory", page: "/inventory/movements", action: "New movement", behavior: "Navigate", status: "ok" },
  { module: "inventory", page: "/inventory/costing", action: "Run costing", behavior: "Records costing run", status: "ok" },

  // Warehouse
  { module: "warehouse", page: "/warehouse/transfers", action: "New transfer", behavior: "Opens drawer", status: "ok" },
  { module: "warehouse", page: "/warehouse/transfers/[id]", action: "Mark received", behavior: "Persistent status update", status: "ok" },
  { module: "warehouse", page: "/warehouse/pick-pack", action: "New pick", behavior: "Opens drawer", status: "ok" },
  { module: "warehouse", page: "/warehouse/pick-pack/[id]", action: "Complete", behavior: "Persistent pick-pack completion", status: "ok" },
  { module: "warehouse", page: "/warehouse/putaway/[id]", action: "Confirm", behavior: "Persistent putaway confirmation", status: "ok" },
  { module: "warehouse", page: "/warehouse/cycle-counts", action: "New count", behavior: "Opens drawer", status: "ok" },
  { module: "warehouse", page: "/warehouse/cycle-counts/[id]", action: "Submit", behavior: "Persistent cycle count submission", status: "ok" },

  // Sales
  { module: "sales", page: "/sales/orders", action: "New order", behavior: "Navigate", status: "ok" },
  { module: "sales", page: "/sales/invoices", action: "New invoice", behavior: "Navigate", status: "ok" },
  { module: "sales", page: "/sales/customers", action: "Add customer", behavior: "Opens drawer", status: "ok" },
  { module: "sales", page: "/sales/customers", action: "Export CSV", behavior: "Real download", status: "ok" },

  // Purchasing
  { module: "purchasing", page: "/purchasing/orders", action: "New PO", behavior: "Navigate", status: "ok" },
  { module: "purchasing", page: "/purchasing/requests", action: "New request", behavior: "Navigate", status: "ok" },
  { module: "purchasing", page: "/purchasing/purchase-returns", action: "Create Return", behavior: "Persistent purchase return creation", status: "ok" },
  { module: "purchasing", page: "/purchasing/purchase-returns", action: "Row click", behavior: "Opens detail sheet", status: "ok" },
  { module: "purchasing", page: "/purchasing/purchase-returns", action: "Export", behavior: "CSV download", status: "ok" },
  { module: "purchasing", page: "/purchasing/purchase-returns", action: "Approve (bulk)", behavior: "Persistent approval update", status: "ok" },

  // AP
  { module: "finance", page: "/ap/bills", action: "New bill", behavior: "Navigate", status: "ok" },
  { module: "finance", page: "/ap/payments", action: "New payment", behavior: "Opens drawer", status: "ok" },
  { module: "finance", page: "/ap/three-way-match", action: "Match selected", behavior: "Creates persistent match decision", status: "ok" },

  // AR
  { module: "finance", page: "/ar/payments", action: "New receipt", behavior: "Opens drawer", status: "ok" },
  { module: "finance", page: "/ar/payments", action: "Allocate", behavior: "Allocates payment to invoices", status: "ok" },

  // Finance
  { module: "finance", page: "/finance/journals", action: "New journal", behavior: "Navigate", status: "ok" },
  { module: "finance", page: "/finance/bank-recon", action: "Match selected", behavior: "Toast + updates", status: "ok" },
  { module: "finance", page: "/finance/bank-recon", action: "Import statement", behavior: "Opens drawer", status: "ok" },
  { module: "finance", page: "/finance/period-close", action: "Close period", behavior: "Updates fiscal period state", status: "ok" },
  { module: "finance", page: "/finance/period-close", action: "Reopen period", behavior: "Restores fiscal period state", status: "ok" },

  // Treasury
  { module: "treasury", page: "/treasury/payment-runs", action: "New run", behavior: "Opens drawer", status: "ok" },
  { module: "treasury", page: "/treasury/payment-runs", action: "Export CSV", behavior: "Real download", status: "ok" },
  { module: "treasury", page: "/treasury/payment-runs/[id]", action: "Approve", behavior: "Persistent approval update", status: "ok" },
  { module: "treasury", page: "/treasury/payment-runs/[id]", action: "Export bank file", behavior: "Real download", status: "ok" },
  { module: "treasury", page: "/treasury/bank-accounts", action: "Add account", behavior: "Opens drawer", status: "ok" },

  // Assets
  { module: "assets", page: "/assets/register", action: "Add asset", behavior: "Opens drawer", status: "ok" },
  { module: "assets", page: "/assets/depreciation", action: "Run depreciation", behavior: "Records depreciation run", status: "ok" },
  { module: "assets", page: "/assets/disposals", action: "New disposal", behavior: "Opens drawer", status: "ok" },

  // Payroll
  { module: "payroll", page: "/payroll/employees", action: "Add employee", behavior: "Opens drawer", status: "ok" },
  { module: "payroll", page: "/payroll/pay-runs", action: "New pay run", behavior: "Opens drawer", status: "ok" },
  { module: "payroll", page: "/payroll/pay-runs/[id]", action: "Approve", behavior: "Persistent pay run approval", status: "ok" },
  { module: "payroll", page: "/payroll/pay-runs/[id]", action: "Export CSV", behavior: "Real download", status: "ok" },
  { module: "payroll", page: "/payroll/pay-runs/[id]", action: "Post journal", behavior: "Navigate", status: "ok" },
  { module: "payroll", page: "/payroll/payslips", action: "Preview", behavior: "Opens drawer", status: "ok" },

  // Analytics
  { module: "analytics", page: "/analytics/explore", action: "Save view", behavior: "Alert + localStorage", status: "ok" },
  { module: "analytics", page: "/analytics/explore", action: "Drill row", behavior: "Opens drawer", status: "ok" },
  { module: "analytics", page: "/analytics/insights", action: "Action CTA", behavior: "Navigate", status: "ok" },
  { module: "analytics", page: "/analytics/anomalies", action: "Investigate", behavior: "Navigate", status: "ok" },
  { module: "analytics", page: "/analytics/simulations", action: "Apply suggestion", behavior: "Records applied simulation", status: "ok" },

  // Automation
  { module: "automation", page: "/automation/rules", action: "New rule", behavior: "Opens drawer", status: "ok" },
  { module: "automation", page: "/automation/ai-insights", action: "Apply action", behavior: "Applies recommendation and opens review", status: "ok" },
  { module: "automation", page: "/work/queue", action: "View item", behavior: "Navigate", status: "ok" },

  // Approvals
  { module: "approvals", page: "/approvals/inbox", action: "Approve", behavior: "Persistent approval action", status: "ok" },
  { module: "approvals", page: "/approvals/inbox", action: "Reject", behavior: "Persistent rejection action", status: "ok" },
  { module: "approvals", page: "/approvals/inbox", action: "View doc", behavior: "Navigate", status: "ok" },

  // Settings
  { module: "settings", page: "/settings/org", action: "Save", behavior: "Persistent org profile save", status: "ok" },
  { module: "settings", page: "/settings/users-roles", action: "Add user", behavior: "Opens drawer", status: "ok" },
  { module: "settings", page: "/settings/sequences", action: "Add sequence", behavior: "Opens drawer", status: "ok" },
  { module: "settings", page: "/settings/financial/currencies", action: "Add currency", behavior: "Opens drawer", status: "ok" },
  { module: "settings", page: "/settings/tax/vat", action: "Add VAT code", behavior: "Opens drawer", status: "ok" },
  { module: "settings", page: "/settings/tax/withholding", action: "Add WHT code", behavior: "Opens drawer", status: "ok" },
];

export function getActionsByModule(): Record<string, ActionInfo[]> {
  const byModule: Record<string, ActionInfo[]> = {};
  for (const a of ACTION_REGISTRY) {
    if (!byModule[a.module]) byModule[a.module] = [];
    byModule[a.module].push(a);
  }
  return byModule;
}

export function getDeadActions(): ActionInfo[] {
  return ACTION_REGISTRY.filter((a) => a.status === "dead");
}

export function getStubActions(): ActionInfo[] {
  return ACTION_REGISTRY.filter((a) => a.status === "stub");
}

export function getActionSummary(): { ok: number; stub: number; dead: number } {
  let ok = 0, stub = 0, dead = 0;
  for (const a of ACTION_REGISTRY) {
    if (a.status === "ok") ok++;
    else if (a.status === "stub") stub++;
    else dead++;
  }
  return { ok, stub, dead };
}
