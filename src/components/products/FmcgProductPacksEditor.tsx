"use client";

/**
 * FMCG product packs — per SKU only (no org defaults).
 * Add pack terms (CARTON, BALE, OUTER, …) and pieces packed in each.
 */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchProductPackagingDetailApi,
  saveProductPackagingApi,
} from "@/lib/api/product-master";
import type { ProductPackaging } from "@/lib/products/pricing-types";
import { toast } from "sonner";
import * as Icons from "lucide-react";

type PackRow = {
  key: string;
  uom: string;
  unitsPer: string;
  isDefaultSalesUom?: boolean;
  barcode?: string;
};

const SUGGESTED_UOMS = ["CARTON", "BALE", "OUTER", "BOX", "PACK", "DOZEN"] as const;

function toSaveItems(rows: PackRow[]): ProductPackaging[] {
  const seen = new Set<string>();
  const out: ProductPackaging[] = [];
  for (const r of rows) {
    const uom = r.uom.trim().toUpperCase();
    if (!uom || seen.has(uom)) continue;
    const unitsPer = Number(r.unitsPer);
    if (!Number.isFinite(unitsPer) || unitsPer <= 1) continue;
    seen.add(uom);
    out.push({
      uom,
      unitsPer,
      baseUom: "PCS",
      barcode: r.barcode,
      isDefaultSalesUom: r.isDefaultSalesUom,
    });
  }
  return out;
}

export function FmcgProductPacksEditor({
  productId,
  canWrite,
  compact,
  onChanged,
}: {
  productId: string;
  canWrite: boolean;
  compact?: boolean;
  onChanged?: (items: ProductPackaging[]) => void;
}) {
  const [rows, setRows] = React.useState<PackRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [newUom, setNewUom] = React.useState("");
  const [newUnits, setNewUnits] = React.useState("");

  const onChangedRef = React.useRef(onChanged);
  onChangedRef.current = onChanged;

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const detail = await fetchProductPackagingDetailApi(productId);
      const next: PackRow[] = (detail.items ?? []).map((item, i) => ({
        key: `${item.uom}-${i}`,
        uom: item.uom.toUpperCase(),
        unitsPer: String(item.unitsPer),
        isDefaultSalesUom: item.isDefaultSalesUom,
        barcode: item.barcode,
      }));
      setRows(next);
      setDirty(false);
      onChangedRef.current?.(detail.items ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load packs.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const patchRow = (key: string, patch: Partial<PackRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    setDirty(true);
  };

  const removeRow = (key: string) => {
    setRows((prev) => prev.filter((r) => r.key !== key));
    setDirty(true);
  };

  const addRow = () => {
    const uom = newUom.trim().toUpperCase();
    const unitsPer = Number(newUnits);
    if (!uom) {
      toast.error("Enter a pack name (e.g. CARTON, BALE).");
      return;
    }
    if (!Number.isFinite(unitsPer) || unitsPer <= 1) {
      toast.error("Pieces packed must be greater than 1.");
      return;
    }
    if (rows.some((r) => r.uom.trim().toUpperCase() === uom)) {
      toast.error(`${uom} is already on this product.`);
      return;
    }
    setRows((prev) => [
      ...prev,
      { key: `${uom}-${Date.now()}`, uom, unitsPer: String(unitsPer) },
    ]);
    setNewUnits("");
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const items = toSaveItems(rows);
      if (rows.some((r) => r.uom.trim()) && items.length === 0) {
        toast.error("Each pack needs pieces packed greater than 1 (e.g. 24).");
        setSaving(false);
        return;
      }
      await saveProductPackagingApi(productId, items);
      setDirty(false);
      onChanged?.(items);
      toast.success("Product packs saved.");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading packs…</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-xs text-muted-foreground max-w-xl">
          Set packing for <strong>this product only</strong> — how many pieces (PCS) are in each carton,
          bale, outer, etc. Different SKUs can differ. Required before converting a sales order to a
          delivery note when you sell in that pack.
        </p>
        {canWrite ? (
          <Button type="button" size="sm" disabled={saving || !dirty} onClick={() => void handleSave()}>
            {saving ? "Saving…" : dirty ? "Save packs" : "Saved"}
          </Button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-amber-800 dark:text-amber-200 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2">
          No packs yet. Add at least one (e.g. CARTON = 24 PCS) if you sell this SKU in cartons or
          bales.
        </p>
      ) : null}

      {compact ? (
        <ul className="text-sm space-y-2">
          {rows.map((r) => (
            <li
              key={r.key}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-2 py-1.5"
            >
              <span className="font-mono font-medium">{r.uom}</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={2}
                  className="h-8 w-20"
                  disabled={!canWrite}
                  value={r.unitsPer}
                  onChange={(e) => patchRow(r.key, { unitsPer: e.target.value })}
                />
                <span className="text-xs text-muted-foreground">pcs</span>
                {canWrite ? (
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeRow(r.key)}>
                    <Icons.Trash2 className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pack name</TableHead>
                <TableHead>Pieces packed</TableHead>
                {canWrite ? <TableHead className="w-12" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.key}>
                  <TableCell>
                    <Input
                      className="h-8 font-mono uppercase"
                      disabled={!canWrite}
                      value={r.uom}
                      onChange={(e) => patchRow(r.key, { uom: e.target.value.toUpperCase() })}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={2}
                        className="h-8 w-28"
                        disabled={!canWrite}
                        value={r.unitsPer}
                        onChange={(e) => patchRow(r.key, { unitsPer: e.target.value })}
                      />
                      <span className="text-xs text-muted-foreground">PCS</span>
                    </div>
                  </TableCell>
                  {canWrite ? (
                    <TableCell>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(r.key)}>
                        <Icons.Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {canWrite ? (
        <div className="flex flex-wrap items-end gap-2 rounded-md border border-dashed p-3">
          <div className="space-y-1">
            <Label className="text-xs">Pack name</Label>
            <Input
              list="fmcg-pack-uom-suggestions"
              className="h-8 w-36 font-mono uppercase"
              value={newUom}
              onChange={(e) => setNewUom(e.target.value.toUpperCase())}
              placeholder="CARTON"
            />
            <datalist id="fmcg-pack-uom-suggestions">
              {SUGGESTED_UOMS.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Pieces packed</Label>
            <Input
              type="number"
              min={2}
              className="h-8 w-28"
              value={newUnits}
              onChange={(e) => setNewUnits(e.target.value)}
              placeholder="e.g. 24"
            />
          </div>
          <Button type="button" size="sm" variant="secondary" onClick={addRow}>
            <Icons.Plus className="mr-1 h-3.5 w-3.5" />
            Add pack
          </Button>
        </div>
      ) : null}
    </div>
  );
}
