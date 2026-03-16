export type WorkQueueSeverity = "info" | "warning" | "error";

export type WorkQueueCategory = string;

export interface WorkQueueItem {
  id: string;
  category: WorkQueueCategory;
  title: string;
  description: string;
  href: string;
  severity: WorkQueueSeverity;
}

export const CATEGORY_LABELS: Record<string, string> = {
  approvals: "Approvals",
  approval: "Approvals",
  anomalies: "Anomalies",
  anomaly: "Anomalies",
  payroll: "Payroll",
  tax: "Tax",
  pricing: "Pricing",
  inventory: "Inventory",
  ar: "Accounts Receivable",
  ap: "Accounts Payable",
  bank: "Bank Reconciliation",
};
