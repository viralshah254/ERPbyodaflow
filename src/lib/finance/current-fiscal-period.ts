import type { FinancePeriod } from "@/lib/api/finance";
import { todayNairobiYmd } from "@/lib/format/nairobi-datetime";

export function currentFiscalPeriodId(periods: readonly FinancePeriod[], now = new Date()): string {
  const today = todayNairobiYmd(now);
  return periods.find(({ startDate, endDate }) => (
    startDate.slice(0, 10) <= today && today <= endDate.slice(0, 10)
  ))?.id ?? "";
}
