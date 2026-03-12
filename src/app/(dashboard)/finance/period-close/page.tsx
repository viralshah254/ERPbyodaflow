"use client";

import * as React from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  closeFinancePeriodApi,
  fetchFinancePeriodsApi,
  reopenFinancePeriodApi,
} from "@/lib/api/finance";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function PeriodClosePage() {
  const [loading, setLoading] = React.useState<"close" | "reopen" | null>(null);
  const [periods, setPeriods] = React.useState<Array<{ id: string; fiscalYear: string; periodNumber: number; status: "OPEN" | "CLOSED" }>>([]);
  const currentPeriodId = React.useMemo(
    () => periods.find((period) => period.status === "OPEN")?.id,
    [periods]
  );
  const closedPeriodId = React.useMemo(
    () => periods.find((period) => period.status === "CLOSED")?.id,
    [periods]
  );

  const refreshPeriods = React.useCallback(async () => {
    setPeriods(await fetchFinancePeriodsApi());
  }, []);

  React.useEffect(() => {
    void refreshPeriods();
  }, [refreshPeriods]);
  return (
    <PageLayout
      title="Period Close"
      description="Close accounting periods and lock transactions"
    >
      <Card>
        <CardHeader>
          <CardTitle>Close Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {[
              "Reconcile all bank accounts",
              "Review AR aging and follow up on overdue",
              "Review AP aging and schedule payments",
              "Post depreciation journals",
              "Review and adjust inventory valuations",
              "Verify all journal entries are posted",
              "Run financial statements and review",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                <Checkbox id={`check-${i}`} />
                <Label htmlFor={`check-${i}`} className="flex-1 cursor-pointer">
                  {item}
                </Label>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t space-y-2">
            <Button
              className="w-full"
              size="lg"
              disabled={loading !== null}
              onClick={async () => {
                setLoading("close");
                try {
                  if (!currentPeriodId) throw new Error("No open fiscal period found.");
                  await closeFinancePeriodApi(currentPeriodId);
                  await refreshPeriods();
                  toast.success("Period closed.");
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setLoading(null);
                }
              }}
            >
              <Icons.Lock className="mr-2 h-4 w-4" />
              Close period
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
                  await refreshPeriods();
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
              Close prevents transactions from being posted to this period. Reopen restores posting and adjustments.
            </p>
            <p className="text-xs text-muted-foreground text-center">
              {periods.length > 0
                ? `Loaded ${periods.length} fiscal period(s). Current open period: ${
                    periods.find((period) => period.status === "OPEN")?.fiscalYear ?? "None"
                  }`
                : "No fiscal periods loaded."}
            </p>
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
}





