"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createFiscalYearSettingsApi,
  fetchFiscalYearsApi,
  monthlyPeriodChunksInclusive,
} from "@/lib/api/fiscal-years";
import { closeFinancePeriodApi, createFinancePeriodApi, reopenFinancePeriodApi } from "@/lib/api/finance";
import type { FiscalYearRow } from "@/lib/types/fiscal";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function FiscalYearsPage() {
  const [years, setYears] = React.useState<FiscalYearRow[]>([]);
  const [selectedYearId, setSelectedYearId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [seeding, setSeeding] = React.useState(false);

  const y = new Date().getFullYear();
  const [fyName, setFyName] = React.useState(`FY ${y}`);
  const [fyCode, setFyCode] = React.useState(String(y));
  const [fyStart, setFyStart] = React.useState(`${y}-01-01`);
  const [fyEnd, setFyEnd] = React.useState(`${y}-12-31`);

  const selected = years.find((row) => row.id === selectedYearId) ?? years[0] ?? null;

  const refreshYears = React.useCallback(async () => {
    const items = await fetchFiscalYearsApi();
    setYears(items);
    setSelectedYearId((current) => {
      if (current && items.some((row) => row.id === current)) return current;
      return items[0]?.id ?? null;
    });
  }, []);

  async function seedMonthlyPeriodsForRange(fiscalYearCode: string, startIso: string, endIso: string) {
    const code = fiscalYearCode.trim();
    const chunks = monthlyPeriodChunksInclusive(startIso, endIso);
    if (!code || chunks.length === 0) {
      toast.error("Need a posting year code and overlapping date range.");
      return 0;
    }
    let created = 0;
    for (const chunk of chunks) {
      try {
        await createFinancePeriodApi({
          fiscalYear: code,
          periodNumber: chunk.periodNumber,
          startDate: chunk.startDate,
          endDate: chunk.endDate,
        });
        created += 1;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/duplicate|already exists|409|11000/i.test(msg)) continue;
        throw err;
      }
    }
    return created;
  }

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void refreshYears()
      .catch((error) => {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Failed to load fiscal years.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshYears]);

  const handleClosePeriod = async (periodId: string) => {
    await closeFinancePeriodApi(periodId);
    await refreshYears();
    toast.success(`Period ${periodId} closed.`);
  };

  const handleReopen = async (periodId: string) => {
    await reopenFinancePeriodApi(periodId);
    await refreshYears();
    toast.success(`Period ${periodId} reopened.`);
  };

  const handleCreateFYAndPeriods = async () => {
    const name = fyName.trim();
    const code = fyCode.trim();
    const start = fyStart.trim();
    const end = fyEnd.trim();
    if (!name || !code || !start || !end) {
      toast.error("Fill in fiscal year name, posting year code, start, and end dates.");
      return;
    }
    if (start > end) {
      toast.error("Start date must be on or before end date.");
      return;
    }
    const chunks = monthlyPeriodChunksInclusive(start, end);
    if (chunks.length === 0) {
      toast.error("No monthly periods fit in this date range.");
      return;
    }

    setSeeding(true);
    try {
      await createFiscalYearSettingsApi({
        name,
        startDate: start,
        endDate: end,
      });

      const created = await seedMonthlyPeriodsForRange(code, start, end);
      if (created === 0) {
        toast.message("Fiscal year saved.", {
          description: "No new posting periods were added (often duplicate period numbers for that year code—check existing FiscalPeriod docs).",
        });
      } else {
        toast.success(`Fiscal year created with ${created} posting period${created !== 1 ? "s" : ""}.`);
      }
      await refreshYears();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Setup failed.");
    } finally {
      setSeeding(false);
    }
  };

  /** Posting periods only (e.g. FY row exists but no FiscalPeriod rows in range). */
  const handleGeneratePeriodsForSelectedYear = async () => {
    if (!selected) return;
    setSeeding(true);
    try {
      const created = await seedMonthlyPeriodsForRange(fyCode, selected.startDate, selected.endDate);
      if (created === 0) {
        toast.message("No new periods.", {
          description: "Posting period rows may already exist for this year code, or the range produced no months.",
        });
      } else {
        toast.success(`Created ${created} posting period${created !== 1 ? "s" : ""}.`);
      }
      await refreshYears();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate periods.");
    } finally {
      setSeeding(false);
    }
  };

  const showEmptySetup = !loading && years.length === 0;
  const showPeriodsGap =
    selected && selected.periods.length === 0 && !selected.derivedFromPostingPeriodsOnly && years.length > 0;

  return (
    <PageShell>
      <PageHeader
        title="Fiscal years"
        description="Years and periods backed by the finance close calendar."
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Financial", href: "/settings/financial/currencies" },
          { label: "Fiscal years" },
        ]}
        sticky
        showCommandHint
      />
      <div className="p-6 space-y-6 max-w-3xl">
        {loading ? (
          <p className="text-sm text-muted-foreground py-8">Loading fiscal calendar…</p>
        ) : null}

        {showEmptySetup ? (
          <Card>
            <CardHeader>
              <CardTitle>No fiscal calendar yet</CardTitle>
              <CardDescription>
                Fiscal years live in Organization settings storage; posting periods are what Period Close locks. Nothing
                is configured for this org yet—run the quick setup below (requires Settings admin for the fiscal year
                and Period Close permission for periods), or POST via API/scripts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fy-name">Fiscal year name</Label>
                  <Input id="fy-name" value={fyName} onChange={(e) => setFyName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fy-code">Posting year code</Label>
                  <Input id="fy-code" value={fyCode} onChange={(e) => setFyCode(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Stored on each FiscalPeriod row (often the calendar year, e.g. 2026).</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fy-start">Start date</Label>
                  <Input id="fy-start" type="date" value={fyStart} onChange={(e) => setFyStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fy-end">End date</Label>
                  <Input id="fy-end" type="date" value={fyEnd} onChange={(e) => setFyEnd(e.target.value)} />
                </div>
              </div>
              <Button onClick={() => void handleCreateFYAndPeriods()} disabled={seeding}>
                <Icons.CalendarPlus className="mr-2 h-4 w-4" />
                {seeding ? "Saving…" : "Create fiscal year + monthly periods"}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {!loading && years.length > 0 && (
          <>
            {years.some((r) => r.derivedFromPostingPeriodsOnly) ? (
              <div className="flex flex-wrap items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
                <Icons.AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" aria-hidden />
                <p>
                  Showing posting periods grouped by fiscal year code — there is{" "}
                  <strong className="font-medium">no</strong> Fiscal year record yet in Settings storage. Adding a fiscal
                  year below keeps documentation aligned; generating periods-only is still possible per code + dates.
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {years.map((row) => (
                <Button
                  key={row.id}
                  variant={selectedYearId === row.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedYearId(row.id)}
                >
                  {row.year}
                </Button>
              ))}
            </div>

            {showPeriodsGap ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">No posting periods in range</CardTitle>
                  <CardDescription>
                    This fiscal year has dates but no matching FiscalPeriod rows. Generate calendar months matching the
                    posting year code below.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-end gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="gap-code">Posting year code</Label>
                    <Input id="gap-code" className="w-36" value={fyCode} onChange={(e) => setFyCode(e.target.value)} />
                  </div>
                  <Button variant="secondary" disabled={seeding} onClick={() => void handleGeneratePeriodsForSelectedYear()}>
                    Generate monthly periods
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            {selected && selected.periods.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>FY {selected.year}</CardTitle>
                  <CardDescription>
                    {selected.startDate} — {selected.endDate}. Period status open / closed.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-40">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selected.periods.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">
                            {p.monthName} {p.year}
                          </TableCell>
                          <TableCell>
                            <Badge variant={p.status === "Closed" ? "secondary" : "default"}>{p.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {p.status === "Open" ? (
                              <Button variant="outline" size="sm" onClick={() => void handleClosePeriod(p.id)}>
                                Close period
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm" onClick={() => void handleReopen(p.id)}>
                                Reopen
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
