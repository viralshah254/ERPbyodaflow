"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchPickPackTask, patchPickPackWarehouse, runPickPackAction, type WarehousePickPackRow } from "@/lib/api/warehouse-execution";
import { fetchWarehouseOptions, type LookupOption } from "@/lib/api/lookups";
import { patchDocumentApi } from "@/lib/api/documents";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function PickPackDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [task, setTask] = React.useState<WarehousePickPackRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [cartons, setCartons] = React.useState("0");
  const [packingNote, setPackingNote] = React.useState("");
  const [courier, setCourier] = React.useState("");
  const [trackingRef, setTrackingRef] = React.useState("");

  const [warehouseOptions, setWarehouseOptions] = React.useState<LookupOption[]>([]);
  const [warehouseSaving, setWarehouseSaving] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const payload = await fetchPickPackTask(id);
      setTask(payload);
      setCartons(String(payload?.cartonsCount ?? 0));
      setPackingNote(payload?.packingNote ?? "");
      setCourier(payload?.courier ?? "");
      setTrackingRef(payload?.trackingRef ?? "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load task.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  React.useEffect(() => {
    void fetchWarehouseOptions()
      .then(setWarehouseOptions)
      .catch(() => {
        toast.error("Failed to load warehouses.");
      });
  }, []);

  const runWarehouseAction = React.useCallback(
    async (successMessage: string, fn: () => Promise<void>) => {
      try {
        await fn();
        toast.success(successMessage);
        await refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Action failed.");
      }
    },
    [refresh]
  );

  const fulfilmentWarehouseUi = React.useMemo(() => {
    if (!task) {
      return { locked: true, changeViaDn: false, isTerminal: false };
    }
    const dn = task.sourceDocumentStatus?.trim().toUpperCase() ?? "";
    const changeViaDn = !!task.sourceDocumentId && dn === "DRAFT";
    const isTerminal = ["DISPATCHED", "COMPLETED"].includes(task.status.trim().toUpperCase());
    const locked = isTerminal || (!!task.sourceDocumentId && !changeViaDn);
    const primaryWh = task.primaryStockWarehouseId?.trim();
    const fulfilWh = task.warehouseId?.trim();
    const showPrimaryStockMismatch =
      Boolean(primaryWh && fulfilWh && primaryWh !== fulfilWh) &&
      task.lines.some(
        (line) =>
          (line.onHandWarehouse ?? 0) === 0 && (line.onHandPrimaryWarehouse ?? 0) > 0
      );
    return { locked, changeViaDn, isTerminal, showPrimaryStockMismatch };
  }, [task]);

  const handleWarehouseChange = React.useCallback(
    async (warehouseId: string) => {
      if (!task || warehouseId === task.warehouseId) return;
      setWarehouseSaving(true);
      try {
        if (fulfilmentWarehouseUi.changeViaDn && task.sourceDocumentId) {
          await patchDocumentApi("delivery-note", task.sourceDocumentId, { warehouseId });
        } else {
          await patchPickPackWarehouse(task.id, warehouseId);
        }
        toast.success("Fulfilment warehouse updated. Pick progress was reset.");
        await refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not update warehouse.");
      } finally {
        setWarehouseSaving(false);
      }
    },
    [task, refresh, fulfilmentWarehouseUi.changeViaDn]
  );

  if (!task && loading) {
    return <PageShell><PageHeader title="Loading task..." /></PageShell>;
  }

  if (!task) {
    return (
      <PageShell>
        <PageHeader title="Task not found" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title={`${task.reference} - ${task.status}`}
        description={
          task.sourceDocumentNumber
            ? `${task.customer ?? "Customer"} · Delivery ${task.sourceDocumentNumber} (${task.sourceDocumentStatus ?? "DRAFT"})`
            : task.customer
        }
        breadcrumbs={[
          { label: "Warehouse", href: "/warehouse/overview" },
          { label: "Pick & Pack", href: "/warehouse/pick-pack" },
          { label: task.reference },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/warehouse/pick-pack">Back to list</Link>
            </Button>
          </div>
        }
      />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Fulfilment warehouse</CardTitle>
            <CardDescription>
              Stock totals and bins are for this warehouse (not the same as the branch switcher above). Updating it resets
              pick / pack progress until you confirm pick again.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-w-lg">
            {fulfilmentWarehouseUi.isTerminal ? (
              <p className="text-sm text-muted-foreground">Warehouse cannot be changed after dispatch or completion.</p>
            ) : task.sourceDocumentId && !fulfilmentWarehouseUi.changeViaDn ? (
              <p className="text-sm text-muted-foreground">
                Pick & pack can only sync this field while the linked delivery note is still in <strong>Draft</strong>.
                <Link className="text-primary underline ml-1 inline" href={`/docs/delivery-note/${task.sourceDocumentId}`}>
                  Open delivery note
                </Link>
              </p>
            ) : null}
            {fulfilmentWarehouseUi.showPrimaryStockMismatch ? (
              <p className="text-sm rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-900 dark:text-amber-100">
                Stock is on hand in your <strong>MAIN</strong> (primary) warehouse — the fulfilment site above shows no
                available quantity. Either switch the fulfilment warehouse to MAIN / primary stock location, or move stock
                into the selected warehouse with a transfer.
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <Label className="shrink-0 text-muted-foreground">Warehouse</Label>
              <Select
                disabled={
                  fulfilmentWarehouseUi.locked || warehouseSaving || (!warehouseOptions.length && !task.warehouseId)
                }
                value={task.warehouseId ?? undefined}
                onValueChange={(value) => void handleWarehouseChange(value)}
              >
                <SelectTrigger className="min-w-[220px] flex-1" aria-label="Fulfilment warehouse">
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouseOptions.map((wh) => (
                    <SelectItem key={wh.id} value={wh.id}>
                      {wh.label}
                    </SelectItem>
                  ))}
                  {task.warehouseId && !warehouseOptions.some((wh) => wh.id === task.warehouseId) ? (
                    <SelectItem key={task.warehouseId} value={task.warehouseId}>
                      {`${task.warehouseId.slice(0, 14)}… (current)`}
                    </SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
              {warehouseSaving ? <span className="text-xs text-muted-foreground">Saving…</span> : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Picklist</CardTitle>
            <CardDescription>Suggested bins and picked quantities now come from backend execution records.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead className="text-right">Warehouse qty</TableHead>
                  <TableHead className="text-right">MAIN stock</TableHead>
                  <TableHead className="text-right">At bin</TableHead>
                  <TableHead>Suggested bin</TableHead>
                  <TableHead>Picked</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {task.lines.map((line) => {
                  const wh = line.onHandWarehouse;
                  const pm = line.onHandPrimaryWarehouse;
                  const atBin = line.onHandBin;
                  const shortage =
                    typeof wh === "number" && Number.isFinite(wh) && wh < line.quantity;
                  const binShort =
                    typeof atBin === "number" &&
                    Number.isFinite(atBin) &&
                    line.locationId != null &&
                    atBin < line.quantity;
                  return (
                    <TableRow key={line.id}>
                      <TableCell>{line.productName ?? line.productId}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{line.sku ?? "—"}</TableCell>
                      <TableCell>{line.quantity}</TableCell>
                      <TableCell
                        className={`text-right tabular-nums ${shortage ? "text-amber-600 font-medium" : ""}`}
                      >
                        {typeof wh === "number" ? wh : "—"}
                      </TableCell>
                      <TableCell className={`text-right tabular-nums ${typeof pm === "number" && pm >= line.quantity ? "text-emerald-600/90" : ""}`}>
                        {typeof pm === "number" ? pm : "—"}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums ${binShort ? "text-amber-600 font-medium" : ""}`}
                      >
                        {line.locationId != null && typeof atBin === "number" ? atBin : "—"}
                      </TableCell>
                      <TableCell>{line.suggestedBin ?? "—"}</TableCell>
                      <TableCell>{line.pickedQty ?? 0}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Pack</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Cartons count</Label>
                <Input value={cartons} onChange={(e) => setCartons(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Packing note</Label>
                <Input value={packingNote} onChange={(e) => setPackingNote(e.target.value)} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Dispatch</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Courier</Label>
                <Input value={courier} onChange={(e) => setCourier(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Tracking reference</Label>
                <Input value={trackingRef} onChange={(e) => setTrackingRef(e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() =>
              void runWarehouseAction("Pick confirmed.", () =>
                runPickPackAction(task.id, {
                  action: "pick",
                  lines: task.lines.map((line) => ({
                    lineId: line.id,
                    pickedQty: line.quantity,
                    locationId: line.locationId,
                  })),
                })
              )
            }
          >
            Confirm pick
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              void runWarehouseAction("Pack confirmed.", () =>
                runPickPackAction(task.id, {
                  action: "pack",
                  cartonsCount: Number(cartons) || 0,
                  packingNote,
                })
              )
            }
          >
            Confirm pack
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              void runWarehouseAction("Dispatch recorded.", () =>
                runPickPackAction(task.id, {
                  action: "dispatch",
                  courier,
                  trackingRef,
                })
              )
            }
          >
            Mark dispatched
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              void runWarehouseAction("Task completed.", () => runPickPackAction(task.id, { action: "complete" }))
            }
          >
            Complete
          </Button>
          {task.sourceDocumentId ? (
            <Button variant="outline" asChild>
              <Link href={`/docs/delivery-note/${task.sourceDocumentId}`}>Open delivery note</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </PageShell>
  );
}
