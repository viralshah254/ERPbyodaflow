"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
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
import { fetchUomsApi, createUomApi, updateUomApi, deleteUomApi } from "@/lib/api/uom";
import {
  createUomConversionApi,
  deleteUomConversionApi,
  fetchUomConversionsApi,
  updateUomConversionApi,
} from "@/lib/api/uom-conversions";
import type { UomDefinition, UomConversion } from "@/lib/products/types";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const CATEGORIES = ["weight", "volume", "count", "length", "other"] as const;

// ─── Inline validation (runs off React state, not localStorage) ────────────

function validateLive(uoms: UomDefinition[], conversions: UomConversion[]): { ok: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const codes = new Set(uoms.map((u) => u.code));

  for (const u of uoms) {
    if (!u.code?.trim()) { errors.push("UOM has empty code."); continue; }
    if (u.decimals < 0) errors.push(`${u.code}: decimals must be ≥ 0.`);
    if (!u.isBase) {
      if (u.baseUom && !codes.has(u.baseUom))
        errors.push(`${u.code}: baseUom "${u.baseUom}" not in catalog.`);
      if (u.factorToBase != null && u.factorToBase <= 0)
        errors.push(`${u.code}: factorToBase must be > 0.`);
    }
  }

  for (const c of conversions) {
    if (!codes.has(c.fromUom)) errors.push(`Conversion: "${c.fromUom}" not in catalog.`);
    if (!codes.has(c.toUom)) errors.push(`Conversion: "${c.toUom}" not in catalog.`);
    if (c.factor <= 0) errors.push(`Conversion ${c.fromUom}→${c.toUom}: factor must be > 0.`);
  }

  if (uoms.filter((u) => u.isBase).length === 0) warnings.push("No base UOM defined.");

  return { ok: errors.length === 0, errors, warnings };
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function UomSettingsPage() {
  const [uoms, setUoms] = React.useState<UomDefinition[]>([]);
  const [conversions, setConversions] = React.useState<UomConversion[]>([]);
  const [sheetOpen, setSheetOpen] = React.useState<"uom" | "conversion" | null>(null);
  const [editingUom, setEditingUom] = React.useState<UomDefinition | null>(null);
  const [editingConversion, setEditingConversion] = React.useState<UomConversion | null>(null);
  const [deleting, setDeleting] = React.useState<string | null>(null);

  const validation = React.useMemo(() => validateLive(uoms, conversions), [uoms, conversions]);

  const refresh = React.useCallback(async () => {
    try {
      const [fromApi, conversionRows] = await Promise.all([
        fetchUomsApi(),
        fetchUomConversionsApi(),
      ]);
      setUoms(fromApi);
      setConversions(conversionRows);
    } catch {
      setUoms([]);
      setConversions([]);
    }
  }, []);

  React.useEffect(() => { void refresh(); }, [refresh]);

  const openAddUom = () => { setEditingUom(null); setSheetOpen("uom"); };
  const openEditUom = (u: UomDefinition) => { setEditingUom(u); setSheetOpen("uom"); };
  const openAddConversion = () => { setEditingConversion(null); setSheetOpen("conversion"); };
  const openEditConversion = (c: UomConversion) => { setEditingConversion(c); setSheetOpen("conversion"); };

  const handleDeleteUom = async (u: UomDefinition) => {
    if (!confirm(`Delete "${u.code}" (${u.name})? This cannot be undone.`)) return;
    setDeleting(u.id);
    try {
      await deleteUomApi(u.id);
      await refresh();
      toast.success(`"${u.code}" deleted.`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteConversion = async (c: UomConversion) => {
    await deleteUomConversionApi(c.id);
    await refresh();
    toast.success("Conversion removed.");
  };

  return (
    <PageShell>
      <PageHeader
        title="UOM catalog"
        description="Units of measure and global conversions. Used by product packaging and pricing."
        breadcrumbs={[
          { label: "Settings", href: "/settings/org" },
          { label: "Inventory", href: "/settings/inventory/costing" },
          { label: "UOM catalog" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button size="sm" onClick={openAddUom}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              Add UOM
            </Button>
            <Button variant="outline" size="sm" onClick={openAddConversion}>
              <Icons.ArrowLeftRight className="mr-2 h-4 w-4" />
              Add conversion
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <Card className={validation.ok ? "" : "border-destructive/50"}>
          <CardHeader>
            <CardTitle className="text-base">Validation</CardTitle>
            <CardDescription>Conversion loops, missing base UOM, invalid factors.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {validation.errors.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {validation.errors.map((e, i) => (
                  <Badge key={i} variant="destructive">{e}</Badge>
                ))}
              </div>
            )}
            {validation.warnings.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {validation.warnings.map((w, i) => (
                  <Badge key={i} variant="secondary">{w}</Badge>
                ))}
              </div>
            )}
            {validation.ok && validation.warnings.length === 0 && (
              <Badge variant="default">OK</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">UOM definitions</CardTitle>
            <CardDescription>Base and derived units. Factor to base for conversions.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[40vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Base / Factor</TableHead>
                    <TableHead>Decimals</TableHead>
                    <TableHead className="w-28" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uoms.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-6 text-sm">
                        {"No UOMs yet. Click \"Add UOM\" to get started."}
                      </TableCell>
                    </TableRow>
                  )}
                  {uoms.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-mono font-medium">{u.code}</TableCell>
                      <TableCell>{u.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{u.category}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {u.isBase
                          ? <span className="text-emerald-600 font-medium">Base</span>
                          : u.baseUom
                          ? `1 ${u.code} = ${u.factorToBase} ${u.baseUom}`
                          : "—"}
                      </TableCell>
                      <TableCell>{u.decimals}</TableCell>
                      <TableCell className="space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditUom(u)}>Edit</Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          disabled={deleting === u.id}
                          onClick={() => void handleDeleteUom(u)}
                        >
                          {deleting === u.id ? <Icons.Loader2 className="h-3 w-3 animate-spin" /> : "Delete"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Global conversions</CardTitle>
            <CardDescription>Reference conversions (e.g. 1 TON = 1000 KG). Product packaging overrides per product.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[30vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Factor</TableHead>
                    <TableHead className="w-28" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conversions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6 text-sm">
                        No conversions yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {conversions.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono">{c.fromUom}</TableCell>
                      <TableCell className="font-mono">{c.toUom}</TableCell>
                      <TableCell className="text-sm">1 {c.fromUom} = {c.factor} {c.toUom}</TableCell>
                      <TableCell className="space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditConversion(c)}>Edit</Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => void handleDeleteConversion(c)}>
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {sheetOpen === "uom" && (
        <UomSheet
          initial={editingUom}
          uomCodes={uoms.map((u) => u.code)}
          onSave={async (u) => {
            try {
              if (editingUom) {
                await updateUomApi(editingUom.id, {
                  name: u.name,
                  category: u.category,
                  decimals: u.decimals,
                  isBase: u.isBase ?? false,
                  baseUomCode: u.baseUom,
                  factorToBase: u.factorToBase,
                });
              } else {
                await createUomApi({
                  code: u.code,
                  name: u.name,
                  category: u.category,
                  decimals: u.decimals,
                  isBase: u.isBase ?? false,
                  baseUomCode: u.baseUom,
                  factorToBase: u.factorToBase,
                });
              }
              await refresh();
              setSheetOpen(null);
              toast.success(editingUom ? "UOM updated." : "UOM created.");
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
          onClose={() => setSheetOpen(null)}
        />
      )}
      {sheetOpen === "conversion" && (
        <ConversionSheet
          initial={editingConversion}
          uomCodes={uoms.map((u) => u.code)}
          onSave={async (c) => {
            try {
              if (editingConversion) {
                await updateUomConversionApi(editingConversion.id, {
                  fromUom: c.fromUom,
                  toUom: c.toUom,
                  factor: c.factor,
                });
              } else {
                await createUomConversionApi({
                  fromUom: c.fromUom,
                  toUom: c.toUom,
                  factor: c.factor,
                });
              }
              await refresh();
              setSheetOpen(null);
              toast.success(editingConversion ? "Conversion updated." : "Conversion created.");
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
          onClose={() => setSheetOpen(null)}
        />
      )}
    </PageShell>
  );
}

// ─── UOM Sheet ────────────────────────────────────────────────────────────

function UomSheet({
  initial,
  uomCodes,
  onSave,
  onClose,
}: {
  initial: UomDefinition | null;
  uomCodes: string[];
  onSave: (u: Omit<UomDefinition, "id">) => void;
  onClose: () => void;
}) {
  const [code, setCode] = React.useState(initial?.code ?? "");
  const [name, setName] = React.useState(initial?.name ?? "");
  const [category, setCategory] = React.useState<string>(initial?.category ?? "count");
  const [decimals, setDecimals] = React.useState(String(initial?.decimals ?? 0));
  const [isBase, setIsBase] = React.useState(initial?.isBase !== false && !initial?.baseUom);
  const [baseUom, setBaseUom] = React.useState(initial?.baseUom ?? "");
  const [factorToBase, setFactorToBase] = React.useState(
    initial?.factorToBase != null ? String(initial.factorToBase) : ""
  );

  const handleSave = () => {
    const dec = parseInt(decimals, 10);
    if (isNaN(dec) || dec < 0) { return; }
    if (!code.trim()) { return; }
    if (!isBase && (!baseUom || !factorToBase || Number(factorToBase) <= 0)) { return; }
    onSave({
      code: code.trim().toUpperCase(),
      name: name.trim() || code.trim().toUpperCase(),
      category: category as UomDefinition["category"],
      decimals: dec,
      isBase: isBase || undefined,
      baseUom: isBase ? undefined : (baseUom || undefined),
      factorToBase: isBase ? undefined : (factorToBase ? Number(factorToBase) : undefined),
    });
  };

  const baseOptions = uomCodes.filter((c) => c !== code.toUpperCase());

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{initial ? "Edit UOM" : "Add UOM"}</SheetTitle>
          <SheetDescription>Define a unit of measure. Mark as Base UOM if it has no conversion factor.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-6">
          <div>
            <Label>Code</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="KG"
              disabled={!!initial}
            />
            <p className="text-xs text-muted-foreground mt-1">Uppercase abbreviation used across the system.</p>
          </div>
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Kilogram" />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Decimal places</Label>
            <Input type="number" min={0} max={10} value={decimals} onChange={(e) => setDecimals(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isBase"
              checked={isBase}
              onChange={(e) => setIsBase(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="isBase">This is a base UOM (no conversion factor)</Label>
          </div>
          {!isBase && (
            <div className="rounded-lg border p-4 space-y-4 bg-muted/30">
              <p className="text-xs text-muted-foreground">
                Enter how many base units equal one of this unit. E.g. for G (gram) with base KG: factor = 0.001.
              </p>
              <div>
                <Label>Base UOM</Label>
                <Select value={baseUom || "_"} onValueChange={(v) => setBaseUom(v === "_" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select base" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_">—</SelectItem>
                    {baseOptions.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Factor to base (1 {code || "?"} = factor × {baseUom || "base"})</Label>
                <Input
                  type="number"
                  step="any"
                  value={factorToBase}
                  onChange={(e) => setFactorToBase(e.target.value)}
                  placeholder="0.001"
                />
              </div>
            </div>
          )}
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ─── Conversion Sheet ──────────────────────────────────────────────────────

function ConversionSheet({
  initial,
  uomCodes,
  onSave,
  onClose,
}: {
  initial: UomConversion | null;
  uomCodes: string[];
  onSave: (c: UomConversion) => void;
  onClose: () => void;
}) {
  const [fromUom, setFromUom] = React.useState(initial?.fromUom ?? "");
  const [toUom, setToUom] = React.useState(initial?.toUom ?? "");
  const [factor, setFactor] = React.useState(initial?.factor != null ? String(initial.factor) : "");

  const handleSave = () => {
    const f = parseFloat(factor);
    if (!fromUom || !toUom || isNaN(f) || f <= 0) return;
    onSave({ id: initial?.id ?? `c${Date.now()}`, fromUom, toUom, factor: f });
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{initial ? "Edit conversion" : "Add conversion"}</SheetTitle>
          <SheetDescription>
            Defines 1 {fromUom || "From"} = factor × {toUom || "To"} (e.g. 1 TON = 1000 KG means fromUom=TON, toUom=KG, factor=1000).
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-6">
          <div>
            <Label>From UOM</Label>
            <Select value={fromUom} onValueChange={setFromUom}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {uomCodes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>To UOM</Label>
            <Select value={toUom} onValueChange={setToUom}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {uomCodes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Factor (1 {fromUom || "From"} = factor {toUom || "To"})</Label>
            <Input type="number" step="any" value={factor} onChange={(e) => setFactor(e.target.value)} placeholder="1000" />
          </div>
          {fromUom && toUom && factor && Number(factor) > 0 && (
            <p className="text-sm text-muted-foreground rounded bg-muted/50 px-3 py-2">
              Preview: 1 {fromUom} = {factor} {toUom}
            </p>
          )}
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
