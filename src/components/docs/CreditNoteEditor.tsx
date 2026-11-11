"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DocumentLineProductDescription } from "@/components/docs/DocumentLineProductDescription";
import { fetchWarehouseOptions } from "@/lib/api/lookups";
import { creditQuantityPreview } from "@/lib/docs/credit-quantity-preview";
import type { DocumentDetailRecord } from "@/lib/types/documents";

type Effect = NonNullable<DocumentDetailRecord["adjustmentEffect"]>;

export function CreditNoteEditor({
  document, partyName, quantities, onQuantity, effect, onEffect, warehouse, onWarehouse,
  editable, busy, dirty, onSave, formatAmount, fmcgOrg,
}: {
  document: DocumentDetailRecord;
  partyName: string;
  quantities: Record<string, string>;
  onQuantity: (id: string, value: string) => void;
  effect: Effect | "";
  onEffect: (effect: Effect) => void;
  warehouse: string;
  onWarehouse: (warehouse: string) => void;
  editable: boolean;
  busy: boolean;
  dirty: boolean;
  onSave: () => void;
  formatAmount: (value: number) => string;
  fmcgOrg: boolean;
}) {
  const supplier = document.type === "purchase-credit-note";
  const returnEffect = supplier ? "SUPPLIER_RETURN" : "PHYSICAL_RETURN";
  const source = document.sourceDocument;
  const preview = creditQuantityPreview(document.lines, quantities);
  const [warehouses, setWarehouses] = React.useState<Array<{ id: string; label: string }>>([]);
  const [warehouseError, setWarehouseError] = React.useState(false);

  React.useEffect(() => {
    if (effect !== "SUPPLIER_RETURN" || !editable) return;
    let active = true;
    void fetchWarehouseOptions().then((rows) => {
      if (active) {
        setWarehouses(rows);
        setWarehouseError(false);
      }
    }).catch(() => { if (active) setWarehouseError(true); });
    return () => { active = false; };
  }, [effect, editable]);

  return (
    <section aria-label="Credit note editor" className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-lg border bg-card px-3 py-2.5 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">{supplier ? "Supplier" : "Customer"}</p>
          <p className="font-medium [overflow-wrap:anywhere]">{partyName}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{supplier ? "Original bill" : "Original invoice"}</p>
          {source ? <Link className="font-medium text-primary underline-offset-2 hover:underline" href={`/docs/${source.typeKey}/${source.id}`}>{source.number}</Link> : <span>Unlinked credit</span>}
        </div>
        {document.priceListName && <div><p className="text-xs text-muted-foreground">Price list</p><p className="font-medium break-words">{document.priceListName}</p></div>}
      </div>

      {document.stockAccountingVersion === 1 && (
        <fieldset className="rounded-lg border bg-card px-3 pb-3 pt-1" disabled={!editable || busy}>
          <legend className="px-1 text-sm font-medium">Stock effect</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {([
              { value: "PRICE_DECREASE", title: "Price correction", detail: "Adjusts the credit amount only." },
              { value: returnEffect, title: supplier ? "Return goods to supplier" : "Receive returned goods", detail: supplier ? "Issues stock from the selected warehouse." : "Receives stock into quarantine for quality review." },
            ] as const).map((option) => (
              <label key={option.value} className={`flex items-start gap-2 rounded-md border px-2.5 py-2 text-sm has-[:disabled]:opacity-70 ${effect === option.value ? "border-primary bg-primary/5" : ""}`}>
                <input type="radio" name="credit-stock-effect" className="mt-1 accent-primary"
                  checked={effect === option.value} disabled={option.value === returnEffect && !document.companyAverageCosting}
                  onChange={() => onEffect(option.value)} />
                <span><span className="block font-medium">{option.title}</span><span className="block text-xs text-muted-foreground">{option.detail}</span></span>
              </label>
            ))}
          </div>
          {effect === "SUPPLIER_RETURN" && (
            <label className="mt-2 block text-sm">
              Issuing warehouse
              <select className="mt-1 block w-full max-w-sm rounded-md border bg-background p-2" value={warehouse} onChange={(event) => onWarehouse(event.target.value)}>
                <option value="">Choose warehouse</option>
                {warehouse && !warehouses.some((row) => row.id === warehouse) && <option value={warehouse}>{warehouse}</option>}
                {warehouses.map((row) => <option key={row.id} value={row.id}>{row.label}</option>)}
              </select>
              {warehouseError && <span className="text-xs text-destructive">Warehouses could not load.</span>}
            </label>
          )}
        </fieldset>
      )}

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b px-3 py-2">
          <h2 className="text-sm font-semibold">Items to credit</h2>
          {editable && <p className="text-xs text-muted-foreground">Enter 0 to leave an item off.</p>}
        </div>
        {document.lines.length === 0 && <p className="p-3 text-sm text-muted-foreground">No credit lines. Use Edit to add items.</p>}
        <div className="credit-note-lines divide-y">
          <div className="credit-note-row credit-note-head bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
            <span>Product</span><span>Already credited</span><span>Available</span><span>Credit qty</span><span className="text-right">Line total</span>
          </div>
          {document.lines.map((line, index) => {
            const capacity = line.creditCapacity;
            const qty = line.id ? quantities[line.id] ?? String(line.qty ?? "") : String(line.qty ?? "");
            const linePreview = line.id ? creditQuantityPreview([line], { [line.id]: qty }) : null;
            return (
              <div key={line.id ?? index} className="credit-note-row px-3 py-2 text-sm">
                <DocumentLineProductDescription line={line} fmcgOrg={fmcgOrg} />
                <div data-credit-label="Already credited" className="tabular-nums">{capacity?.credited ?? "—"}
                  {capacity && capacity.reserved > 0 && <span className="block text-xs text-muted-foreground">{capacity.reserved} on other credits</span>}
                </div>
                <div data-credit-label="Available" className="font-medium tabular-nums">{capacity?.available ?? "—"}{line.unit && <span className="ml-1 text-xs font-normal text-muted-foreground">{line.unit}</span>}</div>
                <div data-credit-label="Credit qty">
                  <Input aria-label={`Quantity to credit for ${line.description}`} aria-invalid={Boolean(linePreview?.error)} type="number" min={0} step="any"
                    max={capacity?.available ?? line.sourceQuantity} value={qty} disabled={!editable || busy || !line.id}
                    className="h-8 max-w-28 tabular-nums" onChange={(event) => { if (line.id) onQuantity(line.id, event.target.value); }} />
                </div>
                <div data-credit-label="Line total" className="credit-note-amount font-medium tabular-nums">{linePreview?.error ? "—" : formatAmount(linePreview?.total ?? line.amount ?? 0)}</div>
              </div>
            );
          })}
        </div>
        {source && document.lines.some((line) => !line.creditCapacity) && <p className="border-t px-3 py-2 text-xs text-muted-foreground">Availability is unavailable for lines marked with a dash. The server checks linked quantities on save.</p>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5">
        <div role={preview.error && dirty ? "alert" : "status"}>
          <p className="text-xs text-muted-foreground">{dirty ? "Unsaved credit total" : "Credit total"}</p>
          <p className="font-semibold tabular-nums">{preview.error ? "—" : formatAmount(preview.total)} <span className="ml-2 text-sm font-normal text-muted-foreground">VAT {preview.error ? "—" : formatAmount(preview.tax)}</span></p>
          {dirty && preview.error && <p className="text-sm text-destructive">{preview.error}</p>}
        </div>
        {editable && (
          <div className="flex flex-wrap items-center gap-2">
            {document.stockAccountingVersion === 1 && !effect && <p className="text-xs text-muted-foreground">Choose a stock effect to save.</p>}
            <Button disabled={busy || !dirty || Boolean(preview.error) || !preview.selected || (document.stockAccountingVersion === 1 && (!effect || (effect === "SUPPLIER_RETURN" && !warehouse)))} onClick={onSave}>
              {busy ? "Saving…" : "Save credit draft"}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
