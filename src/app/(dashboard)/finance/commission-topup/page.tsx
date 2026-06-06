"use client";

import Link from "next/link";
import {
  LIST_PAGE_SHELL_CLASS,
  PageShell,
} from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { CommissionSummaryCard } from "@/components/operational/CommissionSummaryCard";
import { fetchTopUps } from "@/lib/api/cool-catch";
import * as React from "react";
import { formatMoney } from "@/lib/money";
import { useBaseCurrency } from "@/lib/org/useBaseCurrency";

export default function FinanceCommissionTopUpPage() {
  const baseCurrency = useBaseCurrency();
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
    { id: "amount", header: "Top-up amount", accessor: (r: (typeof rows)[number]) => formatMoney(r.amount, baseCurrency) },
    { id: "status", header: "Status", accessor: (r: (typeof rows)[number]) => r.status },
    { id: "reason", header: "Reason", accessor: (r: (typeof rows)[number]) => r.reason },
  ];

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
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
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
        <div className="grid shrink-0 gap-4 lg:grid-cols-2">
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
        <div className="relative flex min-h-0 flex-col rounded-xl border bg-card shadow-sm">
          <div className="shrink-0 border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Top-up records</h3>
            <p className="text-xs text-muted-foreground">
              Drill down and posting workflows can be expanded once finance posting endpoints are wired.
            </p>
          </div>
          {loading ? (
            <div className="flex min-h-0 flex-1 items-center justify-center py-12 text-sm text-muted-foreground">
              Loading top-up records…
            </div>
          ) : (
            <DataTable
              data={rows}
              columns={columns}
              emptyMessage="No top-up records."
              scrollMode="natural"
              size="comfortable"
            />
          )}
        </div>
      </div>
    </PageShell>
  );
}
