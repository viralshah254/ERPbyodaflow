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
import { ActivityPanel } from "@/components/shared/ActivityPanel";
import { BatchStatusTimeline } from "@/components/operational/BatchStatusTimeline";
import { CostImpactPanel } from "@/components/operational/CostImpactPanel";
import { OwnershipLocationBadge } from "@/components/operational/OwnershipLocationBadge";
import { YieldBreakdownCard } from "@/components/operational/YieldBreakdownCard";
import { fetchSubcontractOrderById, fetchSubcontractCostingDrilldown, receiveSubcontractOrder, dispatchSubcontractOrder } from "@/lib/api/cool-catch";
import { fetchAuditLogs } from "@/lib/api/audit-log";
import { fetchYieldRecords } from "@/lib/api/yield";
import { fetchWarehousesApi } from "@/lib/api/warehouses";
import { BatchLandedCostCard } from "@/components/operational/BatchLandedCostCard";
import type { SubcontractOrderLineRow } from "@/lib/mock/manufacturing/subcontracting";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import { manufacturingAreaLabel } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";

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
  const [receiving, setReceiving] = React.useState(false);
  const [dispatching, setDispatching] = React.useState(false);
  const [drilldown, setDrilldown] = React.useState<Awaited<ReturnType<typeof fetchSubcontractCostingDrilldown>>>(null);
  const [auditEntries, setAuditEntries] = React.useState<Array<{ id: string; action: string; user: string; timestamp: string; detail?: string }>>([]);
  const [yieldRecords, setYieldRecords] = React.useState<Awaited<ReturnType<typeof fetchYieldRecords>>>([]);
  const [receiveSheetOpen, setReceiveSheetOpen] = React.useState(false);
  const [receiveWarehouseId, setReceiveWarehouseId] = React.useState("");
  const [warehouses, setWarehouses] = React.useState<Array<{ id: string; name: string; code?: string; status?: string }>>(
    []
  );
  const [lineActualKg, setLineActualKg] = React.useState<string[]>([]);
  // packingMode per line index: "STANDARD" | "CUSTOM"
  const [linePackingMode, setLinePackingMode] = React.useState<Record<number, "STANDARD" | "CUSTOM">>({});
  // Custom packing params per line index
  const [linePackagingType, setLinePackagingType] = React.useState<Record<number, string>>({});
  const [linePackUnitCount, setLinePackUnitCount] = React.useState<Record<number, string>>({});
  const [linePackCostPerUnit, setLinePackCostPerUnit] = React.useState<Record<number, string>>({});

  const reload = React.useCallback(async () => {
    const [r, logs, yields] = await Promise.allSettled([
      fetchSubcontractOrderById(id),
      fetchAuditLogs({ sourceType: "subcontract-order", sourceId: id }),
      fetchYieldRecords({ subcontractOrderId: id }),
    ]);
    if (r.status === "fulfilled") setOrder(r.value);
    if (logs.status === "fulfilled") {
      setAuditEntries((logs.value ?? []).map((e: any) => ({
        id: e.id ?? e._id ?? String(Math.random()),
        action: e.what ?? e.action ?? e.event ?? "Action",
        user: e.who ?? e.actorName ?? e.actor ?? "System",
        timestamp: e.when ? new Date(e.when).toLocaleString() : (e.createdAt ? new Date(e.createdAt).toLocaleString() : ""),
        detail: e.detail ?? e.description ?? "",
      })));
    }
    if (yields.status === "fulfilled") setYieldRecords(yields.value);
  }, [id]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    reload()
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    fetchSubcontractCostingDrilldown(id).then((r) => { setDrilldown(r); }).catch(() => {});
    return () => { cancelled = true; };
  }, [id, reload]);

  React.useEffect(() => {
    if (!receiveSheetOpen) return;
    void fetchWarehousesApi()
      .then((items) => {
        const rows = items
          .filter((w) => (w.status ?? "ACTIVE").toUpperCase() !== "INACTIVE")
          .map((w) => ({ id: w.id, name: w.name, code: w.code, status: w.status }))
          .sort((a, b) => {
            const rank = (x: { code?: string }) => ((x.code ?? "").toUpperCase() === "MAIN" ? 0 : 1);
            const d = rank(a) - rank(b);
            if (d !== 0) return d;
            return a.name.localeCompare(b.name);
          });
        setWarehouses(rows);
        setReceiveWarehouseId((prev) => {
          if (prev && rows.some((r) => r.id === prev)) return prev;
          const main = rows.find((r) => (r.code ?? "").toUpperCase() === "MAIN");
          if (main) return main.id;
          return rows.length === 1 ? rows[0]!.id : "";
        });
      })
      .catch(() => toast.error("Could not load warehouses."));
  }, [receiveSheetOpen]);

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

  const openReceiveSheet = () => {
    if (!order || order.status !== "WIP") return;
    // Initialize from planned kg (plannedQuantity), not quantity which may already be in boxes
    setLineActualKg((order.lines ?? []).map((l) => String(l.plannedQuantity ?? l.quantity)));
    // Default all output lines to STANDARD packing
    const defaultModes: Record<number, "STANDARD" | "CUSTOM"> = {};
    const defaultTypes: Record<number, string> = {};
    const defaultCounts: Record<number, string> = {};
    const defaultCosts: Record<number, string> = {};
    (order.lines ?? []).forEach((l, i) => {
      if (l.type === "OUTPUT_PRIMARY" || l.type === "OUTPUT_SECONDARY") {
        defaultModes[i] = "STANDARD";
        defaultTypes[i] = "BOX";
        const packSize = (l as any).packSizeKg;
        const planned = l.plannedQuantity ?? l.quantity;
        defaultCounts[i] = packSize && packSize > 0 ? String(Math.floor(planned / packSize)) : String(planned);
        defaultCosts[i] = String((l as any).packagingCostPerUnit ?? 0);
      }
    });
    setLinePackingMode(defaultModes);
    setLinePackagingType(defaultTypes);
    setLinePackUnitCount(defaultCounts);
    setLinePackCostPerUnit(defaultCosts);
    setReceiveSheetOpen(true);
  };

  const handleConfirmReceive = async () => {
    if (!order || order.status !== "WIP") return;
    const wid = receiveWarehouseId.trim();
    setReceiving(true);
    try {
      const actualLineQuantities = (order.lines ?? []).map((_, i) => ({
        lineIndex: i,
        // send quantityKg so the backend knows we're providing actual kg (not boxes)
        quantityKg: Math.max(0, Number.parseFloat(lineActualKg[i] ?? "0") || 0),
      }));
      // Build packing overrides for OUTPUT lines
      type PackingOverrideItem =
        | { lineIndex: number; packingMode: "STANDARD" }
        | { lineIndex: number; packingMode: "CUSTOM"; packagingType: "BOX" | "SACK" | "MANUAL"; packUnitCount: number; packagingCostPerUnit: number };
      const packingOverrides: PackingOverrideItem[] = (order.lines ?? []).flatMap((l, i) => {
        if (l.type !== "OUTPUT_PRIMARY" && l.type !== "OUTPUT_SECONDARY") return [] as PackingOverrideItem[];
        const mode = linePackingMode[i] ?? "STANDARD";
        if (mode === "STANDARD") {
          return [{ lineIndex: i, packingMode: "STANDARD" as const }] as PackingOverrideItem[];
        }
        return [{
          lineIndex: i,
          packingMode: "CUSTOM" as const,
          packagingType: (linePackagingType[i] ?? "BOX") as "BOX" | "SACK" | "MANUAL",
          packUnitCount: Math.max(0, parseInt(linePackUnitCount[i] ?? "0", 10) || 0),
          packagingCostPerUnit: Math.max(0, parseFloat(linePackCostPerUnit[i] ?? "0") || 0),
        }] as PackingOverrideItem[];
      });
      await receiveSubcontractOrder(order.id, {
        ...(wid ? { warehouseId: wid } : {}),
        actualLineQuantities,
        packingOverrides,
      });
      toast.success("Order received with actual weights. Stock and fees updated.");
      setReceiveSheetOpen(false);
      await reload();
      fetchSubcontractCostingDrilldown(id).then((r) => { setDrilldown(r); }).catch(() => {});
    } catch (e) {
      toast.error((e as Error)?.message ?? "Receive failed");
    } finally {
      setReceiving(false);
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

      // Planned kg column for received orders
      if (isReceived) {
        cols.push({
          id: "planned",
          header: "Planned kg",
          accessor: (r) => {
            const planned = r.plannedQuantity ?? r.quantity;
            return r.type === "INPUT" ? `${planned.toLocaleString()} kg` :
              r.type !== "WASTE" ? `${planned.toLocaleString()} kg` : "—";
          },
        });
      }

      // Actual kg (always shown, label differs by status)
      cols.push({
        id: "quantity_kg",
        header: isReceived ? "Actual kg" : "Planned kg",
        accessor: (r) => {
          const kg = isReceived
            ? (r.quantityKg ?? (r.packSizeKg && r.packSizeKg > 0 ? r.quantity * r.packSizeKg : r.quantity))
            : (r.plannedQuantity ?? r.quantity);
          return `${kg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`;
        },
      });

      // Stock units (boxes/sacks) column for packed outputs
      cols.push({
        id: "stock_units",
        header: isReceived ? "Stock units" : "Planned units",
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
            accessor: (r) => r.costPerKg != null ? formatMoney(r.costPerKg, "KES") : "—",
          },
          {
            id: "cost_per_unit",
            header: "Cost/box",
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
        <PageHeader title="Subcontract order" breadcrumbs={[{ label: areaLabel, href: "/manufacturing/subcontracting" }, { label: "Subcontracting" }, { label: id }]} />
        <div className="p-6"><p className="text-muted-foreground text-sm">Loading…</p></div>
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

  return (
    <PageShell>
      <PageHeader
        title={order.number}
        description={`${order.workCenterName} · ${order.status}`}
        breadcrumbs={[
          { label: areaLabel, href: "/manufacturing/boms" },
          { label: "Subcontracting", href: "/manufacturing/subcontracting" },
          { label: order.number },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            {order.status === "SENT" && (
              <Button size="sm" variant="secondary" disabled={dispatching} onClick={handleDispatch}>
                {dispatching ? "Dispatching…" : "Mark as In Processing"}
              </Button>
            )}
            {order.status === "WIP" && (
              <Button size="sm" disabled={receiving} onClick={openReceiveSheet}>
                Receive
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/manufacturing/subcontracting">Back to list</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Subcontract Order Summary</CardTitle>
                <Badge>{order.status}</Badge>
              </CardHeader>
              <CardContent className="grid gap-4 text-sm md:grid-cols-3 lg:grid-cols-6">
                <div>
                  <p className="text-muted-foreground">Work center</p>
                  <p className="font-medium">{order.workCenterName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Species / Process</p>
                  <p className="font-medium">
                    {order.species ? (order.species === "TILAPIA" ? "Tilapia" : "Nile Perch") : "—"}
                    {order.processType ? ` · ${order.processType}` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">BOM</p>
                  <p className="font-medium">{order.bomName ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Sent / Received</p>
                  <p className="font-medium">{order.sentAt ?? "—"} / {order.receivedAt ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Linked PO</p>
                  {order.purchaseOrderId ? (
                    <Link href={`/purchasing/orders/${order.purchaseOrderId}`} className="font-medium text-sm text-primary underline-offset-2 hover:underline">
                      {order.purchaseOrderNumber ?? order.purchaseOrderId.slice(-12)}
                    </Link>
                  ) : <p className="font-medium">—</p>}
                </div>
                <div>
                  <p className="text-muted-foreground">Linked GRN</p>
                  {order.grnId ? (
                    <Link href={`/inventory/receipts/${order.grnId}`} className="font-medium text-sm text-primary underline-offset-2 hover:underline">
                      {order.grnNumber ?? order.grnId.slice(-12)}
                    </Link>
                  ) : <p className="font-medium">—</p>}
                </div>
                {order.status === "RECEIVED" && (order.receiveWarehouseName ?? order.receiveWarehouseId) ? (
                  <div className="md:col-span-3 lg:col-span-6">
                    <p className="text-muted-foreground">Outputs received into</p>
                    <p className="font-medium">
                      {order.receiveWarehouseName ?? order.receiveWarehouseId}
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

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

            {order.lines && order.lines.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Lines (input / output)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <DataTable<SubcontractOrderLineRow> data={order.lines} columns={lineColumns} emptyMessage="No lines." />
                </CardContent>
              </Card>
            )}

            {(() => {
              const inputQtyForCost = order.status === "RECEIVED" ? actualInputQty : plannedInputQty;
              const primaryOutputLines = lines.filter((l) => l.type === "OUTPUT_PRIMARY");
              const secondaryOutputLines = lines.filter((l) => l.type === "OUTPUT_SECONDARY");
              // Total fee + packaging (stored in amount post-receive)
              const primaryTotal = primaryOutputLines.reduce((a, l) => a + (l.amount ?? 0), 0);
              const secondaryTotal = secondaryOutputLines.reduce((a, l) => a + (l.amount ?? 0), 0);
              // For received orders, show cost-per-kg / cost-per-box summary
              const primaryKgActual = order.status === "RECEIVED" ? actualPrimaryQty : 0;
              const primaryCostPerKg = primaryKgActual > 0 ? Math.round(primaryTotal / primaryKgActual * 100) / 100 : 0;
              const primaryPackSize = primaryOutputLines[0]?.packSizeKg;
              const primaryCostPerBox = primaryCostPerKg > 0 && primaryPackSize ? Math.round(primaryCostPerKg * primaryPackSize * 100) / 100 : 0;
              return (
                <CostImpactPanel
                  title="Processor Cost Impact"
                  currency="KES"
                  quantityKg={inputQtyForCost}
                  lines={[
                    { label: "Primary outputs (fee + packaging)", amount: primaryTotal },
                    ...(secondaryTotal > 0 ? [{ label: "Secondary/byproduct", amount: secondaryTotal }] : []),
                    ...(order.status === "RECEIVED" && primaryCostPerKg > 0 ? [
                      { label: `Cost/kg (primary)`, amount: primaryCostPerKg },
                      ...(primaryCostPerBox > 0 ? [{ label: `Cost/box (${primaryPackSize}kg)`, amount: primaryCostPerBox }] : []),
                    ] : []),
                  ]}
                />
              );
            })()}
            {drilldown && (
              <Card>
                <CardHeader>
                  <CardTitle>Fee-to-COGS drilldown</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 text-sm md:grid-cols-3">
                  <div>
                    <p className="text-muted-foreground">Expected vs actual yield</p>
                    <p className="font-medium">{(drilldown.expectedYield * 100).toFixed(2)}% vs {(drilldown.actualYield * 100).toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Yield variance</p>
                    <p className="font-medium">{(drilldown.yieldVariance * 100).toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Service fee variance</p>
                    <p className="font-medium">{formatMoney(drilldown.feeVariance, "KES")}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Yield Batches</CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/manufacturing/yield?subcontractOrderId=${id}`}>Record yield</Link>
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {yieldRecords.length === 0 ? (
                  <p className="text-muted-foreground text-sm p-4">No yield batches recorded yet.</p>
                ) : (
                  <div className="divide-y text-sm">
                    {yieldRecords.map((yr: any) => (
                      <div key={yr.id ?? yr._id} className="grid grid-cols-6 gap-2 px-4 py-3">
                        <div>
                          <p className="text-muted-foreground text-xs">Date</p>
                          <p>{yr.recordedAt ? new Date(yr.recordedAt).toLocaleDateString() : "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Input kg</p>
                          <p>{yr.inputKg ?? "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Primary kg</p>
                          <p>{yr.primaryOutputKg ?? "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Secondary kg</p>
                          <p>{yr.secondaryOutputKg ?? "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Loss kg</p>
                          <p>{yr.processLossKg ?? "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Yield %</p>
                          <p>{yr.primaryYieldPct != null ? `${(yr.primaryYieldPct * 100).toFixed(1)}%` : "—"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            {order.grnId && (
              <BatchLandedCostCard
                grnId={order.grnId}
                costingHref={`/inventory/costing?grnId=${order.grnId}`}
              />
            )}
          </div>

          <div className="space-y-6">
            <BatchStatusTimeline
              title="Job Work Timeline"
              steps={[
                { id: "create", label: "Order created", status: "completed", timestamp: order.createdAt },
                { id: "dispatch", label: "Stock dispatched to processor", status: order.sentAt ? "completed" : "current", timestamp: order.sentAt ?? undefined },
                { id: "wip", label: "Processing / WIP", status: order.status === "WIP" ? "current" : order.status === "RECEIVED" ? "completed" : "upcoming", detail: order.workCenterName },
                { id: "receive", label: "Outputs received back", status: order.status === "RECEIVED" ? "completed" : "upcoming", timestamp: order.receivedAt ?? undefined },
              ]}
            />
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Activity & Audit</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ActivityPanel
                  auditEntries={
                    auditEntries.length > 0
                      ? auditEntries
                      : [{ id: "init", action: "Subcontract order created", user: "System", timestamp: new Date(order.createdAt).toLocaleString(), detail: order.number }]
                  }
                  comments={[]}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Sheet open={receiveSheetOpen} onOpenChange={setReceiveSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Receive — enter actual weights</SheetTitle>
            <SheetDescription>
              Input weight is fixed from dispatch. Enter actual primary and secondary output kg; values default to BOM-planned kg. Stock and processing fees use these actuals.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-6 py-6">
            <div className="space-y-2">
              <Label>Receive outputs into warehouse</Label>
              <Select value={receiveWarehouseId || undefined} onValueChange={(v) => setReceiveWarehouseId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder={warehouses.length ? "Select warehouse" : "Loading warehouses…"} />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.code?.trim() ? `${w.code} — ${w.name}` : w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose where finished outputs post to inventory (MAIN is listed first). Falls back to primary MAIN if unset.
              </p>
            </div>
            {(() => {
              const rows = (order.lines ?? []).map((line, i) => ({ line, i }));
              const inputRows = rows.filter((r) => r.line.type === "INPUT");
              const primaryRows = rows.filter((r) => r.line.type === "OUTPUT_PRIMARY");
              const secondaryRows = rows.filter((r) => r.line.type === "OUTPUT_SECONDARY");
              const wasteRows = rows.filter((r) => r.line.type === "WASTE");
              return (
                <>
                  {inputRows.length > 0 ? (
                    <div className="grid gap-3">
                      <h3 className="text-sm font-semibold tracking-tight">Input</h3>
                      <p className="text-xs text-muted-foreground -mt-1">
                        Matches quantity sent to the processor; not editable here.
                      </p>
                      {inputRows.map(({ line, i }) => (
                        <ReceiveWeightRow
                          key={line.id}
                          line={line}
                          lineIndex={i}
                          editable={false}
                          lineActualKg={lineActualKg}
                          setLineActualKg={setLineActualKg}
                        />
                      ))}
                    </div>
                  ) : null}
                  {primaryRows.length > 0 ? (
                    <div className="grid gap-4">
                      <h3 className="text-sm font-semibold tracking-tight">Primary output</h3>
                      {primaryRows.map(({ line, i }) => {
                        const mode = linePackingMode[i] ?? "STANDARD";
                        const rawKg = Number.parseFloat(lineActualKg[i] ?? "") || 0;
                        const packSize = (line as any).packSizeKg;
                        const standardUnits = packSize && packSize > 0 ? Math.floor(rawKg / packSize) : rawKg;
                        const customCount = parseInt(linePackUnitCount[i] ?? "0", 10) || 0;
                        const customCost = parseFloat(linePackCostPerUnit[i] ?? "0") || 0;
                        const packTotal = mode === "CUSTOM"
                          ? Math.round(customCount * customCost * 100) / 100
                          : (packSize && packSize > 0 && standardUnits > 0 ? Math.round(standardUnits * ((line as any).packagingCostPerUnit ?? 0) * 100) / 100 : 0);
                        return (
                          <div key={line.id} className="rounded-lg border p-3 space-y-3">
                            <ReceiveWeightRow
                              line={line}
                              lineIndex={i}
                              editable
                              lineActualKg={lineActualKg}
                              setLineActualKg={(next) => {
                                const newArr = typeof next === "function" ? next(lineActualKg) : next;
                                setLineActualKg(newArr);
                                // Auto-update standard pack count when kg changes
                                if ((linePackingMode[i] ?? "STANDARD") === "STANDARD" && packSize && packSize > 0) {
                                  const newKg = Number.parseFloat(newArr[i] ?? "") || 0;
                                  setLinePackUnitCount((prev) => ({ ...prev, [i]: String(Math.floor(newKg / packSize)) }));
                                }
                              }}
                            />
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-muted-foreground">Packing method</Label>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={mode === "STANDARD" ? "default" : "outline"}
                                  className="h-7 text-xs"
                                  onClick={() => setLinePackingMode((prev) => ({ ...prev, [i]: "STANDARD" }))}
                                >
                                  Standard
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={mode === "CUSTOM" ? "default" : "outline"}
                                  className="h-7 text-xs"
                                  onClick={() => setLinePackingMode((prev) => ({ ...prev, [i]: "CUSTOM" }))}
                                >
                                  Custom
                                </Button>
                              </div>
                              {mode === "STANDARD" && packSize && packSize > 0 ? (
                                <p className="text-xs text-muted-foreground">
                                  {standardUnits.toLocaleString()} units @ {packSize}kg each
                                  {(line as any).packagingCostPerUnit > 0 ? ` · KES ${packTotal.toLocaleString("en-KE", { minimumFractionDigits: 2 })} packaging` : ""}
                                </p>
                              ) : mode === "STANDARD" ? (
                                <p className="text-xs text-muted-foreground">Tracked in kg (no pack size set)</p>
                              ) : null}
                              {mode === "CUSTOM" && (
                                <div className="grid grid-cols-3 gap-2">
                                  <div className="space-y-1">
                                    <Label className="text-xs">Pack type</Label>
                                    <Select
                                      value={linePackagingType[i] ?? "BOX"}
                                      onValueChange={(v) => setLinePackagingType((prev) => ({ ...prev, [i]: v }))}
                                    >
                                      <SelectTrigger className="h-8 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="BOX">Box</SelectItem>
                                        <SelectItem value="SACK">Sack</SelectItem>
                                        <SelectItem value="MANUAL">Manual</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">Count</Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      step={1}
                                      className="h-8 text-xs"
                                      value={linePackUnitCount[i] ?? ""}
                                      onChange={(e) => setLinePackUnitCount((prev) => ({ ...prev, [i]: e.target.value }))}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">KES/unit</Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      step="0.01"
                                      className="h-8 text-xs"
                                      value={linePackCostPerUnit[i] ?? ""}
                                      onChange={(e) => setLinePackCostPerUnit((prev) => ({ ...prev, [i]: e.target.value }))}
                                    />
                                  </div>
                                  {customCount > 0 && customCost > 0 && (
                                    <p className="col-span-3 text-xs text-muted-foreground">
                                      Packaging total: KES {packTotal.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                  {secondaryRows.length > 0 ? (
                    <div className="grid gap-4">
                      <h3 className="text-sm font-semibold tracking-tight">Secondary output</h3>
                      {secondaryRows.map(({ line, i }) => {
                        const mode = linePackingMode[i] ?? "STANDARD";
                        const rawKg = Number.parseFloat(lineActualKg[i] ?? "") || 0;
                        const packSize = (line as any).packSizeKg;
                        const standardUnits = packSize && packSize > 0 ? Math.floor(rawKg / packSize) : rawKg;
                        const customCount = parseInt(linePackUnitCount[i] ?? "0", 10) || 0;
                        const customCost = parseFloat(linePackCostPerUnit[i] ?? "0") || 0;
                        const packTotal = mode === "CUSTOM"
                          ? Math.round(customCount * customCost * 100) / 100
                          : 0;
                        return (
                          <div key={line.id} className="rounded-lg border p-3 space-y-3">
                            <ReceiveWeightRow
                              line={line}
                              lineIndex={i}
                              editable
                              lineActualKg={lineActualKg}
                              setLineActualKg={setLineActualKg}
                            />
                            {(packSize && packSize > 0) || mode === "CUSTOM" ? (
                              <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">Packing method</Label>
                                <div className="flex gap-2">
                                  <Button type="button" size="sm" variant={mode === "STANDARD" ? "default" : "outline"} className="h-7 text-xs"
                                    onClick={() => setLinePackingMode((prev) => ({ ...prev, [i]: "STANDARD" }))}>Standard</Button>
                                  <Button type="button" size="sm" variant={mode === "CUSTOM" ? "default" : "outline"} className="h-7 text-xs"
                                    onClick={() => setLinePackingMode((prev) => ({ ...prev, [i]: "CUSTOM" }))}>Custom</Button>
                                </div>
                                {mode === "STANDARD" && packSize && packSize > 0 && (
                                  <p className="text-xs text-muted-foreground">{standardUnits.toLocaleString()} units @ {packSize}kg each</p>
                                )}
                                {mode === "CUSTOM" && (
                                  <div className="grid grid-cols-3 gap-2">
                                    <div className="space-y-1">
                                      <Label className="text-xs">Pack type</Label>
                                      <Select value={linePackagingType[i] ?? "BOX"} onValueChange={(v) => setLinePackagingType((prev) => ({ ...prev, [i]: v }))}>
                                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="BOX">Box</SelectItem>
                                          <SelectItem value="SACK">Sack</SelectItem>
                                          <SelectItem value="MANUAL">Manual</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">Count</Label>
                                      <Input type="number" min={0} step={1} className="h-8 text-xs" value={linePackUnitCount[i] ?? ""} onChange={(e) => setLinePackUnitCount((prev) => ({ ...prev, [i]: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">KES/unit</Label>
                                      <Input type="number" min={0} step="0.01" className="h-8 text-xs" value={linePackCostPerUnit[i] ?? ""} onChange={(e) => setLinePackCostPerUnit((prev) => ({ ...prev, [i]: e.target.value }))} />
                                    </div>
                                    {customCount > 0 && customCost > 0 && (
                                      <p className="col-span-3 text-xs text-muted-foreground">Packaging total: KES {packTotal.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                  {wasteRows.length > 0 ? (
                    <div className="grid gap-3">
                      <h3 className="text-sm font-semibold tracking-tight">Waste / loss</h3>
                      {wasteRows.map(({ line, i }) => (
                        <ReceiveWeightRow
                          key={line.id}
                          line={line}
                          lineIndex={i}
                          editable
                          lineActualKg={lineActualKg}
                          setLineActualKg={setLineActualKg}
                        />
                      ))}
                    </div>
                  ) : null}
                </>
              );
            })()}
          </div>
          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => setReceiveSheetOpen(false)} disabled={receiving}>
              Cancel
            </Button>
            <Button onClick={handleConfirmReceive} disabled={receiving}>
              {receiving ? "Receiving…" : "Confirm receive"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
