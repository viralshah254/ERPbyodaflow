"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeftRight, ArrowRight, CheckCircle2, Loader2, SlidersHorizontal, Warehouse } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeviceReadingPicker } from "@/components/manufacturing/device-reading-picker";
import { MaterialShortageNotice } from "@/components/manufacturing/material-shortage-notice";
import {
  postWorkOrderOperation,
  runManufacturingWorkOrderAction,
  type ManufacturingWorkOrder,
  type MaterialAvailabilityLine,
} from "@/lib/api/manufacturing";
import { completionInputDefaults, completionIssueShortages } from "@/lib/manufacturing/completion-inputs";
import { materialShortagesFromError, readableProductName, type MaterialShortageRow } from "@/lib/manufacturing/material-shortage";
import { postingAccountNotice } from "@/lib/inventory/posting-account-notice";
import { toastStockMoveError } from "@/lib/inventory/opening-cost-notice";
import { useHasPermission } from "@/lib/rbac/use-write-guard";
import { storeDisplayName } from "@/lib/warehouse/store-label";
import { cn } from "@/lib/utils";

const WASTE_REASONS = ["Burnt or over-baked", "Under-proofed or mis-shaped", "Spoilt mix or dough", "Packaging fault", "Floor spill or dropped", "Machine stoppage", "Trial or sample", "Other"];

const PHASE_TEXT = {
  release: "Reserving ingredients…",
  start: "Starting the batch…",
  operations: "Signing off bakery steps…",
  complete: "Receiving baked goods…",
} as const;

type Phase = keyof typeof PHASE_TEXT;

function fmt(n: number): string {
  return Number(n.toFixed(3)).toLocaleString();
}

/**
 * Bakeries record a batch after it leaves the oven, so release, start and complete
 * run as one posting chain behind a single action.
 */
export function BakeryBatchRecorder({
  order,
  availLines,
  availLoading,
  availError,
  storeNames,
  canApprove,
  transferHref,
  onOrderChange,
  onCompleted,
  onChangeStores,
  onCancelBatch,
}: {
  order: ManufacturingWorkOrder;
  availLines: MaterialAvailabilityLine[];
  availLoading: boolean;
  availError: string | null;
  storeNames: Record<string, string>;
  canApprove: boolean;
  transferHref?: string;
  onOrderChange: (order: ManufacturingWorkOrder) => void;
  onCompleted: (order: ManufacturingWorkOrder) => void;
  onChangeStores?: () => void;
  onCancelBatch?: () => void;
}) {
  const canQc = useHasPermission("inventory.qc.write");
  const mainOutput = order.outputLines.find((line) => line.productId === order.productId) ?? order.outputLines[0];
  const uom = mainOutput?.uom || "units";
  const productName = readableProductName(order.productName || mainOutput?.productName || mainOutput?.sku) || "this product";

  const [quantity, setQuantity] = React.useState(String(order.openQuantity));
  const [waste, setWaste] = React.useState("");
  const [wasteReason, setWasteReason] = React.useState("");
  const [measuredWeight, setMeasuredWeight] = React.useState("");
  const [deviceReadingId, setDeviceReadingId] = React.useState("");
  const [adjusting, setAdjusting] = React.useState(false);
  const [overrides, setOverrides] = React.useState<Record<string, string>>({});
  const [varianceReason, setVarianceReason] = React.useState("");
  const [phase, setPhase] = React.useState<Phase | null>(null);
  const [actionShortages, setActionShortages] = React.useState<MaterialShortageRow[]>([]);
  const [error, setError] = React.useState("");
  const retry = React.useRef<{ fingerprint: string; key: string }>();

  React.useEffect(() => {
    setQuantity(String(order.openQuantity));
    setOverrides({});
  }, [order.id, order.openQuantity]);

  const qty = Number(quantity);
  const defaults = React.useMemo(() => completionInputDefaults(order, qty), [order, qty]);
  const consumeFor = React.useCallback(
    (lineId: string) => overrides[lineId] ?? defaults[lineId]?.consume ?? "0",
    [overrides, defaults],
  );
  const actuals = React.useMemo(() => Object.fromEntries(order.materialLines.map((line) => {
    const consume = Number(consumeFor(line.lineId)) || 0;
    const held = Math.max(0, line.issuedQuantity - line.returnedQuantity - line.consumedQuantity);
    return [line.lineId, { issue: String(Math.max(0, Math.round((consume - held) * 1000) / 1000)), consume: String(consume), returnQty: "0" }];
  })), [order.materialLines, consumeFor]);
  const shortages = actionShortages.length ? actionShortages : completionIssueShortages(order, actuals, availLines);
  const onHandBy = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const line of availLines) map.set(`${line.productId}\0${line.warehouseId ?? ""}`, line.onHandQty);
    return map;
  }, [availLines]);

  const pendingQcSteps = (order.operationExecution ?? []).filter((step) => step.critical && step.qcRequired && step.status !== "COMPLETED");
  const busy = phase !== null;
  const done = order.status === "COMPLETED";
  const inputStores = [...new Set(order.materialLines.map((line) => storeDisplayName(line.warehouseId, line.warehouseName, storeNames)))];
  const outputStore = mainOutput ? storeDisplayName(mainOutput.warehouseId, mainOutput.warehouseName, storeNames) : "";
  const wasteQty = Number(waste);
  const weighs = order.measurementMode !== "COUNT_ONLY";
  const fromDevice = order.measurementMode === "DEVICE_SCALE" || order.measurementMode === "WEIGHBRIDGE";

  const blocker = (() => {
    if (order.postingGaps?.length) return "Set the posting accounts above before recording.";
    if (order.openingCosts?.length) return "Enter the opening cost shown above before recording.";
    if (availError) return availError;
    if (pendingQcSteps.length && !canQc) return `${pendingQcSteps.map((step) => step.name).join(", ")} needs a QC sign-off. Ask someone with QC access to record this batch.`;
    if (!(qty > 0)) return `Enter how many ${uom} were baked.`;
    if (qty > order.openQuantity + 1e-9) return `This batch is for up to ${fmt(order.openQuantity)} ${uom}. Record the extra as a new batch.`;
    if (wasteQty > 0 && !wasteReason) return "Pick why the waste happened.";
    if (weighs && order.weighingRequired && !(Number(measuredWeight) > 0)) return "Enter the measured weight.";
    if (fromDevice && !deviceReadingId.trim()) return "Pick the scale reading for this batch.";
    if (shortages.length) return "Some ingredients are short in their store. Move stock in or change the stores.";
    return "";
  })();

  async function record() {
    const fingerprint = JSON.stringify({ quantity, actuals, waste, wasteReason, measuredWeight, deviceReadingId, varianceReason });
    if (retry.current?.fingerprint !== fingerprint) retry.current = { fingerprint, key: crypto.randomUUID() };
    const idempotencyKey = retry.current.key;
    setError("");
    setActionShortages([]);
    let current = order;
    try {
      if (current.status === "DRAFT") {
        setPhase("release");
        current = await runManufacturingWorkOrderAction(current.id, { action: "release" });
        onOrderChange(current);
      }
      if (current.status === "RELEASED") {
        setPhase("start");
        current = await runManufacturingWorkOrderAction(current.id, { action: "start" });
        onOrderChange(current);
      }
      const steps = [...(current.operationExecution ?? [])].filter((step) => step.critical && step.status !== "COMPLETED").sort((a, b) => a.order - b.order);
      if (steps.length) setPhase("operations");
      for (const step of steps) {
        if (step.status === "PENDING") current = await postWorkOrderOperation(current.id, step.operationId, { status: "IN_PROGRESS" });
        current = await postWorkOrderOperation(current.id, step.operationId, {
          status: "COMPLETED",
          ...(step.qcRequired ? { qcOutcome: "ACCEPTED", qcReason: `Accepted when recording ${fmt(qty)} ${uom} baked` } : {}),
        });
      }
      if (steps.length) onOrderChange(current);
      setPhase("complete");
      const inputLines = current.materialLines.map((line) => {
        const consume = Number(consumeFor(line.lineId)) || 0;
        const held = Math.max(0, line.issuedQuantity - line.returnedQuantity - line.consumedQuantity);
        return {
          lineId: line.lineId,
          productId: line.productId,
          warehouseId: line.warehouseId,
          quantity: Math.max(0, Math.round((consume - held) * 1000) / 1000),
          consumedQuantity: consume,
          returnedQuantity: 0,
        };
      });
      current = await runManufacturingWorkOrderAction(current.id, {
        action: "complete",
        producedQuantity: qty,
        idempotencyKey,
        scrapQuantity: wasteQty > 0 ? wasteQty : undefined,
        wasteReason: wasteQty > 0 ? wasteReason : undefined,
        varianceReason: varianceReason.trim() || undefined,
        measuredWeight: weighs && measuredWeight ? Number(measuredWeight) : undefined,
        deviceReadingId: fromDevice ? deviceReadingId || undefined : undefined,
        inputLines,
        outputLines: current.outputLines.map((line) => ({
          lineId: line.lineId,
          productId: line.productId,
          warehouseId: line.warehouseId,
          quantity: Math.round(line.plannedQuantity * qty / current.quantity * 1000) / 1000,
        })),
      });
      retry.current = undefined;
      onOrderChange(current);
      setWaste(""); setWasteReason(""); setMeasuredWeight(""); setDeviceReadingId(""); setVarianceReason("");
      if (current.status === "COMPLETED") {
        toast.success(`${fmt(qty)} ${uom} ${productName} recorded into ${outputStore}.`);
        onCompleted(current);
      } else {
        toast.success(`${fmt(qty)} ${uom} recorded. ${fmt(current.openQuantity)} ${uom} still open on this batch.`);
      }
    } catch (err) {
      onOrderChange(current);
      const missing = materialShortagesFromError(err);
      if (missing?.length) {
        setActionShortages(missing);
        setError("Not enough stock in the ingredient store. Nothing was received.");
      } else {
        const posting = postingAccountNotice(err);
        if (posting) {
          toast.error(posting.message, { action: { label: "Open posting accounts", onClick: () => { window.location.href = posting.href; } }, duration: 12000 });
          setError(posting.message);
        } else {
          const message = err instanceof Error ? err.message : "Could not record this batch.";
          if (/yield variance/i.test(message)) setAdjusting(true);
          setError(message);
          toastStockMoveError(err, [...order.materialLines, ...order.outputLines], "Could not record this batch.");
        }
      }
    } finally {
      setPhase(null);
    }
  }

  if (done) {
    const produced = mainOutput?.producedQuantity ?? order.producedQuantity;
    return (
      <Card className="border-emerald-500/40">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" aria-hidden />
            <div>
              <p className="text-base font-semibold">{fmt(produced)} {uom} {productName} recorded</p>
              <p className="mt-1 text-sm text-muted-foreground">
                In {outputStore}
                {order.scrapQuantity > 0 ? ` · ${fmt(order.scrapQuantity)} ${uom} wasted` : ""}
                {order.completedAt ? ` · ${new Date(order.completedAt).toLocaleString()}` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {transferHref ? (
              <Button variant="outline" asChild><Link href={transferHref}><ArrowLeftRight className="mr-2 h-4 w-4" />Move to another store</Link></Button>
            ) : null}
            <Button variant="outline" asChild><Link href="/manufacturing/quality">Check in QC<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Record baked batch</CardTitle>
        <CardDescription>
          Enter what came out of the oven. The ingredients come off stock and the {productName} go into {outputStore || "the output store"}, all in one step.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5" data-arrow-nav="">
        {order.producedQuantity > 0 ? (
          <p className="rounded-md bg-muted/50 px-3 py-2 text-sm">
            {fmt(order.producedQuantity)} of {fmt(order.plannedQuantity)} {uom} already recorded. {fmt(order.openQuantity)} {uom} left.
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-1.5">
            <Label htmlFor="baked-quantity">How many were baked?</Label>
            <div className="relative">
              <Input
                id="baked-quantity"
                inputMode="decimal"
                type="number"
                min="0.001"
                max={order.openQuantity}
                step="0.001"
                className="h-12 pr-16 text-lg font-semibold tabular-nums"
                value={quantity}
                disabled={busy}
                onChange={(event) => { setQuantity(event.target.value); setOverrides({}); }}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{uom}</span>
            </div>
            <p className="text-xs text-muted-foreground">Planned {fmt(order.openQuantity)} {uom}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="baked-waste">Wasted <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <div className="relative">
              <Input
                id="baked-waste"
                inputMode="decimal"
                type="number"
                min="0"
                step="0.001"
                placeholder="0"
                className="h-12 pr-16 tabular-nums"
                value={waste}
                disabled={busy}
                onChange={(event) => setWaste(event.target.value)}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{uom}</span>
            </div>
            {wasteQty > 0 ? (
              <select
                aria-label="Why was it wasted?"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={wasteReason}
                disabled={busy}
                onChange={(event) => setWasteReason(event.target.value)}
              >
                <option value="">Why was it wasted?</option>
                {WASTE_REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
              </select>
            ) : null}
          </div>
          {weighs ? (
            <div className="space-y-1.5">
              <Label htmlFor="baked-weight">Measured weight</Label>
              <Input id="baked-weight" type="number" min="0.001" step="0.001" readOnly={fromDevice} value={measuredWeight} disabled={busy} onChange={(event) => setMeasuredWeight(event.target.value)} />
            </div>
          ) : null}
          {fromDevice ? (
            <DeviceReadingPicker workOrderId={order.id} value={deviceReadingId} onChange={(id, reading) => { setDeviceReadingId(id); setMeasuredWeight(reading == null ? "" : String(reading)); }} />
          ) : null}
        </div>

        <div className="flex items-start gap-3 rounded-lg border bg-muted/20 px-3 py-2.5 text-sm">
          <Warehouse className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <p className="min-w-0 flex-1">
            <span className="text-muted-foreground">Ingredients from </span>
            <span className="font-medium">{inputStores.join(", ") || "—"}</span>
            <span className="text-muted-foreground"> · goes to </span>
            <span className="font-medium">{outputStore || "—"}</span>
          </p>
          {onChangeStores ? (
            <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 px-2 text-primary" disabled={busy} onClick={onChangeStores}>Change</Button>
          ) : null}
        </div>

        {order.materialLines.length > 0 ? (
          <section aria-labelledby="baked-ingredients" className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 id="baked-ingredients" className="text-sm font-medium">Ingredients used</h3>
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2" disabled={busy} aria-pressed={adjusting} onClick={() => setAdjusting((value) => !value)}>
                <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />{adjusting ? "Use recipe amounts" : "Adjust amounts"}
              </Button>
            </div>
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left font-medium">Ingredient</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Uses</th>
                    <th scope="col" className="hidden px-3 py-2 text-right font-medium sm:table-cell">In stock</th>
                  </tr>
                </thead>
                <tbody>
                  {order.materialLines.map((line) => {
                    const onHand = onHandBy.get(`${line.productId}\0${line.warehouseId}`);
                    const short = shortages.some((row) => row.productId === line.productId && row.warehouseId === line.warehouseId);
                    return (
                      <tr key={line.lineId} className={cn("border-t", short && "bg-destructive/5")}>
                        <td className="px-3 py-2">
                          <span className="block font-medium">{readableProductName(line.productName || line.sku)}</span>
                          <span className="block text-xs text-muted-foreground">{storeDisplayName(line.warehouseId, line.warehouseName, storeNames)}</span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {adjusting ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Input
                                data-arrow-field="uses"
                                aria-label={`Amount of ${readableProductName(line.productName || line.sku)} used`}
                                className="h-8 w-24 text-right"
                                type="number"
                                min="0"
                                step="0.001"
                                value={consumeFor(line.lineId)}
                                disabled={busy}
                                onChange={(event) => setOverrides((current) => ({ ...current, [line.lineId]: event.target.value }))}
                              />
                              <span className="w-10 text-left text-xs text-muted-foreground">{line.uom}</span>
                            </div>
                          ) : (
                            <>{fmt(Number(consumeFor(line.lineId)) || 0)} <span className="text-muted-foreground">{line.uom}</span></>
                          )}
                        </td>
                        <td className={cn("hidden px-3 py-2 text-right tabular-nums sm:table-cell", short ? "font-medium text-destructive" : "text-muted-foreground")}>
                          {availLoading ? "…" : onHand == null ? "—" : fmt(onHand)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {adjusting && canApprove ? (
              <div className="space-y-1.5">
                <Label htmlFor="baked-variance">Reason for different amounts <span className="font-normal text-muted-foreground">(needed if outside the recipe tolerance of {order.bomSnapshot?.yieldTolerancePercent ?? 0}%)</span></Label>
                <Input id="baked-variance" value={varianceReason} disabled={busy} onChange={(event) => setVarianceReason(event.target.value)} />
              </div>
            ) : null}
          </section>
        ) : null}

        <MaterialShortageNotice title="These ingredients are short in their store." items={shortages} />
        {error ? <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p> : null}

        <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            {onCancelBatch ? <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onCancelBatch}>Cancel batch</Button> : null}
            {!busy && blocker ? <p className="text-xs text-muted-foreground" aria-live="polite">{blocker}</p> : null}
          </div>
          <Button size="lg" className="sm:min-w-56" disabled={busy || availLoading || Boolean(blocker)} onClick={() => void record()}>
            {busy ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{PHASE_TEXT[phase ?? "complete"]}</>
            ) : (
              <>Record {qty > 0 ? fmt(qty) : ""} {uom} baked</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
