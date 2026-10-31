"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { patchDocumentApi } from "@/lib/api/documents";
import { fetchWarehouseOptions } from "@/lib/api/lookups";
import type { DocumentDetailRecord } from "@/lib/types/documents";
import { toast } from "sonner";

export function DocumentAdjustmentEffect({ document, canEdit, onSaved }: { document: DocumentDetailRecord; canEdit: boolean; onSaved: () => Promise<unknown> }) {
  const [effect, setEffect] = React.useState(document.adjustmentEffect ?? "");
  const [warehouse, setWarehouse] = React.useState(document.warehouseId ?? "");
  const [warehouses, setWarehouses] = React.useState<Array<{ id: string; label: string }>>([]);
  const [busy, setBusy] = React.useState(false);
  const editable = canEdit && document.status === "DRAFT" && document.stockAccountingVersion === 1;
  const supplier = document.type === "purchase-credit-note";
  const credit = document.type === "credit-note" || supplier;
  React.useEffect(() => { setEffect(document.adjustmentEffect ?? ""); setWarehouse(document.warehouseId ?? ""); }, [document.adjustmentEffect, document.warehouseId]);
  React.useEffect(() => {
    if (supplier && editable) void fetchWarehouseOptions().then(setWarehouses).catch(() => toast.error("Warehouses could not load."));
  }, [supplier, editable]);
  if (document.stockAccountingVersion !== 1) return <p className="text-xs font-normal text-muted-foreground">Update the connected backend to manage stock effects with return accounting.</p>;
  return <div className="space-y-2 text-sm">
    <select aria-label="Adjustment stock effect" value={effect} disabled={!editable || busy} className="h-9 w-full rounded-md border bg-background px-2 font-normal" onChange={(event) => setEffect(event.target.value as typeof effect)}>
      <option value="">Choose the stock effect</option>
      {credit ? <><option value="PRICE_DECREASE">Price correction only — no stock movement</option><option disabled={!document.companyAverageCosting} value={supplier ? "SUPPLIER_RETURN" : "PHYSICAL_RETURN"}>{supplier ? "Return goods to supplier" : "Receive returned goods into quarantine"}</option></> : <option value="PRICE_INCREASE">Additional charge — no stock movement</option>}
    </select>
    {supplier && effect === "SUPPLIER_RETURN" && <select aria-label="Supplier return warehouse" disabled={!editable || busy} className="h-9 w-full rounded-md border bg-background px-2 font-normal" value={warehouse} onChange={(event) => setWarehouse(event.target.value)}><option value="">Choose the issuing warehouse</option>{warehouses.map((row) => <option key={row.id} value={row.id}>{row.label}</option>)}</select>}
    {effect === "PHYSICAL_RETURN" && <p className="text-xs font-normal text-muted-foreground">Stock returns at original issue cost and stays on hold until QC releases it.</p>}
    {effect === "SUPPLIER_RETURN" && <p className="text-xs font-normal text-muted-foreground">Stock leaves at carrying cost. Any supplier price difference posts separately.</p>}
    {editable && <Button size="sm" variant="outline" disabled={busy || !effect || (effect === "SUPPLIER_RETURN" && !warehouse)} onClick={async () => {
      setBusy(true);
      try { await patchDocumentApi(document.type, document.id, { adjustmentEffect: effect as DocumentDetailRecord["adjustmentEffect"], ...(effect === "SUPPLIER_RETURN" ? { warehouseId: warehouse } : {}) }); await onSaved(); toast.success("Adjustment stock effect saved."); }
      catch (error) { toast.error(error instanceof Error ? error.message : "Adjustment could not save."); }
      finally { setBusy(false); }
    }}>Save stock effect</Button>}
  </div>;
}
