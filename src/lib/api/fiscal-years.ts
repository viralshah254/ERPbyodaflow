import { addMonths, endOfMonth, formatISO, max, min, parseISO, startOfMonth } from "date-fns";
import { apiRequest, requireLiveApi } from "@/lib/api/client";
import { fetchFinancePeriodsApi, type FinancePeriod } from "@/lib/api/finance";
import type { FiscalPeriodRow, FiscalYearRow } from "@/lib/types/fiscal";

type BackendFiscalYear = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  closed?: boolean;
};

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function mapFinancePeriodToRow(period: FinancePeriod): FiscalPeriodRow {
  const periodStart = new Date(period.startDate);
  const month = periodStart.getMonth() + 1;
  return {
    id: period.id,
    year: String(periodStart.getFullYear()),
    month,
    monthName: MONTH_LABELS[month - 1] ?? String(month),
    status: period.status === "CLOSED" ? "Closed" : "Open",
  };
}

/** Posting-period slices (one calendar month overlap with FY boundaries). */
export function monthlyPeriodChunksInclusive(fyStartIso: string, fyEndIso: string): Array<{
  periodNumber: number;
  startDate: string;
  endDate: string;
}> {
  const fyStart = parseISO(fyStartIso.slice(0, 10));
  const fyEnd = parseISO(fyEndIso.slice(0, 10));
  const chunks: Array<{ periodNumber: number; startDate: string; endDate: string }> = [];
  let monthCursor = startOfMonth(fyStart);
  let periodNumber = 1;
  while (monthCursor <= fyEnd) {
    const monthEnd = endOfMonth(monthCursor);
    const sliceStart = max([monthCursor, fyStart]);
    const sliceEnd = min([monthEnd, fyEnd]);
    if (sliceStart <= sliceEnd) {
      chunks.push({
        periodNumber,
        startDate: formatISO(sliceStart, { representation: "date" }),
        endDate: formatISO(sliceEnd, { representation: "date" }),
      });
      periodNumber += 1;
    }
    monthCursor = startOfMonth(addMonths(monthCursor, 1));
  }
  return chunks;
}

function syntheticYearsFromPostingPeriods(periods: FinancePeriod[]): FiscalYearRow[] {
  const byKey = new Map<string, FinancePeriod[]>();
  for (const p of periods) {
    const key = p.fiscalYear?.trim() ? p.fiscalYear : "Posting periods";
    const list = byKey.get(key) ?? [];
    list.push(p);
    byKey.set(key, list);
  }
  return [...byKey.entries()].map(([fyKey, plist]) => {
    const sorted = plist.sort((a, b) => a.periodNumber - b.periodNumber);
    const dates = sorted.map((x) => new Date(x.startDate).getTime());
    const endDates = sorted.map((x) => new Date(x.endDate).getTime());
    const startMs = Math.min(...dates);
    const endMs = Math.max(...endDates);
    return {
      id: `derived:${encodeURIComponent(fyKey)}`,
      year: fyKey,
      startDate: new Date(startMs).toISOString().slice(0, 10),
      endDate: new Date(endMs).toISOString().slice(0, 10),
      periods: sorted.map(mapFinancePeriodToRow),
      derivedFromPostingPeriodsOnly: true,
    };
  });
}

export async function fetchFiscalYearsApi(): Promise<FiscalYearRow[]> {
  requireLiveApi("Fiscal years");
  const [yearPayload, periods] = await Promise.all([
    apiRequest<{ items: BackendFiscalYear[] }>("/api/settings/financial/fiscal-years"),
    fetchFinancePeriodsApi(),
  ]);

  const fromSettings = (yearPayload.items ?? []).map((year) => {
    const start = new Date(year.startDate);
    const end = new Date(year.endDate);
    const yearPeriods = periods
      .filter((period) => {
        const periodStart = new Date(period.startDate);
        return periodStart >= start && periodStart <= end;
      })
      .sort((a, b) => a.periodNumber - b.periodNumber)
      .map(mapFinancePeriodToRow);

    return {
      id: year.id,
      year: year.name || String(start.getUTCFullYear()),
      startDate: year.startDate.slice(0, 10),
      endDate: year.endDate.slice(0, 10),
      periods: yearPeriods,
    };
  });

  if (fromSettings.length === 0 && periods.length > 0) {
    const derived = syntheticYearsFromPostingPeriods(periods);
    derived.sort((a, b) => b.year.localeCompare(a.year));
    return derived;
  }

  return fromSettings.sort((a, b) => b.startDate.localeCompare(a.startDate));
}

export async function createFiscalYearSettingsApi(payload: {
  name: string;
  startDate: string;
  endDate: string;
}): Promise<{ id: string }> {
  requireLiveApi("Create fiscal year");
  return apiRequest<{ id: string }>("/api/settings/financial/fiscal-years", {
    method: "POST",
    body: payload,
  });
}
