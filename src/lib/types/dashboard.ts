export interface KpiSeries {
  label: string;
  value: string | number;
  change?: { value: string; type: "increase" | "decrease" | "neutral" };
  description?: string;
  icon?: string;
  sparkline?: boolean;
}

export interface ApprovalLineItem {
  description: string;
  qty?: number;
  unit?: string;
  amount?: number;
}

export interface ApprovalItem {
  id: string;
  entityType: string;
  entityId: string;
  reference: string;
  summary: string;
  requestedAt: string;
  requestedBy: string;
  severity?: "low" | "medium" | "high";
  amount?: number;
  currency?: string;
  party?: string;
  documentType?: string;
  documentId?: string;
  lineItems?: ApprovalLineItem[];
}

export interface TaskItem {
  id: string;
  title: string;
  entityType?: string;
  entityId?: string;
  dueAt?: string;
  status: "pending" | "in_progress" | "overdue";
}

export interface AlertItem {
  id: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "error";
  entityType?: string;
  entityId?: string;
  createdAt: string;
  suggestedAction?: string;
}

export interface RecentDoc {
  id: string;
  type: string;
  number: string;
  party?: string;
  total: number;
  status: string;
  updatedAt: string;
}
