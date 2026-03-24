"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchCashWeightAuditLines } from "@/lib/api/cool-catch";
import { ProcurementVariancePanel } from "@/components/operational/ProcurementVariancePanel";
import { LiveCurrencyConverterCard } from "@/components/operational/LiveCurrencyConverterCard";
import { ThreeWayMatchComparisonTable, type ThreeWayMatchRow } from "@/components/operational/ThreeWayMatchComparisonTable";

export default function FinanceProcurementReviewPage() {
  const [rows, setRows] = React.useState<Array<{ id: string; poNumber: string; sku: string; orderedQty: number; paidKg: number | null; receivedKg: number | null; varianceKg: number | null; status: string }>>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCashWeightAuditLines()
      .then((data) => {
        if (cancelled) return;
        setRows(
          data.map((d) => ({
            id: d.id,
            poNumber: d.poNumber,
            sku: d.sku,
            orderedQty: d.orderedQty ?? 0,
            paidKg: d.paidWeightKg,
            receivedKg: d.receivedWeightKg,
            varianceKg: d.varianceKg,
            status: d.status,
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

  const comparisonRows: ThreeWayMatchRow[] = rows.map((row) => ({
    id: row.id,
    reference: row.poNumber,
    sku: row.sku,
    poKg: row.paidKg,
    paidKg: row.paidKg,
    receivedKg: row.receivedKg,
    varianceKg: row.varianceKg,
    status: row.status,
  }));

  return (
    <PageShell>
      <PageHeader
        title="Procurement Review"
        description="Finance review of PO vs cash disbursement vs received weight."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Procurement Review" }]}
        sticky
        showCommandHint
        actions={
          <Button asChild>
            <Link href="/purchasing/cash-weight-audit">Open Cash-to-Weight Audit</Link>
          </Button>
        }
      />
      <div className="p-6">
        <div className="mb-6 grid gap-6 xl:grid-cols-2">
          <ProcurementVariancePanel
            poWeightKg={rows.reduce((a, r) => a + r.orderedQty, 0)}
            paidWeightKg={rows.reduce((a, r) => a + (r.paidKg ?? 0), 0)}
            receivedWeightKg={rows.reduce((a, r) => a + (r.receivedKg ?? 0), 0)}
          />
          <LiveCurrencyConverterCard />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Three-way control</CardTitle>
            <CardDescription>Exception-focused finance review for cash-heavy sourcing.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading review rows…</div>
            ) : (
              <ThreeWayMatchComparisonTable
                rows={comparisonRows}
                title="Three-way control"
                description="PO, paid, and received quantities in one finance review grid."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

