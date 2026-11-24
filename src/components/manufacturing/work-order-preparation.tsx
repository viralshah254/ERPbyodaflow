"use client";
import { Table as InteractiveTable } from "@/components/ui/table";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StorePicker, storeOptionLabel } from "@/components/manufacturing/store-picker";
import { fetchAllWarehousesApi, type BackendWarehouse } from "@/lib/api/warehouses";
import { fetchInputStoreRecommendation, previewWorkOrderPreparation, saveWorkOrderPreparation, type InputStoreRecommendation, type ManufacturingWorkOrder, type WorkOrderPreparationPreview } from "@/lib/api/manufacturing";
import { compareStoresForBatch, recommendOutputStore } from "@/lib/manufacturing/store-list-order";

function recommendationReason(recommendation: InputStoreRecommendation): string {
  const covered = recommendation.lines.filter((line) => line.covered).map((line) => line.productName || "ingredient");
  const short = recommendation.lines.filter((line) => !line.covered).map((line) => line.productName || "ingredient");
  const held = covered.length ? covered.join(", ") : "part of the ingredients";
  const missing = short.length ? ` Still short: ${short.join(", ")}.` : "";
  return `Input store. Has ${recommendation.linesCovered} of ${recommendation.linesNeeded} ingredients this batch needs: ${held}.${missing}`;
}

export function WorkOrderPreparation({
  order,
  onSaved,
  restartToken = 0,
  quick = false,
  onCancel,
}: {
  order: ManufacturingWorkOrder;
  onSaved: (order: ManufacturingWorkOrder) => void;
  restartToken?: number;
  /** Save straight after the server preview, for flows where the review table adds nothing. */
  quick?: boolean;
  onCancel?: () => void;
}) {
  const [stores, setStores] = React.useState<BackendWarehouse[]>([]);
  const [storesLoading, setStoresLoading] = React.useState(true);
  const [inputs, setInputs] = React.useState<string[]>(order.preparationDefaults?.inputWarehouseIds || [...new Set((order.materialLines ?? []).map((line) => line.warehouseId))]);
  const [output, setOutput] = React.useState(order.preparationDefaults?.outputWarehouseId || order.outputLines?.[0]?.warehouseId || "");
  const [preview, setPreview] = React.useState<WorkOrderPreparationPreview | null>(null);
  const [recommendation, setRecommendation] = React.useState<InputStoreRecommendation | null>(null);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    void fetchAllWarehousesApi()
      .then((rows) => setStores(rows.filter((row) => row.status !== "INACTIVE")))
      .catch((error) => toast.error(error.message))
      .finally(() => setStoresLoading(false));
  }, []);
  React.useEffect(() => {
    let cancelled = false;
    void fetchInputStoreRecommendation(order.id)
      .then((next) => { if (!cancelled) setRecommendation(next); })
      .catch(() => { if (!cancelled) setRecommendation(null); });
    return () => { cancelled = true; };
  }, [order.id]);
  React.useEffect(() => {
    if (!restartToken) return;
    setInputs([]);
    setOutput("");
    setPreview(null);
  }, [restartToken]);
  async function run(commit: boolean) {
    setBusy(true);
    try {
      const selected = { inputWarehouseIds: inputs, outputWarehouseId: output };
      if (quick) {
        const next = await previewWorkOrderPreparation(order.id, selected);
        onSaved(await saveWorkOrderPreparation(order.id, selected, next));
        toast.success("Stores saved.");
      } else if (commit && preview) {
        onSaved(await saveWorkOrderPreparation(order.id, selected, preview));
        setPreview(null); toast.success("Batch prepared. Review materials, print, then release when stock is ready.");
      } else setPreview(await previewWorkOrderPreparation(order.id, selected));
    } catch (error) { setPreview(null); toast.error(error instanceof Error ? error.message : "Preparation failed"); }
    finally { setBusy(false); }
  }
  const catalog = React.useMemo(() => (
    recommendation && !stores.some((store) => store.id === recommendation.warehouseId)
      ? [{ id: recommendation.warehouseId, code: recommendation.code, name: recommendation.name || recommendation.code || "Recommended store", status: "ACTIVE" } as BackendWarehouse, ...stores]
      : stores
  ), [recommendation, stores]);
  const recommendedId = recommendation?.warehouseId;
  const reason = recommendation ? recommendationReason(recommendation) : "";
  const savedOutputId = order.preparationDefaults?.outputWarehouseId || order.outputLines?.[0]?.warehouseId;
  const outputRecommendation = recommendOutputStore(catalog, savedOutputId);
  const outputRecommendedId = outputRecommendation?.id;
  const outputReason = "Shelf store. A completed batch shows on the shelf when it is received into Storage, Receiving, or Dispatch.";
  const sortedInputs = React.useMemo(() => [...catalog].sort((a, b) => compareStoresForBatch(a, b, recommendedId, storeOptionLabel)), [catalog, recommendedId]);
  const sortedOutputs = React.useMemo(() => [...catalog].sort((a, b) => compareStoresForBatch(a, b, outputRecommendedId, storeOptionLabel)), [catalog, outputRecommendedId]);
  React.useEffect(() => {
    if (output || !outputRecommendedId) return;
    setOutput(outputRecommendedId);
  }, [output, outputRecommendedId]);

  const pickers = (
    <div className="grid gap-4 md:grid-cols-2">
      <StorePicker
        mode="multiple"
        label={quick ? "Ingredients come from" : "Input stores"}
        hint={inputs.length ? undefined : "Pick every store the ingredients are taken from."}
        stores={sortedInputs}
        loading={storesLoading}
        disabled={busy}
        value={inputs}
        onChange={(ids) => { setInputs(ids); setPreview(null); }}
        recommendedId={recommendedId}
        recommendedReason={reason}
        searchPlaceholder="Find an input store"
      />
      <StorePicker
        mode="single"
        label={quick ? "Baked goods go to" : "Output store"}
        hint={output ? undefined : "The finished batch is received here. Shelf stores are listed first."}
        stores={sortedOutputs}
        loading={storesLoading}
        disabled={busy}
        value={output}
        onChange={(id) => { setOutput(id); setPreview(null); }}
        recommendedId={outputRecommendedId}
        recommendedReason={outputReason}
        searchPlaceholder="Find an output store"
      />
    </div>
  );

  if (quick) {
    return <Card><CardHeader><CardTitle>Where does this batch use and keep stock?</CardTitle><CardDescription>Pick the stores once. You record what was baked next.</CardDescription></CardHeader><CardContent className="space-y-4">
      {pickers}
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy || !inputs.length || !output} onClick={() => void run(true)}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save stores
        </Button>
        {onCancel ? <Button variant="ghost" disabled={busy} onClick={onCancel}>Cancel</Button> : null}
      </div>
    </CardContent></Card>;
  }

  return <Card><CardHeader><CardTitle>Prepare this batch</CardTitle><CardDescription>Select stores, review the frozen recipe requirements, then save. Preparation does not reserve or move stock.</CardDescription></CardHeader><CardContent className="space-y-4">
    {pickers}
    <Button disabled={busy || !inputs.length || !output} variant="outline" onClick={() => void run(false)}>Preview preparation</Button>
    {preview && <div className="space-y-3"><p className="text-sm">Recipe {preview.prepared.bomSnapshot?.name} · version {preview.prepared.bomSnapshot?.version} · planned output {order.plannedQuantity}</p><div className="overflow-x-auto"><InteractiveTable className="w-full text-sm"><thead><tr><th className="text-left">Ingredient</th><th className="text-left">Store</th><th className="text-left">Required</th><th className="text-left">Eligible stock</th><th className="text-left">Released, dated lots (preview)</th></tr></thead><tbody>{preview.prepared.materialLines.map((line) => <tr key={line.lineId}><td>{line.productName || line.productId}</td><td>{line.warehouseName || line.warehouseId}</td><td>{line.plannedQuantity} {line.uom}</td><td>{preview.availability?.find((row) => row.productId === line.productId && row.warehouseId === line.warehouseId)?.quantity ?? 0} {line.uom}</td><td>{preview.eligibleLots?.filter((lot) => lot.productId === line.productId && lot.warehouseId === line.warehouseId).map((lot) => `${lot.lotNumber}: ${lot.remainingQuantity}, expires ${lot.expiryDate.slice(0, 10)}`).join("; ") || "No dated lot listed"}</td></tr>)}</tbody></InteractiveTable></div><p className="text-sm text-muted-foreground">Availability is rechecked on release. Dependent batches must be completed and QC accepted before their outputs can be issued.</p><Button disabled={busy} onClick={() => void run(true)}>Save reviewed preparation</Button></div>}
  </CardContent></Card>;
}
