"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  fetchManufacturingBom,
  fetchManufacturingRoutes,
  updateManufacturingBom,
  type ManufacturingBom,
  type ManufacturingBomItem,
  type ManufacturingRoute,
} from "@/lib/api/manufacturing";
import { listProducts } from "@/lib/data/products.repo";
import { listUoms } from "@/lib/data/uom.repo";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function BomDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const products = React.useMemo(() => listProducts(), []);
  const uoms = React.useMemo(() => listUoms().map((item) => item.code), []);
  const [bom, setBom] = React.useState<ManufacturingBom | null>(null);
  const [routes, setRoutes] = React.useState<ManufacturingRoute[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<ManufacturingBomItem | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const [nextBom, nextRoutes] = await Promise.all([
        fetchManufacturingBom(id),
        fetchManufacturingRoutes(),
      ]);
      setBom(nextBom);
      setRoutes(nextRoutes);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load BOM.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  async function saveItems(items: ManufacturingBomItem[]) {
    if (!bom) return;
    setSaving(true);
    try {
      const updated = await updateManufacturingBom(bom.id, {
        items: items.map((item) => ({
          ...item,
          id: item.id,
        })),
      });
      setBom(updated);
      toast.success("BOM components saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save BOM.");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !bom) {
    return (
      <PageShell>
        <PageHeader title="Loading BOM..." breadcrumbs={[{ label: "Manufacturing", href: "/manufacturing/boms" }, { label: "BOMs" }]} />
      </PageShell>
    );
  }

  if (!bom) {
    return (
      <PageShell>
        <PageHeader title="BOM not found" breadcrumbs={[{ label: "Manufacturing", href: "/manufacturing/boms" }, { label: "BOMs" }]} />
        <div className="p-6">
          <p className="text-muted-foreground">This BOM could not be loaded from the backend.</p>
        </div>
      </PageShell>
    );
  }

  const selectedRoute = routes.find((route) => route.id === bom.routeId);

  return (
    <PageShell>
      <PageHeader
        title={`${bom.code} - ${bom.name}`}
        description={`${bom.quantity} ${bom.uom} output for ${bom.finishedProductSku ? `${bom.finishedProductSku} - ${bom.finishedProductName}` : bom.finishedProductName ?? bom.finishedProductId}`}
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
            <Button variant="outline" size="sm" asChild>
              <Link href="/manufacturing/boms">Back to list</Link>
            </Button>
          </div>
        }
      />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Components</CardTitle>
            <CardDescription>Maintain the live component structure used by MRP and work orders.</CardDescription>
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
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {bom.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.productSku ? `${item.productSku} - ${item.productName}` : item.productName ?? item.productId}
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.uom}</TableCell>
                    <TableCell>{item.isOptional ? "Yes" : "No"}</TableCell>
                    <TableCell>{item.scrapFactor ?? "—"}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => {
                        setEditingItem(item);
                        setSheetOpen(true);
                      }}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => {
                          void saveItems(bom.items.filter((candidate) => candidate.id !== item.id));
                        }}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t p-4">
              <Button size="sm" onClick={() => {
                setEditingItem(null);
                setSheetOpen(true);
              }}>
                <Icons.Plus className="mr-2 h-4 w-4" />
                Add component
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Routing link</CardTitle>
            <CardDescription>Assign the live routing used when this BOM is converted into production work orders.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Route</Label>
              <Select
                value={bom.routeId ?? "__none__"}
                onValueChange={async (value) => {
                  try {
                    const updated = await updateManufacturingBom(bom.id, {
                      routeId: value === "__none__" ? undefined : value,
                    });
                    setBom(updated);
                    toast.success("Routing link updated.");
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Failed to update route.");
                  }
                }}
              >
                <SelectTrigger className="w-72">
                  <SelectValue placeholder="Select route" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No route</SelectItem>
                  {routes.map((route) => (
                    <SelectItem key={route.id} value={route.id}>
                      {route.code} - {route.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedRoute && (
              <p className="text-sm text-muted-foreground">
                Assigned route: `{selectedRoute.code}` with {selectedRoute.operations.length} operation(s).
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <BomItemSheet
        open={sheetOpen}
        products={products}
        uoms={uoms}
        initial={editingItem}
        saving={saving}
        onClose={() => {
          setSheetOpen(false);
          setEditingItem(null);
        }}
        onSave={(item) => {
          const nextItems = editingItem
            ? bom.items.map((candidate) => (candidate.id === editingItem.id ? { ...editingItem, ...item } : candidate))
            : [
                ...bom.items,
                {
                  id: `line-${Date.now()}`,
                  ...item,
                },
              ];
          void saveItems(nextItems);
          setSheetOpen(false);
          setEditingItem(null);
        }}
      />
    </PageShell>
  );
}

function BomItemSheet({
  open,
  products,
  uoms,
  initial,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  products: Array<{ id: string; sku: string; name: string }>;
  uoms: string[];
  initial: ManufacturingBomItem | null;
  saving: boolean;
  onClose: () => void;
  onSave: (item: Omit<ManufacturingBomItem, "id" | "productName" | "productSku">) => void;
}) {
  const [productId, setProductId] = React.useState("");
  const [quantity, setQuantity] = React.useState("1");
  const [uom, setUom] = React.useState("EA");
  const [isOptional, setIsOptional] = React.useState("no");
  const [scrapFactor, setScrapFactor] = React.useState("");

  React.useEffect(() => {
    setProductId(initial?.productId ?? "");
    setQuantity(String(initial?.quantity ?? 1));
    setUom(initial?.uom ?? "EA");
    setIsOptional(initial?.isOptional ? "yes" : "no");
    setScrapFactor(initial?.scrapFactor != null ? String(initial.scrapFactor) : "");
  }, [initial, open]);

  return (
    <Sheet open={open} onOpenChange={(value) => !value && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{initial ? "Edit component" : "Add component"}</SheetTitle>
          <SheetDescription>Update the live BOM component structure.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Product</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.sku} - {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input type="number" min="0.001" step="0.001" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>UOM</Label>
              <Select value={uom} onValueChange={setUom}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {uoms.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Optional</Label>
              <Select value={isOptional} onValueChange={setIsOptional}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scrap factor %</Label>
              <Input type="number" min="0" step="0.01" value={scrapFactor} onChange={(e) => setScrapFactor(e.target.value)} />
            </div>
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={saving || !productId}
            onClick={() =>
              onSave({
                productId,
                quantity: Number(quantity) || 0,
                uom,
                isOptional: isOptional === "yes",
                scrapFactor: scrapFactor ? Number(scrapFactor) : undefined,
              })
            }
          >
            Save component
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
