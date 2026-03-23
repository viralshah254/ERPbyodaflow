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
  reopenFinancePeriodApi,
  type CloseChecklistItem,
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
            {item.count} pending
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
  const [checklist, setChecklist] = React.useState<CloseChecklistItem[]>([]);
  const [checklistLoading, setChecklistLoading] = React.useState(false);

  const currentPeriodId = React.useMemo(() => periods.find((p) => p.status === "OPEN")?.id, [periods]);
  const closedPeriodId = React.useMemo(() => periods.find((p) => p.status === "CLOSED")?.id, [periods]);

  const hasBlockers = checklist.some((item) => item.count > 0 && item.severity === "error");
  const hasWarnings = checklist.some((item) => item.count > 0 && item.severity === "warning");

  const refreshAll = React.useCallback(async () => {
    setChecklistLoading(true);
    try {
      const [periodsData, checklistData] = await Promise.all([
        fetchFinancePeriodsApi(),
        fetchCloseChecklistApi(),
      ]);
      setPeriods(periodsData);
      setChecklist(checklistData.items);
    } catch {
      // Non-fatal: checklist might not be available in demo mode
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
        {/* Status summary */}
        {periods.length > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-card text-sm">
            <Icons.Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>
              {periods.filter((p) => p.status === "OPEN").length} open period(s) ·{" "}
              {periods.filter((p) => p.status === "CLOSED").length} closed
            </span>
            <span className="ml-auto text-muted-foreground">
              Current: {periods.find((p) => p.status === "OPEN")?.fiscalYear ?? "None"}
            </span>
          </div>
        )}

        {/* Live checklist */}
        <Card>
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

        {/* Close / Reopen actions */}
        <Card>
          <CardHeader>
            <CardTitle>Close Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              className="w-full"
              size="lg"
              disabled={loading !== null || hasBlockers}
              onClick={async () => {
                setLoading("close");
                try {
                  if (!currentPeriodId) throw new Error("No open fiscal period found.");
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
              {hasBlockers ? "Resolve blockers to close" : "Close period"}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              size="lg"
              disabled={loading !== null}
              onClick={async () => {
                setLoading("reopen");
                try {
                  if (!closedPeriodId) throw new Error("No closed fiscal period found.");
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
              Reopen period
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
