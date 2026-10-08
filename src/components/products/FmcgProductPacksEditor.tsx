"use client";

/**
 * FMCG Alternate Units & Packs — per SKU chained UOM conversions.
 */

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { fetchProductUomsApi } from "@/lib/api/uom";
import type { ProductPackaging } from "@/lib/products/pricing-types";
import {
  formatConversionPreview,
  prepareSkuAlternateUoms,
  type SkuAlternateUom,
} from "@/lib/products/sku-uom";
import { toast } from "sonner";
import * as Icons from "lucide-react";

type PackRow = {
  key: string;
  uom: string;
  factor: string;
  referenceUom: string;
  isDefaultSalesUom?: boolean;
  isDefaultPurchaseUom?: boolean;
  isDefaultWarehouseUom?: boolean;
  isDefaultReportingUom?: boolean;
  status: "active" | "inactive";
  barcode?: string;
  explicitSalesPrice?: string;
};

type CatalogUom = { code: string; name: string };

type DefaultFor = "sales" | "purchase" | "warehouse" | "reporting" | "";

function catalogLabel(uom: CatalogUom): string {
  const name = uom.name.trim();
  if (!name || name.toUpperCase() === uom.code) return uom.code;
  return `${uom.code} · ${name}`;
}

function PackUomSelect({
  value,
  options,
  disabled,
  onChange,
  placeholder,
}: {
  value: string;
  options: CatalogUom[];
  disabled?: boolean;
  onChange: (code: string) => void;
  placeholder?: string;
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled || options.length === 0}>
      <SelectTrigger className="h-8 w-40 font-mono">
        <SelectValue placeholder={placeholder ?? "Select unit"} />
      </SelectTrigger>
      <SelectContent>
        {options.map((uom) => (
          <SelectItem key={uom.code} value={uom.code}>
            {catalogLabel(uom)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function defaultForOf(r: PackRow): DefaultFor {
  if (r.isDefaultSalesUom) return "sales";
  if (r.isDefaultPurchaseUom) return "purchase";
  if (r.isDefaultWarehouseUom) return "warehouse";
  if (r.isDefaultReportingUom) return "reporting";
  return "";
}

function applyDefaultFor(r: PackRow, value: DefaultFor): PackRow {
  return {
    ...r,
    isDefaultSalesUom: value === "sales",
    isDefaultPurchaseUom: value === "purchase",
    isDefaultWarehouseUom: value === "warehouse",
    isDefaultReportingUom: value === "reporting",
  };
}

function toSkuRows(rows: PackRow[], baseUom: string): SkuAlternateUom[] {
  return prepareSkuAlternateUoms(
    rows.map((r) => ({
      uom: r.uom.trim().toUpperCase(),
      factor: Number(r.factor),
      referenceUom: r.referenceUom.trim().toUpperCase() || baseUom,
      barcode: r.barcode,
      isDefaultSalesUom: r.isDefaultSalesUom,
      isDefaultPurchaseUom: r.isDefaultPurchaseUom,
      isDefaultWarehouseUom: r.isDefaultWarehouseUom,
      isDefaultReportingUom: r.isDefaultReportingUom,
      status: r.status,
    })),
    baseUom
  ).rows;
}

function toSaveItems(rows: PackRow[], baseUom: string): ProductPackaging[] {
  const { rows: prepared, validation } = prepareSkuAlternateUoms(
    rows.map((r) => ({
      uom: r.uom.trim().toUpperCase(),
      factor: Number(r.factor),
      referenceUom: r.referenceUom.trim().toUpperCase() || baseUom,
      barcode: r.barcode,
      isDefaultSalesUom: r.isDefaultSalesUom,
      isDefaultPurchaseUom: r.isDefaultPurchaseUom,
      isDefaultWarehouseUom: r.isDefaultWarehouseUom,
      isDefaultReportingUom: r.isDefaultReportingUom,
      status: r.status,
      explicitSalesPrice:
        r.explicitSalesPrice != null && r.explicitSalesPrice !== ""
          ? Number(r.explicitSalesPrice)
          : undefined,
    })),
    baseUom
  );
  if (!validation.ok) {
    throw new Error(validation.errors.join("; "));
  }
  return prepared.map((r) => ({
    uom: r.uom,
    unitsPer: r.unitsPer,
    baseUom: r.baseUom ?? baseUom,
    factor: r.factor,
    referenceUom: r.referenceUom,
    barcode: r.barcode,
    isDefaultSalesUom: r.isDefaultSalesUom,
    isDefaultPurchaseUom: r.isDefaultPurchaseUom,
    isDefaultWarehouseUom: r.isDefaultWarehouseUom,
    isDefaultReportingUom: r.isDefaultReportingUom,
    status: r.status,
    explicitSalesPrice: r.explicitSalesPrice,
  }));
}

export function FmcgProductPacksEditor({
  productId,
  canWrite,
  compact,
  onChanged,
  baseUom: baseUomProp,
}: {
  productId: string;
  canWrite: boolean;
  compact?: boolean;
  onChanged?: (items: ProductPackaging[]) => void;
  baseUom?: string;
}) {
  const baseUom = (baseUomProp ?? "PCS").trim().toUpperCase() || "PCS";
  const [rows, setRows] = React.useState<PackRow[]>([]);
  const [catalog, setCatalog] = React.useState<CatalogUom[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [newUom, setNewUom] = React.useState("");
  const [newFactor, setNewFactor] = React.useState("");
  const [newRef, setNewRef] = React.useState(baseUom);

  const onChangedRef = React.useRef(onChanged);
  onChangedRef.current = onChanged;

  const skuRows = React.useMemo(() => toSkuRows(rows, baseUom), [rows, baseUom]);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const detail = await fetchProductPackagingDetailApi(productId);
      const next: PackRow[] = (detail.items ?? []).map((item, i) => {
        const factor = item.factor ?? item.unitsPer;
        const referenceUom = (item.referenceUom ?? item.baseUom ?? baseUom).toUpperCase();
        return {
          key: `${item.uom}-${i}`,
          uom: item.uom.toUpperCase(),
          factor: String(factor),
          referenceUom,
          isDefaultSalesUom: item.isDefaultSalesUom,
          isDefaultPurchaseUom: item.isDefaultPurchaseUom,
          isDefaultWarehouseUom: item.isDefaultWarehouseUom,
          isDefaultReportingUom: item.isDefaultReportingUom,
          status: item.status === "inactive" ? "inactive" : "active",
          barcode: item.barcode,
          explicitSalesPrice:
            item.explicitSalesPrice != null ? String(item.explicitSalesPrice) : "",
        };
      });
      setRows(next);
      setDirty(false);
      onChangedRef.current?.(detail.items ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load packs.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [productId, baseUom]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  React.useEffect(() => {
    let cancelled = false;
    fetchProductUomsApi()
      .then((list) => {
        if (cancelled) return;
        const next = list
          .map((uom) => ({
            code: uom.code.trim().toUpperCase(),
            name: (uom.name || uom.code).trim(),
          }))
          .filter((uom) => uom.code.length > 0)
          .sort((a, b) => a.code.localeCompare(b.code));
        setCatalog(next);
      })
      .catch(() => {
        if (!cancelled) setCatalog([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    setNewRef((prev) => prev || baseUom);
  }, [baseUom]);

  const choicesFor = React.useCallback(
    (current?: string): CatalogUom[] => {
      const used = new Set(
        rows.map((row) => row.uom.trim().toUpperCase()).filter((code) => code && code !== current)
      );
      used.add(baseUom);
      const options = catalog.filter((uom) => !used.has(uom.code));
      const code = current?.trim().toUpperCase();
      if (code && !options.some((uom) => uom.code === code)) {
        options.unshift({ code, name: code });
      }
      return options;
    },
    [catalog, rows, baseUom]
  );

  const referenceChoices = React.useCallback(
    (forUom?: string): CatalogUom[] => {
      const codes = new Set<string>([baseUom]);
      for (const r of rows) {
        const code = r.uom.trim().toUpperCase();
        if (code && code !== forUom?.toUpperCase()) codes.add(code);
      }
      const fromCatalog = catalog.filter((u) => codes.has(u.code));
      for (const code of codes) {
        if (!fromCatalog.some((u) => u.code === code)) {
          fromCatalog.push({ code, name: code });
        }
      }
      return fromCatalog.sort((a, b) => a.code.localeCompare(b.code));
    },
    [catalog, rows, baseUom]
  );

  const patchRow = (key: string, patch: Partial<PackRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    setDirty(true);
  };

  const removeRow = (key: string) => {
    setRows((prev) => prev.filter((r) => r.key !== key));
    setDirty(true);
  };

  const newPreview =
    newUom && Number(newFactor) > 0
      ? formatConversionPreview(newUom, Number(newFactor), newRef || baseUom, skuRows, baseUom)
      : null;

  const addRow = () => {
    const uom = newUom.trim().toUpperCase();
    const factor = Number(newFactor);
    const referenceUom = (newRef || baseUom).trim().toUpperCase();
    if (!uom) {
      toast.error("Choose an Alternate UOM from the catalog.");
      return;
    }
    if (!catalog.some((item) => item.code === uom) && uom !== baseUom) {
      // allow if in catalog
      if (!catalog.some((item) => item.code === uom)) {
        toast.error("That unit is not in the UOM catalog.");
        return;
      }
    }
    if (!Number.isFinite(factor) || factor <= 0) {
      toast.error("Quantity must be greater than zero.");
      return;
    }
    if (rows.some((r) => r.uom.trim().toUpperCase() === uom)) {
      toast.error(`${uom} is already on this product.`);
      return;
    }
    if (uom === baseUom) {
      toast.error(`${baseUom} is the Base UOM — add alternates only.`);
      return;
    }
    setRows((prev) => [
      ...prev,
      {
        key: `${uom}-${Date.now()}`,
        uom,
        factor: String(factor),
        referenceUom,
        status: "active",
      },
    ]);
    setNewUom("");
    setNewFactor("");
    setNewRef(baseUom);
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const items = toSaveItems(rows, baseUom);
      await saveProductPackagingApi(productId, items);
      setDirty(false);
      onChanged?.(items);
      toast.success("Alternate units saved.");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading alternate units…</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-xs text-muted-foreground max-w-xl">
          Base UOM: <span className="font-mono font-medium text-foreground">{baseUom}</span>.
          Define Alternate UOMs for <strong>this product only</strong> (chained conversions allowed).
          Units come from the{" "}
          <Link href="/settings/uom" className="underline underline-offset-2">
            UOM catalog
          </Link>
          ; conversions are never taken from customer orders.
        </p>
        {canWrite ? (
          <Button type="button" size="sm" disabled={saving || !dirty} onClick={() => void handleSave()}>
            {saving ? "Saving…" : dirty ? "Save units" : "Saved"}
          </Button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-amber-800 dark:text-amber-200 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2">
          No alternate units yet. Add e.g. 1 CTN = 12 {baseUom}, or 1 OUTER = 4 CTN.
        </p>
      ) : null}

      {compact ? (
        <ul className="text-sm space-y-2">
          {rows.map((r) => {
            const preview = formatConversionPreview(
              r.uom,
              Number(r.factor) || 0,
              r.referenceUom,
              skuRows,
              baseUom
            );
            return (
              <li
                key={r.key}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-2 py-1.5"
              >
                <span className="font-mono font-medium">{r.uom}</span>
                <span className="text-xs text-muted-foreground">{preview}</span>
                {canWrite ? (
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeRow(r.key)}>
                    <Icons.Trash2 className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>UOM</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Equals</TableHead>
                <TableHead>Reference UOM</TableHead>
                <TableHead>Base Equivalent</TableHead>
                <TableHead>Default For</TableHead>
                <TableHead>Explicit price</TableHead>
                <TableHead>Status</TableHead>
                {canWrite ? <TableHead className="w-12" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-muted/30">
                <TableCell className="font-mono">{baseUom}</TableCell>
                <TableCell>1</TableCell>
                <TableCell>=</TableCell>
                <TableCell className="font-mono">{baseUom}</TableCell>
                <TableCell className="font-mono">1 {baseUom}</TableCell>
                <TableCell className="text-muted-foreground text-xs">Base</TableCell>
                <TableCell className="text-muted-foreground text-xs">—</TableCell>
                <TableCell>active</TableCell>
                {canWrite ? <TableCell /> : null}
              </TableRow>
              {rows.map((r) => {
                const factorNum = Number(r.factor) || 0;
                const preview = formatConversionPreview(
                  r.uom,
                  factorNum,
                  r.referenceUom,
                  skuRows,
                  baseUom
                );
                const baseEq = skuRows.find((x) => x.uom === r.uom.toUpperCase())?.unitsPer;
                return (
                  <TableRow key={r.key}>
                    <TableCell>
                      {canWrite ? (
                        <PackUomSelect
                          value={r.uom}
                          options={choicesFor(r.uom)}
                          onChange={(code) => patchRow(r.key, { uom: code })}
                        />
                      ) : (
                        <span className="font-mono">{r.uom}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0.0001}
                        step="any"
                        className="h-8 w-24"
                        disabled={!canWrite}
                        value={r.factor}
                        onChange={(e) => patchRow(r.key, { factor: e.target.value })}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">=</TableCell>
                    <TableCell>
                      {canWrite ? (
                        <PackUomSelect
                          value={r.referenceUom}
                          options={referenceChoices(r.uom)}
                          onChange={(code) => patchRow(r.key, { referenceUom: code })}
                        />
                      ) : (
                        <span className="font-mono">{r.referenceUom}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        <div className="font-mono">
                          {baseEq != null ? `${baseEq} ${baseUom}` : "—"}
                        </div>
                        <div className="text-muted-foreground">{preview}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={defaultForOf(r) || "none"}
                        disabled={!canWrite}
                        onValueChange={(v) =>
                          patchRow(
                            r.key,
                            applyDefaultFor(r, v === "none" ? "" : (v as DefaultFor))
                          )
                        }
                      >
                        <SelectTrigger className="h-8 w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          <SelectItem value="sales">Sales</SelectItem>
                          <SelectItem value="purchase">Purchase</SelectItem>
                          <SelectItem value="warehouse">Warehouse</SelectItem>
                          <SelectItem value="reporting">Reporting</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        className="h-8 w-24"
                        disabled={!canWrite}
                        placeholder="calc"
                        value={r.explicitSalesPrice ?? ""}
                        onChange={(e) =>
                          patchRow(r.key, { explicitSalesPrice: e.target.value })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={r.status}
                        disabled={!canWrite}
                        onValueChange={(v) =>
                          patchRow(r.key, { status: v as "active" | "inactive" })
                        }
                      >
                        <SelectTrigger className="h-8 w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">active</SelectItem>
                          <SelectItem value="inactive">inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    {canWrite ? (
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(r.key)}>
                          <Icons.Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {canWrite && catalog.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add this manufacturer’s units on the{" "}
          <Link href="/settings/uom" className="underline underline-offset-2">
            UOM catalog
          </Link>
          , then choose them here.
        </p>
      ) : canWrite ? (
        <div className="space-y-2 rounded-md border border-dashed p-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Alternate UOM</Label>
              <PackUomSelect value={newUom} options={choicesFor()} onChange={setNewUom} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">1 {newUom || "UOM"} contains</Label>
              <Input
                type="number"
                min={0.0001}
                step="any"
                className="h-8 w-28"
                value={newFactor}
                onChange={(e) => setNewFactor(e.target.value)}
                placeholder="e.g. 4"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">of UOM</Label>
              <PackUomSelect
                value={newRef}
                options={referenceChoices(newUom)}
                onChange={setNewRef}
              />
            </div>
            <Button type="button" size="sm" variant="secondary" onClick={addRow} disabled={choicesFor().length === 0}>
              <Icons.Plus className="mr-1 h-3.5 w-3.5" />
              Add alternate
            </Button>
          </div>
          {newPreview ? (
            <p className="text-sm font-mono text-foreground">{newPreview}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
