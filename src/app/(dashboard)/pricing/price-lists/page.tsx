"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
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
  listPriceLists,
  getPriceListById,
  createPriceList,
  updatePriceList,
  deletePriceList,
  resetPricingFromMocks,
} from "@/lib/data/pricing.repo";
import type { PriceList } from "@/lib/products/pricing-types";
import { listProducts } from "@/lib/data/products.repo";
import { listProductPrices } from "@/lib/data/products.repo";
import * as Icons from "lucide-react";

const CHANNELS = ["Retail", "Wholesale", "Distributor", "ModernTrade", "Export"];

function PriceListsContent() {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("list") ?? "";
  const [lists, setLists] = React.useState<PriceList[]>([]);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<PriceList | null>(null);

  const refresh = React.useCallback(() => setLists(listPriceLists()), []);
  React.useEffect(() => refresh(), [refresh]);

  const selected = selectedId ? getPriceListById(selectedId) : null;
  const products = React.useMemo(() => listProducts(), []);
  const productCountByList = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products) {
      const pp = listProductPrices(p.id);
      for (const x of pp) {
        m.set(x.priceListId, (m.get(x.priceListId) ?? 0) + 1);
      }
    }
    return m;
  }, [products]);

  const openAdd = () => {
    setEditing(null);
    setSheetOpen(true);
  };
  const openEdit = (pl: PriceList) => {
    setEditing(pl);
    setSheetOpen(true);
  };

  return (
    <PageShell>
      <PageHeader
        title="Price lists"
        description="Wholesale, Retail, Distributor, Export. Currency per list, UOM-aware tiers."
        breadcrumbs={[{ label: "Pricing", href: "/pricing/overview" }, { label: "Price lists" }]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { resetPricingFromMocks(); refresh(); }}>
              Reset to defaults
            </Button>
            <Button size="sm" onClick={openAdd}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              Add price list
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/pricing/overview">Overview</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lists</CardTitle>
            <CardDescription>Multiple price lists (channel/currency). Assign to products.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead className="w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lists.map((pl) => (
                  <TableRow key={pl.id}>
                    <TableCell className="font-medium">{pl.name}</TableCell>
                    <TableCell>{pl.currency}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{pl.channel}</Badge>
                    </TableCell>
                    <TableCell>{pl.isDefault ? "Yes" : "—"}</TableCell>
                    <TableCell>{productCountByList.get(pl.id) ?? 0}</TableCell>
                    <TableCell className="space-x-1">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/pricing/price-lists?list=${pl.id}`}>View</Link>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(pl)}>Edit</Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { deletePriceList(pl.id); refresh(); }}>Remove</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {selected && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{selected.name}</CardTitle>
              <CardDescription>Products with tiers on this list. Edit pricing per product.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ProductPriceTable priceListId={selected.id} />
            </CardContent>
          </Card>
        )}
      </div>

      {sheetOpen && (
        <PriceListSheet
          initial={editing}
          onSave={(pl) => {
            if (editing) updatePriceList(editing.id, pl);
            else createPriceList(pl);
            refresh();
            setSheetOpen(false);
          }}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </PageShell>
  );
}

export default function PriceListsPage() {
  return (
    <Suspense fallback={
      <PageShell>
        <PageHeader title="Price lists" description="Loading…" breadcrumbs={[{ label: "Pricing", href: "/pricing/overview" }, { label: "Price lists" }]} />
        <div className="p-6">Loading…</div>
      </PageShell>
    }>
      <PriceListsContent />
    </Suspense>
  );
}

function ProductPriceTable({ priceListId }: { priceListId: string }) {
  const products = React.useMemo(() => listProducts(), []);
  const withTiers = React.useMemo(() => {
    return products.filter((p) => listProductPrices(p.id, priceListId).length > 0);
  }, [products, priceListId]);

  if (withTiers.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        No products with pricing on this list. Add tiers via{" "}
        <Link href="/master/products" className="text-primary underline">Products</Link> → product → Pricing.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>SKU</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Tiers</TableHead>
          <TableHead className="w-24"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {withTiers.map((p) => {
          const pp = listProductPrices(p.id, priceListId)[0];
          const tierCount = pp?.tiers?.length ?? 0;
          return (
            <TableRow key={p.id}>
              <TableCell className="font-mono font-medium">{p.sku}</TableCell>
              <TableCell>{p.name}</TableCell>
              <TableCell>{tierCount}</TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/master/products/${p.id}/pricing`}>Edit</Link>
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function PriceListSheet({
  initial,
  onSave,
  onClose,
}: {
  initial: PriceList | null;
  onSave: (pl: Omit<PriceList, "id">) => void;
  onClose: () => void;
}) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [currency, setCurrency] = React.useState(initial?.currency ?? "KES");
  const [channel, setChannel] = React.useState(initial?.channel ?? "Retail");
  const [isDefault, setIsDefault] = React.useState(!!initial?.isDefault);

  const handleSave = () => {
    onSave({ name: name.trim(), currency, channel, isDefault: isDefault || undefined });
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{initial ? "Edit price list" : "Add price list"}</SheetTitle>
          <SheetDescription>Name, currency, channel. Used for tiered product pricing.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-6">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Retail" />
          </div>
          <div>
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="KES">KES</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Channel</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANNELS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="default" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="rounded" />
            <Label htmlFor="default">Default price list</Label>
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
