export type SavedViewRow = {
  id: string;
  name: string;
  reportType: string;
  lastRun: string;
  filters?: string;
};

export type ScheduledReportRow = {
  id: string;
  name: string;
  reportType: string;
  frequency: "daily" | "weekly" | "monthly";
  nextRun: string;
  recipients: string;
  enabled: boolean;
};

export type ExportHistoryRow = {
  id: string;
  name: string;
  format: "xlsx" | "csv" | "pdf";
  createdAt: string;
  status: "completed" | "pending" | "failed";
  size?: string;
};

export type ReportLibraryItem = {
  id: string;
  name: string;
  category: "sales" | "finance" | "inventory" | "purchasing" | "general";
  description: string;
  href?: string;
};
