/**
 * Mock fiscal years and periods for /settings/financial/fiscal-years.
 */

export interface FiscalPeriodRow {
  id: string;
  year: string;
  month: number;
  monthName: string;
  status: "Open" | "Closed";
}

export interface FiscalYearRow {
  id: string;
  year: string;
  startDate: string;
  endDate: string;
  periods: FiscalPeriodRow[];
}

export const MOCK_FISCAL_YEARS: FiscalYearRow[] = [
  {
    id: "fy2025",
    year: "2025",
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    periods: [
      { id: "p202501", year: "2025", month: 1, monthName: "Jan", status: "Closed" },
      { id: "p202502", year: "2025", month: 2, monthName: "Feb", status: "Open" },
      { id: "p202503", year: "2025", month: 3, monthName: "Mar", status: "Open" },
    ],
  },
  {
    id: "fy2026",
    year: "2026",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    periods: [
      { id: "p202601", year: "2026", month: 1, monthName: "Jan", status: "Open" },
    ],
  },
];

export function getMockFiscalYears(): FiscalYearRow[] {
  return [...MOCK_FISCAL_YEARS];
}
