"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { fetchCommissionRunById } from "@/lib/api/cool-catch";
import type { CommissionRunLineRow } from "@/lib/mock/franchise/commission";
import { formatMoney } from "@/lib/money";

export default function CommissionRunDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [run, setRun] = React.useState<Awaited<ReturnType<typeof fetchCommissionRunById>>>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    fetchCommissionRunById(id)
      .then((r) => { if (!cancelled) setRun(r); })
      .catch(() => { if (!cancelled) setRun(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const lineColumns = [
    { id: "franchisee", header: "Franchisee", accessor: (r: CommissionRunLineRow) => r.franchiseeName, sticky: true },
    { id: "sales", header: "Sales", accessor: (r: CommissionRunLineRow) => formatMoney(r.salesAmount, "KES") },
    { id: "commission", header: "Commission", accessor: (r: CommissionRunLineRow) => formatMoney(r.commissionAmount, "KES") },
    { id: "topUp", header: "Top-up", accessor: (r: CommissionRunLineRow) => formatMoney(r.topUpAmount, "KES") },
    { id: "status", header: "Status", accessor: (r: CommissionRunLineRow) => <Badge variant={r.status === "OK" ? "default" : "secondary"}>{r.status}</Badge> },
  ];

  if (loading) {
    return (
      <PageShell>
        <PageHeader title="Commission run" breadcrumbs={[{ label: "Franchise", href: "/franchise/commission" }, { label: "Commission & Rebates" }, { label: id }]} />
        <div className="p-6"><p className="text-muted-foreground text-sm">Loading…</p></div>
      </PageShell>
    );
  }

  if (!run) {
    return (
      <PageShell>
        <PageHeader title="Run not found" breadcrumbs={[{ label: "Franchise", href: "/franchise/commission" }, { label: "Commission runs" }, { label: id }]} />
        <div className="p-6">
          <p className="text-muted-foreground">Commission run not found.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/franchise/commission">Back to Commission</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title={run.number}
        description={`${run.periodStart} – ${run.periodEnd} · ${formatMoney(run.totalPayout, "KES")}`}
        breadcrumbs={[
          { label: "Franchise", href: "/franchise/commission" },
          { label: "Commission & Rebates", href: "/franchise/commission" },
          { label: run.number },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/franchise/commission">Back to list</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Header</CardTitle>
            <Badge>{run.status}</Badge>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>Period: {run.periodStart} – {run.periodEnd}</p>
            <p>Total payout: {formatMoney(run.totalPayout, "KES")} · {run.lineCount ?? run.lines?.length ?? 0} franchisee(s)</p>
            <p>Created: {new Date(run.createdAt).toLocaleString()}</p>
          </CardContent>
        </Card>
        {run.lines && run.lines.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Lines</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable data={run.lines} columns={lineColumns} emptyMessage="No lines." />
            </CardContent>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
