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
import { fetchFinancePeriodsApi, fetchFinancialStatementApi, fetchFinancialStatementDrilldownApi } from "@/lib/api/finance";
import { formatMoney } from "@/lib/money";
import { useBaseCurrency } from "@/lib/org/useBaseCurrency";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function ProfitAndLossPage() {
  const baseCurrency = useBaseCurrency();
  const [periods, setPeriods] = React.useState<Array<{ id: string; fiscalYear: string; periodNumber: number }>>([]);
  const [periodId, setPeriodId] = React.useState("");
  const [statement, setStatement] = React.useState<Awaited<ReturnType<typeof fetchFinancialStatementApi>> | null>(null);
  const [selectedSection, setSelectedSection] = React.useState<string | null>(null);
  const [drilldown, setDrilldown] = React.useState<Array<Awaited<ReturnType<typeof fetchFinancialStatementDrilldownApi>>[number]>>([]);

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
    fetchFinancialStatementApi("pnl", periodId)
      .then(setStatement)
      .catch((error) => toast.error((error as Error).message || "Failed to load P&L."));
  }, [periodId]);

  React.useEffect(() => {
    if (!periodId || !selectedSection) return;
    fetchFinancialStatementDrilldownApi("pnl", selectedSection, periodId)
      .then(setDrilldown)
      .catch((error) => toast.error((error as Error).message || "Failed to load statement drilldown."));
  }, [periodId, selectedSection]);

  return (
    <PageLayout
      title="Profit & Loss Statement"
      description="Income statement for the selected period"
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
            <CardTitle>P&L Statement</CardTitle>
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
              <button
                key={section.key}
                type="button"
                onClick={() => setSelectedSection(section.key)}
                className="flex w-full items-center justify-between rounded border p-3 text-left hover:bg-muted/40"
              >
                <span className="font-medium">{section.label}</span>
                <span>{formatMoney(section.amount, baseCurrency)}</span>
              </button>
            ))}
            {!statement || statement.sections.length === 0 ? (
              <p className="text-sm text-muted-foreground">Select a period to generate the profit and loss statement.</p>
            ) : null}
          </div>
          {selectedSection && (
            <div className="mt-6">
              <p className="mb-2 text-sm font-medium">Drilldown: {selectedSection}</p>
              <div className="space-y-2">
                {drilldown.map((item) => (
                  <div key={item.postingLineId} className="flex items-center justify-between rounded border p-2 text-xs">
                    <span>{item.documentNumber ?? item.sourceNumber} · {item.accountCode ?? "NA"}</span>
                    <span>{formatMoney(item.amount, baseCurrency)}</span>
                  </div>
                ))}
                {drilldown.length === 0 ? <p className="text-xs text-muted-foreground">No source lines for this section.</p> : null}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
}





