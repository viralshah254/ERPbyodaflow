"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  fetchCommissionReconciliationApi,
  downloadCommissionReconciliationCsvApi,
  type CommissionReconciliationRow,
} from "@/lib/api/reports";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";

export default function CommissionReconciliationPage() {
  const [rows, setRows] = React.useState<CommissionReconciliationRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchCommissionReconciliationApi({ status: "ALL" }));
    } catch (error) {
      toast.error((error as Error).message || "Failed to load reconciliation report.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const columns = [
    { id: "run", header: "Run", accessor: (row: CommissionReconciliationRow) => row.runNumber, sticky: true },
    { id: "period", header: "Period", accessor: (row: CommissionReconciliationRow) => `${row.periodStart.slice(0, 10)} → ${row.periodEnd.slice(0, 10)}` },
    { id: "sales", header: "Sales base", accessor: (row: CommissionReconciliationRow) => formatMoney(row.salesBase, "KES") },
    { id: "commission", header: "Commission", accessor: (row: CommissionReconciliationRow) => formatMoney(row.commissionAmount, "KES") },
    { id: "topup", header: "Top-up", accessor: (row: CommissionReconciliationRow) => formatMoney(row.topUpAmount, "KES") },
    { id: "journal", header: "Commission journal", accessor: (row: CommissionReconciliationRow) => row.commissionJournalId ?? "—" },
    { id: "topupJournals", header: "Top-up journals", accessor: (row: CommissionReconciliationRow) => row.topUpJournalIds.join(", ") || "—" },
    {
      id: "settlement",
      header: "Settlement",
      accessor: (row: CommissionReconciliationRow) => (
        <Badge variant={row.paymentSettlementStatus === "SETTLED" ? "default" : "secondary"}>
          {row.paymentSettlementStatus}
        </Badge>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Commission reconciliation"
        description="Run-level reconciliation of sales base, commissions, top-ups, journals, and settlement status."
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Commission reconciliation" }]}
        sticky
        showCommandHint
        actions={
          <Button variant="outline" onClick={() => downloadCommissionReconciliationCsvApi((message) => toast.error(message))}>
            Export CSV
          </Button>
        }
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Run reconciliation</CardTitle>
            <CardDescription>Single view of payout math and settlement progress.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="p-4 text-sm text-muted-foreground">Loading…</p>
            ) : (
              <DataTable data={rows} columns={columns} emptyMessage="No commission runs found." />
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
