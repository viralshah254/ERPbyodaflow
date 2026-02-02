"use client";

import * as React from "react";
import Link from "next/link";
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
import {
  listUoms,
  listConversions,
  createUom,
  updateUom,
  deleteUom,
  validateUomCatalog,
  saveConversion,
  deleteConversion,
  resetUomFromMocks,
} from "@/lib/data/uom.repo";
import type { UomDefinition, UomConversion } from "@/lib/products/types";
import * as Icons from "lucide-react";

const CATEGORIES = ["base", "weight", "volume", "count"] as const;

export default function UomSettingsPage() {
  const [uoms, setUoms] = React.useState<UomDefinition[]>([]);
  const [conversions, setConversions] = React.useState<UomConversion[]>([]);
  const [validation, setValidation] = React.useState(validateUomCatalog());
  const [sheetOpen, setSheetOpen] = React.useState<"uom" | "conversion" | null>(null);
  const [editingUom, setEditingUom] = React.useState<UomDefinition | null>(null);
  const [editingConv, setEditingConv] = React.useState<UomConversion | null>(null);

  const refresh = React.useCallback(() => {
    setUoms(listUoms());
    setConversions(listConversions());
    setValidation(validateUomCatalog());
  }, []);

  React.useEffect(() => refresh(), [refresh]);

  const openAddUom = () => {
    setEditingUom(null);
    setSheetOpen("uom");
  };
  const openEditUom = (u: UomDefinition) => {
    setEditingUom(u);
    setSheetOpen("uom");
  };
  const openAddConversion = () => {
    setEditingConv(null);
    setSheetOpen("conversion");
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
            <Button variant="outline" size="sm" onClick={() => { resetUomFromMocks(); refresh(); }}>
              Reset to defaults
            </Button>
            <Button size="sm" onClick={openAddUom}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              Add UOM
            </Button>
            <Button variant="outline" size="sm" onClick={openAddConversion}>
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
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uoms.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-mono font-medium">{u.code}</TableCell>
                      <TableCell>{u.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{u.category}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {u.isBase ? "Base" : u.baseUom ? `1 ${u.code} = ${u.factorToBase} ${u.baseUom}` : "—"}
                      </TableCell>
                      <TableCell>{u.decimals}</TableCell>
                      <TableCell className="space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditUom(u)}>Edit</Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { deleteUom(u.id); refresh(); }}>Remove</Button>
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
            <CardDescription>Reference conversions (e.g. TON → KG). Product packaging overrides per product.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[30vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Factor</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conversions.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono">{c.fromUom}</TableCell>
                      <TableCell className="font-mono">{c.toUom}</TableCell>
                      <TableCell>1 {c.fromUom} = {c.factor} {c.toUom}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => { deleteConversion(c.id); refresh(); }}>
                          Remove
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
          onSave={(u) => {
            if (editingUom) updateUom(editingUom.id, u);
            else createUom(u);
            refresh();
            setSheetOpen(null);
          }}
          onClose={() => setSheetOpen(null)}
        />
      )}
      {sheetOpen === "conversion" && (
        <ConversionSheet
          uomCodes={uoms.map((u) => u.code)}
          onSave={(c) => {
            saveConversion(c);
            refresh();
            setSheetOpen(null);
          }}
          onClose={() => setSheetOpen(null)}
        />
      )}
    </PageShell>
  );
}

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
  const [isBase, setIsBase] = React.useState(!!initial?.isBase);
  const [baseUom, setBaseUom] = React.useState(initial?.baseUom ?? "");
  const [factorToBase, setFactorToBase] = React.useState(initial?.factorToBase != null ? String(initial.factorToBase) : "");

  const handleSave = () => {
    const dec = parseInt(decimals, 10);
    if (isNaN(dec) || dec < 0) return;
    onSave({
      code: code.trim(),
      name: name.trim(),
      category: category as UomDefinition["category"],
      decimals: dec,
      isBase: isBase || undefined,
      baseUom: isBase ? undefined : (baseUom || undefined),
      factorToBase: isBase ? undefined : (factorToBase ? Number(factorToBase) : undefined),
    });
  };

  const baseOptions = uomCodes.filter((c) => c !== code);

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{initial ? "Edit UOM" : "Add UOM"}</SheetTitle>
          <SheetDescription>Define a unit of measure. Base UOMs have no factor.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-6">
          <div>
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="EA" disabled={!!initial} />
          </div>
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Each" />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Decimals</Label>
            <Input type="number" min={0} value={decimals} onChange={(e) => setDecimals(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isBase"
              checked={isBase}
              onChange={(e) => setIsBase(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="isBase">Base UOM</Label>
          </div>
          {!isBase && (
            <>
              <div>
                <Label>Base UOM</Label>
                <Select value={baseUom || "_"} onValueChange={(v) => setBaseUom(v === "_" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_">—</SelectItem>
                    {baseOptions.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Factor to base (1 {code || "?"} = factor × base)</Label>
                <Input type="number" step="any" value={factorToBase} onChange={(e) => setFactorToBase(e.target.value)} placeholder="0.001" />
              </div>
            </>
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

function ConversionSheet({
  uomCodes,
  onSave,
  onClose,
}: {
  uomCodes: string[];
  onSave: (c: UomConversion) => void;
  onClose: () => void;
}) {
  const [fromUom, setFromUom] = React.useState("");
  const [toUom, setToUom] = React.useState("");
  const [factor, setFactor] = React.useState("");

  const handleSave = () => {
    const f = parseFloat(factor);
    if (!fromUom || !toUom || isNaN(f) || f <= 0) return;
    onSave({ id: `c${Date.now()}`, fromUom, toUom, factor: f });
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Add conversion</SheetTitle>
          <SheetDescription>1 From = factor × To (e.g. 1 TON = 1000 KG).</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-6">
          <div>
            <Label>From UOM</Label>
            <Select value={fromUom} onValueChange={setFromUom}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {uomCodes.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>To UOM</Label>
            <Select value={toUom} onValueChange={setToUom}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {uomCodes.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Factor</Label>
            <Input type="number" step="any" value={factor} onChange={(e) => setFactor(e.target.value)} placeholder="1000" />
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
