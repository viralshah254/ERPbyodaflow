import { apiRequest, requireLiveApi } from "@/lib/api/client";
import { fetchFinancePeriodsApi } from "@/lib/api/finance";
import type { FiscalYearRow } from "@/lib/types/fiscal";

type BackendFiscalYear = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  closed?: boolean;
};

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function fetchFiscalYearsApi(): Promise<FiscalYearRow[]> {
  requireLiveApi("Fiscal years");
  const [yearPayload, periods] = await Promise.all([
    apiRequest<{ items: BackendFiscalYear[] }>("/api/settings/financial/fiscal-years"),
    fetchFinancePeriodsApi(),
  ]);

  return (yearPayload.items ?? []).map((year) => {
    const start = new Date(year.startDate);
    const end = new Date(year.endDate);
    const yearPeriods = periods
      .filter((period) => {
        const periodStart = new Date(period.startDate);
        return periodStart >= start && periodStart <= end;
      })
      .sort((a, b) => a.periodNumber - b.periodNumber)
      .map((period) => {
        const periodStart = new Date(period.startDate);
        const month = periodStart.getUTCMonth() + 1;
        return {
          id: period.id,
          year: String(periodStart.getUTCFullYear()),
          month,
          monthName: MONTH_LABELS[month - 1] ?? String(month),
          status: period.status === "CLOSED" ? ("Closed" as const) : ("Open" as const),
        };
      });

    return {
      id: year.id,
      year: year.name || String(start.getUTCFullYear()),
      startDate: year.startDate.slice(0, 10),
      endDate: year.endDate.slice(0, 10),
      periods: yearPeriods,
    };
  });
}
