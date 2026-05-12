"use client";

import * as React from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { StatementPeriodStatus } from "@/components/finance/statement-period-status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchFinancePeriodsApi,
  fetchFinancialStatementApi,
  fetchFinancialStatementDrilldownApi,
  formatFinancePeriodLoadError,
  type FinancePeriod,
  type FinanceStatementDrilldownItem,
} from "@/lib/api/finance";
import { formatMoney } from "@/lib/money";
import { useBaseCurrency } from "@/lib/org/useBaseCurrency";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";

type DrilldownState = { sectionKey: string; label: string };

export default function CashFlowPage() {
  const baseCurrency = useBaseCurrency();
  const [periods, setPeriods] = React.useState<FinancePeriod[]>([]);
  const [periodsLoading, setPeriodsLoading] = React.useState(true);
  const [periodsError, setPeriodsError] = React.useState<string | null>(null);
  const [periodId, setPeriodId] = React.useState("");
  const [statement, setStatement] = React.useState<Awaited<ReturnType<typeof fetchFinancialStatementApi>> | null>(null);
  const [statementLoading, setStatementLoading] = React.useState(false);
  const [drilldown, setDrilldown] = React.useState<DrilldownState | null>(null);
  const [drilldownItems, setDrilldownItems] = React.useState<FinanceStatementDrilldownItem[]>([]);
  const [drilldownLoading, setDrilldownLoading] = React.useState(false);

  React.useEffect(() => {
    setPeriodsLoading(true);
    setPeriodsError(null);
    fetchFinancePeriodsApi()
      .then((items) => {
        setPeriods(items);
        setPeriodId(items.find((item) => item.status === "OPEN")?.id ?? items[0]?.id ?? "");
      })
      .catch((error) => {
        const msg = formatFinancePeriodLoadError(error);
        setPeriodsError(msg);
        toast.error(msg);
      })
      .finally(() => setPeriodsLoading(false));
  }, []);

  React.useEffect(() => {
    if (!periodId) {
      setStatement(null);
      setStatementLoading(false);
      return;
    }
    setStatement(null);
    setStatementLoading(true);
    setDrilldown(null);
    setDrilldownItems([]);
    fetchFinancialStatementApi("cash-flow", periodId)
      .then(setStatement)
      .catch((error) => {
        setStatement(null);
        toast.error((error as Error).message || "Failed to load cash flow statement.");
      })
      .finally(() => setStatementLoading(false));
  }, [periodId]);

  React.useEffect(() => {
    if (!drilldown || !periodId) return;
    setDrilldownLoading(true);
    setDrilldownItems([]);
    fetchFinancialStatementDrilldownApi("cash-flow", drilldown.sectionKey, periodId)
      .then(setDrilldownItems)
      .catch((error) => toast.error((error as Error).message || "Failed to load drilldown."))
      .finally(() => setDrilldownLoading(false));
  }, [drilldown, periodId]);

  const periodsEmptyOk = !periodsLoading && !periodsError && periods.length === 0;
  const canPickPeriod = !periodsLoading && !periodsError && periods.length > 0;
  const showSelectPeriodHint = canPickPeriod && !periodId;

  const selectedPeriod = periods.find((p) => p.id === periodId);
  const hasBankWarning = statement?.notes?.some((n) => n.startsWith("No bank accounts"));
  const netSection = statement?.sections?.find((s) => s.key === "net");
  const netIsNegative = (netSection?.amount ?? 0) < 0;

  return (
    <PageLayout
      title="Cash Flow Statement"
      description="Cash inflows and outflows for the selected period"
      actions={
        <Button variant="outline">
          <Icons.Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Cash Flow Statement</CardTitle>
              {selectedPeriod && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {selectedPeriod.fiscalYear} · Period {selectedPeriod.periodNumber} &middot;{" "}
                  {new Date(selectedPeriod.startDate).toLocaleDateString()} –{" "}
                  {new Date(selectedPeriod.endDate).toLocaleDateString()}
                </p>
              )}
            </div>
            <Select value={periodId} onValueChange={setPeriodId} disabled={!canPickPeriod}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {periods.map((period) => (
                  <SelectItem key={period.id} value={period.id}>
                    {period.fiscalYear} · P{period.periodNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <StatementPeriodStatus
            loading={periodsLoading}
            errorMessage={periodsError}
            periodsEmpty={periodsEmptyOk}
          />

          {/* Bank GL mapping warning */}
          {hasBankWarning && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              <Icons.AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                No bank accounts are linked to a GL account — cash flow cannot be computed.{" "}
                <a href="/settings/financial/bank-accounts" className="underline font-medium">
                  Map bank accounts to GL
                </a>{" "}
                under Settings → Financial → Bank accounts.
              </span>
            </div>
          )}

          {statementLoading && (
            <p className="py-4 text-sm text-muted-foreground">Loading cash flow statement…</p>
          )}
          {!statementLoading && canPickPeriod && periodId && !statement && (
            <p className="py-4 text-sm text-destructive">Could not load the cash flow statement.</p>
          )}
          {showSelectPeriodHint && (
            <p className="py-4 text-sm text-muted-foreground">Select a period above to generate the statement.</p>
          )}

          {statement && (
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <tbody>
                  {statement.sections.map((section, idx) => {
                    const isNet = section.key === "net";
                    const isActive = drilldown?.sectionKey === section.key;
                    const isLast = idx === statement.sections.length - 1;
                    return (
                      <tr
                        key={section.key}
                        className={cn(
                          "border-b transition-colors",
                          isNet ? "bg-muted/40 font-semibold" : "hover:bg-muted/20",
                          isLast && "border-b-0",
                          isActive && "bg-blue-50 dark:bg-blue-950/20"
                        )}
                      >
                        <td className="px-4 py-3">
                          <span className={cn(isNet ? "font-semibold" : "font-medium")}>
                            {section.label}
                          </span>
                          {section.key === "inflow" && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              — debits on bank GL accounts
                            </span>
                          )}
                          {section.key === "outflow" && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              — credits on bank GL accounts
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {section.key !== "net" ? (
                            <button
                              type="button"
                              onClick={() =>
                                setDrilldown({ sectionKey: section.key, label: section.label })
                              }
                              className={cn(
                                "tabular-nums font-mono hover:underline",
                                isNet && "font-semibold",
                                section.amount < 0 && "text-destructive"
                              )}
                              title="Click to see transactions"
                            >
                              {formatMoney(section.amount, baseCurrency)}
                            </button>
                          ) : (
                            <span
                              className={cn(
                                "tabular-nums font-mono font-semibold",
                                netIsNegative && "text-destructive"
                              )}
                            >
                              {formatMoney(section.amount, baseCurrency)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Drilldown panel */}
          {drilldown && (
            <div className="rounded-md border bg-muted/30">
              <div className="flex items-center justify-between border-b px-4 py-2">
                <p className="text-sm font-medium">Transactions — {drilldown.label}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setDrilldown(null); setDrilldownItems([]); }}
                >
                  <Icons.X className="h-4 w-4" />
                </Button>
              </div>
              {drilldownLoading && (
                <p className="px-4 py-3 text-sm text-muted-foreground">Loading…</p>
              )}
              {!drilldownLoading && drilldownItems.length === 0 && (
                <p className="px-4 py-3 text-sm text-muted-foreground">No posted transactions for this selection.</p>
              )}
              {!drilldownLoading && drilldownItems.length > 0 && (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/50 text-muted-foreground">
                      <th className="px-4 py-2 text-left font-medium">Date</th>
                      <th className="px-4 py-2 text-left font-medium">Document</th>
                      <th className="px-4 py-2 text-left font-medium">Account</th>
                      <th className="px-4 py-2 text-right font-medium">Debit</th>
                      <th className="px-4 py-2 text-right font-medium">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drilldownItems.map((item) => (
                      <tr key={item.postingLineId} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-1.5 tabular-nums">
                          {new Date(item.postingDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-1.5">{item.documentNumber ?? item.sourceNumber}</td>
                        <td className="px-4 py-1.5 text-muted-foreground">
                          {item.accountCode ? `${item.accountCode} · ` : ""}{item.accountName ?? "—"}
                        </td>
                        <td className="px-4 py-1.5 text-right tabular-nums">
                          {item.debit > 0 ? formatMoney(item.debit, baseCurrency) : ""}
                        </td>
                        <td className="px-4 py-1.5 text-right tabular-nums">
                          {item.credit > 0 ? formatMoney(item.credit, baseCurrency) : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Methodological notes */}
          {(statement?.notes ?? []).length > 0 && (
            <div className="space-y-1">
              {statement!.notes!.map((note, i) => (
                <p key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Icons.Info className="mt-0.5 h-3 w-3 shrink-0" />
                  {note}
                </p>
              ))}
            </div>
          )}

          {/* IAS 7 phase-2 note */}
          {statement && !hasBankWarning && (
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Icons.Info className="mt-0.5 h-3 w-3 shrink-0" />
              This statement uses the direct method applied to bank GL accounts (period debits = receipts, credits = payments). Operating / Investing / Financing classification (IAS 7) requires assigning a cash flow activity tag to each ledger account — a future enhancement.
            </p>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
}
