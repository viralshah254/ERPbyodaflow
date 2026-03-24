"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
import { fetchPurchaseOrderById, approvePurchaseOrders } from "@/lib/api/purchasing";
import { requestDocumentApprovalApi } from "@/lib/api/documents";
import { fetchCashWeightAuditLines, fetchCashDisbursements, buildCashWeightAudit, fetchSubcontractOrders } from "@/lib/api/cool-catch";
import type { SubcontractOrderRow } from "@/lib/api/cool-catch";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = String(params?.id ?? "");
  const [runningAudit, setRunningAudit] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [order, setOrder] = React.useState<Awaited<ReturnType<typeof fetchPurchaseOrderById>>>(null);
  const [loading, setLoading] = React.useState(true);
  const [paidWeight, setPaidWeight] = React.useState(0);
  const [receivedWeight, setReceivedWeight] = React.useState(0);
  const [disbursementCount, setDisbursementCount] = React.useState(0);
  const [relatedScos, setRelatedScos] = React.useState<SubcontractOrderRow[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchPurchaseOrderById(id), fetchCashWeightAuditLines(), fetchCashDisbursements(id), fetchSubcontractOrders({ purchaseOrderId: id }).catch(() => [])])
      .then(([po, audit, disbursements, scos]) => {
        if (cancelled) return;
        setOrder(po);
        const matchingAudit = audit.filter((line) => line.poId === id || line.poNumber === po?.number);
        setPaidWeight(matchingAudit.reduce((a, line) => a + (line.paidWeightKg ?? 0), 0));
        setReceivedWeight(matchingAudit.reduce((a, line) => a + (line.receivedWeightKg ?? 0), 0));
        setDisbursementCount(Array.isArray(disbursements) ? disbursements.length : 0);
        setRelatedScos(Array.isArray(scos) ? scos : []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const poCreatedTimestamp = React.useMemo(() => {
    if (!order?.date) return undefined;
    const d = new Date(order.date);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }, [order?.date]);

  // Derive first-incomplete step to mark as "current"
  const lifecycleSteps = React.useMemo(() => {
    if (!order) return [];
    const isApproved = order.status === "APPROVED" || order.status === "RECEIVED";
    const isPendingApproval = order.status === "PENDING_APPROVAL";
    const isPaid = disbursementCount > 0;
    const isReceived = receivedWeight > 0;

    type StepStatus = "completed" | "current" | "upcoming";

    function deriveStatus(
      isDone: boolean,
      prevDone: boolean,
      forceCurrentIfPending?: boolean,
    ): StepStatus {
      if (isDone) return "completed";
      if (forceCurrentIfPending) return "current";
      if (prevDone) return "current";
      return "upcoming";
    }

    const approvedStatus: StepStatus = isApproved
      ? "completed"
      : isPendingApproval
        ? "current"
        : isApproved || isPendingApproval
          ? "current"
          : "upcoming";

    const paidStatus = deriveStatus(isPaid, isApproved);
    const receivedStatus = deriveStatus(isReceived, isPaid);

    const approvalHref =
      !isApproved ? `/docs/purchase-order/${id}` : undefined;

    return [
      {
        id: "draft",
        label: "PO created",
        status: "completed" as StepStatus,
        timestamp: poCreatedTimestamp,
        href: `/docs/purchase-order/${id}`,
      },
      {
        id: "approved",
        label: "Approved / funded",
        status: approvedStatus,
        href: approvalHref,
        actionLabel: isPendingApproval ? "Review approval" : !isApproved ? "Submit for approval" : undefined,
      },
      {
        id: "paid",
        label: "Cash disbursement",
        status: paidStatus,
        detail: isPaid ? `${disbursementCount} disbursement(s) recorded` : "Awaiting disbursement",
        href: `/purchasing/cash-weight-audit?poId=${id}&openDisbursement=1`,
        actionLabel: paidStatus === "current" ? "Record disbursement" : undefined,
      },
      {
        id: "received",
        label: "Receipt / GRN",
        status: receivedStatus,
        detail: isReceived ? `${receivedWeight} kg received` : "Awaiting receiving",
        href: `/docs/grn/new?poId=${id}`,
        actionLabel: receivedStatus === "current" ? "Create GRN" : undefined,
      },
    ];
  }, [order, id, poCreatedTimestamp, disbursementCount, receivedWeight]);

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
          <div className="flex gap-2 flex-wrap">
            {order.status === "DRAFT" && (
              <Button
                size="sm"
                disabled={actionLoading}
                onClick={async () => {
                  setActionLoading(true);
                  try {
                    await requestDocumentApprovalApi("purchase-order", id);
                    toast.success("Submitted for approval.");
                    const refreshed = await fetchPurchaseOrderById(id);
                    setOrder(refreshed);
                  } catch {
                    toast.error("Failed to submit for approval.");
                  } finally {
                    setActionLoading(false);
                  }
                }}
              >
                {actionLoading ? <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icons.Send className="mr-2 h-4 w-4" />}
                Submit for approval
              </Button>
            )}
            {order.status === "PENDING_APPROVAL" && (
              <Button
                size="sm"
                disabled={actionLoading}
                onClick={async () => {
                  setActionLoading(true);
                  try {
                    await approvePurchaseOrders([id]);
                    toast.success("Purchase order approved.");
                    const refreshed = await fetchPurchaseOrderById(id);
                    setOrder(refreshed);
                  } catch {
                    toast.error("Failed to approve.");
                  } finally {
                    setActionLoading(false);
                  }
                }}
              >
                {actionLoading ? <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icons.CheckCircle className="mr-2 h-4 w-4" />}
                Approve
              </Button>
            )}
            {order.status === "APPROVED" && (
              <Button size="sm" asChild>
                <Link href={`/docs/grn/new?poId=${id}`}>
                  <Icons.PackagePlus className="mr-2 h-4 w-4" />
                  Create GRN
                </Link>
              </Button>
            )}
            {(order.status === "APPROVED" || order.status === "RECEIVED") && (
              <Button
                variant="outline"
                size="sm"
                disabled={runningAudit}
                onClick={async () => {
                  setRunningAudit(true);
                  try {
                    const result = await buildCashWeightAudit({ poId: id });
                    toast.success(result.built > 0 ? `${result.built} audit line(s) built.` : "Audit lines already up to date.");
                    router.push(`/purchasing/cash-weight-audit?poId=${id}`);
                  } catch {
                    toast.error("Failed to build audit. Navigate manually.");
                    router.push(`/purchasing/cash-weight-audit?poId=${id}`);
                  } finally {
                    setRunningAudit(false);
                  }
                }}
              >
                {runningAudit ? <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icons.BarChart2 className="mr-2 h-4 w-4" />}
                3-way audit
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/inventory/receipts">GRN queue</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        {order.status === "DRAFT" && (
          <Card className="border-amber-300/60 bg-amber-50/60 dark:bg-amber-950/20">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  This PO is a draft — submit it for approval before creating a GRN.
                </span>
                <Button
                  size="sm"
                  variant="default"
                  disabled={actionLoading}
                  onClick={async () => {
                    setActionLoading(true);
                    try {
                      await requestDocumentApprovalApi("purchase-order", id);
                      toast.success("Submitted for approval.");
                      const refreshed = await fetchPurchaseOrderById(id);
                      setOrder(refreshed);
                    } catch {
                      toast.error("Failed to submit for approval.");
                    } finally {
                      setActionLoading(false);
                    }
                  }}
                >
                  {actionLoading ? <Icons.Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Icons.Send className="mr-1.5 h-3.5 w-3.5" />}
                  Submit for approval
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {order.status === "PENDING_APPROVAL" && (
          <Card className="border-blue-300/60 bg-blue-50/60 dark:bg-blue-950/20">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                  This PO is awaiting approval.
                </span>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/approvals/inbox">
                    <Icons.Inbox className="mr-1.5 h-3.5 w-3.5" />
                    Check approvals inbox
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {order.status === "RECEIVED" && (
          <Card className="border-emerald-300/60 bg-emerald-50/60 dark:bg-emerald-950/20">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  All goods received for this PO — next: create and post the supplier bill.
                </span>
                <Button size="sm" variant="default" asChild>
                  <Link href={`/docs/bill/new?poId=${id}`}>
                    <Icons.FileText className="mr-1.5 h-3.5 w-3.5" />
                    Create bill from PO
                  </Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/ap/three-way-match">
                    <Icons.GitCompare className="mr-1.5 h-3.5 w-3.5" />
                    View 3-way match
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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

            {relatedScos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Related Subcontract Orders</CardTitle>
                  <CardDescription>{relatedScos.length} subcontract order{relatedScos.length !== 1 ? "s" : ""} linked to this PO</CardDescription>
                </CardHeader>
                <CardContent className="divide-y p-0 text-sm">
                  {relatedScos.map((sco) => (
                    <Link
                      key={sco.id}
                      href={`/manufacturing/subcontracting/orders/${sco.id}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium">{sco.number}</p>
                        <p className="text-xs text-muted-foreground">
                          {sco.workCenterName}
                          {sco.species ? ` · ${sco.species === "TILAPIA" ? "Tilapia" : "Nile Perch"}` : ""}
                          {sco.processType ? ` · ${sco.processType}` : ""}
                        </p>
                      </div>
                      <Badge variant={sco.status === "RECEIVED" ? "default" : sco.status === "WIP" ? "secondary" : "outline"}>
                        {sco.status}
                      </Badge>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <BatchStatusTimeline
              title="Procurement Lifecycle"
              steps={lifecycleSteps}
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

