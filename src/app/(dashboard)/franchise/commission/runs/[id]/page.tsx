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
import { CommissionSummaryCard } from "@/components/operational/CommissionSummaryCard";
import { fetchCommissionRunById, fetchFranchiseesApi } from "@/lib/api/cool-catch";
import type { FranchiseeRow } from "@/lib/api/cool-catch";
import type { CommissionRunLineRow } from "@/lib/mock/franchise/commission";
import { formatMoney } from "@/lib/money";

export default function CommissionRunDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [run, setRun] = React.useState<Awaited<ReturnType<typeof fetchCommissionRunById>>>(null);
  const [franchisees, setFranchisees] = React.useState<FranchiseeRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    fetchFranchiseesApi()
      .then((rows) => { if (!cancelled) setFranchisees(rows); })
      .catch(() => {});
    fetchCommissionRunById(id)
      .then((r) => {
        if (!cancelled) setRun(r);
      })
      .catch(() => {
        if (!cancelled) setRun(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const feName = React.useCallback(
    (fid?: string) => {
      if (!fid) return "—";
      const m = franchisees.find((x) => x.id === fid);
      return m ? `${m.code} · ${m.name}` : fid.slice(0, 8);
    },
    [franchisees],
  );

  const displayLines: CommissionRunLineRow[] =
    run?.lines?.map((ln, idx) => {
      const row = ln as {
        franchiseeId?: string;
        salesAmount?: number;
        commissionAmount?: number;
        contractCommissionAmount?: number;
        extraRetailMarginAmount?: number;
        ruleCommissionAmount?: number;
        minFloor?: number | null;
        topUpAmount?: number;
        royaltyWithheldKes?: number;
        withholdingTaxKes?: number;
        netCommissionPayoutKes?: number;
      };
      const fid = row.franchiseeId;
      const minFloor = typeof row.minFloor === "number" ? row.minFloor : null;
      const commissionAmt = row.commissionAmount ?? 0;
      const status: CommissionRunLineRow["status"] =
        typeof minFloor === "number" && commissionAmt < minFloor ? "TOPUP" : "OK";
      return {
        id: `${fid ?? idx}:${idx}`,
        runId: id,
        franchiseeId: fid,
        franchiseeName: feName(fid),
        salesAmount: row.salesAmount ?? 0,
        commissionAmount: commissionAmt,
        contractCommissionAmount: row.contractCommissionAmount,
        extraRetailMarginAmount: row.extraRetailMarginAmount,
        ruleCommissionAmount: row.ruleCommissionAmount,
        minFloor,
        topUpAmount: row.topUpAmount ?? 0,
        royaltyWithheldKes: row.royaltyWithheldKes,
        withholdingTaxKes: row.withholdingTaxKes,
        netCommissionPayoutKes: row.netCommissionPayoutKes,
        status,
      };
    }) ?? [];

  const lineColumns = [
    {
      id: "franchisee",
      header: "Franchisee",
      accessor: (r: CommissionRunLineRow) => r.franchiseeName,
      sticky: true,
    },
    { id: "sales", header: "Retail sales", accessor: (r: CommissionRunLineRow) => formatMoney(r.salesAmount, "KES") },
    {
      id: "contract",
      header: "Guaranteed commission",
      accessor: (r: CommissionRunLineRow) =>
        r.contractCommissionAmount != null ? formatMoney(r.contractCommissionAmount, "KES") : "—",
    },
    {
      id: "margin",
      header: "Extra earnings above guide",
      accessor: (r: CommissionRunLineRow) =>
        r.extraRetailMarginAmount != null ? formatMoney(r.extraRetailMarginAmount, "KES") : "—",
    },
    {
      id: "rules",
      header: "HQ rules",
      accessor: (r: CommissionRunLineRow) =>
        r.ruleCommissionAmount != null ? formatMoney(r.ruleCommissionAmount, "KES") : "—",
    },
    {
      id: "commission",
      header: "Gross franchise earnings",
      accessor: (r: CommissionRunLineRow) => formatMoney(r.commissionAmount, "KES"),
    },
    { id: "topUp", header: "Top-up", accessor: (r: CommissionRunLineRow) => formatMoney(r.topUpAmount ?? 0, "KES") },
    {
      id: "royalty",
      header: "Royalty withheld",
      accessor: (r: CommissionRunLineRow) =>
        r.royaltyWithheldKes != null ? formatMoney(r.royaltyWithheldKes, "KES") : "—",
    },
    {
      id: "wht",
      header: "WHT (5% > KES 24k)",
      accessor: (r: CommissionRunLineRow) =>
        r.withholdingTaxKes != null
          ? formatMoney(r.withholdingTaxKes, "KES")
          : "—",
    },
    {
      id: "netPayout",
      header: "Net payout",
      accessor: (r: CommissionRunLineRow) =>
        r.netCommissionPayoutKes != null
          ? formatMoney(r.netCommissionPayoutKes, "KES")
          : "—",
    },
    {
      id: "status",
      header: "Status",
      accessor: (r: CommissionRunLineRow) => (
        <Badge variant={r.status === "OK" ? "default" : "secondary"}>{r.status ?? "—"}</Badge>
      ),
    },
  ];

  const runTitle = typeof run?.number === "string" && run.number ? run.number : run?.id ?? id;

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
        title={runTitle}
        description={`${String(run.periodStart)} – ${String(run.periodEnd)} · Net payout ${formatMoney(run.totalPayout, "KES")}`}
        breadcrumbs={[
          { label: "Franchise", href: "/franchise/commission" },
          { label: "Commission & Rebates", href: "/franchise/commission" },
          { label: runTitle },
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
        <CommissionSummaryCard
          title={runTitle}
          salesAmount={run.lines?.reduce((a, l) => a + Number((l as { salesAmount?: number }).salesAmount ?? 0), 0) ?? 0}
          commissionAmount={run.lines?.reduce((a, l) => a + Number((l as { commissionAmount?: number }).commissionAmount ?? 0), 0) ?? 0}
          topUpAmount={run.lines?.reduce((a, l) => a + Number((l as { topUpAmount?: number }).topUpAmount ?? 0), 0) ?? 0}
          status={run.status}
        />
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Header</CardTitle>
            <Badge>{run.status}</Badge>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>Period: {String(run.periodStart)} – {String(run.periodEnd)}</p>
            <p>
              Net franchise payout (after royalty withholding & WHT): {formatMoney(run.totalPayout, "KES")} ·{" "}
              {(run.lineCount ?? run.lines?.length ?? 0) as number}{" "}
              franchisee(s)
            </p>
            {"createdAt" in run && run.createdAt ? (
              <p>Created: {new Date(run.createdAt as string).toLocaleString()}</p>
            ) : null}
          </CardContent>
        </Card>
        {run.lines && run.lines.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Lines</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable data={displayLines} columns={lineColumns} emptyMessage="No lines." />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </PageShell>
  );
}
