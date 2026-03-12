import { type FiscalPeriodRow, type FiscalYearRow, MOCK_FISCAL_YEARS } from "@/lib/mock/fiscal";
import { loadStoredValue, saveStoredValue } from "@/lib/data/persisted-store";

const KEY = "odaflow_fiscal_years";

function seedFiscalYears(): FiscalYearRow[] {
  return MOCK_FISCAL_YEARS.map((year) => ({
    ...year,
    periods: year.periods.map((period) => ({ ...period })),
  }));
}

export function listFiscalYears(): FiscalYearRow[] {
  return loadStoredValue(KEY, seedFiscalYears).map((year) => ({
    ...year,
    periods: year.periods.map((period) => ({ ...period })),
  }));
}

export function updateFiscalPeriodStatus(periodId: string, status: FiscalPeriodRow["status"]): void {
  const next = listFiscalYears().map((year) => ({
    ...year,
    periods: year.periods.map((period) =>
      period.id === periodId ? { ...period, status } : period
    ),
  }));
  saveStoredValue(KEY, next);
}

