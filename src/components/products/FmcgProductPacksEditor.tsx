"use client";

/**
 * FMCG product packs: prefilled from manufacturer defaults.
 * Toggle off packs this SKU doesn't use; edit pieces when different.
 */

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  uom: string;
  unitsPer: string;
  enabled: boolean;
  fromDefault: boolean;
  defaultUnitsPer?: number;
  isDefaultSalesUom?: boolean;
  barcode?: string;
};

function buildRows(
  items: ProductPackaging[],
  defaults: ProductPackaging[],
  hasProductOverride: boolean,
): PackRow[] {
  const itemByUom = new Map(items.map((r) => [r.uom.toUpperCase(), r]));
  const rows: PackRow[] = defaults.map((d) => {
    const key = d.uom.toUpperCase();
    const hit = itemByUom.get(key);
    if (!hasProductOverride) {
      return {
        uom: key,
        unitsPer: String(d.unitsPer),
        enabled: true,
        fromDefault: true,
        defaultUnitsPer: d.unitsPer,
        isDefaultSalesUom: d.isDefaultSalesUom,
        barcode: d.barcode,
      };
    }
    return {
      uom: key,
      unitsPer: String(hit?.unitsPer ?? d.unitsPer),
      enabled: Boolean(hit),
      fromDefault: true,
      defaultUnitsPer: d.unitsPer,
      isDefaultSalesUom: hit?.isDefaultSalesUom ?? d.isDefaultSalesUom,
      barcode: hit?.barcode ?? d.barcode,
    };
  });

  const defaultUoms = new Set(defaults.map((d) => d.uom.toUpperCase()));
  for (const item of items) {
    const key = item.uom.toUpperCase();
    if (defaultUoms.has(key)) continue;
    rows.push({
      uom: key,
      unitsPer: String(item.unitsPer),
      enabled: true,
      fromDefault: false,
      isDefaultSalesUom: item.isDefaultSalesUom,
      barcode: item.barcode,
    });
  }
  return rows;
}

function toSaveItems(rows: PackRow[]): ProductPackaging[] {
  return rows
    .filter((r) => r.enabled)
    .map((r) => {
      const unitsPer = Number(r.unitsPer);
      return {
        uom: r.uom,
        unitsPer: Number.isFinite(unitsPer) && unitsPer > 0 ? unitsPer : 1,
        baseUom: "PCS",
        barcode: r.barcode,
        isDefaultSalesUom: r.isDefaultSalesUom,
      };
    });
}

export function FmcgProductPacksEditor({
  productId,
  canWrite,
  compact,
  onChanged,
}: {
  productId: string;
  canWrite: boolean;
  /** Smaller card-style list for Overview. */
  compact?: boolean;
  onChanged?: (items: ProductPackaging[]) => void;
}) {
  const [rows, setRows] = React.useState<PackRow[]>([]);
  const [defaults, setDefaults] = React.useState<ProductPackaging[]>([]);
  const [hasOverride, setHasOverride] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);

  const onChangedRef = React.useRef(onChanged);
  onChangedRef.current = onChanged;

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const detail = await fetchProductPackagingDetailApi(productId);
      setDefaults(detail.defaults);
      setHasOverride(detail.hasProductOverride);
      const next = buildRows(detail.items, detail.defaults, detail.hasProductOverride);
      setRows(next);
      setDirty(false);
      const effective = detail.hasProductOverride
        ? detail.items
        : detail.defaults.map((d) => ({ ...d, baseUom: d.baseUom || "PCS" }));
      onChangedRef.current?.(effective);
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

  const patchRow = (uom: string, patch: Partial<PackRow>) => {
    setRows((prev) => prev.map((r) => (r.uom === uom ? { ...r, ...patch } : r)));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const items = toSaveItems(rows);
      await saveProductPackagingApi(productId, items);
      setHasOverride(true);
      setDirty(false);
      onChanged?.(items);
      toast.success("Product packs saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    if (!canWrite) return;
    setSaving(true);
    try {
      // Clear override by writing the defaults as the product list (explicit copy),
      // then rebuild UI from defaults — user can re-toggle. True "delete key" would
      // need a DELETE endpoint; copying defaults is the practical reset.
      const items = defaults.map((d) => ({
        uom: d.uom.toUpperCase(),
        unitsPer: d.unitsPer,
        baseUom: "PCS" as const,
        barcode: d.barcode,
        isDefaultSalesUom: d.isDefaultSalesUom,
      }));
      await saveProductPackagingApi(productId, items);
      setHasOverride(true);
      setRows(buildRows(items, defaults, true));
      setDirty(false);
      onChanged?.(items);
      toast.success("Reset to manufacturer packs.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reset failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading packs…</p>;
  }

  if (defaults.length === 0 && rows.length === 0) {
    return (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>No manufacturer packs yet. Set them once for this org, then products inherit them.</p>
        <Button size="sm" variant="outline" asChild>
          <Link href="/pricing/workspace/packs">Manufacturer packs</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-xs text-muted-foreground max-w-xl">
          {hasOverride
            ? "Customized for this product. Toggle off packs you don’t sell, or edit pieces."
            : "Using manufacturer defaults. Save after changes to lock this product’s packs."}
          {" "}
          <Link href="/pricing/workspace/packs" className="underline underline-offset-2">
            Edit manufacturer packs
          </Link>
        </p>
        {canWrite ? (
          <div className="flex flex-wrap gap-2">
            {hasOverride ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={() => void handleResetToDefaults()}
              >
                Reset to defaults
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              disabled={saving || !dirty}
              onClick={() => void handleSave()}
            >
              {saving ? "Saving…" : dirty ? "Save packs" : "Saved"}
            </Button>
          </div>
        ) : null}
      </div>

      {compact ? (
        <ul className="text-sm space-y-2">
          {rows.map((r) => (
            <li
              key={r.uom}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-2 py-1.5"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Switch
                  checked={r.enabled}
                  disabled={!canWrite}
                  onCheckedChange={(on) => patchRow(r.uom, { enabled: on })}
                />
                <span className={`font-mono font-medium ${r.enabled ? "" : "text-muted-foreground line-through"}`}>
                  {r.uom}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground sr-only">Pieces</Label>
                <Input
                  type="number"
                  min={1}
                  className="h-8 w-20"
                  disabled={!canWrite || !r.enabled}
                  value={r.unitsPer}
                  onChange={(e) => patchRow(r.uom, { unitsPer: e.target.value })}
                />
                <span className="text-xs text-muted-foreground">pcs</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[72px]">Use</TableHead>
                <TableHead>Pack</TableHead>
                <TableHead>Pieces packed</TableHead>
                <TableHead className="text-muted-foreground">Manufacturer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.uom} className={r.enabled ? undefined : "opacity-60"}>
                  <TableCell>
                    <Switch
                      checked={r.enabled}
                      disabled={!canWrite}
                      onCheckedChange={(on) => patchRow(r.uom, { enabled: on })}
                    />
                  </TableCell>
                  <TableCell className="font-mono font-medium">{r.uom}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      className="h-8 w-28"
                      disabled={!canWrite || !r.enabled}
                      value={r.unitsPer}
                      onChange={(e) => patchRow(r.uom, { unitsPer: e.target.value })}
                    />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.fromDefault
                      ? r.defaultUnitsPer != null
                        ? `${r.defaultUnitsPer} pcs`
                        : "—"
                      : "Product-only"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!compact && canWrite ? (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Icons.Info className="h-3.5 w-3.5 shrink-0" />
          Extra product-only packs can still be added from the legacy packaging tools if needed.
        </p>
      ) : null}
    </div>
  );
}
