"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { ActivityPanel } from "@/components/shared/ActivityPanel";
import { BatchStatusTimeline } from "@/components/operational/BatchStatusTimeline";
import { CostImpactPanel } from "@/components/operational/CostImpactPanel";
import { ProcurementVariancePanel } from "@/components/operational/ProcurementVariancePanel";
import { LiveCurrencyConverterCard } from "@/components/operational/LiveCurrencyConverterCard";
import { fetchPurchaseOrderById } from "@/lib/api/purchasing";
import { fetchCashWeightAuditLines, fetchCashDisbursements } from "@/lib/api/cool-catch";
import { formatMoney } from "@/lib/money";

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id ?? "");
  const [order, setOrder] = React.useState<Awaited<ReturnType<typeof fetchPurchaseOrderById>>>(null);
  const [loading, setLoading] = React.useState(true);
  const [paidWeight, setPaidWeight] = React.useState(0);
  const [receivedWeight, setReceivedWeight] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchPurchaseOrderById(id), fetchCashWeightAuditLines(), fetchCashDisbursements(id)])
      .then(([po, audit]) => {
        if (cancelled) return;
        setOrder(po);
        const matchingAudit = audit.filter((line) => line.poId === id || line.poNumber === po?.number);
        setPaidWeight(matchingAudit.reduce((a, line) => a + (line.paidWeightKg ?? 0), 0));
        setReceivedWeight(matchingAudit.reduce((a, line) => a + (line.receivedWeightKg ?? 0), 0));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading && !order) {
    return (
      <PageShell>
        <PageHeader title="Purchase Order" breadcrumbs={[{ label: "Purchasing", href: "/purchasing/orders" }, { label: id }]} />
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      </PageShell>
    );
  }

  if (!order) {
    return (
      <PageShell>
        <PageHeader title="PO not found" breadcrumbs={[{ label: "Purchasing", href: "/purchasing/orders" }, { label: id }]} />
        <div className="p-6">
          <p className="text-sm text-muted-foreground">Purchase order not found.</p>
        </div>
      </PageShell>
    );
  }

  const orderedWeight = order.lines.reduce((a, line) => a + line.qty, 0);
  const lineColumns = [
    { id: "sku", header: "SKU", accessor: (r: (typeof order.lines)[number]) => r.sku, sticky: true },
    { id: "product", header: "Product", accessor: (r: (typeof order.lines)[number]) => r.productName },
    { id: "qty", header: "Qty", accessor: (r: (typeof order.lines)[number]) => `${r.qty} ${r.uom}` },
    { id: "rate", header: "Rate", accessor: (r: (typeof order.lines)[number]) => formatMoney(r.rate, order.currency) },
    { id: "total", header: "Total", accessor: (r: (typeof order.lines)[number]) => formatMoney(r.total, order.currency) },
  ];

  return (
    <PageShell>
      <PageHeader
        title={order.number}
        description={`${order.country} · ${order.region} · ${order.cashMode}`}
        breadcrumbs={[
          { label: "Purchasing", href: "/purchasing/orders" },
          { label: order.number },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/purchasing/cash-weight-audit">Cash-to-Weight Audit</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/inventory/receipts">Open GRNs</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Purchase Order Summary</CardTitle>
                <CardDescription>Cross-border procurement context for Kenya/Uganda sourcing.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 text-sm md:grid-cols-4">
                <div><div className="text-muted-foreground">Supplier</div><div className="font-medium">{order.supplier}</div></div>
                <div><div className="text-muted-foreground">Status</div><StatusBadge status={order.status} /></div>
                <div><div className="text-muted-foreground">Currency</div><div className="font-medium">{order.currency} @ {order.fxRate}</div></div>
                <div><div className="text-muted-foreground">Total</div><div className="font-medium">{formatMoney(order.total ?? 0, order.currency)}</div></div>
              </CardContent>
            </Card>

            <ProcurementVariancePanel
              poWeightKg={orderedWeight}
              paidWeightKg={paidWeight}
              receivedWeightKg={receivedWeight}
            />

            <Card>
              <CardHeader>
                <CardTitle>Purchase Lines</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable<(typeof order.lines)[number]> data={order.lines} columns={lineColumns} emptyMessage="No PO lines." />
              </CardContent>
            </Card>

            <CostImpactPanel
              title="Landed Cost Preview"
              currency={order.currency}
              quantityKg={orderedWeight}
              lines={[
                { label: "Purchase value", amount: order.total ?? 0 },
                { label: "Border / permit estimate", amount: (order.total ?? 0) * 0.04 },
                { label: "Inbound logistics estimate", amount: (order.total ?? 0) * 0.06 },
              ]}
            />
          </div>

          <div className="space-y-6">
            <BatchStatusTimeline
              title="Procurement Lifecycle"
              steps={[
                { id: "draft", label: "PO created", status: "completed", timestamp: `${order.date}T08:00:00Z` },
                { id: "approved", label: "Approved / funded", status: order.status !== "PENDING_APPROVAL" ? "completed" : "current" },
                { id: "paid", label: "Cash disbursement", status: paidWeight > 0 ? "completed" : "upcoming", detail: paidWeight > 0 ? `${paidWeight} kg paid` : "Awaiting disbursement" },
                { id: "received", label: "Receipt / GRN", status: receivedWeight > 0 ? "completed" : "upcoming", detail: receivedWeight > 0 ? `${receivedWeight} kg received` : "Awaiting receiving" },
              ]}
            />
            <LiveCurrencyConverterCard />
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Activity</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ActivityPanel
                  auditEntries={[
                    { id: "1", action: "PO created", user: "Procurement Manager", timestamp: order.date, detail: `${order.number} for ${order.supplier}` },
                    { id: "2", action: "Approval status checked", user: "Finance", timestamp: new Date().toISOString(), detail: `Current status ${order.status}` },
                  ]}
                  comments={[
                    { id: "c1", user: "Ops", text: "Cross-border permit cost should be attached before final receipt.", timestamp: new Date().toLocaleString() },
                  ]}
                  attachments={[
                    { id: "a1", name: "supplier-quote.pdf", type: "pdf", size: "244 KB", uploadedBy: "Procurement", uploadedAt: order.date },
                  ]}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

