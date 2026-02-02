"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  getBomById,
  listBomItems,
  saveBomItems,
  createBomItem,
  updateBomItem,
  deleteBomItem,
  getFormulaExtras,
  saveFormulaExtras,
  updateBom,
  deleteBom,
} from "@/lib/data/bom.repo";
import { getRouteById, listRoutes } from "@/lib/data/routing.repo";
import { listProducts } from "@/lib/data/products.repo";
import { listUoms } from "@/lib/data/uom.repo";
import type { BOMRow, BOMItemRow, FormulaCoProduct, FormulaByProduct } from "@/lib/manufacturing/types";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function BomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [bom, setBom] = React.useState<BOMRow | null>(null);
  const products = React.useMemo(() => listProducts(), []);
  const productMap = React.useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const uoms = React.useMemo(() => listUoms().map((u) => u.code), []);
  const routes = React.useMemo(() => listRoutes(), []);

  const [items, setItems] = React.useState<BOMItemRow[]>([]);
  const [formulaExtras, setFormulaExtras] = React.useState({ coProducts: [] as FormulaCoProduct[], byProducts: [] as FormulaByProduct[] });
  const [batchSize, setBatchSize] = React.useState<number>(1);
  const [itemSheetOpen, setItemSheetOpen] = React.useState(false);
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const b = getBomById(id);
    setBom(b ?? null);
    if (!b) return;
    setItems(listBomItems(b.id));
    setFormulaExtras(getFormulaExtras(b.id));
    setBatchSize(b.batchSize ?? 1);
  }, [id]);

  const route = bom?.routeId ? getRouteById(bom.routeId) : null;
  const finishedProduct = bom ? productMap.get(bom.finishedProductId) : null;

  const handleDeleteBom = () => {
    if (!bom || !confirm("Delete this BOM?")) return;
    deleteBom(bom.id);
    toast.success("BOM deleted.");
    router.push("/manufacturing/boms");
  };

  const handleSaveFormula = () => {
    if (!bom) return;
    updateBom(bom.id, { batchSize: batchSize || 1 });
    saveFormulaExtras(bom.id, formulaExtras);
    toast.success("Formula saved.");
  };

  if (!bom) {
    return (
      <PageShell>
        <PageHeader title="BOM not found" breadcrumbs={[{ label: "Manufacturing", href: "/manufacturing/boms" }, { label: "BOMs" }, { label: id }]} />
        <div className="p-6">
          <p className="text-muted-foreground">BOM not found.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/manufacturing/boms">Back to list</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const editingItem = editingItemId ? (items.find((i) => i.id === editingItemId) ?? null) : null;

  return (
    <PageShell>
      <PageHeader
        title={`${bom.code} — ${bom.name}`}
        description={`${bom.quantity} ${bom.uom} ${finishedProduct ? `(${finishedProduct.sku})` : ""}`}
        breadcrumbs={[
          { label: "Manufacturing", href: "/manufacturing/boms" },
          { label: "BOMs", href: "/manufacturing/boms" },
          { label: bom.code },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Badge variant={bom.type === "formula" ? "secondary" : "outline"}>{bom.type}</Badge>
            {route && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/manufacturing/routing?route=${bom.routeId}`}>Routing: {route.name}</Link>
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/manufacturing/boms">Back to list</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleDeleteBom} className="text-destructive">
              Delete
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Components</CardTitle>
            <CardDescription>Input materials. Add, edit, or remove.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead>Optional</TableHead>
                  <TableHead>Scrap %</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((i) => {
                  const p = productMap.get(i.productId);
                  return (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{p ? `${p.sku} — ${p.name}` : i.productId}</TableCell>
                      <TableCell>{i.quantity}</TableCell>
                      <TableCell>{i.uom}</TableCell>
                      <TableCell>{i.isOptional ? "Yes" : "—"}</TableCell>
                      <TableCell>{i.scrapFactor ?? "—"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => { setEditingItemId(i.id); setItemSheetOpen(true); }}>Edit</Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { deleteBomItem(bom.id, i.id); setItems(listBomItems(bom.id)); }}>Remove</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="p-4 border-t">
              <Button size="sm" onClick={() => { setEditingItemId(null); setItemSheetOpen(true); }}>
                <Icons.Plus className="mr-2 h-4 w-4" />
                Add component
              </Button>
              <Button size="sm" variant="secondary" className="ml-2" onClick={() => { saveBomItems(bom.id, items); toast.success("Components saved."); }}>
                Save components
              </Button>
            </div>
          </CardContent>
        </Card>

        {bom.type === "formula" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Formula</CardTitle>
              <CardDescription>Batch size, co-products, by-products.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-2">
                  <Label>Batch size (output qty)</Label>
                  <Input
                    type="number"
                    min={0.001}
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number((e.target as HTMLInputElement).value) || 1)}
                  />
                </div>
                <Button onClick={handleSaveFormula}>Save formula</Button>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Co-products</h4>
                  <p className="text-sm text-muted-foreground">Produced alongside main output. (Edit via stub — API pending.)</p>
                  <ul className="mt-2 text-sm list-disc list-inside">
                    {formulaExtras.coProducts.length === 0 ? (
                      <li className="text-muted-foreground">None</li>
                    ) : (
                      formulaExtras.coProducts.map((c, i) => {
                        const p = productMap.get(c.productId);
                        return <li key={i}>{p?.sku ?? c.productId}: {c.quantity} {c.uom}</li>;
                      })
                    )}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">By-products</h4>
                  <p className="text-sm text-muted-foreground">Secondary output. (Edit via stub — API pending.)</p>
                  <ul className="mt-2 text-sm list-disc list-inside">
                    {formulaExtras.byProducts.length === 0 ? (
                      <li className="text-muted-foreground">None</li>
                    ) : (
                      formulaExtras.byProducts.map((b, i) => {
                        const p = productMap.get(b.productId);
                        return <li key={i}>{p?.sku ?? b.productId}: {b.quantity} {b.uom}</li>;
                      })
                    )}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {bom.type === "formula" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Route</CardTitle>
              <CardDescription>Operations for this formula. Assign a route or manage in Routing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2 items-center">
                <Label className="text-sm">Assign route:</Label>
                <Select
                  value={bom.routeId ?? "__none__"}
                  onValueChange={(v) => {
                    const routeId = v === "__none__" ? undefined : v;
                    updateBom(bom.id, { routeId });
                    setBom((prev) => (prev ? { ...prev, routeId } : prev));
                  }}
                >
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {routes.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.code} — {r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {route && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/manufacturing/routing?route=${bom.routeId}`}>Edit route</Link>
                  </Button>
                )}
              </div>
              {!route && (
                <p className="text-sm text-muted-foreground">No route assigned. Create one in Routing first.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {itemSheetOpen && (
        <BomItemSheet
          bomId={bom.id}
          products={products}
          uoms={uoms}
          initial={editingItem}
          onSave={(row) => {
            if (editingItem) {
              updateBomItem(bom.id, editingItem.id, row);
            } else {
              createBomItem(bom.id, row);
            }
            setItems(listBomItems(bom.id));
            setItemSheetOpen(false);
            setEditingItemId(null);
          }}
          onClose={() => { setItemSheetOpen(false); setEditingItemId(null); }}
        />
      )}
    </PageShell>
  );
}

function BomItemSheet({
  bomId,
  products,
  uoms,
  initial,
  onSave,
  onClose,
}: {
  bomId: string;
  products: { id: string; sku: string; name: string }[];
  uoms: string[];
  initial: BOMItemRow | null;
  onSave: (row: Omit<BOMItemRow, "id" | "bomId">) => void;
  onClose: () => void;
}) {
  const [productId, setProductId] = React.useState(initial?.productId ?? "");
  const [quantity, setQuantity] = React.useState(initial?.quantity ?? 1);
  const [uom, setUom] = React.useState(initial?.uom ?? "EA");
  const [isOptional, setIsOptional] = React.useState(!!initial?.isOptional);
  const [scrapFactor, setScrapFactor] = React.useState(initial?.scrapFactor ?? "");

  React.useEffect(() => {
    if (!initial) return;
    setProductId(initial.productId);
    setQuantity(initial.quantity);
    setUom(initial.uom);
    setIsOptional(!!initial.isOptional);
    setScrapFactor(initial.scrapFactor != null ? String(initial.scrapFactor) : "");
  }, [initial]);

  const handleSubmit = () => {
    onSave({
      productId,
      quantity,
      uom,
      isOptional,
      scrapFactor: scrapFactor === "" ? undefined : Number(scrapFactor),
    });
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{initial ? "Edit component" : "Add component"}</SheetTitle>
          <SheetDescription>Product, quantity, UOM, optional, scrap %.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-6">
          <div className="space-y-2">
            <Label>Product</Label>
            <Select value={productId} onValueChange={setProductId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.sku} — {p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input type="number" min={0} step={0.001} value={quantity} onChange={(e) => setQuantity(Number((e.target as HTMLInputElement).value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>UOM</Label>
              <Select value={uom} onValueChange={setUom}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {uoms.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="opt" checked={isOptional} onChange={(e) => setIsOptional(e.target.checked)} className="rounded" />
            <Label htmlFor="opt">Optional</Label>
          </div>
          <div className="space-y-2">
            <Label>Scrap % (optional)</Label>
            <Input type="number" min={0} max={100} step={0.1} placeholder="0" value={scrapFactor} onChange={(e) => setScrapFactor(e.target.value)} />
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>{initial ? "Update" : "Add"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
