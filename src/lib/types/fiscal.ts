export type FiscalPeriodRow = {
  id: string;
  year: string;
  month: number;
  monthName: string;
  status: "Open" | "Closed";
};

export type FiscalYearRow = {
  id: string;
  year: string;
  startDate: string;
  endDate: string;
  periods: FiscalPeriodRow[];
  /** True when this row was synthesized from FiscalPeriod docs only (no FiscalYear settings record yet). */
  derivedFromPostingPeriodsOnly?: boolean;
};
