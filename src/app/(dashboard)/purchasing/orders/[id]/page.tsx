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
import { fetchLandedCostAllocation, type ExistingLandedCostAllocation } from "@/lib/api/landed-cost";
import { fetchCashWeightAuditLines, fetchCashDisbursements, buildCashWeightAudit, fetchSubcontractOrders } from "@/lib/api/cool-catch";
import { BatchLandedCostCard } from "@/components/operational/BatchLandedCostCard";
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
  const [otherCostsAlloc, setOtherCostsAlloc] = React.useState<ExistingLandedCostAllocation | null>(null);
  const [otherCostsLoading, setOtherCostsLoading] = React.useState(false);

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

  const linkedGrnIdsKey = order?.linkedGrns?.map((g) => g.id).join(",") ?? "";

  React.useEffect(() => {
    if (!order?.linkedGrns?.length) {
      setOtherCostsAlloc(null);
      setOtherCostsLoading(false);
      return;
    }
    const grns = order.linkedGrns;
    const preferred =
      grns.find((g) => ["POSTED", "RECEIVED", "CONVERTED"].includes(String(g.status).toUpperCase())) ?? grns[0];
    let cancelled = false;
    setOtherCostsLoading(true);
    fetchLandedCostAllocation(preferred.id)
      .then((alloc) => {
        if (!cancelled) setOtherCostsAlloc(alloc);
      })
      .catch(() => {
        if (!cancelled) setOtherCostsAlloc(null);
      })
      .finally(() => {
        if (!cancelled) setOtherCostsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [linkedGrnIdsKey]);

  const receiptMap = React.useMemo(() => {
    const m = new Map<string, { receivedQty: number; receivedWeightKg: number; receivedValue: number }>();
    for (const r of order?.lineReceipts ?? []) {
      m.set(r.poLineId, {
        receivedQty: r.receivedQty,
        receivedWeightKg: r.receivedWeightKg,
        receivedValue: r.receivedValue,
      });
    }
    return m;
  }, [order?.lineReceipts]);

  const hasOpenReceiptQty = React.useMemo(() => {
    if (!order) return true;
    // When lineReceipts are populated (GRN lines had sourceLineId), use per-line comparison.
    if ((order.lineReceipts?.length ?? 0) > 0) {
      return order.lines.some((line) => {
        const rec = receiptMap.get(line.id);
        return line.qty > (rec?.receivedQty ?? 0) + 1e-9;
      });
    }
    // Fallback: if all linked GRNs are in a terminal state AND received value >= PO total, treat as fully received.
    const grns = order.linkedGrns ?? [];
    if (grns.length === 0) return true;
    const allTerminal = grns.every((g) =>
      ["POSTED", "RECEIVED", "CONVERTED"].includes(String(g.status).toUpperCase())
    );
    const receivedValue = order.receivedTotals?.value ?? 0;
    if (allTerminal && receivedValue >= (order.total ?? 0) - 1) return false;
    return true;
  }, [order, receiptMap]);

  const totalReceivedWeightFromGrns = React.useMemo(() => {
    // Prefer the broader aggregate (all GRN lines, no sourceLineId requirement).
    if ((order?.receivedTotals?.weightKg ?? 0) > 0) return order!.receivedTotals!.weightKg;
    if ((order?.receivedTotals?.qty ?? 0) > 0) return order!.receivedTotals!.qty;
    return (order?.lineReceipts ?? []).reduce((a, r) => a + (r.receivedWeightKg ?? 0), 0);
  }, [order?.receivedTotals, order?.lineReceipts]);

  const COST_CENTRE_LABELS: Record<string, string> = {
    currency_conversion: "Currency conversion",
    permits: "Permits & customs",
    inbound_logistics: "Inbound logistics",
    other: "Other charges",
  };

  const otherCostsPanelLines = React.useMemo(() => {
    if (!order) return [];
    const estimate = [
      { label: "Purchase value", amount: order.total ?? 0 },
      { label: "Permits & customs (estimate)", amount: (order.total ?? 0) * 0.04 },
      { label: "Inbound logistics (estimate)", amount: (order.total ?? 0) * 0.06 },
    ];
    if (otherCostsAlloc?.lines?.length) {
      return otherCostsAlloc.lines.map((l, i) => {
        // Resolution order: template name → human cost-centre label → fallback
        const base = l.templateName
          || COST_CENTRE_LABELS[l.costCentre ?? ""]
          || `Charge ${i + 1}`;
        const label = l.reference ? `${base} — ${l.reference}` : base;
        return { label, amount: typeof l.amount === "number" ? l.amount : 0 };
      });
    }
    if (otherCostsAlloc?.costCentreSummary && Object.keys(otherCostsAlloc.costCentreSummary).length > 0) {
      return Object.entries(otherCostsAlloc.costCentreSummary).map(([k, v]) => ({
        label: COST_CENTRE_LABELS[k] ?? k,
        amount: v.originalAmount ?? 0,
      }));
    }
    return estimate;
  }, [order, otherCostsAlloc]);

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
    const hasReceiptFromGrn =
      totalReceivedWeightFromGrns > 0 ||
      (order.lineReceipts?.some((r) => r.receivedQty > 0 || r.receivedValue > 0) ?? false);
    const isReceived = receivedWeight > 0 || hasReceiptFromGrn;

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
        detail: isReceived
          ? (() => {
              const kg = Math.max(receivedWeight, totalReceivedWeightFromGrns);
              const val = order.receivedTotals?.value;
              if (kg > 0) return `${kg.toLocaleString()} kg received`;
              if (val && val > 0) return `${formatMoney(val, order.currency)} received`;
              return `${order.linkedGrns?.length ?? 0} GRN(s) recorded`;
            })()
          : "Awaiting receiving",
        links: (order.linkedGrns ?? []).map((g) => ({
          label: g.number,
          href: `/docs/grn/${g.id}`,
          badge: g.status,
        })),
        href: order.linkedGrns?.[0]?.id ? `/docs/grn/${order.linkedGrns[0].id}` : `/docs/grn/new?poId=${id}`,
        actionLabel:
          receivedStatus === "current" && !order.linkedGrns?.length ? "Create GRN" : undefined,
      },
      {
        id: "bill",
        label: "Supplier bill",
        status: (() => {
          const bills = order.linkedBills ?? [];
          if (bills.some((b) => ["POSTED", "APPROVED", "CONVERTED"].includes(String(b.status).toUpperCase()))) return "completed" as const;
          if (bills.length > 0) return "current" as const;
          if (isReceived) return "current" as const;
          return "upcoming" as const;
        })(),
        detail: (() => {
          const bills = order.linkedBills ?? [];
          if (bills.length > 0) return `${bills.length} bill(s) linked`;
          return isReceived ? "Match supplier invoice" : "Awaiting receiving";
        })(),
        links: (order.linkedBills ?? []).map((b) => ({
          label: b.number,
          href: `/docs/bill/${b.id}`,
          badge: b.status,
        })),
        href: (order.linkedBills ?? []).length === 0 ? `/docs/bill/new?poId=${id}` : undefined,
        actionLabel: (order.linkedBills ?? []).length === 0 && isReceived ? "Create bill" : undefined,
      },
    ];
  }, [
    order,
    id,
    poCreatedTimestamp,
    disbursementCount,
    receivedWeight,
    totalReceivedWeightFromGrns,
  ]);

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
  const linkedGrns = order.linkedGrns ?? [];
  const costSourceGrn =
    linkedGrns.find((g) =>
      ["POSTED", "RECEIVED", "CONVERTED"].includes(String(g.status).toUpperCase())
    ) ?? linkedGrns[0];

  const showPrimaryCreateGrn =
    order.status === "APPROVED" && (linkedGrns.length === 0 || hasOpenReceiptQty);
  const showBillFromReceipts =
    order.status === "APPROVED" && !hasOpenReceiptQty && linkedGrns.length > 0;

  const lineColumns = [
    { id: "sku", header: "SKU", accessor: (r: (typeof order.lines)[number]) => r.sku, sticky: true },
    { id: "product", header: "Product", accessor: (r: (typeof order.lines)[number]) => r.productName },
    { id: "qty", header: "Ordered qty", accessor: (r: (typeof order.lines)[number]) => `${r.qty} ${r.uom}` },
    { id: "rate", header: "Rate", accessor: (r: (typeof order.lines)[number]) => formatMoney(r.rate, order.currency) },
    { id: "total", header: "Ordered total", accessor: (r: (typeof order.lines)[number]) => formatMoney(r.total, order.currency) },
    {
      id: "recvQty",
      header: "Received qty",
      accessor: (r: (typeof order.lines)[number]) => {
        const rec = receiptMap.get(r.id);
        return rec && rec.receivedQty > 0 ? `${rec.receivedQty.toLocaleString()} ${r.uom}` : "—";
      },
    },
    {
      id: "recvKg",
      header: "Received kg",
      accessor: (r: (typeof order.lines)[number]) => {
        const rec = receiptMap.get(r.id);
        return rec && rec.receivedWeightKg > 0 ? rec.receivedWeightKg.toLocaleString() : "—";
      },
    },
    {
      id: "recvVal",
      header: "Received value",
      accessor: (r: (typeof order.lines)[number]) => {
        const rec = receiptMap.get(r.id);
        return rec && rec.receivedValue > 0 ? formatMoney(rec.receivedValue, order.currency) : "—";
      },
    },
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
              <>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/docs/purchase-order/${id}`}>
                    <Icons.Pencil className="mr-2 h-4 w-4" />
                    Edit PO
                  </Link>
                </Button>
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
              </>
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
            {showPrimaryCreateGrn && (
              <Button size="sm" asChild>
                <Link href={`/docs/grn/new?poId=${id}`}>
                  <Icons.PackagePlus className="mr-2 h-4 w-4" />
                  {linkedGrns.length > 0 ? "Receive remaining (GRN)" : "Create GRN"}
                </Link>
              </Button>
            )}
            {showBillFromReceipts && (
              <Button size="sm" variant="default" asChild>
                <Link href={`/docs/bill/new?poId=${id}`}>
                  <Icons.FileText className="mr-2 h-4 w-4" />
                  Create bill
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
      <div className="mx-auto max-w-[1536px] min-w-0 space-y-6 px-1 pb-8 sm:px-0">
        {order.status === "DRAFT" && (
          <Card className="border-amber-300/60 bg-amber-50/60 dark:bg-amber-950/20">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  This PO is a draft — edit the lines then submit for approval before creating a GRN.
                </span>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/docs/purchase-order/${id}`}>
                    <Icons.Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit PO
                  </Link>
                </Button>
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

        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(260px,min(100%,340px))] xl:gap-8 xl:items-start">
          <div className="min-w-0 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Purchase Order Summary</CardTitle>
                <CardDescription>Cross-border procurement context for Kenya/Uganda sourcing.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
                <div className="min-w-0">
                  <div className="text-muted-foreground">Supplier</div>
                  <div className="font-medium break-words">{order.supplier}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-muted-foreground">Status</div>
                  <StatusBadge status={order.status} />
                </div>
                <div className="min-w-0">
                  <div className="text-muted-foreground">Currency</div>
                  <div className="font-medium tabular-nums">{order.currency} @ {order.fxRate}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-muted-foreground">Total</div>
                  <div className="font-medium tabular-nums">{formatMoney(order.total ?? 0, order.currency)}</div>
                </div>
              </CardContent>
            </Card>

            <ProcurementVariancePanel
              poWeightKg={orderedWeight}
              paidWeightKg={paidWeight}
              receivedWeightKg={receivedWeight}
            />

            {linkedGrns.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Goods receipts (GRN)</CardTitle>
                  <CardDescription>Receipts recorded against this purchase order.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {linkedGrns.map((g) => {
                      const bill = (order.linkedBills ?? []).find((b) => b.grnId === g.id);
                      return (
                        <li
                          key={g.id}
                          className="grid grid-cols-1 gap-2 border-b border-border/60 pb-3 last:border-0 last:pb-0 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center sm:gap-x-3"
                        >
                          <Link
                            href={`/docs/grn/${g.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {g.number}
                          </Link>
                          <StatusBadge status={g.status} />
                          <span className="text-muted-foreground text-sm">{g.date}</span>
                          <span className="text-sm tabular-nums">{formatMoney(g.total, order.currency)}</span>
                          {bill && (
                            <Link
                              href={`/docs/bill/${bill.id}`}
                              className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium text-primary hover:bg-muted/60 transition-colors"
                            >
                              <Icons.FileText className="h-3 w-3" />
                              {bill.number}
                              <StatusBadge status={bill.status} className="ml-0.5 text-[10px]" />
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            )}

            {(order.linkedBills ?? []).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Linked supplier bills</CardTitle>
                  <CardDescription>Bills created from goods receipts on this PO. Match against supplier invoices.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {(order.linkedBills ?? []).map((b) => (
                      <li
                        key={b.id}
                        className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2 last:border-0 last:pb-0"
                      >
                        <Link href={`/docs/bill/${b.id}`} className="font-medium text-primary hover:underline">
                          {b.number}
                        </Link>
                        <StatusBadge status={b.status} />
                        <span className="text-muted-foreground text-sm">from {b.grnNumber}</span>
                        <Button size="sm" variant="ghost" asChild>
                          <Link href={`/ap/three-way-match?billId=${b.id}`}>
                            <Icons.GitCompare className="mr-1 h-3.5 w-3.5" />
                            3-way match
                          </Link>
                        </Button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Purchase vs received (lines)</CardTitle>
                <CardDescription>Ordered from the PO; received totals come from linked GRN lines.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable<(typeof order.lines)[number]> data={order.lines} columns={lineColumns} emptyMessage="No PO lines." />
              </CardContent>
            </Card>

            {otherCostsLoading ? (
              <Card>
                <CardHeader>
                  <CardTitle>Other costs</CardTitle>
                  <CardDescription>Loading allocation from GRN…</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">Please wait.</CardContent>
              </Card>
            ) : (
              <CostImpactPanel
                title={otherCostsAlloc ? "Other costs" : "Other costs (estimate)"}
                cardDescription={
                  otherCostsAlloc && costSourceGrn
                    ? `Actual charges allocated on GRN ${costSourceGrn.number}. Manage in Inventory → Costing.`
                    : linkedGrns.length
                      ? "No other-cost allocation on the GRN yet. Add charges in Inventory → Costing, or use estimates below until posted."
                      : "Estimated add-ons before goods are received. Replace with actual other costs after GRN allocation."
                }
                currency={order.currency}
                quantityKg={orderedWeight}
                lines={otherCostsPanelLines}
              />
            )}

            {linkedGrns.length > 0 && costSourceGrn && (
              <BatchLandedCostCard
                grnId={costSourceGrn.id}
                grnNumber={costSourceGrn.number}
                costingHref={`/inventory/costing?grnId=${costSourceGrn.id}`}
              />
            )}

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

          <div className="min-w-0 space-y-6 xl:sticky xl:top-[4.5rem]">
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

