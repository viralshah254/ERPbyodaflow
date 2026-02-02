/**
 * Mock data for /reports (saved, scheduled, exports, library).
 */

export interface SavedViewRow {
  id: string;
  name: string;
  reportType: string;
  lastRun: string;
  filters?: string;
}

export interface ScheduledReportRow {
  id: string;
  name: string;
  reportType: string;
  frequency: "daily" | "weekly" | "monthly";
  nextRun: string;
  recipients: string;
  enabled: boolean;
}

export interface ExportHistoryRow {
  id: string;
  name: string;
  format: "xlsx" | "csv" | "pdf";
  createdAt: string;
  status: "completed" | "pending" | "failed";
  size?: string;
}

export interface ReportLibraryItem {
  id: string;
  name: string;
  category: "sales" | "finance" | "inventory" | "purchasing" | "general";
  description: string;
  href?: string;
}

export const MOCK_SAVED_VIEWS: SavedViewRow[] = [
  { id: "1", name: "Sales by Region", reportType: "Sales Summary", lastRun: "2025-01-28T09:00:00Z", filters: "Region=East" },
  { id: "2", name: "Top 20 Customers", reportType: "AR Aging", lastRun: "2025-01-27T14:00:00Z" },
];

export const MOCK_SCHEDULED: ScheduledReportRow[] = [
  { id: "1", name: "Weekly P&L", reportType: "P&L", frequency: "weekly", nextRun: "2025-02-03T06:00:00Z", recipients: "finance@acme.com", enabled: true },
  { id: "2", name: "Daily Stock", reportType: "Stock Valuation", frequency: "daily", nextRun: "2025-01-29T07:00:00Z", recipients: "warehouse@acme.com", enabled: true },
];

export const MOCK_EXPORTS: ExportHistoryRow[] = [
  { id: "1", name: "Sales Orders Jan 2025", format: "xlsx", createdAt: "2025-01-28T10:30:00Z", status: "completed", size: "2.1 MB" },
  { id: "2", name: "Customers", format: "csv", createdAt: "2025-01-27T16:00:00Z", status: "completed", size: "450 KB" },
  { id: "3", name: "P&L Q4 2024", format: "pdf", createdAt: "2025-01-27T09:00:00Z", status: "completed", size: "120 KB" },
];

export const MOCK_REPORT_LIBRARY: ReportLibraryItem[] = [
  { id: "1", name: "Sales Summary", category: "sales", description: "Revenue, orders, and trends" },
  { id: "2", name: "AR Aging", category: "finance", description: "Outstanding receivables by customer" },
  { id: "3", name: "AP Aging", category: "finance", description: "Outstanding payables by supplier" },
  { id: "4", name: "P&L", category: "finance", description: "Profit and loss statement" },
  { id: "5", name: "Stock Valuation", category: "inventory", description: "Inventory value by warehouse" },
  { id: "6", name: "Purchase Order Summary", category: "purchasing", description: "POs by status and supplier" },
  { id: "7", name: "Low Stock", category: "inventory", description: "Items below reorder point" },
];

export function getMockSavedViews(): SavedViewRow[] {
  return [...MOCK_SAVED_VIEWS];
}

export function getMockScheduledReports(): ScheduledReportRow[] {
  return [...MOCK_SCHEDULED];
}

export function getMockExportHistory(): ExportHistoryRow[] {
  return [...MOCK_EXPORTS];
}

export function getMockReportLibrary(): ReportLibraryItem[] {
  return [...MOCK_REPORT_LIBRARY];
}
