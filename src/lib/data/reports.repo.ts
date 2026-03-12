import {
  MOCK_EXPORTS,
  MOCK_REPORT_LIBRARY,
  type ExportHistoryRow,
  type ReportLibraryItem,
} from "@/lib/mock/reports";
import { loadStoredValue, saveStoredValue } from "@/lib/data/persisted-store";
import { downloadTextFile } from "@/lib/api/client";

const EXPORTS_KEY = "odaflow_report_exports";

function seedExports(): ExportHistoryRow[] {
  return MOCK_EXPORTS.map((row) => ({ ...row }));
}

export function listReportLibrary(): ReportLibraryItem[] {
  return MOCK_REPORT_LIBRARY.map((row) => ({ ...row }));
}

export function listReportExports(): ExportHistoryRow[] {
  return loadStoredValue(EXPORTS_KEY, seedExports).map((row) => ({ ...row }));
}

export function runReportExport(reportName: string, format: ExportHistoryRow["format"] = "csv"): ExportHistoryRow {
  const created: ExportHistoryRow = {
    id: `rpt-${Date.now()}`,
    name: reportName,
    format,
    createdAt: new Date().toISOString(),
    status: "completed",
    size: "Demo export",
  };
  saveStoredValue(EXPORTS_KEY, [created, ...listReportExports()]);
  return created;
}

export function downloadReportExport(row: ExportHistoryRow): void {
  downloadTextFile(
    `${row.name.replaceAll(" ", "-").toLowerCase()}.${row.format}`,
    `Report export\nName: ${row.name}\nFormat: ${row.format}\nCreated: ${row.createdAt}`
  );
}

