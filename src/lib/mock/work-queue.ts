/**
 * Work queue items: actionable alerts across modules.
 */

export type WorkQueueCategory =
  | "payroll"
  | "tax"
  | "pricing"
  | "inventory"
  | "ar"
  | "ap"
  | "bank"
  | "approvals";

export interface WorkQueueItem {
  id: string;
  category: WorkQueueCategory;
  title: string;
  description: string;
  href: string;
  severity: "info" | "warning" | "error";
}

export const MOCK_WORK_QUEUE: WorkQueueItem[] = [
  // Payroll
  { id: "wq-1", category: "payroll", title: "Pay run awaiting approval", description: "PR-2025-01 is submitted and pending approval.", href: "/payroll/pay-runs", severity: "warning" },
  { id: "wq-2", category: "payroll", title: "Employee missing statutory details", description: "1 employee has missing KRA/NHIF/NSSF. Review in Employees.", href: "/payroll/employees", severity: "warning" },

  // Tax
  { id: "wq-3", category: "tax", title: "VAT mapping missing", description: "VAT Output or VAT Input mapping not set for active VAT codes.", href: "/settings/tax/tax-mappings", severity: "warning" },
  { id: "wq-4", category: "tax", title: "Invoices with mismatched tax category", description: "2 invoices reference products with tax category different from line default.", href: "/docs/invoice", severity: "info" },

  // Pricing
  { id: "wq-5", category: "pricing", title: "Price list missing tiers", description: "Retail price list has products with no tiers defined.", href: "/master/products", severity: "info" },
  { id: "wq-6", category: "pricing", title: "Carton price implies negative unit margin", description: "SKU-001: carton price suggests negative margin vs cost (heuristic).", href: "/master/products/p1/pricing", severity: "warning" },

  // Inventory
  { id: "wq-7", category: "inventory", title: "Stockout alert", description: "SKU-002 is out of stock in WH-Main. Consider reorder.", href: "/inventory/stock-levels", severity: "error" },
  { id: "wq-8", category: "inventory", title: "Low stock warning", description: "3 SKUs are below reorder point.", href: "/inventory/stock-levels", severity: "warning" },

  // AR
  { id: "wq-9", category: "ar", title: "Overdue invoices", description: "5 invoices are past due. Total KES 125,000.", href: "/ar/payments", severity: "warning" },
  { id: "wq-10", category: "ar", title: "Unallocated receipt", description: "Receipt REC-001 has KES 15,000 unallocated.", href: "/ar/payments", severity: "info" },

  // AP
  { id: "wq-11", category: "ap", title: "Bills due this week", description: "3 bills totaling KES 85,000 due by Friday.", href: "/ap/bills", severity: "info" },

  // Bank
  { id: "wq-12", category: "bank", title: "Unmatched bank lines", description: "8 imported bank lines unmatched.", href: "/finance/bank-recon", severity: "warning" },

  // Approvals
  { id: "wq-13", category: "approvals", title: "Pending approvals", description: "2 documents awaiting your approval.", href: "/approvals/inbox", severity: "warning" },
];

export function getMockWorkQueue(): WorkQueueItem[] {
  return [...MOCK_WORK_QUEUE];
}

export const CATEGORY_LABELS: Record<WorkQueueCategory, string> = {
  payroll: "Payroll",
  tax: "Tax",
  pricing: "Pricing",
  inventory: "Inventory",
  ar: "Accounts Receivable",
  ap: "Accounts Payable",
  bank: "Bank Reconciliation",
  approvals: "Approvals",
};
