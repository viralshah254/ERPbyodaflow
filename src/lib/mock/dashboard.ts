/**
 * Mock dashboard data for KPIs, approvals, tasks, alerts, suggestions, recent docs.
 */

export interface KpiSeries {
  label: string;
  value: string | number;
  change?: { value: string; type: "increase" | "decrease" | "neutral" };
  description?: string;
  icon?: string;
  /** Placeholder for sparkline; real impl would use data points */
  sparkline?: boolean;
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

export const MOCK_KPIS: Record<string, KpiSeries> = {
  "production-overview": {
    label: "Production Output",
    value: "12,450",
    change: { value: "+8% MTD", type: "increase" },
    description: "Units produced",
    icon: "Factory",
    sparkline: true,
  },
  "inventory-levels": {
    label: "Stock Value",
    value: "KES 4.2M",
    change: { value: "+2%", type: "increase" },
    description: "Total inventory",
    icon: "Package",
    sparkline: true,
  },
  "pending-work-orders": {
    label: "Pending Work Orders",
    value: "7",
    change: { value: "2 due today", type: "neutral" },
    icon: "ClipboardList",
  },
  "recent-grn": {
    label: "GRNs This Week",
    value: "23",
    description: "Goods received",
    icon: "PackageCheck",
  },
  "work-orders-due": {
    label: "Work Orders Due",
    value: "5",
    icon: "Clock",
  },
  "bom-usage": {
    label: "BOM Revisions",
    value: "3",
    description: "This month",
    icon: "List",
  },
  "wip-value": {
    label: "WIP Value",
    value: "KES 1.1M",
    icon: "Package",
  },
  "stock-levels": {
    label: "Stock Value",
    value: "KES 3.8M",
    change: { value: "+5%", type: "increase" },
    icon: "Warehouse",
    sparkline: true,
  },
  "pending-deliveries": {
    label: "Pending Deliveries",
    value: "14",
    icon: "Truck",
  },
  "collections-overview": {
    label: "AR Outstanding",
    value: "KES 1.85M",
    description: "23 customers",
    icon: "ArrowDownCircle",
  },
  "recent-orders": {
    label: "Orders MTD",
    value: "156",
    change: { value: "+12%", type: "increase" },
    icon: "ShoppingCart",
  },
  "route-coverage": {
    label: "Routes Today",
    value: "8",
    icon: "MapPin",
  },
  "outlet-visits": {
    label: "Outlet Visits",
    value: "42",
    description: "This week",
    icon: "Users",
  },
  "collections-due": {
    label: "Collections Due",
    value: "KES 420K",
    icon: "Wallet",
  },
  "sales-by-store": {
    label: "Sales by Store",
    value: "KES 2.1M",
    icon: "Store",
  },
  "replenishment-due": {
    label: "Replenishment Due",
    value: "18",
    icon: "PackagePlus",
  },
  "promotions-active": {
    label: "Active Promotions",
    value: "4",
    icon: "Tag",
  },
};

export const MOCK_APPROVALS: ApprovalItem[] = [
  {
    id: "a1",
    entityType: "purchase-order",
    entityId: "po-101",
    reference: "PO-2025-101",
    summary: "Office supplies KES 85,000",
    requestedAt: "2025-01-28T10:00:00Z",
    requestedBy: "Jane Doe",
    severity: "medium",
  },
  {
    id: "a2",
    entityType: "sales-order",
    entityId: "so-205",
    reference: "SO-2025-205",
    summary: "Bulk order ABC Ltd KES 320,000",
    requestedAt: "2025-01-28T09:30:00Z",
    requestedBy: "John Smith",
    severity: "high",
  },
];

export const MOCK_TASKS: TaskItem[] = [
  { id: "t1", title: "Review low stock report", entityType: "report", status: "pending", dueAt: "2025-01-28" },
  { id: "t2", title: "Approve PO-2025-101", entityType: "purchase-order", entityId: "po-101", status: "overdue", dueAt: "2025-01-27" },
  { id: "t3", title: "Complete month-end checklist", status: "in_progress", dueAt: "2025-01-31" },
];

export const MOCK_ALERTS: AlertItem[] = [
  {
    id: "al1",
    title: "Low stock",
    message: "Widget B below reorder level (12 units).",
    severity: "warning",
    entityType: "product",
    entityId: "p2",
    createdAt: "2025-01-28T08:00:00Z",
    suggestedAction: "Create purchase order",
  },
  {
    id: "al2",
    title: "Overdue receivable",
    message: "Invoice INV-2025-089 30+ days overdue. KES 45,000.",
    severity: "error",
    entityType: "invoice",
    entityId: "inv-89",
    createdAt: "2025-01-27T14:00:00Z",
    suggestedAction: "Send reminder",
  },
];

export const MOCK_SUGGESTIONS = [
  { id: "s1", type: "OPTIMIZATION", title: "Reorder Widget B", description: "Below reorder level. Create PO?", actionUrl: "/docs/purchase-order/new" },
  { id: "s2", type: "ACTION", title: "Approve pending orders", description: "3 POs awaiting approval.", actionUrl: "/inbox" },
];

export const MOCK_RECENT_DOCS: RecentDoc[] = [
  { id: "1", type: "sales-order", number: "SO-2025-204", party: "ABC Ltd", total: 125000, status: "APPROVED", updatedAt: "2025-01-28T11:00:00Z" },
  { id: "2", type: "purchase-order", number: "PO-2025-099", party: "Supplies Co", total: 85000, status: "PENDING_APPROVAL", updatedAt: "2025-01-28T10:30:00Z" },
  { id: "3", type: "invoice", number: "INV-2025-102", party: "XYZ Shop", total: 45000, status: "POSTED", updatedAt: "2025-01-28T09:00:00Z" },
];
