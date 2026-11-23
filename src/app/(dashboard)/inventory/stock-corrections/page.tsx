"use client";

import * as React from "react";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AsyncSearchableSelect, type AsyncSearchableSelectOption } from "@/components/ui/async-searchable-select";
import { fetchWarehouseOptions, type LookupOption } from "@/lib/api/lookups";
import {
  createStockAdjustmentApi,
  fetchStockCorrectionsApi,
  fetchStockLevelsPageApi,
  type InventoryStockRow,
  type StockCorrectionEntry,
  type StockCorrectionReasonCode,
} from "@/lib/api/inventory-stock";
import {
  correctionDelta,
  STOCK_CORRECTION_REASON_HINTS,
  useStockCorrectionAccess,
} from "@/lib/inventory/stock-correction";

const NOTE_MIN = 10;
const REASONS = Object.entries(STOCK_CORRECTION_REASON_HINTS) as Array<[StockCorrectionReasonCode, (typeof STOCK_CORRECTION_REASON_HINTS)[StockCorrectionReasonCode]]>;

function qty(n: number, uom?: string) {
  return `${n.toLocaleString("en-KE", { maximumFractionDigits: 4 })}${uom ? ` ${uom}` : ""}`;
}

function errorText(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function Disclaimer() {
  return (
    <div role="note" className="rounded-lg border border-amber-400/60 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-50">
      <p className="flex items-center gap-2 font-semibold"><Icons.ShieldAlert className="h-4 w-4" aria-hidden />This changes stock records directly</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed">
        <li>Use it only when what is on the shelf no longer matches the system. For example, the system shows 100 eggs but they broke, went bad, or went missing.</li>
        <li>It is not for receiving, production output, transfers or customer returns. Those have their own screens and keep the stock trail correct.</li>
        <li>Only admins can correct stock, because a correction changes stock movement without a source document.</li>
        <li>Every correction is recorded with your name, the store, the reason, and the quantity before and after.</li>
      </ul>
    </div>
  );
}

export default function StockCorrectionsPage() {
  const { controlled, canCorrect } = useStockCorrectionAccess();
  const [stores, setStores] = React.useState<LookupOption[]>([]);
  const [storeId, setStoreId] = React.useState("");
  const [item, setItem] = React.useState<InventoryStockRow | null>(null);
  const [reasonCode, setReasonCode] = React.useState<StockCorrectionReasonCode | "">("");
  const [entered, setEntered] = React.useState("");
  const [note, setNote] = React.useState("");
  const [confirmed, setConfirmed] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [history, setHistory] = React.useState<StockCorrectionEntry[] | null>(null);
  const itemsById = React.useRef(new Map<string, InventoryStockRow>());

  const loadHistory = React.useCallback(() => {
    fetchStockCorrectionsApi().then((data) => setHistory(data.items)).catch(() => setHistory([]));
  }, []);

  React.useEffect(() => {
    if (!canCorrect) return;
    fetchWarehouseOptions().then(setStores).catch(() => toast.error("Stores could not load."));
    loadHistory();
  }, [canCorrect, loadHistory]);

  const store = stores.find((row) => row.id === storeId);
  const direction = reasonCode ? STOCK_CORRECTION_REASON_HINTS[reasonCode].direction : "reduce";
  const amount = Number(entered);
  const systemQty = item?.quantity ?? 0;
  const delta = item && entered.trim() ? correctionDelta(direction, systemQty, amount) : 0;
  const after = systemQty + delta;
  const problem = !item ? "" : entered.trim() && (!Number.isFinite(amount) || amount < 0) ? "Enter a quantity of zero or more."
    : after < 0 ? `This store only has ${qty(systemQty, item.uom)}.` : entered.trim() && delta === 0 ? "That matches the system. Nothing to correct." : "";
  const ready = !!item && !!reasonCode && delta !== 0 && !problem && note.trim().length >= NOTE_MIN && confirmed && !saving;

  const loadItems = React.useCallback(async (query: string, page?: { cursor: string | null }) => {
    if (!storeId) return { options: [], nextCursor: null };
    const result = await fetchStockLevelsPageApi({ warehouseId: storeId, search: query, limit: 25, cursor: page?.cursor ?? undefined });
    const options: AsyncSearchableSelectOption[] = result.items.map((row) => {
      itemsById.current.set(row.id, row);
      return { id: row.id, label: row.name, description: `${row.sku} · System has ${qty(row.quantity, row.uom)}` };
    });
    return { options, nextCursor: result.nextCursor };
  }, [storeId]);

  const reset = () => { setItem(null); setEntered(""); setNote(""); setReasonCode(""); setConfirmed(false); };

  const submit = async () => {
    if (!ready || !item || !reasonCode) return;
    setSaving(true);
    try {
      const result = await createStockAdjustmentApi({ stockLevelId: item.id, quantityDelta: delta, reasonCode, note: note.trim() });
      toast.success(`Correction ${result.number} recorded. ${item.name} in ${store?.label ?? "the store"} is now ${qty(after, item.uom)}.`);
      reset();
      loadHistory();
    } catch (error) {
      toast.error(errorText(error, "The correction was not recorded."));
    } finally {
      setSaving(false);
    }
  };

  const header = (
    <PageHeader title="Stock correction" description="Record breakage, spoilage, loss or a count difference in one store."
      breadcrumbs={[{ label: "Inventory", href: "/inventory/stock-levels" }, { label: "Stock correction" }]} />
  );

  if (!canCorrect) {
    return (
      <PageShell>
        {header}
        <div className="max-w-2xl space-y-4">
          <Disclaimer />
          <p className="text-sm text-muted-foreground">
            {controlled ? "Only an admin can correct stock. Tell an admin what happened, which store, and how much." : "Stock corrections with an admin reason are used on bakery organisations. Use Stock levels to adjust stock here."}
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {header}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Disclaimer />
          <div className="space-y-1">
            <Label htmlFor="correction-store">1. Store</Label>
            <AsyncSearchableSelect
              id="correction-store"
              value={storeId}
              selectedOption={store ? { id: store.id, label: store.label } : null}
              onValueChange={(next) => { setStoreId(next); setItem(null); setEntered(""); }}
              loadOptions={async (query) => stores
                .filter((row) => row.label.toLowerCase().includes(query.trim().toLowerCase()))
                .map((row) => ({ id: row.id, label: row.label }))}
              reloadToken={stores.length}
              searchDebounceMs={0}
              placeholder="Choose the store where it happened"
              searchPlaceholder="Find a store"
              emptyMessage="No store matches."
              wrapLabels
            />
            <p className="text-xs text-muted-foreground">Stock belongs to a store. A correction only changes this store.</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="correction-item">2. Item</Label>
            <AsyncSearchableSelect
              id="correction-item"
              value={item?.id ?? ""}
              selectedOption={item ? { id: item.id, label: item.name, description: `System has ${qty(item.quantity, item.uom)}` } : null}
              onValueChange={(next) => { setItem(itemsById.current.get(next) ?? null); setEntered(""); }}
              loadOptions={loadItems}
              reloadToken={storeId}
              disabled={!storeId}
              placeholder={storeId ? "Choose the item" : "Choose a store first"}
              searchPlaceholder="Search name or code"
              emptyMessage="This store holds no matching item."
              showSelectedDescription
              wrapLabels
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="correction-reason">3. What happened</Label>
            <select id="correction-reason" className="block min-h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={reasonCode} onChange={(e) => { setReasonCode(e.target.value as StockCorrectionReasonCode); setEntered(""); }} disabled={!item}>
              <option value="">Choose a reason</option>
              {REASONS.map(([code, hint]) => <option key={code} value={code}>{hint.label}</option>)}
            </select>
          </div>
          {item && reasonCode ? (
            <div className="space-y-1">
              <Label htmlFor="correction-qty">
                {direction === "reduce" ? "4. Quantity lost" : direction === "increase" ? "4. Quantity found" : "4. Quantity actually on the shelf"}
              </Label>
              <Input id="correction-qty" type="number" inputMode="decimal" min={0} value={entered} onChange={(e) => setEntered(e.target.value)} className="max-w-xs" />
              <p className="text-sm">
                System has <strong>{qty(systemQty, item.uom)}</strong>
                {delta !== 0 && !problem ? <> · after this correction <strong>{qty(after, item.uom)}</strong> ({delta > 0 ? "+" : ""}{qty(delta, item.uom)})</> : null}
              </p>
              {problem ? <p className="text-sm text-destructive">{problem}</p> : null}
            </div>
          ) : null}
          <div className="space-y-1">
            <Label htmlFor="correction-note">{item && reasonCode ? "5." : "4."} Explain what happened</Label>
            <Textarea id="correction-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} disabled={!item}
              placeholder="For example: a tray of 100 eggs fell during offloading. Seen by the store supervisor." />
            <p className="text-xs text-muted-foreground">{note.trim().length < NOTE_MIN ? `At least ${NOTE_MIN} characters.` : "Saved with the correction."}</p>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={confirmed} onCheckedChange={(value) => setConfirmed(value === true)} disabled={!item} aria-label="Confirm the correction" />
            <span>I checked the store. This correction will be recorded under my name.</span>
          </label>
          <div className="flex gap-2">
            <Button onClick={() => void submit()} disabled={!ready}>{saving ? "Recording…" : "Record correction"}</Button>
            <Button variant="outline" onClick={reset} disabled={saving}>Clear</Button>
          </div>
        </div>
        <section aria-labelledby="recent-corrections" className="space-y-3">
          <h2 id="recent-corrections" className="text-sm font-semibold">Recent corrections and adjustments</h2>
          {history === null ? <p className="text-sm text-muted-foreground">Loading…</p>
            : history.length === 0 ? <p className="text-sm text-muted-foreground">No stock corrections yet.</p>
              : (
                <ul className="space-y-2">
                  {history.map((entry) => (
                    <li key={entry.id} className="rounded-md border p-3 text-sm">
                      <p className="font-medium">{entry.number} · {entry.storeName || "Store"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.date).toLocaleString("en-KE")}{entry.createdByName ? ` · ${entry.createdByName}` : ""}
                      </p>
                      {entry.reason ? <p className="mt-1">{entry.reason}</p> : null}
                      <ul className="mt-1 space-y-0.5 text-xs">
                        {entry.lines.map((line, index) => (
                          <li key={index}>
                            {line.productName}: {line.quantityDelta > 0 ? "+" : ""}{qty(line.quantityDelta, line.uom)}
                            {line.quantityBefore != null && line.quantityAfter != null ? ` (${qty(line.quantityBefore)} → ${qty(line.quantityAfter)})` : ""}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
        </section>
      </div>
    </PageShell>
  );
}
