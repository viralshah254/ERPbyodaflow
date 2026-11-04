"use client";
import { Table as InteractiveTable } from "@/components/ui/table";


import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCanWriteManufacturing } from "@/lib/rbac/use-write-guard";
import { useAuthStore } from "@/stores/auth-store";
import { fetchWarehousesApi, type BackendWarehouse } from "@/lib/api/warehouses";
import {
  fetchProductionPlanDefaults, createManufacturingWorkOrder, fetchManufacturingWorkOrder,
  runManufacturingWorkOrderAction, type ManufacturingWorkOrder, type ProductionPlanRow,
} from "@/lib/api/manufacturing";
import { toast } from "sonner";

type Entry = { requestId: string; productId: string; quantity: string; weight: string; inputStore: string; outputStore: string; orderId?: string };
const blankEntry = (): Entry => ({ requestId: crypto.randomUUID(), productId: "", quantity: "", weight: "", inputStore: "", outputStore: "" });

/** Output-first recording. Frozen recipe materials and normal posting/QC remain authoritative. */
export function ProductionOutputEntry() {
  const canWrite = useCanWriteManufacturing();
  const orgId = useAuthStore((s) => s.org?.orgId);
  const storageKey = `production-output-entry:${orgId}`;
  const [entry, setEntry] = React.useState<Entry | null>(null);
  const [products, setProducts] = React.useState<ProductionPlanRow[]>([]);
  const [stores, setStores] = React.useState<BackendWarehouse[]>([]);
  const [search, setSearch] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [order, setOrder] = React.useState<ManufacturingWorkOrder | null>(null);
  const [error, setError] = React.useState("");
  const [ready, setReady] = React.useState(false);
  const pendingCreate = React.useRef(false);

  React.useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      setEntry(saved ? JSON.parse(saved) as Entry : blankEntry());
    } catch { setEntry(blankEntry()); }
    void fetchWarehousesApi().then((rows) => { setStores(rows.filter((r) => r.status !== "INACTIVE")); setReady(true); }).catch((e) => setError(e.message));
  }, [storageKey]);
  React.useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      void fetchProductionPlanDefaults({ search: search.trim() || undefined, limit: 100 }).then((result) => {
        if (active) setProducts(result.items);
      }).catch((e) => { if (active) setError(e.message); });
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [search]);
  React.useEffect(() => {
    if (!entry?.orderId) return;
    void fetchManufacturingWorkOrder(entry.orderId).then(setOrder).catch((e) => setError(e.message));
  }, [entry?.orderId]);

  const persist = (next: Entry) => { sessionStorage.setItem(storageKey, JSON.stringify(next)); setEntry(next); };
  const update = (patch: Partial<Entry>) => { if (entry) persist({ ...entry, ...patch }); };
  const product = products.find((p) => p.productId === entry?.productId);
  const locked = busy || Boolean(entry?.orderId) || pendingCreate.current;
  const completed = order?.status === "COMPLETED";
  const valid = entry && entry.productId && Number.isFinite(Number(entry.quantity)) && Number(entry.quantity) > 0
    && Number.isFinite(Number(entry.weight)) && Number(entry.weight) > 0 && entry.inputStore && entry.outputStore;

  const calculate = async () => {
    if (!entry || !valid || !canWrite || busy) return;
    setBusy(true); setError("");
    // Keep the same request and values if the server responds late or the connection drops.
    pendingCreate.current = true;
    try {
      persist(entry);
      const result = await createManufacturingWorkOrder({ requestId: entry.requestId, productId: entry.productId,
        quantity: Number(entry.quantity), inputWarehouseIds: [entry.inputStore], outputWarehouseId: entry.outputStore,
        measurementMode: "MANUAL_SCALE", weighingRequired: true, notes: "Recorded from weighed finished production" });
      persist({ ...entry, orderId: result.id });
      setOrder(await fetchManufacturingWorkOrder(result.id));
      pendingCreate.current = false;
    } catch (e) { setError(e instanceof Error ? e.message : "Could not calculate ingredients. Retry with the same entry."); }
    finally { setBusy(false); }
  };

  const record = async () => {
    if (!entry?.orderId || !canWrite || busy) return;
    setBusy(true); setError("");
    try {
      // Refresh status on every retry; never repeat a successful transition or completion.
      let current = await fetchManufacturingWorkOrder(entry.orderId);
      if (current.status === "DRAFT") current = await runManufacturingWorkOrderAction(current.id, { action: "release" });
      if (current.status === "RELEASED") current = await runManufacturingWorkOrderAction(current.id, { action: "start" });
      if (current.status === "IN_PROGRESS") current = await runManufacturingWorkOrderAction(current.id, {
        action: "complete", producedQuantity: Number(entry.quantity), measuredWeight: Number(entry.weight),
        idempotencyKey: entry.requestId,
      });
      setOrder(current);
      if (current.status === "COMPLETED") toast.success("Production recorded. Finished goods are awaiting QC release.");
      else setError("This entry needs attention. Open its production record below.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not record production. You can safely retry."); }
    finally { setBusy(false); }
  };

  if (!entry) return <PageShell><p>Loading production entry…</p></PageShell>;
  return <PageShell>
    <PageHeader title="Record production" description="Enter what Joy Bakers has produced. The recipe calculates ingredient usage backwards from the finished quantity."
      actions={<Button variant="outline" asChild><Link href="/manufacturing/work-orders">Production records</Link></Button>} />
    <div className="space-y-5">
      <div className="rounded-xl border bg-card p-4 text-sm">Weigh finished output → enter quantity → review ingredients → record production</div>
      {error && <p role="alert" className="rounded-lg border border-destructive p-3 text-sm text-destructive">{error}</p>}
      <section className="space-y-4 rounded-xl border bg-card p-5" aria-label="Finished production">
        <h2 className="font-semibold">Finished production</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm">Search product<Input value={search} disabled={locked} onChange={(e) => setSearch(e.target.value)} placeholder="SKU or product name" /></label>
          <label className="space-y-2 text-sm">Finished product<select className="block h-10 w-full rounded-md border bg-background px-3" value={entry.productId} disabled={locked} onChange={(e) => update({ productId: e.target.value, quantity: "", weight: "" })}>
            <option value="">Choose a product</option>{!product && entry.productId && <option value={entry.productId}>{order?.productName || entry.productId}</option>}
            {products.map((p) => <option key={p.productId} value={p.productId}>{p.productSku} · {p.productName} ({p.uom})</option>)}
          </select><span className="text-xs text-muted-foreground">Search to find more products. Only products with recipes appear.</span></label>
          <label className="space-y-2 text-sm">Finished quantity ({product?.uom || order?.outputLines[0]?.uom || "product unit"})<Input type="number" min="0.001" step="0.001" value={entry.quantity} disabled={locked} onChange={(e) => update({ quantity: e.target.value, ...(product?.uom?.toUpperCase() === "KG" ? { weight: e.target.value } : {}) })} /></label>
          <label className="space-y-2 text-sm">Measured finished weight (kg)<Input type="number" min="0.001" step="0.001" value={entry.weight} disabled={locked} onChange={(e) => update({ weight: e.target.value, ...(product?.uom?.toUpperCase() === "KG" ? { quantity: e.target.value } : {}) })} /></label>
          {([['inputStore', 'Ingredient store'], ['outputStore', 'Finished goods store']] as const).map(([field, label]) => <label key={field} className="space-y-2 text-sm">{label}<select className="block h-10 w-full rounded-md border bg-background px-3" value={entry[field]} disabled={locked} onChange={(e) => update({ [field]: e.target.value })}><option value="">Choose a store</option>{stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>)}
        </div>
        <p className="text-xs text-muted-foreground">For products stocked in kg, enter the weighed quantity. For products stocked in pieces or packs, enter their count and the measured weight separately. Ingredient usage is calculated from the recipe’s output unit.</p>
        {!entry.orderId && canWrite && <div className="flex gap-3"><Button disabled={!valid || busy || !ready} onClick={() => void calculate()}>{busy ? "Calculating…" : "Calculate ingredients"}</Button>{error && !busy && <Button variant="outline" onClick={() => { pendingCreate.current = false; persist({ ...entry, requestId: crypto.randomUUID() }); setError(""); }}>Edit entry</Button>}</div>}
        {!canWrite && <p className="text-sm text-muted-foreground">Production write permission is required to record output.</p>}
      </section>
      {entry.orderId && !order && <Button disabled={busy} onClick={() => void fetchManufacturingWorkOrder(entry.orderId!).then(setOrder).catch((e) => setError(e.message))}>Reload ingredient preview</Button>}
      {order && <section className="space-y-4 rounded-xl border bg-card p-5" aria-label="Calculated ingredient usage">
        <h2 className="font-semibold">{completed ? "Production recorded" : "Review calculated ingredient usage"}</h2>
        <p className="text-sm text-muted-foreground">{completed ? "Finished goods are received under QC hold. Release them through Production QC." : "Review the recipe quantities below. Recording deducts these ingredients and receives the finished output under QC hold."}</p>
        <div className="overflow-x-auto"><InteractiveTable className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Ingredient</th><th className="p-2">Quantity</th><th className="p-2">Unit</th><th className="p-2">Store</th></tr></thead><tbody>{order.materialLines.map((line) => <tr key={line.lineId} className="border-b"><td className="p-2">{line.productName || line.productId}</td><td className="p-2 tabular-nums">{line.plannedQuantity}</td><td className="p-2">{line.uom}</td><td className="p-2">{line.warehouseName || stores.find((s) => s.id === line.warehouseId)?.name || line.warehouseId}</td></tr>)}</tbody></InteractiveTable></div>
        <div className="flex flex-wrap gap-3">
          {!completed && canWrite && <Button disabled={busy} onClick={() => void record()}>{busy ? "Recording…" : "Record production"}</Button>}
          {order.status === "DRAFT" && canWrite && <Button variant="outline" disabled={busy} onClick={() => {
            setBusy(true); setError("");
            void runManufacturingWorkOrderAction(order.id, { action: "cancel" }).then(() => {
              persist({ ...entry, orderId: undefined, requestId: crypto.randomUUID() }); setOrder(null);
            }).catch((e) => setError(e.message)).finally(() => setBusy(false));
          }}>Change entry</Button>}
          {completed && <Button onClick={() => { persist({ ...blankEntry(), inputStore: entry.inputStore, outputStore: entry.outputStore }); setOrder(null); setError(""); setSearch(""); }}>Record next product</Button>}
          <Button variant="outline" asChild><Link href={`/manufacturing/work-orders/${encodeURIComponent(order.id)}`}>Open record {order.number}</Link></Button>
          {completed && <Button variant="outline" asChild><Link href="/manufacturing/quality">Production QC</Link></Button>}
        </div>
      </section>}
    </div>
  </PageShell>;
}
