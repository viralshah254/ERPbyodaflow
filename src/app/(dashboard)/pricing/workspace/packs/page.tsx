"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  fetchPackagingDefaultsApi,
  savePackagingDefaultsApi,
} from "@/lib/api/product-master";
import { createUomApi, fetchProductUomsApi } from "@/lib/api/uom";
import type { ProductPackaging } from "@/lib/products/pricing-types";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const COMMON_PACKS = ["CARTON", "OUTER", "BALE", "BOX", "PACK", "DOZEN"] as const;

export default function PricingManufacturerPacksPage() {
  const [items, setItems] = React.useState<ProductPackaging[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingIdx, setEditingIdx] = React.useState<number | null>(null);
  const [packName, setPackName] = React.useState("CARTON");
  const [customName, setCustomName] = React.useState("");
  const [useCustom, setUseCustom] = React.useState(false);
  const [unitsPer, setUnitsPer] = React.useState("24");
  const [uomOptions, setUomOptions] = React.useState<string[]>([]);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const [rows, uoms] = await Promise.all([
        fetchPackagingDefaultsApi(),
        fetchProductUomsApi().catch(() => []),
      ]);
      setItems(rows);
      setUomOptions(uoms.map((u) => u.code.toUpperCase()));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load manufacturer packs.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const packChoices = React.useMemo(() => {
    const set = new Set<string>([...COMMON_PACKS, ...uomOptions]);
    for (const piece of ["EA", "PC", "PCS", "PIECE", "UNIT", "RRP"]) set.delete(piece);
    for (const row of items) set.add(row.uom.toUpperCase());
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [uomOptions, items]);

  const openAdd = () => {
    setEditingIdx(null);
    setPackName("CARTON");
    setCustomName("");
    setUseCustom(false);
    setUnitsPer("24");
    setSheetOpen(true);
  };

  const openEdit = (idx: number) => {
    const row = items[idx];
    if (!row) return;
    setEditingIdx(idx);
    const known = packChoices.includes(row.uom.toUpperCase());
    setUseCustom(!known);
    setPackName(row.uom.toUpperCase());
    setCustomName(known ? "" : row.uom);
    setUnitsPer(String(row.unitsPer));
    setSheetOpen(true);
  };

  const persist = async (next: ProductPackaging[]) => {
    setSaving(true);
    try {
      const saved = await savePackagingDefaultsApi(next);
      setItems(saved);
      toast.success("Manufacturer packs saved.");
      setSheetOpen(false);
      setEditingIdx(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRow = async () => {
    const code = (useCustom ? customName : packName).trim().replace(/\s+/g, "_").toUpperCase();
    const pieces = Number(unitsPer);
    if (!code) {
      toast.error("Enter a pack name.");
      return;
    }
    if (!Number.isFinite(pieces) || pieces <= 0) {
      toast.error("Pieces packed must be greater than 0.");
      return;
    }
    if (!uomOptions.includes(code)) {
      try {
        await createUomApi({
          code,
          name: code.replace(/_/g, " "),
          category: "count",
          decimals: 0,
          isBase: true,
        });
        setUomOptions((prev) => (prev.includes(code) ? prev : [...prev, code]));
      } catch {
        // catalog create optional — pack still saves
      }
    }
    const row: ProductPackaging = {
      uom: code,
      unitsPer: pieces,
      baseUom: "PCS",
    };
    const next = [...items];
    const dupIdx = next.findIndex((r, i) => r.uom.toUpperCase() === code && i !== editingIdx);
    if (dupIdx >= 0) {
      toast.error(`${code} is already in the list.`);
      return;
    }
    if (editingIdx != null) next[editingIdx] = row;
    else next.push(row);
    await persist(next);
  };

  const handleRemove = async (idx: number) => {
    const next = items.filter((_, i) => i !== idx);
    await persist(next);
  };

  const addCommonMissing = async () => {
    const have = new Set(items.map((r) => r.uom.toUpperCase()));
    const toAdd: ProductPackaging[] = COMMON_PACKS.filter((c) => !have.has(c)).map((c) => ({
      uom: c,
      unitsPer: c === "OUTER" ? 6 : c === "DOZEN" ? 12 : 24,
      baseUom: "PCS",
    }));
    if (toAdd.length === 0) {
      toast.message("Common packs are already listed.");
      return;
    }
    await persist([...items, ...toAdd]);
  };

  return (
    <PageShell>
      <PageHeader
        title="Manufacturer packs"
        description="Carton, outer, bale, box — or any pack name. Pieces per pack drive price-tag pack prices. Products inherit these; tweak per SKU on the product Packs tab."
        breadcrumbs={[
          { label: "Pricing", href: "/pricing/workspace/overview" },
          { label: "Packs" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/pricing/workspace/lists">Price tags</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => void addCommonMissing()} disabled={saving}>
              Add common packs
            </Button>
            <Button size="sm" onClick={openAdd}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              Add pack
            </Button>
          </div>
        }
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Default packs</CardTitle>
            <CardDescription>
              1 pack = N pieces. Price tags stay price-per-piece; sales in a pack auto-calculate using these
              values unless a product overrides them.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="p-6 text-sm text-muted-foreground">Loading…</p>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground space-y-3">
                <p>No manufacturer packs yet. Add the packs you sell in (carton, outer, bale…).</p>
                <Button size="sm" onClick={openAdd}>
                  <Icons.Plus className="mr-2 h-4 w-4" />
                  Add pack
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pack</TableHead>
                    <TableHead>Pieces packed</TableHead>
                    <TableHead className="w-[120px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row, idx) => (
                    <TableRow key={row.uom}>
                      <TableCell className="font-mono font-medium">{row.uom}</TableCell>
                      <TableCell>{row.unitsPer}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(idx)}>
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => void handleRemove(idx)}
                            disabled={saving}
                          >
                            Remove
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingIdx != null ? "Edit pack" : "Add pack"}</SheetTitle>
            <SheetDescription>
              Applies to all products by default. Individual products can turn a pack off or change pieces.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Pack name</Label>
              <Select
                value={useCustom ? "__custom__" : packName}
                onValueChange={(v) => {
                  if (v === "__custom__") {
                    setUseCustom(true);
                    return;
                  }
                  setUseCustom(false);
                  setPackName(v);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pack" />
                </SelectTrigger>
                <SelectContent>
                  {packChoices.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                  <SelectItem value="__custom__">Other — type a new name…</SelectItem>
                </SelectContent>
              </Select>
              {useCustom ? (
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. HALF_CARTON"
                  autoFocus
                />
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Pieces packed</Label>
              <Input
                type="number"
                min={1}
                step={1}
                value={unitsPer}
                onChange={(e) => setUnitsPer(e.target.value)}
                placeholder="e.g. 24"
              />
              <p className="text-xs text-muted-foreground">
                1 {useCustom ? customName.trim() || "pack" : packName} = {unitsPer || "?"} pieces
              </p>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveRow()} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
