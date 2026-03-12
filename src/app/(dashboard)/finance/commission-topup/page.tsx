"use client";

import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { CommissionSummaryCard } from "@/components/operational/CommissionSummaryCard";
import { fetchTopUps } from "@/lib/api/cool-catch";
import * as React from "react";
import { formatMoney } from "@/lib/money";

export default function FinanceCommissionTopUpPage() {
  const [rows, setRows] = React.useState<Array<{ franchiseeName: string; runNumber: string; amount: number; status: string; reason: string }>>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchTopUps()
      .then((data) => {
        if (cancelled) return;
        setRows(
          data.map((t) => ({
            franchiseeName: t.franchiseeName,
            runNumber: t.runNumber,
            amount: t.amount,
            status: t.status,
            reason: t.reason,
          }))
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const columns = [
    { id: "franchisee", header: "Franchisee", accessor: (r: (typeof rows)[number]) => r.franchiseeName, sticky: true },
    { id: "run", header: "Run", accessor: (r: (typeof rows)[number]) => r.runNumber },
    { id: "amount", header: "Top-up amount", accessor: (r: (typeof rows)[number]) => formatMoney(r.amount, "KES") },
    { id: "status", header: "Status", accessor: (r: (typeof rows)[number]) => r.status },
    { id: "reason", header: "Reason", accessor: (r: (typeof rows)[number]) => r.reason },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Commission / Top-up"
        description="Finance control center for franchise top-up exposure and payout readiness."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Commission / Top-up" }]}
        sticky
        showCommandHint
        actions={
          <Button asChild>
            <Link href="/franchise/commission">Open Franchise Commission</Link>
          </Button>
        }
      />
      <div className="p-6">
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <CommissionSummaryCard
            title="Top-up Exposure"
            salesAmount={0}
            commissionAmount={0}
            topUpAmount={rows.reduce((a, r) => a + r.amount, 0)}
            status={rows.some((r) => r.status === "PENDING") ? "PENDING" : "POSTED"}
          />
          <CommissionSummaryCard
            title="Payout Readiness"
            salesAmount={0}
            commissionAmount={0}
            topUpAmount={rows.filter((r) => r.status === "PENDING").reduce((a, r) => a + r.amount, 0)}
            status="REVIEW"
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Top-up records</CardTitle>
            <CardDescription>Drill down and posting workflows can be expanded once finance posting endpoints are wired.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading top-up records…</div>
            ) : (
              <DataTable data={rows} columns={columns} emptyMessage="No top-up records." />
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

