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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DocumentDetailHeader, DocumentNumberField } from "@/components/docs/document-detail-header";
import { ActivityPanel } from "@/components/shared/ActivityPanel";
import { BatchStatusTimeline } from "@/components/operational/BatchStatusTimeline";
import { YieldBreakdownCard } from "@/components/operational/YieldBreakdownCard";
import { DeferredSection } from "@/components/ui/deferred-section";
import { Skeleton, SkeletonCard, SkeletonDataTable } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";
import { fetchSubcontractOrderById, fetchSubcontractCostingDrilldown, dispatchSubcontractOrder, patchSubcontractOrder, fetchSubcontractBatchCost, type SubcontractBatchCost } from "@/lib/api/cool-catch";
import { fetchDistributionVehicles, type DistributionVehicleRow } from "@/lib/api/logistics";
import { apiRequest } from "@/lib/api/client";
import { NewTripSheet } from "@/app/(dashboard)/distribution/trips/new-trip-sheet";
import { fetchAuditLogs } from "@/lib/api/audit-log";
import { fetchYieldRecords } from "@/lib/api/yield";
import { BatchLandedCostCard } from "@/components/operational/BatchLandedCostCard";
import type { SubcontractOrderLineRow } from "@/lib/mock/manufacturing/subcontracting";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import { manufacturingAreaLabel } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";

function SubcontractOrderDetailSkeleton() {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_17.5rem]">
      <div className="space-y-4 min-w-0">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4 animate-pulse space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-32" />
            </div>
          ))}
        </div>
        <SkeletonDataTable
          rows={3}
          columnWidths={["w-16", "w-40", "w-20", "w-20", "w-28", "w-20", "w-20", "w-24"]}
        />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="space-y-4 min-w-0">
        <Skeleton className="h-56 w-full rounded-xl" />
        <SkeletonCard />
      </div>
    </div>
  );
}

function ReceiveWeightRow({
  line,
  lineIndex,
  editable,
  lineActualKg,
  setLineActualKg,
}: {
  line: SubcontractOrderLineRow;
  lineIndex: number;
  editable: boolean;
  lineActualKg: string[];
  setLineActualKg: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const planned = line.plannedQuantity ?? line.quantity;
  const pack = line.packSizeKg != null && line.packSizeKg > 0 ? line.packSizeKg : null;
  const rawKg = Number.parseFloat(lineActualKg[lineIndex] ?? "") || 0;
  const boxes = pack != null ? Math.floor(Math.max(0, rawKg) / pack) : 0;
  const remainder = pack != null ? Math.round((rawKg - boxes * pack) * 100) / 100 : 0;

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Label className="text-xs font-medium text-foreground">{line.productName}</Label>
        <span className="text-xs text-muted-foreground">
          Planned: {planned.toLocaleString()} kg
        </span>
      </div>
      {editable ? (
        <Input
          type="number"
          min={0}
          step="0.01"
          value={lineActualKg[lineIndex] ?? ""}
          onChange={(e) => {
            const next = [...lineActualKg];
            next[lineIndex] = e.target.value;
            setLineActualKg(next);
          }}
        />
      ) : (
        <Input
          type="number"
          readOnly
          tabIndex={-1}
          className="bg-muted/50 text-muted-foreground"
          value={lineActualKg[lineIndex] ?? String(planned)}
        />
      )}
      {editable && pack != null ? (
        <p className="text-xs text-muted-foreground">
          → {boxes.toLocaleString()} {boxes === 1 ? "box" : "boxes"}
          {remainder > 0.001
            ? ` (${remainder.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg remainder)`
            : ""}
        </p>
      ) : null}
    </div>
  );
}

export default function SubcontractOrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const terminology = useTerminology();
  const areaLabel = manufacturingAreaLabel(terminology);
  const [order, setOrder] = React.useState<Awaited<ReturnType<typeof fetchSubcontractOrderById>>>(null);
  const [loading, setLoading] = React.useState(true);
  const [sidebarLoading, setSidebarLoading] = React.useState(false);
  const [analyticsLoading, setAnalyticsLoading] = React.useState(false);
  const analyticsRequested = React.useRef(false);
  const [dispatching, setDispatching] = React.useState(false);
  const [drilldown, setDrilldown] = React.useState<Awaited<ReturnType<typeof fetchSubcontractCostingDrilldown>>>(null);
  const [batchCost, setBatchCost] = React.useState<SubcontractBatchCost | null>(null);
  const [auditEntries, setAuditEntries] = React.useState<Array<{ id: string; action: string; user: string; timestamp: string; detail?: string }>>([]);
  const [yieldRecords, setYieldRecords] = React.useState<Awaited<ReturnType<typeof fetchYieldRecords>>>([]);
  // Trip-link state
  const [vehicles, setVehicles] = React.useState<DistributionVehicleRow[]>([]);
  const [availableTrips, setAvailableTrips] = React.useState<Array<{ id: string; reference?: string; status: string }>>([]);
  const [linkingTrip, setLinkingTrip] = React.useState(false);
  const [tripSelectValue, setTripSelectValue] = React.useState<string>("");
  const [newTripSheetOpen, setNewTripSheetOpen] = React.useState(false);

  /** Core order + lines — one GET; drives KPI tiles, yield, and lines table. */
  const loadCore = React.useCallback(async () => {
    const r = await fetchSubcontractOrderById(id);
    setOrder(r);
    return r;
  }, [id]);

  const loadSidebar = React.useCallback(async () => {
    setSidebarLoading(true);
    try {
      const [logs, yields] = await Promise.allSettled([
        fetchAuditLogs({ sourceType: "subcontract-order", sourceId: id }),
        fetchYieldRecords({ subcontractOrderId: id }),
      ]);
      if (logs.status === "fulfilled") {
        setAuditEntries((logs.value ?? []).map((e: Record<string, unknown>) => ({
          id: String(e.id ?? e._id ?? Math.random()),
          action: String(e.what ?? e.action ?? e.event ?? "Action"),
          user: String(e.who ?? e.actorName ?? e.actor ?? "System"),
          timestamp: e.when
            ? new Date(String(e.when)).toLocaleString()
            : e.createdAt
              ? new Date(String(e.createdAt)).toLocaleString()
              : "",
          detail: String(e.detail ?? e.description ?? ""),
        })));
      }
      if (yields.status === "fulfilled") setYieldRecords(yields.value);
    } finally {
      setSidebarLoading(false);
    }
  }, [id]);

  const loadAnalytics = React.useCallback(async () => {
    if (analyticsRequested.current) return;
    analyticsRequested.current = true;
    setAnalyticsLoading(true);
    try {
      const [dd, bc] = await Promise.allSettled([
        fetchSubcontractCostingDrilldown(id),
        fetchSubcontractBatchCost(id),
      ]);
      if (dd.status === "fulfilled") setDrilldown(dd.value);
      if (bc.status === "fulfilled") setBatchCost(bc.value);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [id]);

  const reload = React.useCallback(async () => {
    analyticsRequested.current = false;
    await loadCore();
    void loadSidebar();
    void loadAnalytics();
  }, [loadCore, loadSidebar, loadAnalytics]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setOrder(null);
    analyticsRequested.current = false;
    loadCore()
      .catch(() => toast.error("Failed to load subcontract order."))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, loadCore]);

  React.useEffect(() => {
    if (!order) return;
    void loadSidebar();
  }, [order, loadSidebar]);

  React.useEffect(() => {
    void fetchDistributionVehicles({ active: true }).then(setVehicles).catch(() => {});
    // Fetch PLANNED/IN_TRANSIT OUTBOUND trips for linking
    void apiRequest<{ items: Array<{ id: string; reference?: string; status: string }> }>("/api/distribution/trips", {
      params: { type: "OUTBOUND", status: "IN_TRANSIT,PLANNED" },
    })
      .then((res) => setAvailableTrips(res?.items ?? []))
      .catch(() => {});
  }, []);

  const handleDispatch = async () => {
    if (!order || order.status !== "SENT") return;
    setDispatching(true);
    try {
      await dispatchSubcontractOrder(order.id);
      toast.success("Order marked as In Processing (WIP).");
      await reload();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Dispatch failed");
    } finally {
      setDispatching(false);
    }
  };

  const handleLinkTrip = async () => {
    if (!order || !tripSelectValue) return;
    setLinkingTrip(true);
    try {
      await patchSubcontractOrder(order.id, { outboundTripId: tripSelectValue || null });
      toast.success("Outbound trip linked.");
      await reload();
      fetchSubcontractBatchCost(id).then((r) => { setBatchCost(r); }).catch(() => {});
    } catch (e) {
      toast.error((e as Error)?.message ?? "Could not link trip.");
    } finally {
      setLinkingTrip(false);
    }
  };

  const lineColumns = React.useMemo(
    () => {
      const isReceived = order?.status === "RECEIVED";
      const cols: Array<{
        id: string;
        header: string;
        accessor: (r: SubcontractOrderLineRow) => React.ReactNode;
        sticky?: boolean;
        className?: string;
      }> = [
        {
          id: "type",
          header: "Type",
          accessor: (r) => (
            <span className={
              r.type === "INPUT" ? "text-muted-foreground" :
              r.type === "OUTPUT_PRIMARY" ? "text-green-700 font-medium dark:text-green-400" :
              r.type === "OUTPUT_SECONDARY" ? "text-blue-700 dark:text-blue-400" :
              "text-orange-600"
            }>
              {r.type.replace("OUTPUT_", "").replace("_", " ")}
            </span>
          ),
          sticky: true,
        },
        { id: "product", header: "Product", accessor: (r) => r.productName },
      ];

      const numCell = "text-right tabular-nums whitespace-nowrap";

      // Planned kg column for received orders
      if (isReceived) {
        cols.push({
          id: "planned",
          header: "Planned kg",
          className: numCell,
          accessor: (r) => {
            const planned = r.plannedQuantity ?? r.quantity;
            return r.type === "INPUT" ? `${planned.toLocaleString()} kg` :
              r.type !== "WASTE" ? `${planned.toLocaleString()} kg` : "—";
          },
        });
      }

      cols.push({
        id: "quantity_kg",
        header: isReceived ? "Actual kg" : "Planned kg",
        className: numCell,
        accessor: (r) => {
          const kg = isReceived
            ? (r.quantityKg ?? (r.packSizeKg && r.packSizeKg > 0 ? r.quantity * r.packSizeKg : r.quantity))
            : (r.plannedQuantity ?? r.quantity);
          return `${kg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`;
        },
      });

      cols.push({
        id: "stock_units",
        header: isReceived ? "Stock units" : "Planned units",
        className: "text-right",
        accessor: (r) => {
          if (r.type === "INPUT" || r.type === "WASTE") return "—";
          const packSize = r.packSizeKg;
          if (!packSize || packSize <= 0) return "kg tracked";
          const units = isReceived
            ? (r.stockUnits ?? r.quantity)
            : (r.plannedStockUnits ?? Math.floor((r.plannedQuantity ?? r.quantity) / packSize));
          const uomLabel = r.uom && r.uom !== "KG" ? r.uom : "box";
          return (
            <span className="font-medium">
              {units.toLocaleString()} {units === 1 ? uomLabel : `${uomLabel}es`}
              <span className="text-muted-foreground font-normal"> @ {packSize}kg</span>
            </span>
          );
        },
      });

      // Cost columns for received orders
      if (isReceived) {
        cols.push(
          {
            id: "cost_per_kg",
            header: "Cost/kg",
            className: numCell,
            accessor: (r) => r.costPerKg != null ? formatMoney(r.costPerKg, "KES") : "—",
          },
          {
            id: "cost_per_unit",
            header: "Cost/box",
            className: numCell,
            accessor: (r) =>
              r.costPerStockUnit != null ? formatMoney(r.costPerStockUnit, "KES") :
              r.packSizeKg == null && r.costPerKg != null ? formatMoney(r.costPerKg, "KES") :
              "—",
          }
        );
      }

      cols.push(
        {
          id: "amount",
          header: isReceived ? "Output cost" : "Fee + packaging",
          className: numCell,
          accessor: (r) => {
            const totalCost = (r as any).totalOutputCost ?? r.amount;
            if (totalCost == null) return "—";
            if (isReceived && (r as any).processingFeeShare != null) {
              const feeShare = (r as any).processingFeeShare ?? 0;
              const packTotal = (r as any).packagingTotal ?? 0;
              const parts = [
                feeShare > 0 ? `Fee: ${formatMoney(feeShare, "KES")}` : null,
                packTotal > 0 ? `Pack: ${formatMoney(packTotal, "KES")}` : null,
              ].filter(Boolean);
              return (
                <span title={parts.join(" + ")} className="tabular-nums">
                  {formatMoney(totalCost, "KES")}
                </span>
              );
            }
            return formatMoney(totalCost, "KES");
          },
        }
      );
      return cols;
    },
    [order?.status]
  );

  if (loading) {
    return (
      <PageShell>
        <PageHeader
          title="Subcontract order"
          breadcrumbs={[
            { label: areaLabel, href: "/manufacturing/subcontracting" },
            { label: "Subcontracting", href: "/manufacturing/subcontracting" },
            { label: "…" },
          ]}
          dense
        />
        <div className="px-4 pb-6 sm:px-6">
          <SubcontractOrderDetailSkeleton />
        </div>
      </PageShell>
    );
  }

  if (!order) {
    return (
      <PageShell>
        <PageHeader title="Order not found" breadcrumbs={[{ label: areaLabel, href: "/manufacturing/subcontracting" }, { label: "Subcontracting" }, { label: id }]} />
        <div className="p-6">
          <p className="text-muted-foreground">Subcontract order not found.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/manufacturing/subcontracting">Back to Subcontracting</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const lines = order.lines ?? [];
  const sumByType = (type: SubcontractOrderLineRow["type"], usePlanned: boolean) =>
    lines
      .filter((l) => l.type === type)
      .reduce((a, l) => {
        if (usePlanned) return a + (l.plannedQuantity ?? l.quantity);
        // For actual: use quantityKg when available (actual kg, not boxes)
        return a + (l.quantityKg ?? (l.packSizeKg && l.packSizeKg > 0 ? l.quantity * l.packSizeKg : l.quantity));
      }, 0);

  const plannedInputQty = sumByType("INPUT", true);
  const plannedPrimaryQty = sumByType("OUTPUT_PRIMARY", true);
  const plannedSecondaryQty = sumByType("OUTPUT_SECONDARY", true);
  const plannedWasteQty = sumByType("WASTE", true);

  const actualInputQty = sumByType("INPUT", false);
  const actualPrimaryQty = sumByType("OUTPUT_PRIMARY", false);
  const actualSecondaryQty = sumByType("OUTPUT_SECONDARY", false);
  const actualWasteQty = sumByType("WASTE", false);

  const feeLines = lines.filter((line) => line.processingFeePerUnit != null);
  const feeTotal = feeLines.reduce((a, line) => a + (line.amount ?? 0), 0);

  const speciesLabel = order.species
    ? order.species === "TILAPIA"
      ? "Tilapia"
      : "Nile Perch"
    : "—";
  const processLabel = order.processType ?? "—";

  return (
    <PageShell>
      <PageHeader
        title={order.number}
        description={`${order.workCenterName ?? "Work center"} · ${order.status}`}
        breadcrumbs={[
          { label: areaLabel, href: "/manufacturing/boms" },
          { label: "Subcontracting", href: "/manufacturing/subcontracting" },
          { label: order.number },
        ]}
        sticky
        dense
        showCommandHint
        actions={
          <div className="flex flex-wrap gap-2">
            {order.status === "SENT" && (
              <Button size="sm" variant="secondary" disabled={dispatching} onClick={handleDispatch}>
                {dispatching ? "Dispatching…" : "Mark as In Processing"}
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/manufacturing/subcontracting">Back to list</Link>
            </Button>
          </div>
        }
      />
      <div className="px-4 pb-6 sm:px-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_17.5rem] xl:items-start">
          <div className="space-y-4 min-w-0">
            <DocumentDetailHeader
              compact
              className="sm:grid-cols-2 lg:grid-cols-4"
              fields={[
                { label: "Work center", value: order.workCenterName ?? "—" },
                {
                  label: "Species / process",
                  value: `${speciesLabel} · ${processLabel}`,
                },
                { label: "BOM", value: order.bomName ?? "—" },
                {
                  label: "Sent / received",
                  value: (
                    <span className="tabular-nums">
                      {order.sentAt ?? "—"} / {order.receivedAt ?? "—"}
                    </span>
                  ),
                },
                {
                  label: "Linked PO",
                  value: order.purchaseOrderId ? (
                    <DocumentNumberField
                      number={order.purchaseOrderNumber ?? order.purchaseOrderId.slice(-12)}
                    />
                  ) : (
                    "—"
                  ),
                  href: order.purchaseOrderId
                    ? `/purchasing/orders/${order.purchaseOrderId}`
                    : undefined,
                },
                {
                  label: "Linked GRN",
                  value: order.grnId ? (
                    <DocumentNumberField number={order.grnNumber ?? order.grnId.slice(-12)} />
                  ) : (
                    "—"
                  ),
                  href: order.grnId ? `/inventory/receipts/${order.grnId}` : undefined,
                },
                ...(order.status === "RECEIVED" && (order.receiveWarehouseName ?? order.receiveWarehouseId)
                  ? [
                      {
                        label: "Received into",
                        value: order.receiveWarehouseName ?? order.receiveWarehouseId ?? "—",
                      },
                    ]
                  : []),
              ]}
            />

            {order.status === "WIP" && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-50/70 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-500/30">
                <p className="font-semibold">Receive from the mobile app</p>
                <p className="mt-0.5 text-xs opacity-80">
                  Goods receipt (weighing outputs, entering actual kg) is done on the mobile app. Open the app → Processing → and tap this order to receive.
                </p>
              </div>
            )}

            {order.status === "WIP" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Outbound trip</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Link the distribution trip that carries finished goods from the processor. Fuel and transport costs are allocated to this batch through the trip.
                  </p>

                  {order.outboundTripId ? (
                    /* ── Trip already linked ── */
                    <div className="flex items-center gap-3 rounded-md border border-primary/25 bg-primary/5 px-3 py-2 text-sm">
                      <span className="font-medium text-primary flex-1">
                        {availableTrips.find((t) => t.id === order.outboundTripId)?.reference ?? order.outboundTripId.slice(-12)}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        disabled={linkingTrip}
                        onClick={() => {
                          void (async () => {
                            setLinkingTrip(true);
                            try {
                              await patchSubcontractOrder(order.id, { outboundTripId: null });
                              toast.success("Trip unlinked.");
                              await reload();
                              fetchSubcontractBatchCost(id).then((r) => { setBatchCost(r); }).catch(() => {});
                            } catch (e) {
                              toast.error((e as Error)?.message ?? "Could not unlink trip.");
                            } finally {
                              setLinkingTrip(false);
                            }
                          })();
                        }}
                      >
                        Unlink
                      </Button>
                    </div>
                  ) : (
                    /* ── No trip linked yet ── */
                    <div className="space-y-3">
                      {/* Primary action: create a new trip tied to this order */}
                      <Button
                        className="w-full"
                        onClick={() => setNewTripSheetOpen(true)}
                      >
                        Create trip for this order
                      </Button>

                      {/* Secondary: link an existing trip */}
                      <div className="relative flex items-center gap-2">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground shrink-0">or link existing trip</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      <div className="flex gap-2">
                        <Select value={tripSelectValue} onValueChange={setTripSelectValue}>
                          <SelectTrigger className="flex-1" aria-label="Existing outbound trip">
                            <SelectValue placeholder={availableTrips.length ? "Select trip…" : "No active trips found"} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableTrips.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.reference ?? t.id.slice(-12)} — {t.status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={!tripSelectValue || linkingTrip}
                          onClick={handleLinkTrip}
                        >
                          {linkingTrip ? "Linking…" : "Link"}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {order.lines && order.lines.length > 0 && (
              <Card>
                <CardHeader className="border-b bg-muted/30 px-4 py-3">
                  <CardTitle className="text-base">Lines (input / output)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <DataTable<SubcontractOrderLineRow>
                    data={order.lines}
                    columns={lineColumns}
                    scrollMode="natural"
                    size="comfortable"
                    className="border-0 rounded-none shadow-none"
                    emptyMessage="No lines."
                  />
                </CardContent>
              </Card>
            )}

            {order.status === "RECEIVED" ? (
              <YieldBreakdownCard
                inputKg={actualInputQty}
                primaryKg={actualPrimaryQty}
                secondaryKg={actualSecondaryQty}
                lossKg={actualWasteQty}
                serviceFeeTotal={feeTotal}
                planned={{
                  inputKg: plannedInputQty,
                  primaryKg: plannedPrimaryQty,
                  secondaryKg: plannedSecondaryQty,
                  lossKg: plannedWasteQty,
                }}
                actual={{
                  inputKg: actualInputQty,
                  primaryKg: actualPrimaryQty,
                  secondaryKg: actualSecondaryQty,
                  lossKg: actualWasteQty,
                }}
              />
            ) : (
              <YieldBreakdownCard
                inputKg={plannedInputQty}
                primaryKg={plannedPrimaryQty}
                secondaryKg={plannedSecondaryQty}
                lossKg={plannedWasteQty}
                serviceFeeTotal={feeTotal}
              />
            )}

            <DeferredSection
              onShow={() => void loadAnalytics()}
              fallback={
                <div className="grid gap-4 lg:grid-cols-2">
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              }
            >
              <div className="grid gap-4 lg:grid-cols-2">
                {analyticsLoading && !batchCost ? (
                  <SkeletonCard />
                ) : batchCost ? (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Batch cost chain</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="divide-y rounded-md border">
                        <div className="flex justify-between gap-4 px-3 py-2">
                          <span className="text-muted-foreground">Raw material (PO)</span>
                          <span className="font-medium tabular-nums shrink-0">
                            {batchCost.rawMaterialCost != null
                              ? formatMoney(batchCost.rawMaterialCost, batchCost.currency)
                              : "—"}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4 px-3 py-2">
                          <span className="text-muted-foreground">Processing fee</span>
                          <span className="font-medium tabular-nums shrink-0">
                            {formatMoney(batchCost.processingFee, batchCost.currency)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4 px-3 py-2">
                          <span className="text-muted-foreground">
                            Outbound transport
                            {batchCost.transport.tripStatus
                              ? ` (${batchCost.transport.finalized ? "final" : "provisional"})`
                              : ""}
                          </span>
                          <span className="font-medium tabular-nums shrink-0 text-right">
                            {batchCost.transport.tripId
                              ? formatMoney(batchCost.transport.cost, batchCost.currency)
                              : "No trip linked"}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4 px-3 py-2 font-semibold bg-muted/40">
                          <span>Total estimate</span>
                          <span className="tabular-nums shrink-0">
                            {formatMoney(batchCost.totalEstimate, batchCost.currency)}
                          </span>
                        </div>
                      </div>
                      {!batchCost.transport.tripId && (
                        <p className="text-xs text-muted-foreground">
                          Link an outbound trip to include fuel and transport in this batch.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ) : null}

                {analyticsLoading && !drilldown ? (
                  <SkeletonCard />
                ) : drilldown ? (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Fee-to-COGS variance</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-3 text-sm">
                      <div className="rounded-lg border bg-muted/30 px-3 py-2">
                        <p className="text-xs text-muted-foreground">Expected vs actual yield</p>
                        <p className="mt-1 font-semibold tabular-nums">
                          {(drilldown.expectedYield * 100).toFixed(1)}% → {(drilldown.actualYield * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="rounded-lg border bg-muted/30 px-3 py-2">
                        <p className="text-xs text-muted-foreground">Yield variance</p>
                        <p
                          className={cn(
                            "mt-1 font-semibold tabular-nums",
                            drilldown.yieldVariance < 0 && "text-destructive"
                          )}
                        >
                          {(drilldown.yieldVariance * 100).toFixed(2)}%
                        </p>
                      </div>
                      <div className="rounded-lg border bg-muted/30 px-3 py-2 sm:col-span-1">
                        <p className="text-xs text-muted-foreground">Service fee variance</p>
                        <p className="mt-1 font-semibold tabular-nums">
                          {formatMoney(drilldown.feeVariance, "KES")}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : !analyticsLoading && !batchCost && !drilldown ? (
                  <p className="text-sm text-muted-foreground lg:col-span-2">Cost analytics unavailable.</p>
                ) : null}
              </div>
            </DeferredSection>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                <CardTitle className="text-base">Yield batches</CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/manufacturing/yield?subcontractOrderId=${id}`}>Record yield</Link>
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {sidebarLoading ? (
                  <div className="space-y-2 px-4 py-6">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                ) : yieldRecords.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
                    <Icons.Layers className="h-8 w-8 text-muted-foreground/50" aria-hidden />
                    <p className="text-sm text-muted-foreground">No yield batches recorded yet.</p>
                    <Button variant="link" size="sm" className="h-auto p-0" asChild>
                      <Link href={`/manufacturing/yield?subcontractOrderId=${id}`}>Record first yield</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y text-sm">
                    {yieldRecords.map((yr: Record<string, unknown>) => (
                      <div
                        key={String(yr.id ?? yr._id)}
                        className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-3 lg:grid-cols-6"
                      >
                        <div>
                          <p className="text-muted-foreground text-xs">Date</p>
                          <p className="tabular-nums">
                            {yr.recordedAt ? new Date(String(yr.recordedAt)).toLocaleDateString() : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Input kg</p>
                          <p className="tabular-nums">{String(yr.inputKg ?? "—")}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Primary kg</p>
                          <p className="tabular-nums">{String(yr.primaryOutputKg ?? "—")}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Secondary kg</p>
                          <p className="tabular-nums">{String(yr.secondaryOutputKg ?? "—")}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Loss kg</p>
                          <p className="tabular-nums">{String(yr.processLossKg ?? "—")}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Yield %</p>
                          <p className="tabular-nums">
                            {yr.primaryYieldPct != null
                              ? `${(Number(yr.primaryYieldPct) * 100).toFixed(1)}%`
                              : "—"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {order.grnId && (
              <DeferredSection
                fallback={<SkeletonCard />}
              >
                <BatchLandedCostCard
                  grnId={order.grnId}
                  costingHref={`/inventory/costing?grnId=${order.grnId}`}
                />
              </DeferredSection>
            )}
          </div>

          <aside className="space-y-4 min-w-0 xl:sticky xl:top-[4.5rem]">
            <BatchStatusTimeline
              title="Job work timeline"
              steps={[
                { id: "create", label: "Order created", status: "completed", timestamp: order.createdAt },
                { id: "dispatch", label: "Stock dispatched to processor", status: order.sentAt ? "completed" : "current", timestamp: order.sentAt ?? undefined },
                { id: "wip", label: "Processing / WIP", status: order.status === "WIP" ? "current" : order.status === "RECEIVED" ? "completed" : "upcoming", detail: order.workCenterName },
                { id: "receive", label: "Outputs received back", status: order.status === "RECEIVED" ? "completed" : "upcoming", timestamp: order.receivedAt ?? undefined },
              ]}
            />
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Activity & audit</CardTitle>
              </CardHeader>
              <CardContent className="p-0 max-h-[min(20rem,40vh)] overflow-y-auto">
                {sidebarLoading ? (
                  <div className="space-y-3 p-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                ) : (
                  <ActivityPanel
                    auditEntries={
                      auditEntries.length > 0
                        ? auditEntries
                        : [{ id: "init", action: "Subcontract order created", user: "System", timestamp: new Date(order.createdAt).toLocaleString(), detail: order.number }]
                    }
                    comments={[]}
                  />
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>

      {/* Subcontract receive is handled in the mobile app. */}


      {/* New trip sheet — opened from "Create trip for this order" button */}
      {order && (
        <NewTripSheet
          open={newTripSheetOpen}
          onOpenChange={setNewTripSheetOpen}
          defaultType="OUTBOUND"
          onCreated={async (tripId) => {
            // Auto-link the newly created trip to this subcontract order
            try {
              await patchSubcontractOrder(order.id, { outboundTripId: tripId });
              toast.success("Trip created and linked to this batch.");
            } catch {
              toast.error("Trip created, but failed to auto-link — please link it manually.");
            }
            await reload();
            fetchSubcontractBatchCost(id).then((r) => { setBatchCost(r); }).catch(() => {});
            // Refresh available trips list
            void apiRequest<{ items: Array<{ id: string; reference?: string; status: string }> }>("/api/distribution/trips", {
              params: { type: "OUTBOUND", status: "IN_TRANSIT,PLANNED" },
            })
              .then((res) => setAvailableTrips(res?.items ?? []))
              .catch(() => {});
          }}
        />
      )}
    </PageShell>
  );
}
