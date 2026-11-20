"use client";
import { Table as InteractiveTable } from "@/components/ui/table";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchWarehousesApi, type BackendWarehouse } from "@/lib/api/warehouses";
import { fetchInputStoreRecommendation, previewWorkOrderPreparation, saveWorkOrderPreparation, type InputStoreRecommendation, type ManufacturingWorkOrder, type WorkOrderPreparationPreview } from "@/lib/api/manufacturing";

function storeLabel(store: { code?: string; name?: string }): string {
  return [store.code, store.name].filter(Boolean).join(" ");
}

export function WorkOrderPreparation({ order, onSaved }: { order: ManufacturingWorkOrder; onSaved: (order: ManufacturingWorkOrder) => void }) {
  const [stores, setStores] = React.useState<BackendWarehouse[]>([]);
  const [inputs, setInputs] = React.useState<string[]>(order.preparationDefaults?.inputWarehouseIds || [...new Set((order.materialLines ?? []).map((line) => line.warehouseId))]);
  const [output, setOutput] = React.useState(order.preparationDefaults?.outputWarehouseId || order.outputLines?.[0]?.warehouseId || "");
  const [preview, setPreview] = React.useState<WorkOrderPreparationPreview | null>(null);
  const [recommendation, setRecommendation] = React.useState<InputStoreRecommendation | null>(null);
  const [storeQuery, setStoreQuery] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { void fetchWarehousesApi().then((rows) => setStores(rows.filter((row) => row.status !== "INACTIVE"))).catch((error) => toast.error(error.message)); }, []);
  React.useEffect(() => {
    let cancelled = false;
    void fetchInputStoreRecommendation(order.id)
      .then((next) => { if (!cancelled) setRecommendation(next); })
      .catch(() => { if (!cancelled) setRecommendation(null); });
    return () => { cancelled = true; };
  }, [order.id]);
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
  const visibleStores = [...stores].filter((store) => !query || storeLabel(store).toLowerCase().includes(query)).sort((a, b) => {
    if (a.id === recommendation?.warehouseId) return -1;
    if (b.id === recommendation?.warehouseId) return 1;
    return storeLabel(a).localeCompare(storeLabel(b));
  });
  const coveredNames = recommendation?.lines.filter((line) => line.covered).map((line) => line.productName || "ingredient") ?? [];
  const shortNames = recommendation?.lines.filter((line) => !line.covered).map((line) => line.productName || "ingredient") ?? [];
  function useRecommendedStore() {
    if (!recommendation) return;
    setInputs([recommendation.warehouseId]);
    setPreview(null);
  }
  return <Card><CardHeader><CardTitle>Prepare this batch</CardTitle></CardHeader><CardContent className="space-y-4">
    <p className="text-sm text-muted-foreground">Select stores, review the frozen recipe requirements, then save. Preparation does not reserve or move stock.</p>
    {recommendation ? <div className="rounded-md border border-primary/40 bg-primary/5 p-3 text-sm"><p className="font-medium">Use {storeLabel(recommendation)}</p><p className="mt-1 text-muted-foreground">It has {recommendation.linesCovered} of {recommendation.linesNeeded} ingredients this batch needs{coveredNames.length ? `: ${coveredNames.join(", ")}` : ""}.{shortNames.length ? ` Still short: ${shortNames.join(", ")}.` : ""}</p><Button type="button" size="sm" className="mt-2" disabled={busy} onClick={useRecommendedStore}>Use this store</Button></div> : null}
    <fieldset disabled={busy} className="space-y-2"><legend className="text-sm font-medium">Input stores</legend><input aria-label="Find a store" className="mb-2 block w-full rounded-md border bg-background p-2 text-sm" placeholder="Find a store" value={storeQuery} onChange={(event) => setStoreQuery(event.target.value)} /><div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">{visibleStores.map((store) => <label key={store.id} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted/60"><input type="checkbox" checked={inputs.includes(store.id)} onChange={(event) => { setInputs(event.target.checked ? [...inputs, store.id] : inputs.filter((id) => id !== store.id)); setPreview(null); }} />{storeLabel(store)}{store.id === recommendation?.warehouseId ? <span className="text-xs text-primary">Recommended</span> : null}</label>)}{visibleStores.length === 0 ? <p className="px-1 py-1 text-xs text-muted-foreground">No store matches that search.</p> : null}</div></fieldset>
    <label className="block text-sm font-medium">Output store<select className="mt-1 block w-full rounded-md border bg-background p-2" value={output} disabled={busy} onChange={(event) => { setOutput(event.target.value); setPreview(null); }}><option value="">Select output store</option>{stores.map((store) => <option key={store.id} value={store.id}>{store.code} {store.name}</option>)}</select></label>
    <Button disabled={busy || !inputs.length || !output} variant="outline" onClick={() => void run(false)}>Preview preparation</Button>
    {preview && <div className="space-y-3"><p className="text-sm">Recipe {preview.prepared.bomSnapshot?.name} · version {preview.prepared.bomSnapshot?.version} · planned output {order.plannedQuantity}</p><div className="overflow-x-auto"><InteractiveTable className="w-full text-sm"><thead><tr><th className="text-left">Ingredient</th><th className="text-left">Store</th><th className="text-left">Required</th><th className="text-left">Eligible stock</th><th className="text-left">Released, dated lots (preview)</th></tr></thead><tbody>{preview.prepared.materialLines.map((line) => <tr key={line.lineId}><td>{line.productName || line.productId}</td><td>{line.warehouseName || line.warehouseId}</td><td>{line.plannedQuantity} {line.uom}</td><td>{preview.availability?.find((row) => row.productId === line.productId && row.warehouseId === line.warehouseId)?.quantity ?? 0} {line.uom}</td><td>{preview.eligibleLots?.filter((lot) => lot.productId === line.productId && lot.warehouseId === line.warehouseId).map((lot) => `${lot.lotNumber}: ${lot.remainingQuantity}, expires ${lot.expiryDate.slice(0, 10)}`).join("; ") || "No dated lot listed"}</td></tr>)}</tbody></InteractiveTable></div><p className="text-sm text-muted-foreground">Availability is rechecked on release. Dependent batches must be completed and QC accepted before their outputs can be issued.</p><Button disabled={busy} onClick={() => void run(true)}>Save reviewed preparation</Button></div>}
  </CardContent></Card>;
}
