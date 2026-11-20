"use client";
import { Table as InteractiveTable } from "@/components/ui/table";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchAllWarehousesApi, type BackendWarehouse } from "@/lib/api/warehouses";
import { fetchInputStoreRecommendation, previewWorkOrderPreparation, saveWorkOrderPreparation, type InputStoreRecommendation, type ManufacturingWorkOrder, type WorkOrderPreparationPreview } from "@/lib/api/manufacturing";
import { compareStoresForBatch, recommendOutputStore } from "@/lib/manufacturing/store-list-order";

function storeLabel(store: { code?: string; name?: string }): string {
  return [store.code, store.name].filter(Boolean).join(" ");
}

function recommendationReason(recommendation: InputStoreRecommendation): string {
  const covered = recommendation.lines.filter((line) => line.covered).map((line) => line.productName || "ingredient");
  const short = recommendation.lines.filter((line) => !line.covered).map((line) => line.productName || "ingredient");
  const held = covered.length ? covered.join(", ") : "part of the ingredients";
  const missing = short.length ? ` Still short: ${short.join(", ")}.` : "";
  return `Input store. Has ${recommendation.linesCovered} of ${recommendation.linesNeeded} ingredients this batch needs: ${held}.${missing}`;
}

export function WorkOrderPreparation({ order, onSaved, restartToken = 0 }: { order: ManufacturingWorkOrder; onSaved: (order: ManufacturingWorkOrder) => void; restartToken?: number }) {
  const [stores, setStores] = React.useState<BackendWarehouse[]>([]);
  const [inputs, setInputs] = React.useState<string[]>(order.preparationDefaults?.inputWarehouseIds || [...new Set((order.materialLines ?? []).map((line) => line.warehouseId))]);
  const [output, setOutput] = React.useState(order.preparationDefaults?.outputWarehouseId || order.outputLines?.[0]?.warehouseId || "");
  const [preview, setPreview] = React.useState<WorkOrderPreparationPreview | null>(null);
  const [recommendation, setRecommendation] = React.useState<InputStoreRecommendation | null>(null);
  const [storeQuery, setStoreQuery] = React.useState("");
  const [outputQuery, setOutputQuery] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { void fetchAllWarehousesApi().then((rows) => setStores(rows.filter((row) => row.status !== "INACTIVE"))).catch((error) => toast.error(error.message)); }, []);
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
    setStoreQuery("");
    setOutputQuery("");
  }, [restartToken]);
  async function run(commit: boolean) {
    setBusy(true);
    try {
      const selected = { inputWarehouseIds: inputs, outputWarehouseId: output };
      if (commit && preview) {
        onSaved(await saveWorkOrderPreparation(order.id, selected, preview));
        setPreview(null); toast.success("Batch prepared. Review materials, print, then release when stock is ready.");
      } else setPreview(await previewWorkOrderPreparation(order.id, selected));
    } catch (error) { setPreview(null); toast.error(error instanceof Error ? error.message : "Preparation failed"); }
    finally { setBusy(false); }
  }
  const query = storeQuery.trim().toLowerCase();
  const catalog = recommendation && !stores.some((store) => store.id === recommendation.warehouseId)
    ? [{ id: recommendation.warehouseId, code: recommendation.code, name: recommendation.name || recommendation.code || "Recommended store", status: "ACTIVE" } as BackendWarehouse, ...stores]
    : stores;
  const recommendedId = recommendation?.warehouseId;
  const reason = recommendation ? recommendationReason(recommendation) : "";
  const savedOutputId = order.preparationDefaults?.outputWarehouseId || order.outputLines?.[0]?.warehouseId;
  const outputRecommendation = recommendOutputStore(catalog, savedOutputId);
  const outputRecommendedId = outputRecommendation?.id;
  const outputReason = "Shelf store. A completed batch shows on the shelf when it is received into Storage, Receiving, or Dispatch.";
  const visibleStores = catalog.filter((store) => store.id === recommendedId || !query || storeLabel(store).toLowerCase().includes(query)).sort((a, b) => compareStoresForBatch(a, b, recommendedId, storeLabel));
  const outputQueryText = outputQuery.trim().toLowerCase();
  const visibleOutputs = [...catalog].filter((store) => store.id === output || store.id === outputRecommendedId || !outputQueryText || storeLabel(store).toLowerCase().includes(outputQueryText)).sort((a, b) => compareStoresForBatch(a, b, outputRecommendedId, storeLabel));
  React.useEffect(() => {
    if (output || !outputRecommendedId) return;
    setOutput(outputRecommendedId);
  }, [output, outputRecommendedId]);
  function selectInput(id: string, checked: boolean) {
    setInputs((current) => checked ? (current.includes(id) ? current : [...current, id]) : current.filter((item) => item !== id));
    setPreview(null);
  }
  return <Card><CardHeader><CardTitle>Prepare this batch</CardTitle></CardHeader><CardContent className="space-y-4">
    <p className="text-sm text-muted-foreground">Select stores, review the frozen recipe requirements, then save. Preparation does not reserve or move stock.</p>
    <fieldset disabled={busy} className="space-y-2"><legend className="text-sm font-medium">Input stores</legend><input aria-label="Find an input store" className="block w-full rounded-md border bg-background p-2 text-sm" placeholder="Find an input store" value={storeQuery} onChange={(event) => setStoreQuery(event.target.value)} /><div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">{visibleStores.map((store) => <div key={store.id} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted/60"><label className="flex min-w-0 flex-1 items-center gap-2"><input type="checkbox" checked={inputs.includes(store.id)} onChange={(event) => selectInput(store.id, event.target.checked)} />{storeLabel(store)}</label>{store.id === recommendedId ? <button type="button" title={reason} className="shrink-0 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs text-primary" onClick={() => selectInput(store.id, true)}>Recommended</button> : null}</div>)}{visibleStores.length === 0 ? <p className="px-1 py-1 text-xs text-muted-foreground">No input store matches that search.</p> : null}</div></fieldset>
    <fieldset disabled={busy} className="space-y-2"><legend className="text-sm font-medium">Output store</legend><p className="text-xs text-muted-foreground">The finished batch is received here. Shelf stores are listed first. Search, then pick one store.</p><input aria-label="Find an output store" className="block w-full rounded-md border bg-background p-2 text-sm" placeholder="Find an output store" value={outputQuery} onChange={(event) => setOutputQuery(event.target.value)} /><div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">{visibleOutputs.map((store) => <div key={store.id} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted/60"><label className="flex min-w-0 flex-1 items-center gap-2"><input type="radio" name="output-store" checked={output === store.id} onChange={() => { setOutput(store.id); setPreview(null); }} />{storeLabel(store)}</label>{store.id === outputRecommendedId ? <button type="button" title={outputReason} className="shrink-0 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs text-primary" onClick={() => { setOutput(store.id); setPreview(null); }}>Recommended</button> : null}</div>)}{visibleOutputs.length === 0 ? <p className="px-1 py-1 text-xs text-muted-foreground">No output store matches that search.</p> : null}</div></fieldset>
    <Button disabled={busy || !inputs.length || !output} variant="outline" onClick={() => void run(false)}>Preview preparation</Button>
    {preview && <div className="space-y-3"><p className="text-sm">Recipe {preview.prepared.bomSnapshot?.name} · version {preview.prepared.bomSnapshot?.version} · planned output {order.plannedQuantity}</p><div className="overflow-x-auto"><InteractiveTable className="w-full text-sm"><thead><tr><th className="text-left">Ingredient</th><th className="text-left">Store</th><th className="text-left">Required</th><th className="text-left">Eligible stock</th><th className="text-left">Released, dated lots (preview)</th></tr></thead><tbody>{preview.prepared.materialLines.map((line) => <tr key={line.lineId}><td>{line.productName || line.productId}</td><td>{line.warehouseName || line.warehouseId}</td><td>{line.plannedQuantity} {line.uom}</td><td>{preview.availability?.find((row) => row.productId === line.productId && row.warehouseId === line.warehouseId)?.quantity ?? 0} {line.uom}</td><td>{preview.eligibleLots?.filter((lot) => lot.productId === line.productId && lot.warehouseId === line.warehouseId).map((lot) => `${lot.lotNumber}: ${lot.remainingQuantity}, expires ${lot.expiryDate.slice(0, 10)}`).join("; ") || "No dated lot listed"}</td></tr>)}</tbody></InteractiveTable></div><p className="text-sm text-muted-foreground">Availability is rechecked on release. Dependent batches must be completed and QC accepted before their outputs can be issued.</p><Button disabled={busy} onClick={() => void run(true)}>Save reviewed preparation</Button></div>}
  </CardContent></Card>;
}
