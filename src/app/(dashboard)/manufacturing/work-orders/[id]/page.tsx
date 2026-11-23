"use client";
import { Table as InteractiveTable } from "@/components/ui/table";


import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  checkExistingWorkOrderAvailability,
  fetchManufacturingWorkOrder,
  runManufacturingWorkOrderAction,
  type ManufacturingWorkOrder,
  type MaterialAvailabilityLine,
} from "@/lib/api/manufacturing";
import { MaterialComponentLinks } from "@/components/manufacturing/material-component-links";
import { MaterialShortageNotice } from "@/components/manufacturing/material-shortage-notice";
import { materialShortagesFromError, readableProductName, type MaterialShortageRow } from "@/lib/manufacturing/material-shortage";
import { manufacturingAreaLabel, t } from "@/lib/terminology";
import { productionTerms } from "@/lib/manufacturing/production-language";
import { storeDisplayName } from "@/lib/warehouse/store-label";
import { isSeafoodOrg } from "@/config/industry";
import { useOrgContextStore, useTerminology } from "@/stores/orgContextStore";
import { useCanWriteInventory, useCanWriteManufacturing, useHasPermission } from "@/lib/rbac/use-write-guard";
import { transferPrefillHref } from "@/lib/warehouse/transfer-prefill";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { toastStockMoveError } from "@/lib/inventory/opening-cost-notice";
import { postingAccountNotice } from "@/lib/inventory/posting-account-notice";
import { openingCostsHref } from "@/lib/api/grn";
import { printProductionSheet } from "@/lib/manufacturing/production-sheet";
import { DeviceReadingPicker } from "@/components/manufacturing/device-reading-picker";
import { WorkOrderFloor } from "@/components/manufacturing/work-order-floor";
import { WorkOrderPreparation } from "@/components/manufacturing/work-order-preparation";
import { completionInputDefaults, completionIssueShortages } from "@/lib/manufacturing/completion-inputs";
import * as Icons from "lucide-react";

const STEPS = [
  { key: "DRAFT", label: "Draft" },
  { key: "RELEASED", label: "Released" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "COMPLETED", label: "Completed" },
] as const;

function stepIndex(status: string): number {
  if (status === "CANCELLED") return -1;
  const i = STEPS.findIndex((s) => s.key === status);
  return i >= 0 ? i : 0;
}

function canChangeStores(order: { status: string; producedQuantity: number; materialLines: Array<{ issuedQuantity: number; returnedQuantity: number; consumedQuantity: number }> }): boolean {
  if (order.status !== "RELEASED" && order.status !== "IN_PROGRESS") return false;
  if (order.producedQuantity > 1e-9) return false;
  return !order.materialLines.some((line) => line.issuedQuantity > 1e-9 || line.returnedQuantity > 1e-9 || line.consumedQuantity > 1e-9);
}

/** The finished output of a completed batch, ready to open as a transfer out of its output store. */
function outputTransfer(order: ManufacturingWorkOrder, storeNames: Record<string, string>) {
  const produced = order.outputLines.filter((line) => line.producedQuantity > 1e-9 && line.warehouseId);
  const main = produced.find((line) => line.productId === order.productId) ?? produced[0];
  if (!main) return null;
  const lines = produced.filter((line) => line.warehouseId === main.warehouseId);
  const quantity = (n: number) => Number(n.toFixed(3)).toLocaleString();
  return {
    href: transferPrefillHref({
      fromWarehouseId: main.warehouseId,
      lines: lines.map((line) => ({ productId: line.productId, quantity: line.producedQuantity })),
      reference: order.number,
    }),
    storeName: storeDisplayName(main.warehouseId, main.warehouseName, storeNames),
    summary: lines.map((line) => `${quantity(line.producedQuantity)} ${line.uom ?? ""} ${line.productName?.trim() || line.sku || "product"}`.replace(/\s+/g, " ").trim()).join(", "),
  };
}

export default function WorkOrderDetailPage() {
  const params = useParams();
  const rawId = params.id as string;
  const id = (() => {
    try {
      return decodeURIComponent(rawId);
    } catch {
      return rawId;
    }
  })();
  const router = useRouter();
  const canWrite = useCanWriteManufacturing();
  const canApprove = useHasPermission("manufacturing.production.approve");
  const canTransfer = useCanWriteInventory();
  const [transferOfferOpen, setTransferOfferOpen] = React.useState(false);
  const [varianceReason, setVarianceReason] = React.useState("");
  const [wasteQuantity, setWasteQuantity] = React.useState("");
  const [wasteReason, setWasteReason] = React.useState("");
  const completionRetry = React.useRef<{ fingerprint: string; key: string }>();
  const terminology = useTerminology();
  const woLabel = t("workOrder", terminology);
  const areaLabel = manufacturingAreaLabel(terminology);
  const templateId = useOrgContextStore((s) => s.templateId);
  const industryCategory = useOrgContextStore((s) => s.industryCategory);
  const seafoodOrg = isSeafoodOrg(templateId, industryCategory);
  const terms = productionTerms(templateId);

  const [order, setOrder] = React.useState<ManufacturingWorkOrder | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [acting, setActing] = React.useState(false);
  const [availLines, setAvailLines] = React.useState<MaterialAvailabilityLine[]>([]);
  const storeNames = React.useMemo(() => {
    const names: Record<string, string> = {};
    for (const line of availLines) {
      if (line.warehouseId && line.warehouseName) names[line.warehouseId] = line.warehouseName;
    }
    return names;
  }, [availLines]);
  const [availLoading, setAvailLoading] = React.useState(false);
  const [availError, setAvailError] = React.useState<string | null>(null);
  const [actionShortages, setActionShortages] = React.useState<MaterialShortageRow[]>([]);
  const [completionQuantity, setCompletionQuantity] = React.useState("");
  const [measuredWeight, setMeasuredWeight] = React.useState("");
  const [deviceReadingId, setDeviceReadingId] = React.useState("");
  const [actualInputs, setActualInputs] = React.useState<Record<string, { issue: string; consume: string; returnQty: string }>>({});
  const [restartToken, setRestartToken] = React.useState(0);
  const [pendingAction, setPendingAction] = React.useState<"reopen" | "cancel" | null>(null);

  function restartStores() {
    setRestartToken((current) => current + 1);
    document.getElementById("prepare-batch")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchManufacturingWorkOrder(id);
      completionRetry.current = undefined;
      setVarianceReason("");
      setOrder(next);
      setCompletionQuantity(String(next.openQuantity));
      setActualInputs(completionInputDefaults(next, next.openQuantity));
      setWasteQuantity(""); setWasteReason("");
      setMeasuredWeight(""); setDeviceReadingId("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load work order.");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  React.useEffect(() => {
    if (!order?.bomId || order.status === "COMPLETED" || order.status === "CANCELLED") {
      setAvailLines([]);
      return;
    }
    let cancelled = false;
    setAvailLoading(true);
    setAvailError(null);
    void checkExistingWorkOrderAvailability(order.id)
      .then((result) => {
        if (!cancelled) setAvailLines(result.lines);
      })
      .catch((error) => {
        if (!cancelled) { setAvailLines([]); setAvailError(error instanceof Error ? error.message : "Availability check failed. Retry before release."); }
      })
      .finally(() => {
        if (!cancelled) setAvailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [order?.id, order?.bomId, order?.quantity, order?.status, order?.materialLines]);

  const shortfalls = availLines.filter((line) => line.shortfall > 0);
  const issueShortages = order ? completionIssueShortages(order, actualInputs, availLines) : [];
  const recipeShortages: MaterialShortageRow[] = shortfalls.map((line) => ({
    productId: line.productId,
    productName: line.productName,
    productSku: line.productSku,
    barcode: line.barcode,
    warehouseId: line.warehouseId,
    warehouseName: line.warehouseName,
    needed: line.requiredQty,
    onHand: line.onHandQty,
    short: line.shortfall,
    uom: line.uom,
  }));
  const blockingShortages = actionShortages.length ? actionShortages : issueShortages;
  const currentStep = order ? stepIndex(order.status) : 0;

  async function runAction(action: "release" | "start" | "complete" | "cancel" | "reopen") {
    if (!order) return;
    setActing(true);
    setActionShortages([]);
    const fingerprint = JSON.stringify({ completionQuantity, actualInputs, measuredWeight, deviceReadingId, varianceReason });
    if (completionRetry.current?.fingerprint !== fingerprint) completionRetry.current = { fingerprint, key: crypto.randomUUID() };
    try {
      const next = await runManufacturingWorkOrderAction(order.id, {
        action,
        producedQuantity:
          action === "complete"
            ? Number(completionQuantity)
            : undefined,
        idempotencyKey: action === "complete" ? completionRetry.current.key : undefined,
        scrapQuantity: action === "complete" && Number(wasteQuantity) > 0 ? Number(wasteQuantity) : undefined,
        wasteReason: action === "complete" && Number(wasteQuantity) > 0 ? wasteReason.trim() || undefined : undefined,
        varianceReason: action === "complete" ? varianceReason : undefined,
        measuredWeight: action === "complete" && measuredWeight ? Number(measuredWeight) : undefined,
        deviceReadingId: action === "complete" ? deviceReadingId || undefined : undefined,
        inputLines: action === "complete" ? order.materialLines.map((line) => ({
          lineId: line.lineId,
          productId: line.productId,
          warehouseId: line.warehouseId,
          quantity: Number(actualInputs[line.lineId]?.issue ?? 0),
          consumedQuantity: Number(actualInputs[line.lineId]?.consume ?? 0),
          returnedQuantity: Number(actualInputs[line.lineId]?.returnQty ?? 0),
        })) : undefined,
        outputLines: action === "complete" ? order.outputLines.map((line) => ({
          lineId: line.lineId,
          productId: line.productId,
          warehouseId: line.warehouseId,
          quantity: Math.round(line.plannedQuantity * Number(completionQuantity) / order.quantity * 1000) / 1000,
        })) : undefined,
      });
      setOrder(next);
      setCompletionQuantity(String(next.openQuantity));
      setActualInputs(completionInputDefaults(next, next.openQuantity));
      if (action === "complete") { setWasteQuantity(""); setWasteReason(""); }
      toast.success(
        action === "release"
          ? "Released. Floor can start this batch."
          : action === "start"
            ? "Marked in progress."
            : action === "complete"
              ? (next.status === "COMPLETED" ? "Production completed. Finished goods received; check QC before dispatch." : "Partial production posted. Remaining quantities updated; check received goods in QC.")
              : action === "reopen"
                ? "Back to draft. Change the output store, save, then release again."
                : "Cancelled."
      );
      if (action === "complete") { setMeasuredWeight(""); setDeviceReadingId(""); }
      if (action === "complete" && next.status === "COMPLETED" && canTransfer) setTransferOfferOpen(true);
      if (action === "reopen") window.setTimeout(() => document.getElementById("prepare-batch")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
      if (action === "cancel") router.push("/manufacturing/work-orders");
    } catch (error) {
      const shortages = materialShortagesFromError(error);
      if (shortages?.length) {
        setActionShortages(shortages);
        toast.error("Not enough stock in the store on this batch.");
      } else {
        const posting = postingAccountNotice(error);
        if (posting) {
          toast.error(posting.message, { action: { label: "Open posting accounts", onClick: () => { window.location.href = posting.href; } }, duration: 12000 });
        } else {
          toastStockMoveError(error, [...(order?.materialLines ?? []), ...(order?.outputLines ?? [])], "Action failed.");
        }
      }
    } finally {
      setActing(false);
    }
  }

  const productName = order?.productName?.trim() || order?.productId || "";
  const transfer = order?.status === "COMPLETED" && canTransfer ? outputTransfer(order, storeNames) : null;
  const productBarcode = order?.productBarcode?.trim();

  return (
    <PageShell>
      <PageHeader
        title={loading ? woLabel : (order?.number ?? woLabel)}
        description={
          loading
            ? "Loading…"
            : order
              ? (
                  <>
                    <span className="block">{productName}</span>
                    {productBarcode ? (
                      <span className="mt-0.5 block font-mono text-xs">{productBarcode}</span>
                    ) : null}
                    <span className="mt-1 block">
                      Walk this batch through release, start, and complete — not from the list.
                    </span>
                  </>
                )
              : "Work order not found."
        }
        breadcrumbs={[
          { label: areaLabel, href: "/manufacturing/work-orders" },
          { label: woLabel, href: "/manufacturing/work-orders" },
          { label: order?.number ?? "Detail" },
        ]}
        sticky
        actions={
          <>
          <Button variant="outline" size="sm" disabled={!order?.materialLines.length} onClick={() => {
            if (!order) return;
            try { printProductionSheet(order); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not print production sheet."); }
          }}><Icons.Printer className="mr-2 h-4 w-4" />Print / save production PDF</Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/manufacturing/work-orders">
              <Icons.ArrowLeft className="mr-2 h-4 w-4" />
              All work orders
            </Link>
          </Button>
          </>
        }
      />

      <div className="space-y-6 p-4 sm:p-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading work order…</p>
        ) : !order ? (
          <p className="text-sm text-muted-foreground">This work order does not exist or you cannot open it.</p>
        ) : (
          <>
            {order.status !== "COMPLETED" && order.status !== "CANCELLED" && (order.postingGaps?.length || order.openingCosts?.length) ? (
              <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-sm">
                {order.postingGaps?.length ? (
                  <p>{order.postingGaps.map((gap) => gap.label).join(" and ")} {order.postingGaps.length === 1 ? "is" : "are"} not set, so this batch cannot be received yet. <Link href="/settings/financial/posting-mappings" className="font-medium underline">Open posting accounts</Link></p>
                ) : null}
                {order.openingCosts?.length ? (
                  <p>{order.openingCosts.map((product) => product.name && product.code ? `${product.name} (${product.code})` : product.name || product.code).join(", ")} already {order.openingCosts.length === 1 ? "has" : "have"} stock, but no opening cost. <Link href={openingCostsHref(order.openingCosts)} className="font-medium underline">Enter opening cost</Link></p>
                ) : null}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-primary/5 p-4"><div><p className="text-sm font-medium">{order.status === "DRAFT" ? "Prepare, then release to the production team" : order.status === "RELEASED" ? "Released to production · ready for the floor to start" : order.status === "IN_PROGRESS" ? "Record verified actual output before receiving stock" : "Finished output and quality release"}</p><p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">Completion consumes materials and receives the output into the selected store. That store has to be a shelf store, or the quantity shows as 0. Plants that use quality control hold the lot until QC accepts it. Do not add the output again with a stock adjustment.</p></div><div className="flex flex-wrap gap-2">{transfer && <Button variant="outline" asChild><Link href={transfer.href}><Icons.ArrowLeftRight className="mr-2 h-4 w-4" />Move to another store</Link></Button>}{order.producedQuantity > 0 && <Button variant="outline" asChild><Link href="/manufacturing/quality">Review finished lots in QC<Icons.ArrowRight className="ml-2 h-4 w-4" /></Link></Button>}</div></div>
            {canWrite && order.status === "DRAFT" && <div id="prepare-batch"><WorkOrderPreparation order={order} restartToken={restartToken} onSaved={(next) => { setOrder(next); setCompletionQuantity(String(next.openQuantity)); setActualInputs(completionInputDefaults(next, next.openQuantity)); }} /></div>}
            {canWrite && ["RELEASED", "IN_PROGRESS", "COMPLETED"].includes(order.status) && <WorkOrderFloor order={order} storeNames={storeNames} onSaved={(next) => { setOrder(next); setCompletionQuantity(String(next.openQuantity)); setActualInputs(completionInputDefaults(next, next.openQuantity)); }} />}
            <Card data-tutorial-hint="work-order-lifecycle">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center gap-3">
                  <CardTitle className="text-lg">Production steps</CardTitle>
                  <StatusBadge status={order.status} />
                </div>
                <CardDescription>
                  Planned {order.plannedQuantity} · produced {order.producedQuantity} · open {order.openQuantity}
                  {order.bomName ? ` · BOM ${order.bomName}` : ""}
                  {order.routingName ? ` · routing ${order.routingName}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {order.status === "CANCELLED" ? (
                  <p className="text-sm text-muted-foreground">This work order was cancelled.</p>
                ) : (
                  <ol className="grid gap-3 sm:grid-cols-4">
                    {STEPS.map((step, i) => {
                      const done = currentStep > i;
                      const current = currentStep === i;
                      return (
                        <li
                          key={step.key}
                          className={cn(
                            "rounded-xl border px-3 py-3",
                            current && "border-primary bg-primary/10",
                            done && "border-emerald-500/40 bg-emerald-500/5",
                            !current && !done && "border-border bg-muted/30"
                          )}
                        >
                          <p className="text-xs font-medium text-muted-foreground">Step {i + 1}</p>
                          <p className="text-sm font-semibold">{step.label}</p>
                        </li>
                      );
                    })}
                  </ol>
                )}

                {canWrite && order.status !== "COMPLETED" && order.status !== "CANCELLED" ? (
                  <div className="space-y-4">
                    {order.status === "IN_PROGRESS" && (
                      <div
                        className="grid gap-3 rounded-lg border p-3 sm:grid-cols-3"
                        data-tutorial-hint="work-order-measurement"
                      >
                        <div className="space-y-1.5">
                          <Label htmlFor="completion-quantity">Actual verified output ({order.outputLines.find((line) => line.productId === order.productId)?.uom || "product units"})</Label>
                          <Input id="completion-quantity" type="number" min="0.001" max={order.openQuantity} step="0.001" value={completionQuantity} onChange={(event) => {
                            const value = event.target.value;
                            setCompletionQuantity(value);
                            setActualInputs(completionInputDefaults(order, Number(value)));
                          }} />
                        </div>
                        {order.measurementMode !== "COUNT_ONLY" && (
                          <div className="space-y-1.5">
                            <Label htmlFor="measured-weight">Measured weight</Label>
                            <Input id="measured-weight" readOnly={order.measurementMode === "DEVICE_SCALE" || order.measurementMode === "WEIGHBRIDGE"} type="number" min="0.001" step="0.001" value={measuredWeight} onChange={(event) => setMeasuredWeight(event.target.value)} />
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <Label htmlFor="waste-quantity">Waste ({order.outputLines.find((line) => line.productId === order.productId)?.uom || "product units"})</Label>
                          <Input id="waste-quantity" type="number" min="0" step="0.001" value={wasteQuantity} onChange={(event) => setWasteQuantity(event.target.value)} placeholder="0" />
                        </div>
                        {Number(wasteQuantity) > 0 && (
                          <div className="space-y-1.5">
                            <Label htmlFor="waste-reason">Why was it wasted?</Label>
                            <select id="waste-reason" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={wasteReason} onChange={(event) => setWasteReason(event.target.value)}>
                              <option value="">Choose a reason</option>
                              {["Burnt or over-baked", "Under-proofed or mis-shaped", "Spoilt mix or dough", "Packaging fault", "Floor spill or dropped", "Machine stoppage", "Trial or sample", "Other"].map((r) => <option key={r} value={r}>{r}</option>)}
                            </select>
                          </div>
                        )}
                        {(order.measurementMode === "DEVICE_SCALE" || order.measurementMode === "WEIGHBRIDGE") && (
                          <DeviceReadingPicker workOrderId={order.id} value={deviceReadingId} onChange={(id, quantity) => { setDeviceReadingId(id); setMeasuredWeight(quantity == null ? "" : String(quantity)); }} />
                        )}
                        <p className="text-xs text-muted-foreground sm:col-span-3">
                          {order.measurementMode === "COUNT_ONLY" ? "Weighing is optional and disabled for this order." : `Mode: ${order.measurementMode.replaceAll("_", " ").toLowerCase()}.`}
                        </p>
                        {order.materialLines.length > 0 && (
                          <div className="overflow-x-auto sm:col-span-3">
                            <InteractiveTable className="w-full min-w-[34rem] text-xs">
                              <thead><tr className="border-b text-muted-foreground"><th className="py-2 text-left">Material / store</th><th>Issue</th><th>Consume</th><th>Return</th></tr></thead>
                              <tbody>
                                {order.materialLines.map((line) => (
                                  <tr key={line.lineId} className="border-b last:border-0">
                                    <td className="py-2 pr-2">
                                      <span className="block font-medium">{readableProductName(line.productName || line.sku)}</span>
                                      {line.barcode?.trim() ? (
                                        <span className="block font-mono text-[11px] text-muted-foreground">
                                          {line.barcode.trim()}
                                        </span>
                                      ) : null}
                                      <span className="block text-muted-foreground">{storeDisplayName(line.warehouseId, line.warehouseName, storeNames)}</span>
                                    </td>
                                    {(["issue", "consume", "returnQty"] as const).map((field) => (
                                      <td key={field} className="p-1">
                                        <Input
                                          className="h-8 min-w-24"
                                          type="number"
                                          min="0"
                                          step="0.001"
                                          value={actualInputs[line.lineId]?.[field] ?? "0"}
                                          onChange={(event) => setActualInputs((current) => ({
                                            ...current,
                                            [line.lineId]: { ...(current[line.lineId] ?? { issue: "0", consume: "0", returnQty: "0" }), [field]: event.target.value },
                                          }))}
                                        />
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </InteractiveTable>
                          </div>
                        )}
                      </div>
                    )}
                    {canApprove && ["RELEASED", "IN_PROGRESS"].includes(order.status) && <label className="block text-sm">Supervisor yield-variance approval reason (tolerance {order.bomSnapshot?.yieldTolerancePercent ?? 0}%)<Input value={varianceReason} onChange={(event) => setVarianceReason(event.target.value)} /></label>}
                    <MaterialShortageNotice
                      title={actionShortages.length ? "Receiving needs these ingredients in the store first." : "These ingredients are short for this receive."}
                      items={blockingShortages}
                    />
                    <div className="flex flex-wrap gap-2">
                    {order.status === "DRAFT" && (
                      <Button size="sm" disabled={acting || !order.materialLines.length || !order.outputLines.length || Boolean(availError) || availLoading || shortfalls.length > 0} onClick={() => void runAction("release")}>
                        Release to production
                      </Button>
                    )}
                    {order.status === "DRAFT" && shortfalls.length > 0 && (
                      <Button size="sm" variant="outline" disabled={acting} onClick={restartStores}>
                        Restart input and output stores
                      </Button>
                    )}
                    {order.status === "RELEASED" && (
                      <Button size="sm" variant="outline" disabled={acting} onClick={() => void runAction("start")}>
                        Start production
                      </Button>
                    )}
                    {canChangeStores(order) && (
                      <Button size="sm" variant="outline" disabled={acting} onClick={() => setPendingAction("reopen")}>
                        Change stores
                      </Button>
                    )}
                    {order.status === "IN_PROGRESS" && (
                      <Button
                        size="sm"
                        disabled={acting || Boolean(order.postingGaps?.length) || Boolean(order.openingCosts?.length) || order.operationExecution?.some((step) => step.critical && (step.status !== "COMPLETED" || (step.qcRequired && step.qcOutcome !== "ACCEPTED"))) || issueShortages.length > 0 || availLoading || Boolean(availError) || !(Number(completionQuantity) > 0) || Number(completionQuantity) > order.openQuantity || (order.weighingRequired && order.measurementMode !== "COUNT_ONLY" && !(Number(measuredWeight) > 0)) || ((order.measurementMode === "DEVICE_SCALE" || order.measurementMode === "WEIGHBRIDGE") && !deviceReadingId.trim())}
                        onClick={() => void runAction("complete")}
                      >
                        Receive actual output · QC hold
                      </Button>
                    )}
                    {(order.status === "DRAFT" || order.status === "RELEASED") && (
                      <Button size="sm" variant="ghost" disabled={acting || order.producedQuantity > 0 || order.materialLines.some((line) => line.issuedQuantity - line.returnedQuantity - line.consumedQuantity > 1e-9)} onClick={() => setPendingAction("cancel")}>
                        Cancel batch
                      </Button>
                    )}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {order.status !== "COMPLETED" && order.status !== "CANCELLED" ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Materials in the warehouse</CardTitle>
                  <CardDescription>
                    Completing issues real on-hand stock. Production Plan “Covered” can include other work orders
                    that are not finished yet — those are not in the warehouse until you complete them first
                    {seafoodOrg
                      ? " (for example process whole fish before packing fillets)."
                      : " (process components before packing the finished SKU)."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!order.bomId ? (
                    <p className="text-sm text-muted-foreground">No BOM is linked, so availability cannot be checked here.</p>
                  ) : availLoading ? (
                    <p className="text-sm text-muted-foreground">Checking on-hand…</p>
                  ) : availError ? (
                    <p role="alert" className="text-sm text-destructive">{availError}</p>
                  ) : availLines.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No BOM components to issue.</p>
                  ) : (
                    <>
                      {recipeShortages.length > 0 ? (
                        <div className="mb-3 space-y-3">
                          <MaterialShortageNotice
                            title="These ingredients are low in the store on this batch."
                            items={recipeShortages}
                          />
                          {order.status === "DRAFT" && canWrite ? (
                            <Button size="sm" variant="outline" disabled={acting} onClick={restartStores}>Restart input and output stores</Button>
                          ) : null}
                        </div>
                      ) : (
                        <p className="mb-3 text-sm text-muted-foreground">{terms.covered}</p>
                      )}
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Component</TableHead>
                            <TableHead>Store</TableHead>
                            <TableHead className="text-right">Required</TableHead>
                            <TableHead className="text-right">On hand</TableHead>
                            <TableHead className="text-right">Short</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {availLines.map((line) => (
                            <TableRow key={`${line.productId}-${line.warehouseId ?? ""}`} className={line.shortfall > 0 ? "bg-destructive/10" : undefined}>
                              <TableCell>
                                <MaterialComponentLinks line={line} />
                              </TableCell>
                              <TableCell className="text-muted-foreground">{line.warehouseName ?? "—"}</TableCell>
                              <TableCell className="text-right tabular-nums">
                                {line.requiredQty} {line.uom}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">{line.onHandQty}</TableCell>
                              <TableCell className="text-right tabular-nums">
                                {line.shortfall > 0 ? line.shortfall : "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : null}

            <Card data-tutorial-hint="work-order-reconciliation">
              <CardHeader>
                <CardTitle className="text-lg">Production reconciliation</CardTitle>
                <CardDescription>Actual WIP, mass, count, and cost closure from posted partial completions.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <p>WIP <strong className="block tabular-nums">{order.wipQuantity}</strong></p>
                <p>Mass variance <strong className="block tabular-nums">{order.reconciliation.massVariance}</strong></p>
                <p>Count variance <strong className="block tabular-nums">{order.reconciliation.countVariance}</strong></p>
                <p>Cost variance <strong className="block tabular-nums">{order.reconciliation.costVariance}</strong></p>
                <p className="text-muted-foreground sm:col-span-2 lg:col-span-4">
                  {order.completions.length} completion posting{order.completions.length === 1 ? "" : "s"} · snapshots and posting history are immutable.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
      <ConfirmDialog
        open={transferOfferOpen && Boolean(transfer)}
        onOpenChange={setTransferOfferOpen}
        title="Move the output to another store?"
        description={transfer ? `${transfer.summary} went into ${transfer.storeName}. Open a transfer with these quantities filled in? You can skip this and transfer later.` : undefined}
        confirmLabel="Open transfer"
        cancelLabel="Not now"
        onConfirm={() => { if (transfer) router.push(transfer.href); }}
      />
      <ConfirmDialog
        open={pendingAction !== null}
        onOpenChange={(open) => { if (!open) setPendingAction(null); }}
        title={pendingAction === "cancel" ? "Cancel this batch?" : "Change the stores?"}
        description={pendingAction === "cancel" ? "Cancel closes this batch. To change the output store, use Change stores." : "This returns the batch to draft and releases the reserved ingredients. You can then change the output store."}
        confirmLabel={pendingAction === "cancel" ? "Cancel batch" : "Change stores"}
        cancelLabel="Keep this batch"
        variant={pendingAction === "cancel" ? "destructive" : "default"}
        onConfirm={() => { if (pendingAction) void runAction(pendingAction); }}
      />
    </PageShell>
  );
}
