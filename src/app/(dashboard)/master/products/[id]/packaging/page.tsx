"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { getProductById, listPackaging, savePackaging } from "@/lib/data/products.repo";
import type { ProductPackaging } from "@/lib/products/pricing-types";
import { validateProductPackaging } from "@/lib/products/validation";
import { listUoms } from "@/lib/data/uom.repo";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { useCopilotStore } from "@/stores/copilot-store";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import * as Icons from "lucide-react";

function getUomOptions(): string[] {
  return listUoms().map((u) => u.code);
}

export default function ProductPackagingPage() {
  const params = useParams();
  const id = params.id as string;
  const terminology = useTerminology();
  const openWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);

  const product = React.useMemo(() => getProductById(id), [id]);
  const [packaging, setPackaging] = React.useState<ProductPackaging[]>([]);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [allowDecimals, setAllowDecimals] = React.useState(false);

  React.useEffect(() => {
    if (product) setPackaging(listPackaging(product.id));
  }, [product]);

  const baseUom = product?.baseUom ?? product?.unit ?? "EA";
  const validation = React.useMemo(
    () => (product ? validateProductPackaging(baseUom, packaging, { checkUomCatalog: true }) : { ok: true, errors: [] as string[], warnings: [] as string[] }),
    [product, baseUom, packaging]
  );
  const hasErrors = validation.errors.length > 0;
  const hasWarnings = validation.warnings.length > 0;
  const uomOptions = React.useMemo(() => getUomOptions(), []);

  const handleSave = (p: ProductPackaging) => {
    const next = [...packaging];
    if (editingIndex != null && editingIndex >= 0 && editingIndex < next.length) {
      next[editingIndex] = p;
    } else {
      next.push(p);
    }
    setPackaging(next);
    if (product) savePackaging(product.id, next);
    setSheetOpen(false);
    setEditingIndex(null);
  };

  const handleRemove = (idx: number) => {
    const next = packaging.filter((_, i) => i !== idx);
    setPackaging(next);
    if (product) savePackaging(product.id, next);
  };

  if (!product) {
    return (
      <PageShell>
        <PageHeader title="Product not found" breadcrumbs={[{ label: "Masters", href: "/master" }, { label: "Products", href: "/master/products" }, { label: id }]} />
        <div className="p-6">
          <p className="text-muted-foreground">Product not found.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/master/products">Back to list</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const editingRow = editingIndex != null ? packaging[editingIndex] ?? null : null;

  return (
    <PageShell>
      <PageHeader
        title={`Packaging — ${product.sku}`}
        description="UOM conversions, barcode, dimensions, weight. Default sales/purchase."
        breadcrumbs={[
          { label: "Masters", href: "/master" },
          { label: t("product", terminology) + "s", href: "/master/products" },
          { label: product.sku, href: `/master/products/${id}` },
          { label: "Packaging" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <ExplainThis prompt="Explain UOM conversions and default sales/purchase UOM." label="Explain" />
            <Button size="sm" onClick={() => openWithPrompt(`Suggest carton/bundle conversions for ${product.sku}.`)}>
              <Icons.Sparkles className="mr-2 h-4 w-4" />
              Copilot
            </Button>
            <Button size="sm" onClick={() => { setEditingIndex(null); setSheetOpen(true); }}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              Add UOM
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/master/products/${id}`}>Product</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/master/products">Back to list</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Checkbox id="decimals" checked={allowDecimals} onCheckedChange={(c) => setAllowDecimals(c === true)} />
          <Label htmlFor="decimals">Allow decimals for conversions</Label>
        </div>
        {(hasErrors || hasWarnings) && (
          <Card className={hasErrors ? "border-destructive/50 bg-destructive/5" : "border-amber-500/50 bg-amber-500/5"}>
            <CardHeader>
              <CardTitle className="text-base">{hasErrors ? "Validation errors" : "Warnings"}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm list-disc list-inside space-y-1">
                {validation.errors.map((e, i) => (
                  <li key={`e-${i}`} className="text-destructive">{e}</li>
                ))}
                {validation.warnings.map((w, i) => (
                  <li key={`w-${i}`}>{w}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">UOM conversions</CardTitle>
            <CardDescription>Base UOM: {baseUom}. Default sales/purchase, barcode, dimensions, weight.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {packaging.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No packaging. Add UOMs above.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>UOM</TableHead>
                    <TableHead>Units per</TableHead>
                    <TableHead>Base UOM</TableHead>
                    <TableHead>Default sales</TableHead>
                    <TableHead>Default purchase</TableHead>
                    <TableHead>Barcode</TableHead>
                    <TableHead>Dimensions / Weight</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packaging.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{p.uom}</TableCell>
                      <TableCell>{p.unitsPer}</TableCell>
                      <TableCell>{p.baseUom}</TableCell>
                      <TableCell>{p.isDefaultSalesUom ? "Yes" : "—"}</TableCell>
                      <TableCell>{p.isDefaultPurchaseUom ? "Yes" : "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{p.barcode ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.dimensions && `${p.dimensions.l}×${p.dimensions.w}×${p.dimensions.h} ${p.dimensions.unit}`}
                        {p.weight && ` · ${p.weight.value} ${p.weight.unit}`}
                        {!p.dimensions && !p.weight && "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingIndex(i); setSheetOpen(true); }}>
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleRemove(i)}>
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

      <PackagingSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        baseUom={baseUom}
        allowDecimals={allowDecimals}
        uomOptions={uomOptions}
        initial={editingRow}
        onSave={handleSave}
        onCancel={() => { setSheetOpen(false); setEditingIndex(null); }}
      />
    </PageShell>
  );
}

function PackagingSheet({
  open,
  onOpenChange,
  baseUom,
  allowDecimals,
  uomOptions,
  initial,
  onSave,
  onCancel,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  baseUom: string;
  allowDecimals: boolean;
  uomOptions: string[];
  initial: ProductPackaging | null;
  onSave: (p: ProductPackaging) => void;
  onCancel: () => void;
}) {
  const [uom, setUom] = React.useState(initial?.uom ?? "EA");
  const [unitsPer, setUnitsPer] = React.useState(initial?.unitsPer ?? 1);
  const [barcode, setBarcode] = React.useState(initial?.barcode ?? "");
  const [defSales, setDefSales] = React.useState(!!initial?.isDefaultSalesUom);
  const [defPurchase, setDefPurchase] = React.useState(!!initial?.isDefaultPurchaseUom);
  const [dimL, setDimL] = React.useState(initial?.dimensions?.l ?? "");
  const [dimW, setDimW] = React.useState(initial?.dimensions?.w ?? "");
  const [dimH, setDimH] = React.useState(initial?.dimensions?.h ?? "");
  const [dimUnit, setDimUnit] = React.useState<"cm" | "in">(initial?.dimensions?.unit ?? "cm");
  const [weightVal, setWeightVal] = React.useState(initial?.weight?.value ?? "");
  const [weightUnit, setWeightUnit] = React.useState<"kg" | "g">(initial?.weight?.unit ?? "kg");

  React.useEffect(() => {
    if (!open) return;
    setUom(initial?.uom ?? "EA");
    setUnitsPer(initial?.unitsPer ?? 1);
    setBarcode(initial?.barcode ?? "");
    setDefSales(!!initial?.isDefaultSalesUom);
    setDefPurchase(!!initial?.isDefaultPurchaseUom);
    setDimL(initial?.dimensions?.l ?? "");
    setDimW(initial?.dimensions?.w ?? "");
    setDimH(initial?.dimensions?.h ?? "");
    setDimUnit(initial?.dimensions?.unit ?? "cm");
    setWeightVal(initial?.weight?.value ?? "");
    setWeightUnit(initial?.weight?.unit ?? "kg");
  }, [open, initial]);

  const handleSubmit = () => {
    const p: ProductPackaging = {
      uom,
      unitsPer: Number(unitsPer) || 1,
      baseUom,
      barcode: barcode.trim() || undefined,
      isDefaultSalesUom: defSales,
      isDefaultPurchaseUom: defPurchase,
    };
    if (dimL !== "" || dimW !== "" || dimH !== "") {
      p.dimensions = { l: Number(dimL) || 0, w: Number(dimW) || 0, h: Number(dimH) || 0, unit: dimUnit };
    }
    if (weightVal !== "") {
      p.weight = { value: Number(weightVal) || 0, unit: weightUnit };
    }
    onSave(p);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{initial ? "Edit UOM" : "Add UOM"}</SheetTitle>
          <SheetDescription>Conversion to base UOM, barcode, dimensions, weight.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>UOM</Label>
            <Select value={uom} onValueChange={setUom}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {uomOptions.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Units per (base: {baseUom})</Label>
            <Input type="number" min={0} step={allowDecimals ? 0.01 : 1} value={unitsPer} onChange={(e) => setUnitsPer(Number((e.target as HTMLInputElement).value) || 0)} />
          </div>
          <div className="space-y-2">
            <Label>Barcode</Label>
            <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Optional" />
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Checkbox id="ds" checked={defSales} onCheckedChange={(c) => setDefSales(c === true)} />
              <Label htmlFor="ds">Default sales UOM</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="dp" checked={defPurchase} onCheckedChange={(c) => setDefPurchase(c === true)} />
              <Label htmlFor="dp">Default purchase UOM</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Dimensions (L × W × H)</Label>
            <div className="flex gap-2">
              <Input type="number" placeholder="L" value={dimL} onChange={(e) => setDimL(e.target.value)} />
              <Input type="number" placeholder="W" value={dimW} onChange={(e) => setDimW(e.target.value)} />
              <Input type="number" placeholder="H" value={dimH} onChange={(e) => setDimH(e.target.value)} />
              <Select value={dimUnit} onValueChange={(v) => setDimUnit(v as "cm" | "in")}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cm">cm</SelectItem>
                  <SelectItem value="in">in</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Weight</Label>
            <div className="flex gap-2">
              <Input type="number" placeholder="Value" value={weightVal} onChange={(e) => setWeightVal(e.target.value)} />
              <Select value={weightUnit} onValueChange={(v) => setWeightUnit(v as "kg" | "g")}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="g">g</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSubmit}>Save</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
