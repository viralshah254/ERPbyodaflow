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
import { fetchPickPackTask, patchPickPackWarehouse, runPickPackAction, stagePickPackStock, type WarehousePickPackRow } from "@/lib/api/warehouse-execution";
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

function pickPackStockHintMessage(hint: string | undefined): string | null {
  switch (hint) {
    case "no_stock_levels_for_line_product_ids":
      return "No stock records match the product IDs on these lines (Inventory may list the same SKU under a different product). Check the delivery note lines or duplicate catalogue entries.";
    case "reserved_or_insufficient_across_sites":
      return "Stock records exist but nothing is available to pick everywhere (fully reserved, zero on hand, or all at inactive sites). Review reservations and stock levels.";
    case "some_line_product_ids_missing_stock_levels":
      return "Some line products have no stock records while others do. Compare product IDs on this pick with Inventory stock levels.";
    default:
      return null;
  }
}

function AvailWithPickDelta({
  value,
  pickedQty,
  showDelta,
}: {
  value: number | undefined;
  pickedQty: number;
  showDelta: boolean;
}) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return <span>—</span>;
  }
  const pq = Math.max(0, pickedQty);
  if (!showDelta || pq <= 0) {
    return <span>{value}</span>;
  }
  const after = value - pq;
  return (
    <div className="tabular-nums">
      <div>{value}</div>
      <div className="text-[11px] font-normal text-muted-foreground leading-tight">
        −{pq} this task
        {after >= 0 ? <span className="block opacity-90">After pick: {after}</span> : null}
      </div>
    </div>
  );
}

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
  const [stagingLoading, setStagingLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<"not_found" | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const payload = await fetchPickPackTask(id);
      setTask(payload);
      setCartons(String(payload?.cartonsCount ?? 0));
      setPackingNote(payload?.packingNote ?? "");
      setCourier(payload?.courier ?? "");
      setTrackingRef(payload?.trackingRef ?? "");
    } catch (error) {
      setTask(null);
      const err = error as Error & { status?: number };
      if (err.status === 404) {
        setLoadError("not_found");
      } else {
        toast.error(err.message || "Failed to load task.");
      }
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
      return {
        locked: true,
        changeViaDn: false,
        isTerminal: false,
        coolCatchLocked: false,
        showPrimaryStockMismatch: false,
      };
    }
    const dn = task.sourceDocumentStatus?.trim().toUpperCase() ?? "";
    const changeViaDn = !!task.sourceDocumentId && dn === "DRAFT";
    const isTerminal = ["DISPATCHED", "COMPLETED"].includes(task.status.trim().toUpperCase());
    const coolCatchLocked = Boolean(task.coolCatchFulfilmentLocked);
    const locked = isTerminal || coolCatchLocked || (!!task.sourceDocumentId && !changeViaDn);
    const primaryWh = task.primaryStockWarehouseId?.trim();
    const fulfilWh = task.warehouseId?.trim();
    const showPrimaryStockMismatch =
      Boolean(primaryWh && fulfilWh && primaryWh !== fulfilWh) &&
      task.lines.some(
        (line) =>
          (line.onHandWarehouse ?? 0) === 0 && (line.onHandPrimaryWarehouse ?? 0) > 0
      );
    return { locked, changeViaDn, isTerminal, showPrimaryStockMismatch, coolCatchLocked };
  }, [task]);

  const showStageStockCta = React.useMemo(() => {
    if (!task || fulfilmentWarehouseUi.isTerminal) return false;
    return task.lines.some((line) => {
      const need = line.pickedQty ?? line.quantity;
      if (need <= 0) return false;
      const whAvail = line.onHandWarehouse ?? 0;
      const orgWide = line.onHandOrgWide ?? 0;
      return whAvail < need && orgWide > whAvail;
    });
  }, [task, fulfilmentWarehouseUi.isTerminal]);

  const handleWarehouseChange = React.useCallback(
    async (warehouseId: string) => {
      if (!task || warehouseId === task.warehouseId) return;
      if (fulfilmentWarehouseUi.coolCatchLocked) return;
      setWarehouseSaving(true);
      try {
        if (fulfilmentWarehouseUi.changeViaDn && task.sourceDocumentId) {
          const r = await patchDocumentApi("delivery-note", task.sourceDocumentId, { warehouseId });
          if (r.pickPackSyncWarning) toast.warning(r.pickPackSyncWarning);
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
    [task, refresh, fulfilmentWarehouseUi.changeViaDn, fulfilmentWarehouseUi.coolCatchLocked]
  );

  if (!task && loading) {
    return <PageShell><PageHeader title="Loading task..." /></PageShell>;
  }

  if (!task && loadError === "not_found") {
    return (
      <PageShell>
        <PageHeader
          title="Task not found"
          description="No pick-pack task matches this link. Delivery notes and pick-pack tasks each have their own id. If you copied the id from the document URL (/docs/delivery-note/…), open that delivery note and use Open pick-pack, or choose a row from the Pick & Pack list."
          breadcrumbs={[
            { label: "Warehouse", href: "/warehouse/overview" },
            { label: "Pick & Pack", href: "/warehouse/pick-pack" },
            { label: "Not found" },
          ]}
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link href="/warehouse/pick-pack">Back to list</Link>
            </Button>
          }
        />
      </PageShell>
    );
  }

  if (!task) {
    return (
      <PageShell>
        <PageHeader title="Could not load task" />
        <div className="p-6">
          <Button variant="outline" size="sm" asChild>
            <Link href="/warehouse/pick-pack">Back to list</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const taskStatusUpper = (task.status ?? "").trim().toUpperCase();
  const packedOrLater = ["PACKED", "DISPATCHED", "COMPLETED"].includes(taskStatusUpper);
  const dispatchedOrComplete = ["DISPATCHED", "COMPLETED"].includes(taskStatusUpper);
  const isCancelled = taskStatusUpper === "CANCELLED";
  const canConfirmPick = taskStatusUpper === "PENDING" && !isCancelled;
  const canConfirmPack =
    (taskStatusUpper === "PICKED" || taskStatusUpper === "PACKED") && !dispatchedOrComplete && !isCancelled;
  const canDispatch = taskStatusUpper === "PACKED" && !isCancelled;
  const canComplete = taskStatusUpper === "DISPATCHED" && !isCancelled;
  const picklistCardTone =
    taskStatusUpper === "PICKED"
      ? "border-orange-500/50 bg-orange-500/[0.06]"
      : taskStatusUpper === "PACKED"
        ? "border-emerald-500/50 bg-emerald-500/[0.06]"
        : dispatchedOrComplete
          ? "border-sky-500/45 bg-sky-500/[0.07]"
          : "";
  const picklistStatusLabel =
    taskStatusUpper === "PICKED"
      ? "Picked — ready to pack"
      : taskStatusUpper === "PACKED"
        ? "Packed — ready to dispatch"
        : dispatchedOrComplete
          ? taskStatusUpper === "COMPLETED"
            ? "Complete — stock issued"
            : "Dispatched — stock issued from warehouse"
          : null;
  const qtyColumnLabel = packedOrLater ? "Packed" : "Picked";
  /** After dispatch, ledger avails already reflect issues — show delta only pre-dispatch. */
  const showAvailPickDelta = taskStatusUpper === "PICKED" || taskStatusUpper === "PACKED";
  const workflowHint = (() => {
    if (isCancelled) return "This task was cancelled.";
    if (taskStatusUpper === "PENDING") return "Start by confirming pick when line quantities are correct.";
    if (taskStatusUpper === "PICKED") return "Pick saved — adjust cartons if needed, then confirm pack.";
    if (taskStatusUpper === "PACKED") return "Packed — add courier/tracking and mark dispatched to issue stock from the fulfilment warehouse.";
    if (taskStatusUpper === "DISPATCHED")
      return "Dispatched — use Complete to close this warehouse task. The delivery note stays in transit until proof of delivery is recorded on the document.";
    if (taskStatusUpper === "COMPLETED")
      return "Task complete — customer receipt is recorded separately: open the delivery note and complete Record POD to mark it delivered.";
    return null;
  })();

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
              Quantities shown are <strong>available</strong> to pick (on hand minus reserved) for this warehouse — not the same as the branch switcher above. Updating it resets
              pick / pack progress until you confirm pick again.
              {task.coolCatchFulfilmentLocked
                ? " Cool Catch orgs use the main stock warehouse only; fulfilment site cannot be changed here."
                : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-w-lg">
            {fulfilmentWarehouseUi.isTerminal ? (
              <p className="text-sm text-muted-foreground">Warehouse cannot be changed after dispatch or completion.</p>
            ) : fulfilmentWarehouseUi.coolCatchLocked ? (
              <p className="text-sm text-muted-foreground">
                Fulfilment is locked to main stock. Edit the delivery note only while it is Draft to adjust routing; for Cool Catch
                the saved warehouse is always the primary stock location.
              </p>
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
                Available stock is showing in your <strong>MAIN</strong> (primary) warehouse — the fulfilment site above shows no
                available quantity. Either switch the fulfilment warehouse to MAIN / primary stock location, or move stock
                into the selected warehouse with a transfer.
              </p>
            ) : null}
            {pickPackStockHintMessage(task.stockLookupHint) ? (
              <p className="text-sm rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive">
                {pickPackStockHintMessage(task.stockLookupHint)}
                {task.productIdsWithoutStockLevels?.length ? (
                  <span className="mt-2 block font-mono text-xs opacity-90">
                    IDs without stock records: {task.productIdsWithoutStockLevels.join(", ")}
                  </span>
                ) : null}
              </p>
            ) : null}
            {task.suggestedFulfilmentWarehouseId &&
            task.suggestedFulfilmentWarehouseLabel &&
            !fulfilmentWarehouseUi.locked &&
            task.suggestedFulfilmentWarehouseId !== task.warehouseId ? (
              <div className="text-sm rounded-md border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-sky-950 dark:text-sky-100">
                <p>
                  Better <strong>available</strong> stock coverage at{" "}
                  <strong>{task.suggestedFulfilmentWarehouseLabel}</strong>. Switch fulfilment if you intend to pick there.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                  disabled={warehouseSaving || fulfilmentWarehouseUi.coolCatchLocked}
                  onClick={() => void handleWarehouseChange(task.suggestedFulfilmentWarehouseId!)}
                >
                  Use suggested warehouse
                </Button>
              </div>
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

        <Card className={picklistCardTone ? picklistCardTone : undefined}>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>Picklist</CardTitle>
              {picklistStatusLabel ? (
                <span
                  className={`rounded-md border px-2 py-0.5 text-xs font-medium ${
                    taskStatusUpper === "PICKED"
                      ? "border-orange-500/40 text-orange-800 dark:text-orange-200"
                      : taskStatusUpper === "PACKED"
                        ? "border-emerald-500/40 text-emerald-900 dark:text-emerald-100"
                        : "border-sky-500/35 text-sky-900 dark:text-sky-100"
                  }`}
                >
                  {picklistStatusLabel}
                </span>
              ) : null}
            </div>
            <CardDescription>
              Suggested bins and picked quantities come from backend execution records. Table columns use available quantity (on
              hand minus reserved), including inactive warehouses in &quot;All sites&quot;.
              {dispatchedOrComplete ? (
                <span className="mt-2 block font-medium text-foreground">
                  This shipment has been dispatched from stock; remaining columns still show ledger availability before this task&apos;s
                  quantities were issued.
                </span>
              ) : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead className="text-right">Avail. (warehouse)</TableHead>
                  <TableHead className="text-right">Avail. (MAIN)</TableHead>
                  <TableHead className="text-right">Avail. (all sites)</TableHead>
                  <TableHead className="text-right">Avail. at bin</TableHead>
                  <TableHead>Suggested bin</TableHead>
                  <TableHead>{qtyColumnLabel}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {task.lines.map((line) => {
                  const wh = line.onHandWarehouse;
                  const pm = line.onHandPrimaryWarehouse;
                  const ow = line.onHandOrgWide;
                  const atBin = line.onHandBin;
                  const pickedForDelta = line.pickedQty ?? 0;
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
                        <AvailWithPickDelta
                          value={wh}
                          pickedQty={pickedForDelta}
                          showDelta={showAvailPickDelta}
                        />
                      </TableCell>
                      <TableCell className={`text-right tabular-nums ${typeof pm === "number" && pm >= line.quantity ? "text-emerald-600/90" : ""}`}>
                        <AvailWithPickDelta
                          value={pm}
                          pickedQty={pickedForDelta}
                          showDelta={showAvailPickDelta}
                        />
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {typeof ow === "number" ? ow : "—"}
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

        {showStageStockCta ? (
          <Card className="border-sky-500/35">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Stock is in another site</CardTitle>
              <CardDescription>
                Fulfilment warehouse is short, but more quantity exists <strong>at other sites</strong>. Move what you can into this
                fulfilment warehouse in one step (internal transfer + receipt). Lines with no stock at the source are skipped; you
                can run again after other transfers.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                disabled={stagingLoading}
                onClick={() => {
                  void (async () => {
                    setStagingLoading(true);
                    try {
                      const r = await stagePickPackStock(task.id);
                      const partial = r.lines.filter((ln) => ln.moved < ln.need);
                      toast.success(`Stock staged — ${r.number}.${partial.length ? ` ${partial.length} line(s) partially moved.` : ""}`, {
                        description: `Open Warehouse → Transfers for ${r.number} (id ${r.transferId.slice(0, 8)}…).`,
                        duration: 8000,
                      });
                      await refresh();
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Staging failed.");
                    } finally {
                      setStagingLoading(false);
                    }
                  })();
                }}
              >
                {stagingLoading ? "Staging…" : "Stage stock to fulfilment warehouse"}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Pack</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Cartons count</Label>
                <Input value={cartons} onChange={(e) => setCartons(e.target.value)} />
                <p className="text-[11px] text-muted-foreground">Leave as 0 or empty to default to 1 when you confirm pack.</p>
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

        <div className="flex flex-col gap-2">
          {workflowHint ? <p className="text-xs text-muted-foreground">{workflowHint}</p> : null}
          <div className="flex flex-wrap gap-2">
          <Button
            disabled={!canConfirmPick}
            title={!canConfirmPick ? "Pick already confirmed or task is not pending." : undefined}
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
            disabled={!canConfirmPack}
            title={!canConfirmPack ? "Confirm pick first (or task is past packing)." : undefined}
            onClick={() =>
              void runWarehouseAction("Pack confirmed.", () =>
                runPickPackAction(task.id, {
                  action: "pack",
                  cartonsCount: Math.max(1, Number(cartons) || 1),
                  packingNote,
                })
              )
            }
          >
            Confirm pack
          </Button>
          <Button
            variant="secondary"
            disabled={!canDispatch}
            title={!canDispatch ? "Confirm pack first." : undefined}
            onClick={() => {
              void (async () => {
                try {
                  await runPickPackAction(task.id, {
                    action: "dispatch",
                    courier,
                    trackingRef,
                  });
                  toast.success("Dispatch recorded.");
                  await refresh();
                } catch (e) {
                  const err = e as Error & {
                    status?: number;
                    body?: {
                      error?: string;
                      shortLines?: Array<{ sku?: string; productId: string; need: number; available: number }>;
                    };
                  };
                  if (err.status === 400 && err.body?.shortLines?.length) {
                    const detail = err.body.shortLines
                      .map((s) => `${s.sku ?? s.productId}: need ${s.need}, here ${s.available}`)
                      .join(" · ");
                    toast.error(err.body.error ?? "Cannot dispatch.", { description: detail, duration: 14000 });
                  } else {
                    toast.error(err instanceof Error ? err.message : "Dispatch failed.");
                  }
                }
              })();
            }}
          >
            Mark dispatched
          </Button>
          <Button
            variant="outline"
            disabled={!canComplete}
            title={!canComplete ? "Mark dispatched first." : undefined}
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
      </div>
    </PageShell>
  );
}
