"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  closeFinancePeriodApi,
  fetchCloseChecklistApi,
  fetchFinancePeriodsApi,
  fetchInvoiceCogsExceptionsApi,
  formatFinancePeriodLoadError,
  reopenFinancePeriodApi,
  retryInvoiceCogsApi,
  type CloseChecklistItem,
  type InvoiceCogsException,
} from "@/lib/api/finance";
import { toast } from "sonner";
import * as Icons from "lucide-react";

function ChecklistRow({ item }: { item: CloseChecklistItem }) {
  const isOk = item.count === 0;
  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 border rounded-lg",
        isOk
          ? "border-green-200 bg-green-50/40 dark:border-green-800/30 dark:bg-green-900/10"
          : item.severity === "error"
          ? "border-red-200 bg-red-50/40 dark:border-red-800/30 dark:bg-red-900/10"
          : "border-amber-200 bg-amber-50/40 dark:border-amber-800/30 dark:bg-amber-900/10"
      )}
    >
      <div className="flex items-center gap-3">
        {isOk ? (
          <Icons.CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
        ) : item.severity === "error" ? (
          <Icons.XCircle className="h-4 w-4 text-red-600 shrink-0" />
        ) : (
          <Icons.AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
        )}
        <span className="text-sm font-medium">{item.label}</span>
      </div>
      <div className="flex items-center gap-2">
        {!isOk && (
          <Badge variant={item.severity === "error" ? "destructive" : "outline"} className="text-xs">
            {item.key === "no_open_fiscal_period"
              ? "Blocked"
              : `${item.count} pending`}
          </Badge>
        )}
        {isOk ? (
          <Badge variant="outline" className="text-xs text-green-700 border-green-300">
            Clear
          </Badge>
        ) : (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
            <Link href={item.action}>Resolve</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

export default function PeriodClosePage() {
  const [loading, setLoading] = React.useState<"close" | "reopen" | null>(null);
  const [periods, setPeriods] = React.useState<Array<{ id: string; fiscalYear: string; periodNumber: number; status: "OPEN" | "CLOSED" }>>([]);
  const [periodsLoadFailed, setPeriodsLoadFailed] = React.useState(false);
  const [checklist, setChecklist] = React.useState<CloseChecklistItem[]>([]);
  const [cogsExceptions, setCogsExceptions] = React.useState<InvoiceCogsException[]>([]);
  const [retryingCogsId, setRetryingCogsId] = React.useState<string | null>(null);
  const [checklistLoading, setChecklistLoading] = React.useState(false);

  const openPeriodRow = React.useMemo(() => periods.find((p) => p.status === "OPEN"), [periods]);
  const currentPeriodId = openPeriodRow?.id;
  const closedPeriodId = React.useMemo(() => periods.find((p) => p.status === "CLOSED")?.id, [periods]);
  const hasOpenPeriod = Boolean(currentPeriodId);

  const hasBlockers = checklist.some((item) => item.count > 0 && item.severity === "error");
  const hasWarnings = checklist.some((item) => item.count > 0 && item.severity === "warning");

  const refreshAll = React.useCallback(async () => {
    setChecklistLoading(true);
    try {
      try {
        const loadedPeriods = await fetchFinancePeriodsApi();
        setPeriods(loadedPeriods);
        setPeriodsLoadFailed(false);
        const selectedOpenPeriod = loadedPeriods.find((period) => period.status === "OPEN");
        const [checklistRes, cogsItems] = await Promise.all([
          fetchCloseChecklistApi(selectedOpenPeriod?.id),
          fetchInvoiceCogsExceptionsApi(selectedOpenPeriod?.id),
        ]);
        setChecklist(checklistRes.items);
        setCogsExceptions(cogsItems);
      } catch (error) {
        setPeriods([]);
        setChecklist([]);
        setCogsExceptions([]);
        setPeriodsLoadFailed(true);
        toast.error(formatFinancePeriodLoadError(error));
      }
    } finally {
      setChecklistLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  return (
    <PageLayout
      title="Period Close"
      description="Close accounting periods and lock transactions"
    >
      <div className="space-y-6 max-w-2xl">
        {/* Status summary — always visible so “no periods” isn't hidden */}
        <div className="flex flex-wrap items-start gap-3 p-3 rounded-lg border bg-card text-sm">
          <Icons.Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1 space-y-1">
            {periodsLoadFailed ? (
              <p className="text-destructive">
                Could not load fiscal periods. Use refresh above or check your connection and permissions, then try again.
              </p>
            ) : periods.length === 0 ? (
              <p>
                No fiscal periods are configured yet.{" "}
                <Link href="/settings/financial/fiscal-years" className="font-medium text-primary underline underline-offset-4">
                  Create periods in Fiscal years
                </Link>{" "}
                before you can close one.
              </p>
            ) : (
              <p className="text-foreground">
                {periods.filter((p) => p.status === "OPEN").length} open ·{" "}
                {periods.filter((p) => p.status === "CLOSED").length} closed
                {!hasOpenPeriod && periods.length > 0 ? (
                  <span className="text-muted-foreground">
                    {" "}
                    · All periods are closed. Use <strong className="font-medium">Reopen period</strong> below or{" "}
                    <Link href="/settings/financial/fiscal-years" className="font-medium text-primary underline underline-offset-4">
                      Fiscal years
                    </Link>{" "}
                    to add a new open period.
                  </span>
                ) : null}
              </p>
            )}
            {periods.length > 0 && (
              <p className="text-muted-foreground text-xs">
                Current open FY:{" "}
                <span className="text-foreground font-medium tabular-nums">
                  {openPeriodRow?.fiscalYear ?? "None"}
                  {openPeriodRow ? ` · P${openPeriodRow.periodNumber}` : ""}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Live checklist */}
        <Card data-tutorial-hint="period-close-checklist">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Pre-Close Checklist</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => void refreshAll()} disabled={checklistLoading}>
              <Icons.RefreshCw className={cn("h-3.5 w-3.5", checklistLoading && "animate-spin")} />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {checklist.length === 0 && !checklistLoading && (
              <p className="text-sm text-muted-foreground text-center py-4">No checklist data available.</p>
            )}
            {checklist.map((item) => (
              <ChecklistRow key={item.key} item={item} />
            ))}
            {checklist.length > 0 && !hasBlockers && !hasWarnings && (
              <div className="flex items-center gap-2 pt-2 text-sm text-green-700 font-medium">
                <Icons.CheckCircle2 className="h-4 w-4" />
                All checks passed — ready to close this period.
              </div>
            )}
            {hasBlockers && (
              <div className="flex items-center gap-2 pt-2 text-sm text-red-600 font-medium">
                <Icons.XCircle className="h-4 w-4" />
                Resolve all errors before closing the period.
              </div>
            )}
          </CardContent>
        </Card>

        <Card id="invoice-cogs">
          <CardHeader>
            <CardTitle>Invoice COGS Recovery</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cogsExceptions.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-green-700">
                <Icons.CheckCircle2 className="h-4 w-4" />
                No pending or failed invoice COGS for this period.
              </div>
            ) : (
              cogsExceptions.map((item) => (
                <div key={item.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{item.number}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.date).toLocaleDateString()} · Attempt {item.attemptCount}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.status === "FAILED" ? "destructive" : "outline"}>
                        {item.processing ? "PROCESSING" : item.status}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={item.processing || retryingCogsId === item.id}
                        onClick={async () => {
                          setRetryingCogsId(item.id);
                          try {
                            await retryInvoiceCogsApi(item.id);
                            await refreshAll();
                            toast.success(`COGS retry queued for ${item.number}.`);
                          } catch (error) {
                            toast.error((error as Error).message);
                          } finally {
                            setRetryingCogsId(null);
                          }
                        }}
                      >
                        <Icons.RotateCcw className="mr-2 h-3.5 w-3.5" />
                        Retry
                      </Button>
                    </div>
                  </div>
                  {item.lastError ? (
                    <p className="text-xs text-destructive break-words">{item.lastError}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Queued for automatic recovery.</p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Close / Reopen actions */}
        <Card>
          <CardHeader>
            <CardTitle>Close Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              className="w-full"
              size="lg"
              data-tutorial-hint="period-close-action"
              disabled={loading !== null || hasBlockers || !hasOpenPeriod}
              onClick={async () => {
                setLoading("close");
                try {
                  if (!currentPeriodId) {
                    toast.error("No open fiscal period to close.");
                    return;
                  }
                  await closeFinancePeriodApi(currentPeriodId);
                  await refreshAll();
                  toast.success("Period closed.");
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setLoading(null);
                }
              }}
            >
              <Icons.Lock className="mr-2 h-4 w-4" />
              {hasBlockers
                ? "Resolve blockers to close"
                : !hasOpenPeriod
                  ? "No open period to close"
                  : "Close period"}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              size="lg"
              disabled={loading !== null || !closedPeriodId}
              onClick={async () => {
                setLoading("reopen");
                try {
                  if (!closedPeriodId) {
                    toast.error("No closed fiscal period to reopen.");
                    return;
                  }
                  await reopenFinancePeriodApi(closedPeriodId);
                  await refreshAll();
                  toast.success("Period reopened.");
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setLoading(null);
                }
              }}
            >
              <Icons.Unlock className="mr-2 h-4 w-4" />
              {closedPeriodId ? "Reopen period" : "No closed period to reopen"}
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Closing a period prevents any transactions from being posted to it. Only users with{" "}
              <code>finance.close.write</code> permission can close or reopen.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
