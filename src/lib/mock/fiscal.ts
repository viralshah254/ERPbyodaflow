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

const STORAGE_KEY = "odaflow_mock_fiscal_years";

function cloneYears(years: FiscalYearRow[]): FiscalYearRow[] {
  return years.map((year) => ({
    ...year,
    periods: year.periods.map((period) => ({ ...period })),
  }));
}

export function getMockFiscalYears(): FiscalYearRow[] {
  if (typeof window === "undefined") return cloneYears(MOCK_FISCAL_YEARS);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneYears(MOCK_FISCAL_YEARS);
    return cloneYears(JSON.parse(raw) as FiscalYearRow[]);
  } catch {
    return cloneYears(MOCK_FISCAL_YEARS);
  }
}

function saveMockFiscalYears(years: FiscalYearRow[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(years));
}

export function updateMockFiscalPeriodStatus(periodId: string, status: FiscalPeriodRow["status"]): void {
  const next = getMockFiscalYears().map((year) => ({
    ...year,
    periods: year.periods.map((period) =>
      period.id === periodId ? { ...period, status } : period
    ),
  }));
  saveMockFiscalYears(next);
}
