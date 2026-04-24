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
  fetchPriceListsForUi,
  createPriceListApi,
  updatePriceListApi,
  deletePriceListApi,
  fetchDailyPriceStatusApi,
  type DailyPriceStatusList,
} from "@/lib/api/pricing";
import type { PriceList } from "@/lib/products/pricing-types";
import { fetchProductsApi } from "@/lib/api/products";
import { fetchProductPricingApi } from "@/lib/api/product-master";
import type { ProductRow } from "@/lib/types/masters";
import { canDeleteEntity } from "@/lib/permissions";
import { isApiConfigured } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";

const CHANNELS = ["Retail", "Wholesale", "Distributor", "ModernTrade", "Export"];

function PriceListsContent() {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("list") ?? "";
  const user = useAuthStore((s) => s.user);
  const canDelete = canDeleteEntity(user);
  const [lists, setLists] = React.useState<PriceList[]>([]);
  const [selectedDetail, setSelectedDetail] = React.useState<PriceList | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<PriceList | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [dailyStatus, setDailyStatus] = React.useState<DailyPriceStatusList[]>([]);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchPriceListsForUi();
      setLists(next);
      if (selectedId) {
        const found = next.find((pl) => pl.id === selectedId) ?? null;
        setSelectedDetail(found);
      } else {
        setSelectedDetail(null);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
    // Load daily price staleness status (best-effort)
    fetchDailyPriceStatusApi()
      .then((s) => setDailyStatus(s.lists))
      .catch(() => {});
  }, [selectedId]);
  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const selected = selectedDetail;
  const [products, setProducts] = React.useState<ProductRow[]>([]);
  const [pricingByProductId, setPricingByProductId] = React.useState<Record<string, Awaited<ReturnType<typeof fetchProductPricingApi>>>>({});

  React.useEffect(() => {
    let cancelled = false;
    fetchProductsApi()
      .then(async (list) => {
        if (cancelled) return;
        setProducts(list);
        const results = await Promise.all(list.map((p) => fetchProductPricingApi(p.id)));
        if (cancelled) return;
        const map: Record<string, Awaited<ReturnType<typeof fetchProductPricingApi>>> = {};
        list.forEach((p, i) => {
          map[p.id] = results[i] ?? [];
        });
        setPricingByProductId(map);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const productCountByList = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products) {
      const pp = pricingByProductId[p.id] ?? [];
      for (const x of pp) {
        m.set(x.priceListId, (m.get(x.priceListId) ?? 0) + 1);
      }
    }
    return m;
  }, [products, pricingByProductId]);

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
        {/* Cost basis banner */}
        <div className="flex items-center gap-3 rounded-md border bg-amber-50 border-amber-200 px-4 py-2.5 text-sm">
          <Icons.Calculator className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-amber-800">
            <strong>Set prices based on landed batch cost.</strong> Know your cost per kg before entering prices here.
          </span>
          <Button variant="outline" size="sm" className="ml-auto shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100" asChild>
            <Link href="/reports/batch-costing">
              <Icons.BarChart3 className="h-3.5 w-3.5 mr-1.5" />
              View batch cost report
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100" asChild>
            <Link href="/inventory/costing">
              <Icons.Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Batch allocation
            </Link>
          </Button>
        </div>

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
                  <TableHead>Today's prices</TableHead>
                  <TableHead className="w-40"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lists.map((pl) => {
                  const status = dailyStatus.find((s) => s.priceListId === pl.id);
                  return (
                  <TableRow key={pl.id}>
                    <TableCell className="font-medium">{pl.name}</TableCell>
                    <TableCell>{pl.currency}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{pl.channel}</Badge>
                    </TableCell>
                    <TableCell>{pl.isDefault ? "Yes" : "—"}</TableCell>
                    <TableCell>{productCountByList.get(pl.id) ?? 0}</TableCell>
                    <TableCell>
                      {status ? (
                        status.staleCount > 0 ? (
                          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/20 gap-1 text-xs whitespace-nowrap">
                            <Icons.Clock className="h-3 w-3" />
                            {status.staleCount} need update
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-xs gap-1">
                            <Icons.CheckCircle2 className="h-3 w-3" />
                            Up to date
                          </Badge>
                        )
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="space-x-1">
                      <Button variant="default" size="sm" asChild>
                        <Link href={`/pricing/price-lists/${pl.id}`}>
                          <Icons.Tag className="mr-1.5 h-3.5 w-3.5" />
                          Set prices
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(pl)}>Edit</Button>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={async () => {
                            if (!isApiConfigured()) {
                              toast.info("Set NEXT_PUBLIC_API_URL to delete price lists.");
                              return;
                            }
                            try {
                              await deletePriceListApi(pl.id);
                              await refresh();
                              toast.success("Price list removed.");
                            } catch (e) {
                              toast.error((e as Error).message || "Failed to delete.");
                            }
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  );
                })}
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
              <ProductPriceTable
                priceListId={selected.id}
                products={products}
                pricingByProductId={pricingByProductId}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {sheetOpen && (
        <PriceListSheet
          initial={editing}
          onSave={async (pl) => {
            try {
              if (editing) {
                await updatePriceListApi(editing.id, { name: pl.name, currency: pl.currency, code: pl.channel });
              } else {
                await createPriceListApi({ name: pl.name, currency: pl.currency, code: pl.channel });
              }
              await refresh();
              setSheetOpen(false);
              toast.success(editing ? "Price list updated." : "Price list created.");
            } catch (e) {
              toast.error((e as Error).message);
            }
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

function ProductPriceTable({
  priceListId,
  products,
  pricingByProductId,
}: {
  priceListId: string;
  products: ProductRow[];
  pricingByProductId: Record<string, Awaited<ReturnType<typeof fetchProductPricingApi>>>;
}) {
  const withTiers = React.useMemo(() => {
    return products.filter((p) => (pricingByProductId[p.id] ?? []).some((pp) => pp.priceListId === priceListId));
  }, [products, pricingByProductId, priceListId]);

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
          const pp = (pricingByProductId[p.id] ?? []).find((x) => x.priceListId === priceListId);
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
