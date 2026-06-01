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
  defaultCommission: string;
  override: string;
  effectiveCommission: number;
};

function useDebounced<T>(value: T, ms: number): T {
  const [d, setD] = React.useState(value);
  React.useEffect(() => {
    const t = window.setTimeout(() => setD(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return d;
}

function mapEconomicsToRow(e: {
  productId: string;
  sku?: string | null;
  productName?: string | null;
  zoneBasePrice?: number | null;
  supplyBasePrice: number;
  inheritedDefaultCommission?: number;
  commissionOverride?: number | null;
  commissionPerUnit: number;
  isOverride?: boolean;
}, product?: { sku?: string; name?: string }) {
  return {
    productId: e.productId,
    sku: e.sku ?? product?.sku ?? e.productId,
    name: e.productName ?? product?.name ?? e.productId,
    base:
      e.zoneBasePrice != null && e.zoneBasePrice > 0
        ? String(e.zoneBasePrice)
        : e.supplyBasePrice > 0
          ? String(e.supplyBasePrice)
          : "",
    defaultCommission: String(e.inheritedDefaultCommission ?? 0),
    override: e.isOverride && e.commissionOverride != null ? String(e.commissionOverride) : "",
    effectiveCommission: e.commissionPerUnit ?? 0,
  };
}

export function FranchiseProductEconomicsSection(props: {
  franchiseeRegistryId: string | undefined;
  /** Child org id for PATCH body when linking franchisee registry (shown when unlinked). */
  outletOrgId?: string;
  zoneMasterListId?: string;
}) {
  const { franchiseeRegistryId, outletOrgId, zoneMasterListId } = props;
  const [tab, setTab] = React.useState<"catalog" | "assigned">("catalog");
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [removingId, setRemovingId] = React.useState<string | null>(null);
  const [listRefreshTick, setListRefreshTick] = React.useState(0);
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

  const [savedByProductId, setSavedByProductId] = React.useState<
    Map<string, { override: string }>
  >(() => new Map());

  const snapshotRows = React.useCallback((list: Row[]) => {
    const m = new Map<string, { override: string }>();
    for (const r of list) {
      m.set(r.productId, { override: r.override });
    }
    return m;
  }, []);

  const isDirty = React.useMemo(() => {
    for (const r of rows) {
      const saved = savedByProductId.get(r.productId);
      if (!saved) {
        if (r.override.trim() !== "") return true;
        continue;
      }
      if (saved.override !== r.override) return true;
    }
    return false;
  }, [rows, savedByProductId]);

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
    setSavedByProductId(new Map());
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
          status: "ACTIVE",
          includeStock: false,
          search: catalogSearchDebounced.trim() || undefined,
        });
        if (cancelled) return;
        const ids = products.items.map((p) => p.id);
        const econ = ids.length
          ? await fetchFranchiseeProductEconomicsApi(franchiseeRegistryId, {
              productIds: ids,
              outletOrgId,
            })
          : { items: [], nextCursor: null as string | null };
        if (cancelled) return;
        const econMap = new Map(econ.items.map((e) => [e.productId, e]));
        const mapped = products.items
          .filter((p) => !dismissedProductIds.has(p.id))
          .map((p) => {
            const e = econMap.get(p.id);
            if (!e) {
              return {
                productId: p.id,
                sku: p.sku ?? p.id,
                name: p.name,
                base: "",
                defaultCommission: "0",
                override: "",
                effectiveCommission: 0,
              };
            }
            return mapEconomicsToRow(e, { sku: p.sku, name: p.name });
          });
        setRows(mapped);
        setSavedByProductId(snapshotRows(mapped));
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
  }, [franchiseeRegistryId, tab, catalogCursor, catalogSearchDebounced, listRefreshTick, dismissedProductIds, outletOrgId, snapshotRows]);

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
          outletOrgId,
        });
        if (cancelled) return;
        const mapped = items.filter((e) => e.isOverride).map((e) => mapEconomicsToRow(e));
        setRows(mapped);
        setSavedByProductId(snapshotRows(mapped));
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
  }, [franchiseeRegistryId, tab, assignedCursor, assignedSearchDebounced, listRefreshTick, outletOrgId, snapshotRows]);

  const tableRows = React.useMemo(() => {
    if (tab !== "catalog" || !catalogOnlyEconomics) return rows;
    return rows.filter(
      (r) =>
        (Number.parseFloat(r.base) || 0) > 0 ||
        r.effectiveCommission > 0 ||
        r.override.trim() !== ""
    );
  }, [tab, catalogOnlyEconomics, rows]);

  const updateOverride = (productId: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.productId !== productId) return r;
        const overrideVal = value;
        const base = Number.parseFloat(r.base) || 0;
        const defaultComm = Number.parseFloat(r.defaultCommission) || 0;
        const effective =
          overrideVal.trim() !== ""
            ? Number.parseFloat(overrideVal) || 0
            : defaultComm;
        return { ...r, override: overrideVal, effectiveCommission: effective };
      })
    );
  };

  const onSave = async () => {
    if (!franchiseeRegistryId) return;
    setSaving(true);
    try {
      const items = rows
        .filter((r) => {
          const saved = savedByProductId.get(r.productId);
          if (!saved) return r.override.trim() !== "";
          return saved.override !== r.override;
        })
        .map((r) => ({
          productId: r.productId,
          commissionPerUnit: Number.parseFloat(r.override) || 0,
        }));
      await putFranchiseeProductEconomicsApi(franchiseeRegistryId, items);
      toast.success("Commission overrides saved for this page.");
      setSavedByProductId(snapshotRows(rows));
      setListRefreshTick((t) => t + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const onRemoveFromShop = async (productId: string) => {
    if (!franchiseeRegistryId) return;
    if (!window.confirm("Remove commission override for this SKU at this shop?")) return;
    setRemovingId(productId);
    try {
      await putFranchiseeProductEconomicsApi(franchiseeRegistryId, [
        { productId, commissionPerUnit: 0 },
      ]);
      toast.success("Override removed — shop will inherit network/zone default.");
      if (tab === "catalog") {
        setRows((prev) =>
          prev.map((r) =>
            r.productId === productId
              ? {
                  ...r,
                  override: "",
                  effectiveCommission: Number.parseFloat(r.defaultCommission) || 0,
                }
              : r
          )
        );
        setSavedByProductId((prev) => {
          const next = new Map(prev);
          const row = rows.find((r) => r.productId === productId);
          if (row) next.set(productId, { override: "" });
          return next;
        });
      } else {
        setRows((prev) => prev.filter((r) => r.productId !== productId));
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
          <CardTitle>Commission overrides</CardTitle>
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
          <CardTitle>Commission overrides</CardTitle>
          <CardDescription>
            Base price comes from your zone master published prices (read-only). Default commission comes from{" "}
            <Link href="/pricing/workspace/commissions" className="text-primary underline">
              Pricing → Franchise commissions
            </Link>{" "}
            (network/zone). Add an override only if this shop&apos;s guide retail should differ. Guide retail = base +
            effective commission.
            {zoneMasterListId ? (
              <>
                {" "}
                <Link href={`/pricing/price-lists/${zoneMasterListId}`} className="text-primary underline">
                  Set zone prices
                </Link>{" "}
                if base is blank.
              </>
            ) : null}
          </CardDescription>
        </div>
        {isDirty ? (
          <Button
            type="button"
            size="sm"
            onClick={() => void onSave()}
            disabled={saving || loading}
            className="hidden sm:inline-flex"
          >
            {saving ? "Saving…" : "Save this page"}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4 p-6 pt-0">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "catalog" | "assigned")} className="w-full">
          <TabsList className="h-auto flex-wrap justify-start gap-1">
            <TabsTrigger value="catalog" className="text-xs sm:text-sm">
              Full catalogue
            </TabsTrigger>
            <TabsTrigger value="assigned" className="text-xs sm:text-sm">
              SKUs with commission override
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
                On this page, show only SKUs with zone base or commission
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
              SKUs where a standalone commission override has been saved for this shop (not inherited defaults).
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
                  <th className="p-3 font-medium w-28">Base (zone)</th>
                  <th className="p-3 font-medium w-28">Default commission</th>
                  <th className="p-3 font-medium w-28">Override</th>
                  <th className="p-3 font-medium w-32">Guide retail</th>
                  <th className="p-3 w-12" />
                </tr>
              </thead>
              <tbody>
                {tableRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      {tab === "assigned"
                        ? assignedSearchDebounced.trim()
                          ? "No overrides match this search."
                          : "No commission overrides on this page."
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
                    const guide = b + r.effectiveCommission;
                    return (
                      <tr key={r.productId} className="border-b border-border/60">
                        <td className="p-3 font-mono text-xs">{r.sku}</td>
                        <td className="p-3">{r.name}</td>
                        <td className="p-2">
                          <Input
                            className="h-8 bg-muted/50"
                            inputMode="decimal"
                            value={r.base || "—"}
                            readOnly
                            tabIndex={-1}
                            aria-label={`Zone base for ${r.sku}`}
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            className="h-8 bg-muted/50"
                            inputMode="decimal"
                            value={r.defaultCommission || "0"}
                            readOnly
                            tabIndex={-1}
                            aria-label={`Default commission for ${r.sku}`}
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            className="h-8"
                            inputMode="decimal"
                            value={r.override}
                            onChange={(e) => updateOverride(r.productId, e.target.value)}
                            placeholder="inherit"
                            aria-label={`Commission override for ${r.sku}`}
                          />
                        </td>
                        <td className="p-3 text-muted-foreground">{guide > 0 ? formatMoney(guide, "KES") : "—"}</td>
                        <td className="p-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            disabled={removingId === r.productId || !r.override.trim()}
                            title="Remove override"
                            aria-label={`Remove override for ${r.sku}`}
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

        {isDirty && (
          <div
            className="fixed bottom-6 left-1/2 z-50 flex w-[min(100%-2rem,36rem)] -translate-x-1/2 items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 shadow-lg animate-in slide-in-from-bottom-4 duration-200"
            role="status"
            aria-live="polite"
          >
            <p className="text-sm text-muted-foreground">Unsaved override changes on this page</p>
            <Button type="button" size="sm" onClick={() => void onSave()} disabled={saving || loading}>
              {saving ? "Updating…" : "Update overrides"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
