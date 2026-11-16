import { describe, expect, it } from "vitest";
import type { FinancePeriod } from "@/lib/api/finance";
import { currentFiscalPeriodId } from "./current-fiscal-period";

const periods = [
  { id: "p12", fiscalYear: "2026", periodNumber: 12, startDate: "2026-12-01", endDate: "2026-12-31", status: "OPEN" },
  { id: "p11", fiscalYear: "2026", periodNumber: 11, startDate: "2026-11-01T00:00:00.000Z", endDate: "2026-11-30T00:00:00.000Z", status: "CLOSED" },
] satisfies FinancePeriod[];

describe("currentFiscalPeriodId", () => {
  it("uses the period covering today even when a future open period is first", () => {
    expect(currentFiscalPeriodId(periods, new Date("2026-11-16T10:00:00Z"))).toBe("p11");
  });

  it("includes the last day and advances at Nairobi midnight", () => {
    expect(currentFiscalPeriodId(periods, new Date("2026-11-30T20:59:59Z"))).toBe("p11");
    expect(currentFiscalPeriodId(periods, new Date("2026-11-30T21:00:00Z"))).toBe("p12");
  });

  it("uses all periods when no configured period contains today", () => {
    expect(currentFiscalPeriodId(periods, new Date("2026-10-31T10:00:00Z"))).toBe("");
  });
});
