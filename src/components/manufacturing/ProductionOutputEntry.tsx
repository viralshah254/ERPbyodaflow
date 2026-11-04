"use client";
import { Table as InteractiveTable } from "@/components/ui/table";


import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { useCanWriteManufacturing } from "@/lib/rbac/use-write-guard";
import { useAuthStore } from "@/stores/auth-store";
import { fetchWarehousesApi, type BackendWarehouse } from "@/lib/api/warehouses";
import {
  previewProductionOutput, type ProductionOutputPreview, fetchProductionPlanDefaults, createManufacturingWorkOrder, fetchManufacturingWorkOrder,
  runManufacturingWorkOrderAction, type ManufacturingWorkOrder, type ProductionPlanRow,
} from "@/lib/api/manufacturing";
import { toast } from "sonner";

type Entry = { requestId: string; productId: string; quantity: string; weight: string; inputStore: string; outputStore: string; orderId?: string; pendingPreview?: ProductionOutputPreview };
const blankEntry = (): Entry => ({ requestId: crypto.randomUUID(), productId: "", quantity: "", weight: "", inputStore: "", outputStore: "" });

/** Output-first recording. Frozen recipe materials and normal posting/QC remain authoritative. */
export function ProductionOutputEntry() {
  const canWrite = useCanWriteManufacturing();
  const orgId = useAuthStore((s) => s.org?.orgId);
  const storageKey = `production-output-entry:${orgId}`;
  const [entry, setEntry] = React.useState<Entry | null>(null);
  const [products, setProducts] = React.useState<ProductionPlanRow[]>([]);
  const [stores, setStores] = React.useState<BackendWarehouse[]>([]);

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
    void (async () => {
      const rows: ProductionPlanRow[] = [];
      let cursor: string | undefined;
      do {
        const result = await fetchProductionPlanDefaults({ limit: 50, cursor, scope: "makeable" });
        rows.push(...result.items);
        if (!result.hasMore || !result.items.length) break;
        cursor = String(rows.length);
      } while (active);
      if (active) setProducts(rows);
    })().catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, []);
  React.useEffect(() => {
    if (!entry?.orderId) return;
    void fetchManufacturingWorkOrder(entry.orderId).then(setOrder).catch((e) => setError(e.message));
  }, [entry?.orderId]);

  const persist = (next: Entry) => { sessionStorage.setItem(storageKey, JSON.stringify(next)); setEntry(next); };
  const update = (patch: Partial<Entry>) => { if (entry) persist({ ...entry, ...patch }); };
  const product = products.find((p) => p.productId === entry?.productId);
  const locked = busy || Boolean(entry?.orderId || entry?.pendingPreview) || pendingCreate.current;
  const completed = order?.status === "COMPLETED";
  const [preview, setPreview] = React.useState<ProductionOutputPreview | null>(null);
  const [previewing, setPreviewing] = React.useState(false);
  const [previewRevision, setPreviewRevision] = React.useState(0);
  React.useEffect(() => {
    setPreview(null);
    if (entry?.pendingPreview) { setPreview(entry.pendingPreview); setPreviewing(false); return; }
    if (!entry?.productId || !(Number(entry.quantity) > 0) || entry.orderId) { setPreviewing(false); return; }
    let active = true;
    setPreviewing(true);
    const timer = setTimeout(() => {
      void previewProductionOutput(entry.productId, Number(entry.quantity)).then((result) => {
        if (active) { setPreview(result); setError(""); }
      }).catch((e) => { if (active) setError(e.message); }).finally(() => { if (active) setPreviewing(false); });
    }, 350);
    return () => { active = false; clearTimeout(timer); };
  }, [entry?.productId, entry?.quantity, entry?.orderId, entry?.pendingPreview, previewRevision]);

  const record = async () => {
    if (!entry || !canWrite || busy || (!entry.orderId && !preview)) return;
    setBusy(true); setError("");
    try {
      let id = entry.orderId;
      if (!id && preview) {
        pendingCreate.current = true;
        persist({ ...entry, pendingPreview: preview });
        const result = await createManufacturingWorkOrder({ requestId: entry.requestId, productId: entry.productId,
          quantity: Number(entry.quantity), inputWarehouseIds: preview.inputWarehouseIds, outputWarehouseId: preview.outputWarehouseId,
          reviewSignature: preview.reviewSignature, measurementMode: "COUNT_ONLY", weighingRequired: false, notes: "Approved from quantity-only production entry" });
        id = result.id;
        persist({ ...entry, orderId: id, pendingPreview: undefined });
        pendingCreate.current = false;
      }
      if (!id) return;
      let current = await fetchManufacturingWorkOrder(id);
      if (current.status === "DRAFT") current = await runManufacturingWorkOrderAction(current.id, { action: "release" });
      if (current.status === "RELEASED") current = await runManufacturingWorkOrderAction(current.id, { action: "start" });
      if (current.status === "IN_PROGRESS") current = await runManufacturingWorkOrderAction(current.id, {
        action: "complete", producedQuantity: Number(entry.quantity), idempotencyKey: entry.requestId,
        ...(current.measurementMode !== "COUNT_ONLY" && Number(entry.weight) > 0 ? { measuredWeight: Number(entry.weight) } : {}),
      });
      setOrder(current);
      if (current.status === "COMPLETED") toast.success("Production posted. Finished goods are awaiting QC release.");
      else setError("This entry needs attention. Open its production record below.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not post production. Retry this entry safely.";
      if (!entry.orderId && (e as { status?: number })?.status === 400) {
        pendingCreate.current = false; persist({ ...entry, pendingPreview: undefined, requestId: crypto.randomUUID() });
      }
      setError(message);
    }
    finally { setBusy(false); }
  };

  if (!entry) return <PageShell><p>Loading production entry…</p></PageShell>;
  const lines = order?.materialLines || preview?.materialLines || [];
  const outputs = order?.outputLines || preview?.outputLines || [];
  return <PageShell>
    <PageHeader title="Record production" description="Select a product and quantity. Review its formulation, then approve and post."
      actions={<Button variant="outline" asChild><Link href="/manufacturing/work-orders">Production records</Link></Button>} />
    <section className="space-y-5 rounded-xl border bg-card p-5">
      {error && <p role="alert" className="rounded-lg border border-destructive p-3 text-sm text-destructive">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 text-sm"><p>Finished product</p><Combobox value={entry.productId} disabled={locked} onChange={(productId) => update({ productId, quantity: "" })}
          options={products.map((p) => ({ value: p.productId, label: `${p.productSku || ""} · ${p.productName} (${p.uom})` }))} placeholder="Choose a product" searchPlaceholder="Search products…" /></div>
        <label className="space-y-2 text-sm">Quantity ({product?.uom || outputs[0]?.uom || "product unit"})<Input type="number" min="0.001" step="0.001" value={entry.quantity} disabled={locked} onChange={(e) => update({ quantity: e.target.value })} /></label>
      </div>
      {previewing && !order && <p role="status" className="text-sm text-muted-foreground">Calculating formulation and selecting stores…</p>}
      {lines.length > 0 && <>
        <h2 className="font-semibold">{completed ? "Production posted" : "Formulation"}</h2>
        <p className="text-sm text-muted-foreground">Ingredient stores are selected automatically from usable stock. Finished goods: {outputs[0]?.warehouseName || outputs[0]?.warehouseId}. Finished output remains subject to QC release.</p>
        <div className="overflow-x-auto"><InteractiveTable className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Ingredient</th><th className="p-2">Quantity</th><th className="p-2">Unit</th><th className="p-2">Warehouse</th></tr></thead><tbody>{lines.map((line) => <tr key={line.lineId} className="border-b"><td className="p-2">{line.productName || line.productId}</td><td className="p-2 tabular-nums">{line.plannedQuantity}</td><td className="p-2">{line.uom}</td><td className="p-2">{line.warehouseName || stores.find((s) => s.id === line.warehouseId)?.name || line.warehouseId}</td></tr>)}</tbody></InteractiveTable></div>
        {!order && preview?.shortages.map((message) => <p key={message} role="alert" className="text-sm text-destructive">{message}</p>)}
      </>}
      {!locked && (preview?.shortages.length || error) ? <Button variant="outline" disabled={previewing} onClick={() => setPreviewRevision((v) => v + 1)}>Refresh formulation</Button> : null}
      <div className="flex flex-wrap gap-3">
        {!completed && canWrite && <Button disabled={busy || !ready || (!entry.orderId && (!preview || previewing || preview.shortages.length > 0))} onClick={() => void record()}>{busy ? "Posting…" : "Approve and post"}</Button>}
        {completed && <Button onClick={() => { persist(blankEntry()); setOrder(null); setError(""); }}>Record next product</Button>}
        {entry.orderId && <Button variant="outline" asChild><Link href={`/manufacturing/work-orders/${encodeURIComponent(entry.orderId)}`}>Open production record</Link></Button>}
      </div>
      {!canWrite && <p className="text-sm text-muted-foreground">Production write permission is required.</p>}
    </section>
  </PageShell>;
}
