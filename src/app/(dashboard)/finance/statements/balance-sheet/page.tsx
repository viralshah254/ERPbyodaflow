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
  formatFinancePeriodLoadError,
  type FinancePeriod,
} from "@/lib/api/finance";
import { formatMoney } from "@/lib/money";
import { useBaseCurrency } from "@/lib/org/useBaseCurrency";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function BalanceSheetPage() {
  const baseCurrency = useBaseCurrency();
  const [periods, setPeriods] = React.useState<FinancePeriod[]>([]);
  const [periodsLoading, setPeriodsLoading] = React.useState(true);
  const [periodsError, setPeriodsError] = React.useState<string | null>(null);
  const [periodId, setPeriodId] = React.useState("");
  const [statement, setStatement] = React.useState<Awaited<ReturnType<typeof fetchFinancialStatementApi>> | null>(null);
  const [statementLoading, setStatementLoading] = React.useState(false);

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
    fetchFinancialStatementApi("balance-sheet", periodId)
      .then(setStatement)
      .catch((error) => {
        setStatement(null);
        toast.error((error as Error).message || "Failed to load balance sheet.");
      })
      .finally(() => setStatementLoading(false));
  }, [periodId]);

  const periodsEmptyOk = !periodsLoading && !periodsError && periods.length === 0;
  const canPickPeriod =
    !periodsLoading && !periodsError && periods.length > 0;
  const showSelectPeriodHint =
    canPickPeriod && !periodId;
  const showStatementHint =
    canPickPeriod &&
    !!periodId &&
    !statementLoading &&
    !!statement &&
    statement.sections.length === 0;

  return (
    <PageLayout
      title="Balance Sheet"
      description="Assets, liabilities, and equity as of the selected date"
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
            <CardTitle>Balance Sheet</CardTitle>
            <Select
              value={periodId}
              onValueChange={setPeriodId}
              disabled={!canPickPeriod}
            >
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
        <CardContent className="space-y-4">
          <StatementPeriodStatus
            loading={periodsLoading}
            errorMessage={periodsError}
            periodsEmpty={periodsEmptyOk}
          />
          <div className="space-y-4">
            {(statement?.sections ?? []).map((section) => (
              <div key={section.key} className="flex items-center justify-between rounded border p-3">
                <span className="font-medium">{section.label}</span>
                <span>{formatMoney(section.amount, baseCurrency)}</span>
              </div>
            ))}
            {statementLoading ? (
              <p className="text-sm text-muted-foreground">Loading balance sheet…</p>
            ) : null}
            {!statementLoading &&
            canPickPeriod &&
            periodId &&
            !statement ? (
              <p className="text-sm text-destructive">Could not load the balance sheet.</p>
            ) : null}
            {showSelectPeriodHint ? (
              <p className="text-sm text-muted-foreground">Select a period above to generate the balance sheet.</p>
            ) : null}
            {showStatementHint ? (
              <p className="text-sm text-muted-foreground">
                No line items matched for this statement in the selected period.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
