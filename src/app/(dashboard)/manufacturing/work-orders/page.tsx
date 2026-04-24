"use client";

import * as React from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import {
  checkWorkOrderAvailability,
  createManufacturingWorkOrder,
  fetchManufacturingBoms,
  fetchManufacturingRoutes,
  fetchManufacturingWorkOrders,
  runManufacturingWorkOrderAction,
  type ManufacturingBom,
  type ManufacturingRoute,
  type ManufacturingWorkOrder,
  type MaterialAvailabilityLine,
} from "@/lib/api/manufacturing";
import { fetchGRNs } from "@/lib/api/grn";
import { type PurchasingDocRow } from "@/lib/types/purchasing";
import { hydrateProductsFromApi, listProducts, subscribeProductsCache } from "@/lib/data/products.repo";
import { isApiConfigured } from "@/lib/api/client";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function WorkOrdersPage() {
  const terminology = useTerminology();
  const woLabel = t("workOrder", terminology);
  const [products, setProducts] = React.useState(() => listProducts());
  React.useEffect(() => subscribeProductsCache(() => setProducts(listProducts())), []);
  const [rows, setRows] = React.useState<ManufacturingWorkOrder[]>([]);
  const [boms, setBoms] = React.useState<ManufacturingBom[]>([]);
  const [routes, setRoutes] = React.useState<ManufacturingRoute[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [bomId, setBomId] = React.useState("");
  const [productId, setProductId] = React.useState("");
  const [routingId, setRoutingId] = React.useState("");
  const [quantity, setQuantity] = React.useState("1");
  const [dueDate, setDueDate] = React.useState("");
  const [grnId, setGrnId] = React.useState("");
  const [availableGrns, setAvailableGrns] = React.useState<PurchasingDocRow[]>([]);
  const [grnsLoading, setGrnsLoading] = React.useState(false);
  const [availLines, setAvailLines] = React.useState<MaterialAvailabilityLine[]>([]);
  const [availLoading, setAvailLoading] = React.useState(false);
  const availDebounce = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      await hydrateProductsFromApi();
      const [nextRows, nextBoms, nextRoutes] = await Promise.all([
        fetchManufacturingWorkOrders(),
        fetchManufacturingBoms(),
        fetchManufacturingRoutes(),
      ]);
      setRows(nextRows);
      setBoms(nextBoms);
      setRoutes(nextRoutes);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load work orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  // Debounced availability check when BOM + quantity changes
  React.useEffect(() => {
    if (availDebounce.current) clearTimeout(availDebounce.current);
    if (!bomId || !Number(quantity)) {
      setAvailLines([]);
      return;
    }
    availDebounce.current = setTimeout(async () => {
      setAvailLoading(true);
      try {
        const result = await checkWorkOrderAvailability(bomId, Number(quantity));
        setAvailLines(result.lines);
      } catch {
        setAvailLines([]);
      } finally {
        setAvailLoading(false);
      }
    }, 400);
    return () => {
      if (availDebounce.current) clearTimeout(availDebounce.current);
    };
  }, [bomId, quantity]);

  const hasShortfall = availLines.some((line) => line.shortfall > 0);

  // When GRN or BOM changes:
  // 1. Smart quantity: match BOM components to GRN lines; fall back to total received weight.
  // 2. Auto-derive productId from BOM output, or from GRN's first input product line when no BOM.
  //    (Finished product selector is hidden when GRN/BOM is set — no manual selection needed.)
  React.useEffect(() => {
    if (!grnId) return;
    const selectedGrn = availableGrns.find((g) => g.id === grnId);
    if (!selectedGrn) return;
    const selectedBom = boms.find((b) => b.id === bomId);

    // Quantity pre-fill
    if (selectedBom && selectedBom.items.length > 0) {
      const bomProductIds = new Set(selectedBom.items.map((i) => i.productId).filter(Boolean));
      const matchedWeight = (selectedGrn.lineAvailability ?? [])
        .filter((l) => l.available && bomProductIds.has(l.productId ?? ""))
        .reduce((sum, l) => sum + l.receivedWeightKg, 0);
      if (matchedWeight > 0) setQuantity(String(matchedWeight));
      else if (selectedGrn.receivedWeightKg) setQuantity(String(selectedGrn.receivedWeightKg));
    } else if (selectedGrn.receivedWeightKg) {
      setQuantity(String(selectedGrn.receivedWeightKg));
    }

    // Auto-derive productId: BOM takes precedence, then GRN's first available input line.
    if (!selectedBom) {
      const firstLine = (selectedGrn.lineAvailability ?? []).find((l) => l.available && l.productId);
      if (firstLine?.productId) setProductId(firstLine.productId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grnId, bomId]);

  const columns = [
    { id: "number", header: "Number", accessor: (r: ManufacturingWorkOrder) => <span className="font-medium">{r.number}</span>, sticky: true },
    {
      id: "product",
      header: "Product",
      accessor: (r: ManufacturingWorkOrder) => r.productSku ? `${r.productSku} - ${r.productName}` : r.productName ?? r.productId,
    },
    { id: "bom", header: "BOM", accessor: (r: ManufacturingWorkOrder) => r.bomName ?? "—" },
    { id: "routing", header: "Routing", accessor: (r: ManufacturingWorkOrder) => r.routingName ?? "—" },
    {
      id: "grn",
      header: "GRN batch",
      accessor: (r: ManufacturingWorkOrder) =>
        r.grnNumber ? (
          <span className="text-xs font-medium text-primary">{r.grnNumber}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    { id: "qty", header: "Planned qty", accessor: (r: ManufacturingWorkOrder) => r.plannedQuantity },
    { id: "produced", header: "Produced", accessor: (r: ManufacturingWorkOrder) => r.producedQuantity },
    { id: "open", header: "Open", accessor: (r: ManufacturingWorkOrder) => r.openQuantity },
    { id: "dueDate", header: "Due date", accessor: (r: ManufacturingWorkOrder) => r.dueDate?.slice(0, 10) ?? "—" },
    { id: "status", header: "Status", accessor: (r: ManufacturingWorkOrder) => <StatusBadge status={r.status} /> },
    {
      id: "actions",
      header: "",
      accessor: (r: ManufacturingWorkOrder) => (
        <div className="flex gap-2">
          {r.status === "DRAFT" && (
            <Button size="sm" variant="ghost" onClick={async () => {
              await runManufacturingWorkOrderAction(r.id, { action: "release" });
              await refresh();
            }}>
              Release
            </Button>
          )}
          {r.status === "RELEASED" && (
            <Button size="sm" variant="ghost" onClick={async () => {
              await runManufacturingWorkOrderAction(r.id, { action: "start" });
              await refresh();
            }}>
              Start
            </Button>
          )}
          {r.status === "IN_PROGRESS" && (
            <Button size="sm" variant="ghost" onClick={async () => {
              await runManufacturingWorkOrderAction(r.id, {
                action: "complete",
                producedQuantity: r.openQuantity > 0 ? r.quantity : r.producedQuantity,
              });
              await refresh();
            }}>
              Complete
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Load available GRNs when sheet opens.
  // Uses availableForProcessing=true: restricts to POSTED/CONVERTED status and returns
  // lineAvailability per line for smart qty matching.
  // We show ALL returned GRNs (including those already linked to a WO) so the dropdown
  // is never unexpectedly empty. GRNs with an existing WO show a warning in the label;
  // the backend 409 guard prevents actually creating a duplicate.
  const loadAvailableGrns = React.useCallback(async () => {
    if (!isApiConfigured()) return;
    setGrnsLoading(true);
    try {
      const all = await fetchGRNs({ availableForProcessing: true });
      setAvailableGrns(all);
    } catch {
      setAvailableGrns([]);
    } finally {
      setGrnsLoading(false);
    }
  }, []);

  function resetForm() {
    setBomId("");
    setProductId("");
    setRoutingId("");
    setGrnId("");
    setQuantity("1");
    setDueDate("");
    setAvailLines([]);
  }

  return (
    <PageLayout
      title={woLabel}
      description="Create, issue, and receive work orders"
      actions={
        <Button onClick={() => setSheetOpen(true)}>
          <Icons.Plus className="mr-2 h-4 w-4" />
          New work order
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Work orders</CardTitle>
          <CardDescription>Live production orders with release, start, and completion progress.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable data={rows} columns={columns} emptyMessage={loading ? "Loading work orders..." : "No work orders."} />
        </CardContent>
      </Card>

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) {
            resetForm();
          } else {
            void loadAvailableGrns();
          }
        }}
      >
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New work order</SheetTitle>
            <SheetDescription>
              {grnId
                ? "Link a GRN batch to track input weight and production outputs."
                : "Create a production order from a BOM or for a specific product."}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            {/* GRN batch link */}
            <div className="space-y-2">
              <Label>
                GRN batch
                <span className="ml-1 text-xs text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Select
                value={grnId || "__none__"}
                onValueChange={(value) => {
                  const next = value === "__none__" ? "" : value;
                  setGrnId(next);
                  // Clear auto-derived productId when GRN is removed (unless BOM is set)
                  if (!next && !bomId) setProductId("");
                }}
              >
                <SelectTrigger>
                  {grnsLoading ? (
                    <span className="text-muted-foreground text-sm">Loading receipts…</span>
                  ) : (
                    <SelectValue placeholder="Select a GRN receipt" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No GRN linked</SelectItem>
                  {availableGrns.map((g) => {
                    const eligible = g.eligibleLineCount ?? g.lineAvailability?.filter((l) => l.available).length ?? 0;
                    const total = g.lineAvailability?.length ?? 0;
                    const hasWo = !!(g.workOrderId && g.workOrderStatus !== "CANCELLED");
                    return (
                      <SelectItem key={g.id} value={g.id}>
                        {g.number}
                        {g.poRef ? ` · PO: ${g.poRef}` : ""}
                        {` · ${g.status}`}
                        {total > 0 ? ` · ${eligible}/${total} lines` : ""}
                        {g.receivedWeightKg ? ` · ${g.receivedWeightKg.toLocaleString()} kg` : ""}
                        {hasWo ? ` · ⚠ ${g.workOrderNumber ?? "WO linked"}` : ""}
                      </SelectItem>
                    );
                  })}
                  {!grnsLoading && availableGrns.length === 0 && (
                    <SelectItem value="__empty__" disabled>
                      No available receipts
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {grnId && (() => {
                const grn = availableGrns.find((g) => g.id === grnId);
                if (!grn) return null;
                const lines = grn.lineAvailability?.filter((l) => l.available) ?? [];
                const hasWo = !!(grn.workOrderId && grn.workOrderStatus !== "CANCELLED");
                return (
                  <div className="space-y-1.5">
                    {hasWo && (
                      <div className="flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                        <Icons.AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                        <span>This GRN is already linked to <span className="font-medium">{grn.workOrderNumber ?? "a work order"}</span>. Creating another will be blocked.</span>
                      </div>
                    )}
                    <div className="rounded-md border bg-muted/30 px-3 py-2 space-y-1">
                      {lines.length > 0 ? (
                        lines.map((l, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{l.productName}</span>
                            <span className="font-medium tabular-nums">{l.receivedWeightKg.toLocaleString()} kg</span>
                          </div>
                        ))
                      ) : (
                        grn.receivedWeightKg ? (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Total received</span>
                            <span className="font-medium tabular-nums">{grn.receivedWeightKg.toLocaleString()} kg</span>
                          </div>
                        ) : null
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* BOM */}
            <div className="space-y-2">
              <Label>BOM</Label>
              <Select
                value={bomId || "__none__"}
                onValueChange={(value) => {
                  const nextBomId = value === "__none__" ? "" : value;
                  setBomId(nextBomId);
                  const bom = boms.find((item) => item.id === nextBomId);
                  if (bom) {
                    setProductId(bom.finishedProductId);
                    if (bom.routeId) setRoutingId(bom.routeId);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional BOM" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No BOM</SelectItem>
                  {boms.map((bom) => (
                    <SelectItem key={bom.id} value={bom.id}>
                      {bom.code} - {bom.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Finished product — only shown for standalone work orders (no GRN, no BOM).
                When a GRN is linked, the input is the batch itself (multi-output processing).
                When a BOM is selected, the output product is encoded in the BOM. */}
            {!grnId && !bomId && (
              <div className="space-y-2">
                <Label>
                  Finished product
                  <span className="ml-1 text-xs text-destructive">*</span>
                </Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.sku} - {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Routing */}
            <div className="space-y-2">
              <Label>Routing</Label>
              <Select value={routingId || "__none__"} onValueChange={(v) => setRoutingId(v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional routing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No routing</SelectItem>
                  {routes.map((route) => (
                    <SelectItem key={route.id} value={route.id}>
                      {route.code} - {route.name} ({route.operations.length} ops)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="0.001"
                step="0.001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            {/* Due date */}
            <div className="space-y-2">
              <Label>Due date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>

            {/* Material availability panel */}
            {bomId && (
              <div className="rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Material availability</span>
                  {availLoading && <Icons.Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                  {!availLoading && hasShortfall && (
                    <Badge variant="destructive" className="text-xs">
                      <Icons.AlertTriangle className="mr-1 h-3 w-3" />
                      Shortfall
                    </Badge>
                  )}
                  {!availLoading && !hasShortfall && availLines.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      <Icons.CheckCircle2 className="mr-1 h-3 w-3" />
                      All available
                    </Badge>
                  )}
                </div>
                {availLines.length > 0 && (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground border-b">
                        <th className="text-left py-1 font-medium">Component</th>
                        <th className="text-right py-1 font-medium">Required</th>
                        <th className="text-right py-1 font-medium">On hand</th>
                        <th className="text-right py-1 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {availLines.map((line) => (
                        <tr key={line.productId} className="border-b border-border/40 last:border-0">
                          <td className="py-1 pr-2">
                            {line.productSku ? `${line.productSku}` : line.productName}
                          </td>
                          <td className="py-1 text-right tabular-nums">
                            {line.requiredQty} {line.uom}
                          </td>
                          <td className="py-1 text-right tabular-nums">
                            {line.onHandQty} {line.uom}
                          </td>
                          <td className="py-1 text-right">
                            {line.shortfall > 0 ? (
                              <span className="text-destructive font-medium">−{line.shortfall}</span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400">OK</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {availLines.length === 0 && !availLoading && (
                  <p className="text-xs text-muted-foreground">No component lines on this BOM.</p>
                )}
              </div>
            )}
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => { setSheetOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button
              disabled={saving || (!productId && !grnId && !bomId)}
              onClick={async () => {
                setSaving(true);
                try {
                  await createManufacturingWorkOrder({
                    productId,
                    bomId: bomId || undefined,
                    routingId: routingId || undefined,
                    grnId: grnId || undefined,
                    quantity: Number(quantity) || 0,
                    dueDate: dueDate || undefined,
                  });
                  toast.success("Work order created.");
                  setSheetOpen(false);
                  resetForm();
                  await refresh();
                } catch (error) {
                  const msg = error instanceof Error ? error.message : "Failed to create work order.";
                  // 409 = GRN already linked to another work order
                  toast.error(msg);
                } finally {
                  setSaving(false);
                }
              }}
            >
              {hasShortfall && <Icons.AlertTriangle className="mr-2 h-4 w-4 text-amber-400" />}
              Create work order
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageLayout>
  );
}
