"use client";
import { Table as InteractiveTable } from "@/components/ui/table";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchWarehousesApi, type BackendWarehouse } from "@/lib/api/warehouses";
import { previewWorkOrderPreparation, saveWorkOrderPreparation, type ManufacturingWorkOrder, type WorkOrderPreparationPreview } from "@/lib/api/manufacturing";

export function WorkOrderPreparation({ order, onSaved }: { order: ManufacturingWorkOrder; onSaved: (order: ManufacturingWorkOrder) => void }) {
  const [stores, setStores] = React.useState<BackendWarehouse[]>([]);
  const [inputs, setInputs] = React.useState<string[]>(order.preparationDefaults?.inputWarehouseIds || [...new Set((order.materialLines ?? []).map((line) => line.warehouseId))]);
  const [output, setOutput] = React.useState(order.preparationDefaults?.outputWarehouseId || order.outputLines?.[0]?.warehouseId || "");
  const [preview, setPreview] = React.useState<WorkOrderPreparationPreview | null>(null);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { void fetchWarehousesApi().then((rows) => setStores(rows.filter((row) => row.status !== "INACTIVE"))).catch((error) => toast.error(error.message)); }, []);
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
  return <Card><CardHeader><CardTitle>Prepare this batch</CardTitle></CardHeader><CardContent className="space-y-4">
    <p className="text-sm text-muted-foreground">Select stores, review the frozen recipe requirements, then save. Preparation does not reserve or move stock.</p>
    <fieldset disabled={busy} className="space-y-2"><legend className="text-sm font-medium">Input stores</legend>{stores.map((store) => <label key={store.id} className="mr-4 inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={inputs.includes(store.id)} onChange={(event) => { setInputs(event.target.checked ? [...inputs, store.id] : inputs.filter((id) => id !== store.id)); setPreview(null); }} />{store.code} {store.name}</label>)}</fieldset>
    <label className="block text-sm font-medium">Output store<select className="mt-1 block w-full rounded-md border bg-background p-2" value={output} disabled={busy} onChange={(event) => { setOutput(event.target.value); setPreview(null); }}><option value="">Select output store</option>{stores.map((store) => <option key={store.id} value={store.id}>{store.code} {store.name}</option>)}</select></label>
    <Button disabled={busy || !inputs.length || !output} variant="outline" onClick={() => void run(false)}>Preview preparation</Button>
    {preview && <div className="space-y-3"><p className="text-sm">Recipe {preview.prepared.bomSnapshot?.name} · version {preview.prepared.bomSnapshot?.version} · planned output {order.plannedQuantity}</p><div className="overflow-x-auto"><InteractiveTable className="w-full text-sm"><thead><tr><th className="text-left">Ingredient</th><th className="text-left">Store</th><th className="text-left">Required</th><th className="text-left">Eligible stock</th><th className="text-left">Released, dated lots (preview)</th></tr></thead><tbody>{preview.prepared.materialLines.map((line) => <tr key={line.lineId}><td>{line.productName || line.productId}</td><td>{line.warehouseName || line.warehouseId}</td><td>{line.plannedQuantity} {line.uom}</td><td>{preview.availability?.find((row) => row.productId === line.productId && row.warehouseId === line.warehouseId)?.quantity ?? 0} {line.uom}</td><td>{preview.eligibleLots?.filter((lot) => lot.productId === line.productId && lot.warehouseId === line.warehouseId).map((lot) => `${lot.lotNumber}: ${lot.remainingQuantity}, expires ${lot.expiryDate.slice(0, 10)}`).join("; ") || "No dated lot listed"}</td></tr>)}</tbody></InteractiveTable></div><p className="text-sm text-muted-foreground">Availability is rechecked on release. Dependent batches must be completed and QC accepted before their outputs can be issued.</p><Button disabled={busy} onClick={() => void run(true)}>Save reviewed preparation</Button></div>}
  </CardContent></Card>;
}
