"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  resolveCatalogLabel,
  type DailyPriceStatusList,
} from "@/lib/api/pricing";
import { fetchPricingZones, type PricingZoneRow } from "@/lib/api/pricing-engine";
import type { PriceList } from "@/lib/products/pricing-types";
import { fetchProductsApi } from "@/lib/api/products";
import { fetchProductPricingApi } from "@/lib/api/product-master";
import type { ProductRow } from "@/lib/types/masters";
import { canDeleteEntity } from "@/lib/permissions";
import { can } from "@/lib/rbac/can";
import { isApiConfigured } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { PRICING_ENGINE_CHANNELS } from "@/lib/pricing/engine-types";
import { isFranchiseList } from "@/lib/pricing/franchise-zone-master";
import { isFmcgOrg } from "@/lib/fmcg/sfa-customer";
import { isSeafoodOrg } from "@/config/industry";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { FmcgPriceTagsWorkspace } from "@/components/pricing/FmcgPriceTagsWorkspace";

const CHANNELS = ["Retail", "Wholesale", "Distributor", "ModernTrade", "Export"];

function catalogLabelForList(pl: PriceList | null | undefined): string {
  if (!pl) return "Retail";
  return resolveCatalogLabel(pl.code ?? pl.channel, pl.pricingEngineChannel);
}

function PriceListsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("list") ?? "";
  const templateId = useOrgContextStore((s) => s.templateId);
  const industryCategory = useOrgContextStore((s) => s.industryCategory);
  const fmcgOrg = isFmcgOrg(templateId);
  const seafoodOrg = isSeafoodOrg(templateId, industryCategory);

  const selectList = React.useCallback(
    (id: string) => {
      router.replace(`/pricing/workspace/lists?list=${encodeURIComponent(id)}`, { scroll: false });
    },
    [router]
  );
  const user = useAuthStore((s) => s.user);
  const canDelete =
    canDeleteEntity(user) || can(user, "inventory.write");
  const [lists, setLists] = React.useState<PriceList[]>([]);
  const [selectedDetail, setSelectedDetail] = React.useState<PriceList | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<PriceList | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<PriceList | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [dailyStatus, setDailyStatus] = React.useState<DailyPriceStatusList[]>([]);
  const [pricingZones, setPricingZones] = React.useState<PricingZoneRow[]>([]);

  const refresh = React.useCallback(async (opts?: { soft?: boolean }) => {
    // Soft refresh keeps the tag list visible (e.g. after save). Full load only on first paint.
    if (!opts?.soft) setLoading(true);
    try {
      const next = await fetchPriceListsForUi();
      setLists(next);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
    // Seafood CoolCatch daily / zone status only
    if (seafoodOrg) {
      fetchDailyPriceStatusApi()
        .then((s) => setDailyStatus(s.lists))
        .catch(() => {});
      fetchPricingZones()
        .then((z) => setPricingZones(Array.isArray(z) ? z : []))
        .catch(() => setPricingZones([]));
    } else {
      setDailyStatus([]);
      setPricingZones([]);
    }
  }, [seafoodOrg]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  // Keep selection highlight in sync without re-fetching the whole tag list.
  React.useEffect(() => {
    if (!selectedId) {
      setSelectedDetail(null);
      return;
    }
    setSelectedDetail(lists.find((pl) => pl.id === selectedId) ?? null);
  }, [selectedId, lists]);

  // FMCG: open the first price tag so piece-price editing is visible without an extra click.
  React.useEffect(() => {
    if (!fmcgOrg || selectedId || lists.length === 0 || loading) return;
    selectList(lists[0]!.id);
  }, [fmcgOrg, selectedId, lists, loading, selectList]);

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

  const zoneLabelById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const z of pricingZones) {
      m.set(z.id, z.tier ? `${z.name} (${z.tier})` : z.name);
    }
    return m;
  }, [pricingZones]);

  const childListCountById = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const pl of lists) {
      if (!pl.parentPriceListId) continue;
      m.set(pl.parentPriceListId, (m.get(pl.parentPriceListId) ?? 0) + 1);
    }
    return m;
  }, [lists]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    if (!isApiConfigured()) {
      toast.info("Set NEXT_PUBLIC_API_URL to delete price lists.");
      return;
    }
    setDeleting(true);
    try {
      await deletePriceListApi(deleteTarget.id);
      if (selectedId === deleteTarget.id) {
        setSelectedDetail(null);
      }
      await refresh({ soft: true });
      toast.success(`“${deleteTarget.name}” deleted.`);
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete price list.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title={fmcgOrg ? "Price tags" : "Price lists"}
        description={
          fmcgOrg
            ? "Named tags (e.g. Naivas, Premium). Set price per piece; pack prices calculate from packaging."
            : "Wholesale, Retail, Distributor, Export. Currency per list, UOM-aware tiers."
        }
        breadcrumbs={[{ label: "Pricing", href: "/pricing/workspace/overview" }, { label: fmcgOrg ? "Price tags" : "Price lists" }]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button size="sm" onClick={openAdd}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              {fmcgOrg ? "Add price tag" : "Add price list"}
            </Button>
            {seafoodOrg ? (
              <Button variant="outline" size="sm" asChild>
                <Link href="/pricing/workspace/approvals">Daily review</Link>
              </Button>
            ) : null}
            <Button variant="outline" size="sm" asChild>
              <Link href="/pricing/workspace/overview">Overview</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        {!seafoodOrg ? (
          <FmcgPriceTagsWorkspace
            lists={lists}
            loading={loading}
            selectedId={selectedId}
            selected={selected}
            canDelete={canDelete}
            onSelect={selectList}
            onAdd={openAdd}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
            onSaved={() => void refresh({ soft: true })}
          />
        ) : null}

        {/* CoolCatch / seafood cost + franchise banners */}
        {seafoodOrg ? (
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
        ) : null}

        {seafoodOrg ? (
          <div className="flex flex-wrap items-start gap-3 rounded-md border bg-muted/30 px-4 py-3 text-sm">
            <Icons.MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="text-muted-foreground min-w-[200px] flex-1">
              <strong className="text-foreground">Franchise outlet minimums</strong> derive from the linked{" "}
              <Link href="/pricing/workspace/zones" className="text-primary underline">
                pricing zone
              </Link>{" "}
              (zone tier sets engine margin floors and markup rules). Publish engine rows / daily prices for
              &quot;today&quot; so mobile Sell and WhatsApp stay compliant.
            </div>
          </div>
        ) : null}

        {seafoodOrg ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{fmcgOrg ? "Price tags" : "Lists"}</CardTitle>
            <CardDescription>
              {fmcgOrg
                ? "Create tags (e.g. Naivas, Premium), then set price per piece in the editor below."
                : "Multiple price lists (channel/currency). Assign to products."}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {!loading && lists.length === 0 ? (
              <div className="px-6 py-10 text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  {fmcgOrg
                    ? "No price tags yet. Create one (e.g. Premium or Naivas), then enter price per piece for each product."
                    : "No price lists yet."}
                </p>
                <Button size="sm" onClick={openAdd}>
                  <Icons.Plus className="mr-2 h-4 w-4" />
                  {fmcgOrg ? "Add price tag" : "Add price list"}
                </Button>
              </div>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Currency</TableHead>
                  {seafoodOrg ? <TableHead>Label</TableHead> : null}
                  {seafoodOrg ? <TableHead>Pricing zone</TableHead> : null}
                  {seafoodOrg ? <TableHead>Engine</TableHead> : null}
                  {seafoodOrg ? <TableHead>Based on</TableHead> : null}
                  <TableHead>Type</TableHead>
                  <TableHead>Products</TableHead>
                  {seafoodOrg ? <TableHead>{"Today's prices"}</TableHead> : null}
                  <TableHead className="w-52">Updated</TableHead>
                  <TableHead className="w-56 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lists.map((pl) => {
                  const status = dailyStatus.find((s) => s.priceListId === pl.id);
                  const isSelected = selectedId === pl.id;
                  return (
                  <TableRow
                    key={pl.id}
                    className={isSelected ? "bg-muted/40" : undefined}
                    data-state={isSelected ? "selected" : undefined}
                  >
                    <TableCell className="font-medium">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          className="text-left text-primary underline-offset-2 hover:underline"
                          onClick={() => selectList(pl.id)}
                        >
                          {pl.name}
                        </button>
                        {seafoodOrg &&
                          !pl.zoneId &&
                          (pl.name.toLowerCase().includes("franchise") || isFranchiseList(pl)) &&
                          pl.pricingEngineChannel &&
                          pl.pricingEngineChannel !== "FRANCHISE" && (
                            <Badge variant="destructive" className="text-[10px]">
                              Not FRANCHISE engine
                            </Badge>
                          )}
                      </div>
                    </TableCell>
                    <TableCell>{pl.currency}</TableCell>
                    {seafoodOrg ? (
                    <TableCell>
                      <Badge variant="outline">{pl.channel}</Badge>
                    </TableCell>
                    ) : null}
                    {seafoodOrg ? (
                    <TableCell className="text-xs max-w-[200px]" title={pl.zoneId ?? undefined}>
                      {!pl.zoneId ? (
                        <button
                          type="button"
                          className="text-primary underline hover:opacity-80"
                          onClick={() => openEdit(pl)}
                        >
                          assign zone
                        </button>
                      ) : zoneLabelById.has(pl.zoneId) ? (
                        isFranchiseList(pl) ? (
                          <span>{zoneLabelById.get(pl.zoneId)}</span>
                        ) : (
                          <span
                            className="text-muted-foreground"
                            title="Does not drive franchise outlets — only FRANCHISE master lists set outlet base prices."
                          >
                            {zoneLabelById.get(pl.zoneId)}
                            <span className="block text-[10px]">(not franchise master)</span>
                          </span>
                        )
                      ) : (
                        <span
                          className={isFranchiseList(pl) ? "font-mono truncate block" : "font-mono truncate block text-muted-foreground"}
                          title={
                            isFranchiseList(pl)
                              ? undefined
                              : "Does not drive franchise outlets — only FRANCHISE master lists set outlet base prices."
                          }
                        >
                          {pl.zoneId}
                        </span>
                      )}
                    </TableCell>
                    ) : null}
                    {seafoodOrg ? (
                    <TableCell className="text-xs">
                      {pl.pricingEngineChannel ? (
                        <Badge variant="secondary" className="text-[10px]">
                          {pl.pricingEngineChannel}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    ) : null}
                    {seafoodOrg ? (
                    <TableCell>
                      {pl.parentPriceListId ? (
                        <span className="text-xs">
                          <span className="font-medium">{pl.parentName ?? pl.parentPriceListId}</span>
                          {pl.markupType && pl.markupValue != null && (
                            <span className="ml-1 text-muted-foreground">
                              +{pl.markupValue}{pl.markupType === "PERCENT" ? "%" : " flat"}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    ) : null}
                    <TableCell className="text-xs">
                      {seafoodOrg ? (
                        isFranchiseList(pl) ? (
                          pl.parentPriceListId ? (
                            <Badge variant="secondary">Outlet derived</Badge>
                          ) : (
                            <Badge variant="outline">Zone / master</Badge>
                          )
                        ) : (
                          "—"
                        )
                      ) : (
                        fmcgOrg ? "Price tag" : "—"
                      )}
                    </TableCell>
                    <TableCell>{productCountByList.get(pl.id) ?? 0}</TableCell>
                    {seafoodOrg ? (
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
                    ) : null}
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap align-top">
                      {pl.lastCalculatedAt
                        ? new Date(pl.lastCalculatedAt).toLocaleString("en-KE", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right align-top">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex flex-wrap justify-end gap-1">
                          {fmcgOrg ? (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                selectList(pl.id);
                                requestAnimationFrame(() => {
                                  document
                                    .getElementById("fmcg-price-tag-editor")
                                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                                });
                              }}
                            >
                              <Icons.Tag className="mr-1.5 h-3.5 w-3.5" />
                              Set piece prices
                            </Button>
                          ) : (
                            <Button variant="default" size="sm" asChild>
                              <Link href={`/pricing/price-lists/${pl.id}`}>
                                <Icons.Tag className="mr-1.5 h-3.5 w-3.5" />
                                Set prices
                              </Link>
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => openEdit(pl)}>
                            Edit
                          </Button>
                          {canDelete ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive border-destructive/40 hover:bg-destructive/10"
                              onClick={() => setDeleteTarget(pl)}
                            >
                              <Icons.Trash2 className="mr-1.5 h-3.5 w-3.5" />
                              Delete
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            )}
          </CardContent>
        </Card>
        ) : null}

        {seafoodOrg && selected ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{selected.name}</CardTitle>
              <CardDescription>
                Products with tiers on this list. Edit pricing per product.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ProductPriceTable
                priceListId={selected.id}
                products={products}
                pricingByProductId={pricingByProductId}
              />
            </CardContent>
          </Card>
        ) : null}
      </div>

      {sheetOpen && (
        <PriceListSheet
          initial={editing}
          allLists={lists}
          pricingZones={pricingZones}
          fmcgMode={!seafoodOrg}
          onSave={async (pl) => {
            try {
              if (!seafoodOrg) {
                if (editing) {
                  await updatePriceListApi(editing.id, {
                    name: pl.name,
                    currency: pl.currency,
                    code: pl.code || undefined,
                    channel: null,
                    zoneId: null,
                    parentPriceListId: null,
                    markupType: null,
                    markupValue: null,
                  });
                } else {
                  const created = await createPriceListApi({
                    name: pl.name,
                    currency: pl.currency,
                    code: pl.code || "Retail",
                  });
                  selectList(created.id);
                }
              } else if (editing) {
                await updatePriceListApi(editing.id, {
                  name: pl.name,
                  currency: pl.currency,
                  code: pl.code || undefined,
                  channel: pl.pricingEngineChannel?.trim()
                    ? pl.pricingEngineChannel.trim()
                    : null,
                  zoneId: pl.zoneId?.trim() ? pl.zoneId.trim() : null,
                  parentPriceListId: pl.parentPriceListId ?? null,
                  markupType: pl.markupType ?? null,
                  markupValue: pl.markupValue ?? null,
                });
              } else {
                await createPriceListApi({
                  name: pl.name,
                  currency: pl.currency,
                  code: pl.code || undefined,
                  channel: pl.pricingEngineChannel?.trim() ? pl.pricingEngineChannel.trim() : undefined,
                  zoneId: pl.zoneId?.trim() ? pl.zoneId.trim() : undefined,
                  parentPriceListId: pl.parentPriceListId,
                  markupType: pl.markupType,
                  markupValue: pl.markupValue,
                });
              }
              await refresh();
              setSheetOpen(false);
              toast.success(
                editing
                  ? seafoodOrg
                    ? "Price list updated."
                    : "Price tag updated."
                  : seafoodOrg
                    ? "Price list created."
                    : "Price tag created. Set piece prices below."
              );
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
          onClose={() => setSheetOpen(false)}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
        title={
          deleteTarget
            ? `Delete “${deleteTarget.name}”?`
            : seafoodOrg
              ? "Delete price list?"
              : "Delete price tag?"
        }
        description={
          deleteTarget
            ? seafoodOrg
              ? [
                  "This permanently removes the price list and its daily price rows.",
                  (childListCountById.get(deleteTarget.id) ?? 0) > 0
                    ? `${childListCountById.get(deleteTarget.id)} derived outlet list(s) still reference this list as their parent — delete or reassign those first.`
                    : deleteTarget.zoneId && isFranchiseList(deleteTarget)
                      ? "This list is linked to a pricing zone. Outlets in that zone may lose their price source if this is the zone master."
                      : null,
                ]
                  .filter(Boolean)
                  .join(" ")
              : "This permanently removes the price tag and its piece prices. Customers assigned to this tag will need a new tag."
            : undefined
        }
        confirmLabel={
          deleting ? "Deleting…" : seafoodOrg ? "Delete price list" : "Delete price tag"
        }
        variant="destructive"
        onConfirm={() => void handleConfirmDelete()}
      />
    </PageShell>
  );
}

export default function PriceListsPage() {
  return (
    <Suspense fallback={
      <PageShell>
        <PageHeader title="Price lists" description="Loading…" breadcrumbs={[{ label: "Pricing", href: "/pricing/workspace/overview" }, { label: "Price lists" }]} />
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
  allLists,
  pricingZones,
  fmcgMode,
  onSave,
  onClose,
}: {
  initial: PriceList | null;
  allLists: PriceList[];
  pricingZones: PricingZoneRow[];
  fmcgMode: boolean;
  onSave: (pl: {
    name: string;
    currency: string;
    code: string;
    pricingEngineChannel?: string;
    zoneId?: string;
    isDefault?: boolean;
    parentPriceListId?: string;
    markupType?: "PERCENT" | "FLAT";
    markupValue?: number;
  }) => void;
  onClose: () => void;
}) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [currency, setCurrency] = React.useState(initial?.currency ?? "KES");
  const [catalogLabel, setCatalogLabel] = React.useState(() => catalogLabelForList(initial));
  const [pricingChannel, setPricingChannel] = React.useState(initial?.pricingEngineChannel ?? "__none__");
  const [zoneId, setZoneId] = React.useState(initial?.zoneId ?? "");
  const [isDefault, setIsDefault] = React.useState(!!initial?.isDefault);
  const [parentId, setParentId] = React.useState<string>(initial?.parentPriceListId ?? "");
  const [markupType, setMarkupType] = React.useState<"PERCENT" | "FLAT">(initial?.markupType ?? "PERCENT");
  const [markupValue, setMarkupValue] = React.useState<string>(
    initial?.markupValue != null ? String(initial.markupValue) : ""
  );

  React.useEffect(() => {
    setName(initial?.name ?? "");
    setCurrency(initial?.currency ?? "KES");
    setCatalogLabel(catalogLabelForList(initial));
    setPricingChannel(initial?.pricingEngineChannel ?? "__none__");
    setZoneId(initial?.zoneId ?? "");
    setIsDefault(!!initial?.isDefault);
    setParentId(initial?.parentPriceListId ?? "");
    setMarkupType(initial?.markupType ?? "PERCENT");
    setMarkupValue(initial?.markupValue != null ? String(initial.markupValue) : "");
  }, [initial]);

  // Only allow lists other than the one being edited as parents.
  const parentCandidates = allLists.filter((pl) => pl.id !== initial?.id);

  const handleSave = () => {
    if (fmcgMode) {
      onSave({
        name: name.trim(),
        currency,
        code: catalogLabel || "Retail",
        isDefault: isDefault || undefined,
      });
      return;
    }
    onSave({
      name: name.trim(),
      currency,
      code: catalogLabel,
      pricingEngineChannel: pricingChannel === "__none__" ? undefined : pricingChannel,
      zoneId: zoneId.trim() || undefined,
      isDefault: isDefault || undefined,
      parentPriceListId: parentId || undefined,
      markupType: parentId ? markupType : undefined,
      markupValue: parentId && markupValue !== "" ? Number(markupValue) : undefined,
    });
  };

  const zoneSelectValue =
    !zoneId.trim() ? "__none__" : pricingZones.some((z) => z.id === zoneId.trim()) ? zoneId.trim() : "__custom__";

  const engineIsFranchise = pricingChannel === "FRANCHISE";
  const zoneAssigned = zoneSelectValue !== "__none__" && zoneId.trim() !== "";
  const showNonFranchiseZoneWarning = zoneAssigned && !engineIsFranchise && !parentId;
  const catalogLabelOptions = React.useMemo(() => {
    if (CHANNELS.includes(catalogLabel)) return CHANNELS;
    return [catalogLabel, ...CHANNELS];
  }, [catalogLabel]);

  if (fmcgMode) {
    return (
      <Sheet open onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{initial ? "Edit price tag" : "Add price tag"}</SheetTitle>
            <SheetDescription>
              A named price book (e.g. Naivas, Premium). After saving, set price per piece on the tag.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-6">
            <div>
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Premium, Naivas"
              />
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
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="default-fmcg"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="default-fmcg">Default tag when customer has none</Label>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{initial ? "Edit price list" : "Add price list"}</SheetTitle>
          <SheetDescription>
            Name, currency, display label, pricing channel, and pricing zone (tier is defined on the zone).
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-6">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nairobi Franchise" />
          </div>
          <div>
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="KES">KES</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Catalog label</Label>
            <p className="text-xs text-muted-foreground mb-1.5">
              Stored as list <code className="text-[10px]">code</code> for backwards-compatible display.
            </p>
            <Select value={catalogLabel} onValueChange={setCatalogLabel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {catalogLabelOptions.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Pricing channel (engine)</Label>
            <Select value={pricingChannel} onValueChange={setPricingChannel}>
              <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Not set</SelectItem>
                {PRICING_ENGINE_CHANNELS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Pricing zone</Label>
            <p className="text-xs text-muted-foreground mb-1.5">
              Tier and markup rules come from the zone. Manage zones under{" "}
              <Link href="/pricing/workspace/zones" className="text-primary underline">
                Pricing → Franchise zones
              </Link>
              .
            </p>
            <Select
              value={zoneSelectValue}
              onValueChange={(v) => {
                if (v === "__none__") {
                  setZoneId("");
                  return;
                }
                if (v === "__custom__") {
                  setZoneId((prev) => (pricingZones.some((z) => z.id === prev.trim()) ? "" : prev));
                  return;
                }
                setZoneId(v);
              }}
            >
              <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No pricing zone</SelectItem>
                {pricingZones
                  .filter((z) => z.isActive !== false)
                  .map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      {z.name}
                      {z.tier ? ` (${z.tier})` : ""}
                    </SelectItem>
                  ))}
                <SelectItem value="__custom__">Other — paste zone id</SelectItem>
              </SelectContent>
            </Select>
            {zoneSelectValue !== "__none__" && zoneSelectValue !== "__custom__" && (
              <p className="text-xs text-muted-foreground mt-2">
                Engine tier:{" "}
                <strong>{pricingZones.find((z) => z.id === zoneId.trim())?.tier ?? "—"}</strong>
              </p>
            )}
            {zoneSelectValue === "__custom__" && (
              <Input
                className="mt-2 font-mono text-xs"
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                placeholder="Zone UUID (optional)"
              />
            )}
            {showNonFranchiseZoneWarning ? (
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 dark:border-amber-900/40 dark:bg-amber-950/30">
                This list is not a FRANCHISE master — linking a zone here will not drive franchise outlet base
                prices. Use Pricing → Franchise zones to link the zone master instead.
              </p>
            ) : null}
          </div>

          {/* Inheritance / logistics markup */}
          <div className="rounded-md border p-4 space-y-3">
            <p className="text-sm font-medium">Based on (master list)</p>
            <p className="text-xs text-muted-foreground">
              Leave blank for a standalone list. When set, products not priced explicitly on this list
              inherit the master price plus your markup — useful for adding logistics costs per route.
            </p>
            <Select value={parentId || "__none__"} onValueChange={(v) => setParentId(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="None (standalone)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None (standalone)</SelectItem>
                {parentCandidates.map((pl) => (
                  <SelectItem key={pl.id} value={pl.id}>{pl.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {parentId && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs">Add-on type</Label>
                  <Select value={markupType} onValueChange={(v) => setMarkupType(v as "PERCENT" | "FLAT")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENT">Percent (%)</SelectItem>
                      <SelectItem value="FLAT">Flat per unit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label className="text-xs">
                    Add-on value {markupType === "PERCENT" ? "(%)" : `(${currency})`}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step={markupType === "PERCENT" ? "0.1" : "1"}
                    value={markupValue}
                    onChange={(e) => setMarkupValue(e.target.value)}
                    placeholder={markupType === "PERCENT" ? "e.g. 8" : "e.g. 50"}
                  />
                </div>
              </div>
            )}

            {parentId && markupValue !== "" && (
              <div className="rounded bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                Example: if master price = 300, effective price ={" "}
                <span className="font-semibold text-foreground">
                  {markupType === "PERCENT"
                    ? (300 * (1 + Number(markupValue) / 100)).toFixed(2)
                    : (300 + Number(markupValue)).toFixed(2)}
                </span>{" "}
                {currency}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="default" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="rounded" />
            <Label htmlFor="default">Default price list</Label>
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>Save</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
