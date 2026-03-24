"use client";

import * as React from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchFinancePeriodsApi, fetchFinancialStatementApi } from "@/lib/api/finance";
import { formatMoney } from "@/lib/money";
import { useBaseCurrency } from "@/lib/org/useBaseCurrency";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function BalanceSheetPage() {
  const baseCurrency = useBaseCurrency();
  const [periods, setPeriods] = React.useState<Array<{ id: string; fiscalYear: string; periodNumber: number }>>([]);
  const [periodId, setPeriodId] = React.useState("");
  const [statement, setStatement] = React.useState<Awaited<ReturnType<typeof fetchFinancialStatementApi>> | null>(null);

  React.useEffect(() => {
    fetchFinancePeriodsApi()
      .then((items) => {
        setPeriods(items);
        setPeriodId(items.find((item) => item.status === "OPEN")?.id ?? items[0]?.id ?? "");
      })
      .catch((error) => toast.error((error as Error).message || "Failed to load periods."));
  }, []);

  React.useEffect(() => {
    if (!periodId) return;
    fetchFinancialStatementApi("balance-sheet", periodId)
      .then(setStatement)
      .catch((error) => toast.error((error as Error).message || "Failed to load balance sheet."));
  }, [periodId]);

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
            <Select value={periodId} onValueChange={setPeriodId}>
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
        <CardContent>
          <div className="space-y-4">
            {(statement?.sections ?? []).map((section) => (
              <div key={section.key} className="flex items-center justify-between rounded border p-3">
                <span className="font-medium">{section.label}</span>
                <span>{formatMoney(section.amount, baseCurrency)}</span>
              </div>
            ))}
            {!statement || statement.sections.length === 0 ? (
              <p className="text-sm text-muted-foreground">Select a period to generate the balance sheet.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
}





