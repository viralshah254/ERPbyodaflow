/** Menu coverage from IMG_2197–IMG_2205. Workspace links do not certify Sage output parity. */
export type SageReportEntry = { id: string; name: string; group: string; permission: string; additionalPermissions?: string[]; status: "workspace" | "new-report" | "planned" | "definition"; href?: string; phase: number; kind: "report" | "submenu" };
const entries: SageReportEntry[] = [];
function group(group: string, permission: string, rows: Array<[string, string?, number?]>) {
  for (const [name, href, phase = 2] of rows) entries.push({ id: `${group}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name, group, permission, status: href?.startsWith("/reports/manufacturing/") ? "new-report" : href ? "workspace" : "planned", ...(href ? { href } : {}), phase: href ? 1 : phase, kind: "report" });
}
group("Tax", "finance.tax.read", [["Tax Box Report", undefined, 1], ["Tax Report", "/reports/vat-summary"]]);
group("General Ledger", "finance.read", [
  ["Account Balances", "/finance/trial-balance"], ["Account Transactions", "/finance/gl"], ["Audit Trail", "/finance/audit"], ["Balance Sheet", "/finance/statements/balance-sheet"], ["Bank Reconciliation", "/finance/bank-recon"], ["Budgets", "/finance/budgets"], ["Cashbook", "/finance/payments"], ["Chart of Accounts", "/finance/chart-of-accounts"], ["Cheques Printed", undefined, 3], ["Income Statement", "/finance/statements/pnl"], ["Open Batches", "/finance/cutoff"], ["Project Budget vs Actual", undefined, 3], ["Project Profit and Loss", undefined, 3], ["Revaluation History", undefined, 3], ["Revised Budget History", undefined, 3], ["Trial Balance", "/finance/trial-balance"],
]);
group("Accounts Receivable", "finance.ar.read", [
  ["Age Analysis", "/ar/aging"], ["Allocations", "/ar/payments"], ["Customer Listing", "/sales/customers"], ["Delivery Addresses", "/sales/customer-directory"], ["Electronic Document Audit Trail", "/finance/kra-signing"], ["Labels", undefined, 3], ["Post Dated Cheques", undefined, 3], ["Rep Commissions", undefined, 2], ["Sales Analysis", "/sales/overview"], ["Statements", "/ar/statements"], ["Top Sales", undefined, 2], ["Transactions", "/finance/ar"], ["Unrealised Profit/Loss", undefined, 3], ["Volume Discounts", undefined, 3],
]);
group("Accounts Payable", "finance.ap.read", [
  ["Age Analysis", "/finance/ap"], ["Allocations", "/ap/payments"], ["Delivery Addresses", "/ap/suppliers"], ["Labels", undefined, 3], ["Remittance Advice", "/ap/payments"], ["Supplier Listing", "/ap/suppliers"], ["Transactions", "/finance/ap"], ["Unrealised Profit/Loss", undefined, 3], ["Volume Discounts", undefined, 3],
]);
group("Inventory", "inventory.read", [
  ["Costs", "/inventory/costing"], ["Count", "/warehouse/cycle-counts"], ["Labels", undefined, 2], ["Levels", "/inventory/stock-levels"], ["Listing", "/master/products"], ["Lot Tracking Listing", "/inventory/stock-explorer"], ["Lot Tracking Transactions", undefined, 1], ["Management", undefined, 2], ["Movement", "/inventory/movements"], ["Outstanding Customer Documents", "/sales/orders"], ["Outstanding GRVs", "/inventory/receipts"], ["Preferred Supplier", undefined, 2], ["Pricing", "/pricing/price-lists"], ["Quotes", "/sales/quotes"], ["Sales Analysis", "/sales/overview"], ["Slow Movers", undefined, 1], ["Transactions", "/inventory/movements"], ["Valuation", "/inventory/valuation"], ["Warehouse IBT Listing", "/warehouse/transfers"], ["Warehouse Transfers", "/warehouse/transfers"],
]);
group("Order Entry — Sales", "sales.read", [
  ["Daily Distribution Sheet", "/warehouse/route-pick-lists"], ["Executable Orders", undefined, 1], ["Outstanding Customer Documents", "/sales/orders"], ["Overdue Sales Orders", undefined, 1], ["Picking List", "/warehouse/pick-pack"], ["Quotes", "/sales/quotes"], ["Sales Order Foreign Currency Variance", undefined, 3], ["Sales Orders", "/sales/orders"], ["Sales Rep Report", undefined, 2], ["Sales vs Purchases", undefined, 2],
]);
group("Order Entry — Purchasing", "purchase.read", [
  ["Linked Purchase Orders", undefined, 1], ["Outstanding GRVs", "/inventory/receipts"], ["Overdue Purchase Orders", undefined, 1], ["Purchase Order Foreign Currency Variance", undefined, 3], ["Purchase Orders", "/purchasing/orders"],
]);
group("Bill of Materials", "manufacturing.bom.read", [["Explosion", "/reports/manufacturing/bom-explosion"], ["Implosion (Where-used)", "/reports/manufacturing/bom-where-used"]]);
group("Manufacturing", "manufacturing.workorders.read", [["Manufacture Order", "/reports/manufacturing/manufacture-orders"], ["Manufacture Process", "/manufacturing/work-orders"], ["Material Requirements Plan", "/manufacturing/mrp"], ["Work in Progress", "/reports/manufacturing/work-in-progress"]]);
for (const name of ["Contracts", "Incidents", "Knowledge Base", "Sales Force Automation"]) entries.push({ id: `contact-${name.toLowerCase().replaceAll(" ", "-")}`, name, group: "Contact Management", permission: "crm.accounts.read", status: "definition", phase: 3, kind: "submenu" });
const operational: Record<string, { id: string; permissions: string[] }> = {
  "Overdue Sales Orders": { id: "overdue-sales-orders", permissions: ["sales.read"] },
  "Overdue Purchase Orders": { id: "overdue-purchase-orders", permissions: ["purchase.read"] },
  "Outstanding Customer Documents": { id: "outstanding-customer-documents", permissions: ["sales.read"] },
  "Outstanding GRVs": { id: "outstanding-grns", permissions: ["purchase.read", "finance.ap.read"] },
  "Linked Purchase Orders": { id: "linked-purchase-orders", permissions: ["purchase.read", "finance.ap.read"] },
  "Executable Orders": { id: "executable-orders", permissions: ["sales.read", "inventory.read"] },
  "Lot Tracking Transactions": { id: "lot-transactions", permissions: ["inventory.read"] },
  "Slow Movers": { id: "slow-movers", permissions: ["inventory.read"] },
  "Management": { id: "inventory-management", permissions: ["inventory.read"] },
  "Top Sales": { id: "top-sales", permissions: ["sales.read"] },
  "Sales Rep Report": { id: "sales-by-rep", permissions: ["sales.read"] },
  "Sales vs Purchases": { id: "sales-vs-purchases", permissions: ["sales.read", "purchase.read", "finance.read"] },
  "Post Dated Cheques": { id: "post-dated-cheques", permissions: ["finance.ar.read"] },
};
for (const entry of entries) {
  const report = entry.name === "Labels" && entry.group === "Accounts Receivable" ? { id: "customer-labels", permissions: ["finance.ar.read"] }
    : entry.name === "Labels" && entry.group === "Accounts Payable" ? { id: "supplier-labels", permissions: ["finance.ap.read"] }
    : entry.name === "Transactions" && entry.group === "Accounts Receivable" ? { id: "sales-register", permissions: ["sales.read", "finance.ar.read"] }
    : entry.name === "Transactions" && entry.group === "Accounts Payable" ? { id: "purchase-register", permissions: ["purchase.read", "finance.ap.read"] } : operational[entry.name];
  if (report) { entry.href = `/reports/operations/${report.id}`; entry.status = "new-report"; entry.additionalPermissions = report.permissions; }
}
export const SAGE_REPORT_MAP = entries.map((entry) => entry.href?.endsWith("/work-in-progress") ? { ...entry, additionalPermissions: ["finance.read"] } : entry);
export const SAGE_REPORT_STATUS_LABELS = { workspace: "Existing screen — report parity to verify", "new-report": "New report — client acceptance pending", planned: "To build", definition: "Submenu — report list not shown" } as const;
