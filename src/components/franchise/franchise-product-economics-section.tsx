"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMoney } from "@/lib/money";
import { fetchProductsPageApi } from "@/lib/api/products";
import {
  fetchFranchiseeProductEconomicsApi,
  putFranchiseeProductEconomicsApi,
} from "@/lib/api/cool-catch";

const PAGE_SIZE = 50;

type Row = {
  productId: string;
  sku: string;
  name: string;
  base: string;
  commission: string;
};

function useDebounced<T>(value: T, ms: number): T {
  const [d, setD] = React.useState(value);
  React.useEffect(() => {
    const t = window.setTimeout(() => setD(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return d;
}

export function FranchiseProductEconomicsSection(props: {
  franchiseeRegistryId: string | undefined;
  /** Child org id for PATCH body when linking franchisee registry (shown when unlinked). */
  outletOrgId?: string;
}) {
  const { franchiseeRegistryId, outletOrgId } = props;
  const [tab, setTab] = React.useState<"catalog" | "assigned">("catalog");
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [removingId, setRemovingId] = React.useState<string | null>(null);
  const [listRefreshTick, setListRefreshTick] = React.useState(0);
  /** SKUs removed on Full catalogue — hidden until outlet changes (catalog always lists HQ products). */
  const [dismissedProductIds, setDismissedProductIds] = React.useState<Set<string>>(() => new Set());

  const [catalogSearch, setCatalogSearch] = React.useState("");
  const catalogSearchDebounced = useDebounced(catalogSearch, 400);
  const [catalogOnlyEconomics, setCatalogOnlyEconomics] = React.useState(false);
  const [assignedSearch, setAssignedSearch] = React.useState("");
  const assignedSearchDebounced = useDebounced(assignedSearch, 400);
  const [catalogCursor, setCatalogCursor] = React.useState("0");
  const [catalogCursorStack, setCatalogCursorStack] = React.useState<string[]>([]);
  const [catalogNextCursor, setCatalogNextCursor] = React.useState<string | null>(null);

  const [assignedCursor, setAssignedCursor] = React.useState("0");
  const [assignedCursorStack, setAssignedCursorStack] = React.useState<string[]>([]);
  const [assignedNextCursor, setAssignedNextCursor] = React.useState<string | null>(null);

  React.useEffect(() => {
    setCatalogCursor("0");
    setCatalogCursorStack([]);
    setCatalogSearch("");
    setCatalogOnlyEconomics(false);
    setAssignedSearch("");
    setCatalogNextCursor(null);
    setAssignedCursor("0");
    setAssignedCursorStack([]);
    setAssignedNextCursor(null);
    setDismissedProductIds(new Set());
  }, [franchiseeRegistryId]);

  React.useEffect(() => {
    setCatalogCursor("0");
    setCatalogCursorStack([]);
    setCatalogNextCursor(null);
  }, [catalogSearchDebounced]);

  React.useEffect(() => {
    setAssignedCursor("0");
    setAssignedCursorStack([]);
    setAssignedNextCursor(null);
  }, [assignedSearchDebounced]);

  React.useEffect(() => {
    if (!franchiseeRegistryId || tab !== "catalog") return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const products = await fetchProductsPageApi({
          limit: PAGE_SIZE,
          cursor: catalogCursor,
          sellable: true,
          includeStock: false,
          search: catalogSearchDebounced.trim() || undefined,
        });
        if (cancelled) return;
        const ids = products.items.map((p) => p.id);
        const econ = ids.length
          ? await fetchFranchiseeProductEconomicsApi(franchiseeRegistryId, { productIds: ids })
          : { items: [], nextCursor: null as string | null };
        if (cancelled) return;
        const econMap = new Map(econ.items.map((e) => [e.productId, e]));
        setRows(
          products.items
            .filter((p) => !dismissedProductIds.has(p.id))
            .map((p) => {
              const e = econMap.get(p.id);
              return {
                productId: p.id,
                sku: p.sku ?? p.id,
                name: p.name,
                base: e != null ? String(e.supplyBasePrice) : "",
                commission: e != null ? String(e.commissionPerUnit) : "",
              };
            })
        );
        setCatalogNextCursor(products.nextCursor ?? null);
      } catch (err) {
        if (!cancelled) toast.error(err instanceof Error ? err.message : "Could not load products.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [franchiseeRegistryId, tab, catalogCursor, catalogSearchDebounced, listRefreshTick, dismissedProductIds]);

  React.useEffect(() => {
    if (!franchiseeRegistryId || tab !== "assigned") return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { items, nextCursor } = await fetchFranchiseeProductEconomicsApi(franchiseeRegistryId, {
          limit: PAGE_SIZE,
          cursor: assignedCursor,
          includeProductDetails: true,
          search: assignedSearchDebounced.trim() || undefined,
        });
        if (cancelled) return;
        setRows(
          items.map((e) => ({
            productId: e.productId,
            sku: e.sku ?? e.productId,
            name: e.productName ?? e.productId,
            base: String(e.supplyBasePrice),
            commission: String(e.commissionPerUnit),
          }))
        );
        setAssignedNextCursor(nextCursor ?? null);
      } catch (err) {
        if (!cancelled) toast.error(err instanceof Error ? err.message : "Could not load assigned SKUs.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [franchiseeRegistryId, tab, assignedCursor, assignedSearchDebounced, listRefreshTick]);

  const tableRows = React.useMemo(() => {
    if (tab !== "catalog" || !catalogOnlyEconomics) return rows;
    return rows.filter((r) => (Number.parseFloat(r.base) || 0) > 0 || (Number.parseFloat(r.commission) || 0) > 0);
  }, [tab, catalogOnlyEconomics, rows]);

  const updateRow = (productId: string, field: "base" | "commission", value: string) => {
    setRows((prev) => prev.map((r) => (r.productId === productId ? { ...r, [field]: value } : r)));
  };

  const onSave = async () => {
    if (!franchiseeRegistryId) return;
    setSaving(true);
    try {
      const items = rows.map((r) => ({
        productId: r.productId,
        supplyBasePrice: Number.parseFloat(r.base) || 0,
        commissionPerUnit: Number.parseFloat(r.commission) || 0,
      }));
      await putFranchiseeProductEconomicsApi(franchiseeRegistryId, items);
      toast.success("Product economics saved for this page.");
      setListRefreshTick((t) => t + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const onRemoveFromShop = async (productId: string) => {
    if (!franchiseeRegistryId) return;
    if (!window.confirm("Remove supply base and commission for this SKU at this shop?")) return;
    setRemovingId(productId);
    try {
      await putFranchiseeProductEconomicsApi(franchiseeRegistryId, [
        { productId, supplyBasePrice: 0, commissionPerUnit: 0 },
      ]);
      toast.success("Removed from this shop.");
      setRows((prev) => prev.filter((r) => r.productId !== productId));
      if (tab === "catalog") {
        setDismissedProductIds((prev) => new Set(prev).add(productId));
      } else {
        setListRefreshTick((t) => t + 1);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Remove failed.");
    } finally {
      setRemovingId(null);
    }
  };

  const goCatalogNext = () => {
    if (!catalogNextCursor || loading) return;
    setCatalogCursorStack((s) => [...s, catalogCursor]);
    setCatalogCursor(catalogNextCursor);
  };

  const goCatalogPrev = () => {
    if (!catalogCursorStack.length || loading) return;
    const stack = [...catalogCursorStack];
    const prev = stack.pop()!;
    setCatalogCursorStack(stack);
    setCatalogCursor(prev);
  };

  const goAssignedNext = () => {
    if (!assignedNextCursor || loading) return;
    setAssignedCursorStack((s) => [...s, assignedCursor]);
    setAssignedCursor(assignedNextCursor);
  };

  const goAssignedPrev = () => {
    if (!assignedCursorStack.length || loading) return;
    const stack = [...assignedCursorStack];
    const prev = stack.pop()!;
    setAssignedCursorStack(stack);
    setAssignedCursor(prev);
  };

  if (!franchiseeRegistryId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Product commission (supply base + contract commission)</CardTitle>
          <CardDescription>
            This outlet is not linked to an HQ franchisee registry record yet. Use{" "}
            <Link href="/franchise/royalties" className="text-primary underline underline-offset-2">
              Franchise → Royalty billing
            </Link>{" "}
            (HQ org) to see franchisee names/codes, then link via{" "}
            <code className="rounded bg-muted px-1 text-xs">PATCH /api/franchise/franchisees/&lt;id&gt;</code> with{" "}
            <code className="rounded bg-muted px-1 text-xs break-all">
              {outletOrgId ? `{"outletOrgId":"${outletOrgId}"}` : '{"outletOrgId":"<this-outlet-org-uuid>"}'}
            </code>
            .
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Product commission per shop</CardTitle>
          <CardDescription>
            Each row is an{" "}
            <strong className="font-medium text-foreground">outlet–SKU assignment</strong> stored as franchisee
            economics (supply base + commission in KES). Guide retail = base + commission.{" "}
            <strong className="font-medium text-foreground">Assigned SKUs (non-zero economics)</strong> lists only
            outlet–SKU rows where supply base or commission is greater than zero. Save updates only the current page.{" "}
            <strong className="font-medium text-foreground">Remove</strong> deletes the assignment for that SKU (the row
            leaves this list; HQ product master is unchanged). On{" "}
            <strong className="font-medium text-foreground">Full catalogue</strong>, use{" "}
            <strong className="font-medium text-foreground">Assigned SKUs</strong> or the filter below to see only
            active assignments. POS selling also depends on published outlet prices.
          </CardDescription>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => void onSave()}
          disabled={saving || loading || !rows.length}
        >
          {saving ? "Saving…" : "Save this page"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 p-6 pt-0">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "catalog" | "assigned")} className="w-full">
          <TabsList className="h-auto flex-wrap justify-start gap-1">
            <TabsTrigger value="catalog" className="text-xs sm:text-sm">
              Full catalogue
            </TabsTrigger>
            <TabsTrigger value="assigned" className="text-xs sm:text-sm">
              Assigned SKUs (non-zero economics)
            </TabsTrigger>
          </TabsList>
          <TabsContent value="catalog" className="mt-4 space-y-3 outline-none">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <Input
                className="max-w-md"
                placeholder="Search products…"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                aria-label="Search catalogue"
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loading || catalogCursorStack.length === 0}
                  onClick={goCatalogPrev}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loading || !catalogNextCursor}
                  onClick={goCatalogNext}
                >
                  Next
                </Button>
                <span className="text-xs text-muted-foreground tabular-nums">{PAGE_SIZE} per page</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="catalog-only-economics"
                checked={catalogOnlyEconomics}
                onCheckedChange={(v) => setCatalogOnlyEconomics(v === true)}
              />
              <Label htmlFor="catalog-only-economics" className="text-sm font-normal text-muted-foreground">
                On this page, show only SKUs that already have base or commission
              </Label>
            </div>
          </TabsContent>
          <TabsContent value="assigned" className="mt-4 space-y-3 outline-none">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Input
                className="max-w-md"
                placeholder="Search by product name (HQ catalogue text index)…"
                value={assignedSearch}
                onChange={(e) => setAssignedSearch(e.target.value)}
                aria-label="Search assigned SKUs"
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loading || assignedCursorStack.length === 0}
                  onClick={goAssignedPrev}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loading || !assignedNextCursor}
                  onClick={goAssignedNext}
                >
                  Next
                </Button>
                <span className="text-xs text-muted-foreground tabular-nums">{PAGE_SIZE} per page</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Paginated outlet–SKU rows with at least one of supply base or commission greater than zero.
            </p>
          </TabsContent>
        </Tabs>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="max-h-[420px] overflow-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 border-b bg-card">
                <tr className="text-left text-muted-foreground">
                  <th className="p-3 font-medium">SKU</th>
                  <th className="p-3 font-medium">Product</th>
                  <th className="p-3 font-medium w-28">Base</th>
                  <th className="p-3 font-medium w-28">Commission</th>
                  <th className="p-3 font-medium w-32">Guide retail</th>
                  <th className="p-3 w-12" />
                </tr>
              </thead>
              <tbody>
                {tableRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      {tab === "assigned"
                        ? assignedSearchDebounced.trim()
                          ? "No assignments match this search."
                          : "No assigned SKUs on this page."
                        : catalogOnlyEconomics
                          ? "No SKUs with economics on this page. Turn off the filter or try another page."
                          : catalogSearchDebounced.trim()
                            ? "No products match this search."
                            : "No products on this page."}
                    </td>
                  </tr>
                ) : (
                  tableRows.map((r) => {
                    const b = Number.parseFloat(r.base) || 0;
                    const c = Number.parseFloat(r.commission) || 0;
                    const guide = b + c;
                    return (
                      <tr key={r.productId} className="border-b border-border/60">
                        <td className="p-3 font-mono text-xs">{r.sku}</td>
                        <td className="p-3">{r.name}</td>
                        <td className="p-2">
                          <Input
                            className="h-8"
                            inputMode="decimal"
                            value={r.base}
                            onChange={(e) => updateRow(r.productId, "base", e.target.value)}
                            placeholder="0"
                            aria-label={`Base for ${r.sku}`}
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            className="h-8"
                            inputMode="decimal"
                            value={r.commission}
                            onChange={(e) => updateRow(r.productId, "commission", e.target.value)}
                            placeholder="0"
                            aria-label={`Commission for ${r.sku}`}
                          />
                        </td>
                        <td className="p-3 text-muted-foreground">{guide > 0 ? formatMoney(guide, "KES") : "—"}</td>
                        <td className="p-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            disabled={removingId === r.productId}
                            title="Remove from this shop"
                            aria-label={`Remove ${r.sku} from shop`}
                            onClick={() => void onRemoveFromShop(r.productId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
