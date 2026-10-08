"use client";

import * as React from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchSfaProductSyncOverviewApi,
  fetchSfaSyncSettingsApi,
  updateSfaSyncSettingsApi,
  type SfaProductSyncOverview,
  type SfaUnlinkedProduct,
} from "@/lib/api/odaflow-integration";
import { fetchPriceListsForUi } from "@/lib/api/pricing";
import type { PriceList } from "@/lib/products/pricing-types";
import { SfaBulkSyncSheet } from "@/components/integrations/SfaBulkSyncSheet";
import { SfaCatalogSyncAlertBanner } from "@/components/integrations/SfaCatalogSyncAlertBanner";
import { useErpSfaEnrollment } from "@/lib/integrations/use-erp-sfa-enrollment";
import {
  LIST_TABLE_PAGINATION_CLASS,
  LIST_TABLE_STATIC_CLASS,
} from "@/components/layout/page-shell";
import { TopProgressBar } from "@/components/ui/top-progress-bar";
import { TablePagination } from "@/components/ui/table-pagination";
import { cn } from "@/lib/utils";

type Props = {
  canSave: boolean;
  productMappingsCount: number;
};

const PAGE_SIZE_OPTIONS = [15, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 15;

function CatalogPresenceBadge({ onSfa, linked }: { onSfa: boolean; linked: boolean }) {
  if (onSfa) {
    return (
      <Badge variant="secondary" className="font-normal text-green-700 dark:text-green-400">
        {linked ? "On SFA" : "On SFA · barcode/link"}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="font-normal text-amber-700 border-amber-500/50 dark:text-amber-400">
      Missing
    </Badge>
  );
}

export function OdaflowProductsSyncPanel({ canSave, productMappingsCount }: Props) {
  const { status: sfaEnrollment, refresh: refreshEnrollment } = useErpSfaEnrollment();
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [overview, setOverview] = React.useState<SfaProductSyncOverview | null>(null);
  const [unlinked, setUnlinked] = React.useState<SfaUnlinkedProduct[]>([]);
  const [unlinkedTotal, setUnlinkedTotal] = React.useState(0);
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);
  const [pageOffset, setPageOffset] = React.useState(0);

  const [priceLists, setPriceLists] = React.useState<PriceList[]>([]);
  const [defaultPriceListId, setDefaultPriceListId] = React.useState("");
  const [defaultGt, setDefaultGt] = React.useState(true);
  const [defaultMt, setDefaultMt] = React.useState(false);
  const [savingDefaults, setSavingDefaults] = React.useState(false);

  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [bulkProductIds, setBulkProductIds] = React.useState<string[]>([]);
  const hasShellRef = React.useRef(false);
  const listRequestId = React.useRef(0);

  const loadShell = React.useCallback(async () => {
    setLoading(true);
    try {
      const [data, settings, lists] = await Promise.all([
        fetchSfaProductSyncOverviewApi({
          search: debouncedSearch || undefined,
          limit: pageSize,
          offset: 0,
        }),
        fetchSfaSyncSettingsApi(),
        fetchPriceListsForUi(),
      ]);
      setOverview(data.overview);
      setUnlinked(data.unlinked.items);
      setUnlinkedTotal(data.unlinked.total);
      setPriceLists(lists);
      setDefaultPriceListId(
        settings.defaultPriceListId || lists.find((p) => p.isDefault)?.id || lists[0]?.id || ""
      );
      setDefaultGt(settings.defaultCatalogs.includes("general_trade"));
      setDefaultMt(settings.defaultCatalogs.includes("modern_trade"));
      hasShellRef.current = true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load SFA product sync data.");
      if (!hasShellRef.current) {
        setOverview(null);
        setUnlinked([]);
      }
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, pageSize]);

  const loadUnlinkedPage = React.useCallback(async () => {
    const requestId = ++listRequestId.current;
    setRefreshing(true);
    setUnlinked([]);
    let keepRefreshing = false;
    try {
      const data = await fetchSfaProductSyncOverviewApi({
        search: debouncedSearch || undefined,
        limit: pageSize,
        offset: pageOffset,
        includeOverview: false,
      });
      if (requestId !== listRequestId.current) return;
      if (
        pageOffset > 0 &&
        data.unlinked.items.length === 0 &&
        data.unlinked.total > 0
      ) {
        keepRefreshing = true;
        setPageOffset(Math.max(0, Math.floor((data.unlinked.total - 1) / pageSize) * pageSize));
        return;
      }
      setUnlinked(data.unlinked.items);
      setUnlinkedTotal(data.unlinked.total);
      setOverview((prev) =>
        prev
          ? {
              ...prev,
              unlinked: debouncedSearch ? prev.unlinked : data.unlinked.total,
              sfaLookupOk: data.unlinked.sfaLookupOk ?? prev.sfaLookupOk,
            }
          : data.overview
      );
    } catch (err) {
      if (requestId !== listRequestId.current) return;
      toast.error(err instanceof Error ? err.message : "Failed to load products.");
      setUnlinked([]);
    } finally {
      if (requestId === listRequestId.current && !keepRefreshing) setRefreshing(false);
    }
  }, [debouncedSearch, pageOffset, pageSize]);

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPageOffset(0);
    }, 300);
    return () => window.clearTimeout(t);
  }, [search]);

  React.useEffect(() => {
    if (!hasShellRef.current) {
      void loadShell();
      return;
    }
    void loadUnlinkedPage();
  }, [loadShell, loadUnlinkedPage]);

  const refresh = React.useCallback(
    async (opts?: { soft?: boolean }) => {
      if (opts?.soft && hasShellRef.current) {
        await loadUnlinkedPage();
        return;
      }
      setPageOffset(0);
      await loadShell();
    },
    [loadShell, loadUnlinkedPage]
  );

  const handleSaveDefaults = async () => {
    if (!canSave) {
      toast.error("You need admin settings permission.");
      return;
    }
    const defaultCatalogs = [
      ...(defaultGt ? (["general_trade"] as const) : []),
      ...(defaultMt ? (["modern_trade"] as const) : []),
    ];
    if (!defaultCatalogs.length) {
      toast.error("Select at least one default catalog.");
      return;
    }
    setSavingDefaults(true);
    try {
      await updateSfaSyncSettingsApi({
        defaultPriceListId: defaultPriceListId || null,
        defaultCatalogs,
      });
      toast.success("Default SFA sync settings saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save defaults.");
    } finally {
      setSavingDefaults(false);
    }
  };

  const openBulkSync = async (ids?: string[]) => {
    if (ids?.length) {
      setBulkProductIds(ids);
      setBulkOpen(true);
      return;
    }
    try {
      const allIds: string[] = [];
      let offset = 0;
      const limit = 100;
      while (true) {
        const data = await fetchSfaProductSyncOverviewApi({ limit, offset });
        allIds.push(...data.unlinked.items.map((p) => p.productId));
        if (allIds.length >= data.unlinked.total || data.unlinked.items.length === 0) break;
        offset += limit;
      }
      if (!allIds.length) {
        toast.error("No products to sync.");
        return;
      }
      setBulkProductIds(allIds);
      setBulkOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load unlinked products.");
    }
  };

  if (loading && !overview) {
    return <div className="text-sm text-muted-foreground">Loading product sync…</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="space-y-3">
        <SfaCatalogSyncAlertBanner
          pending={sfaEnrollment?.catalogSyncPending}
          onSyncHere={() => void openBulkSync()}
        />

        {overview ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                [
                  "active",
                  "Active",
                  String(overview.activeProducts),
                  `${overview.withBarcode} with barcode`,
                  false,
                ],
                ["gt", "GT linked", String(overview.gtLinked), null, false],
                ["mt", "MT linked", String(overview.mtLinked), null, false],
                [
                  "missing",
                  "Missing GT/MT",
                  String(overview.unlinked),
                  overview.missingBarcode > 0
                    ? `${overview.missingBarcode} without barcode`
                    : null,
                  overview.unlinked > 0,
                ],
              ] as const
            ).map(([id, label, value, hint, emphasize]) => (
              <div
                key={id}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md border px-2.5 py-1",
                  emphasize &&
                    "border-amber-300/70 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/30"
                )}
              >
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {label}
                </span>
                <span
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    id === "gt" || id === "mt" ? "text-green-600 dark:text-green-400" : null,
                    emphasize ? "text-amber-700 dark:text-amber-400" : null
                  )}
                >
                  {value}
                </span>
                {hint ? <span className="text-[10px] text-muted-foreground">{hint}</span> : null}
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col gap-2 rounded-lg border px-3 py-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex min-w-[11rem] flex-1 items-center gap-2">
            <Label className="shrink-0 text-xs text-muted-foreground">Price tag</Label>
            <Select
              value={defaultPriceListId || "__none__"}
              onValueChange={(v) => setDefaultPriceListId(v === "__none__" ? "" : v)}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Select price tag" />
              </SelectTrigger>
              <SelectContent>
                {priceLists.map((pl) => (
                  <SelectItem key={pl.id} value={pl.id}>
                    {pl.name}
                    {pl.isDefault ? " (org default)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Checkbox
                id="def-gt"
                checked={defaultGt}
                onCheckedChange={(v) => setDefaultGt(v === true)}
              />
              <Label htmlFor="def-gt" className="text-sm font-normal">
                General trade
              </Label>
            </div>
            <div className="flex items-center gap-1.5">
              <Checkbox
                id="def-mt"
                checked={defaultMt}
                onCheckedChange={(v) => setDefaultMt(v === true)}
              />
              <Label htmlFor="def-mt" className="text-sm font-normal">
                Modern trade
              </Label>
            </div>
          </div>
          {canSave ? (
            <Button
              type="button"
              size="sm"
              className="h-8"
              disabled={savingDefaults}
              onClick={() => void handleSaveDefaults()}
            >
              {savingDefaults ? "Saving…" : "Save defaults"}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Natural-height table: page scrolls outward; Rows can go 15 → 100. */}
      <section id="odaflow-missing-products" className={LIST_TABLE_STATIC_CLASS}>
        <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-tight">
              Products missing an SFA catalog
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Barcoded SKUs missing GT and/or MT · {productMappingsCount} ERP mappings
            </p>
          </div>
          <div className="flex shrink-0 flex-nowrap items-center gap-2">
            <Input
              placeholder="Search name, SKU, barcode…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-48 sm:w-64"
            />
            {(debouncedSearch ? unlinkedTotal : overview?.unlinked ?? unlinkedTotal) > 0 ? (
              <Button type="button" size="sm" className="h-8" onClick={() => void openBulkSync()}>
                <Icons.Radio className="mr-1.5 h-3.5 w-3.5" />
                Sync all {debouncedSearch ? unlinkedTotal : overview?.unlinked ?? unlinkedTotal}
              </Button>
            ) : null}
          </div>
        </div>

        {overview?.sfaLookupOk === false ? (
          <p className="border-b px-3 py-1.5 text-xs text-amber-600">
            Could not reach the SFA API for live catalog presence. Check{" "}
            <code className="text-[11px] bg-muted px-1 rounded">ODAFLOW_SFA_API_URL</code> and{" "}
            <code className="text-[11px] bg-muted px-1 rounded">ODAFLOW_SFA_API_KEY</code>.
          </p>
        ) : null}

        <div className="relative">
          <TopProgressBar active={refreshing} />
          {refreshing ? (
            <p className="absolute right-3 top-2 z-20 text-[11px] text-muted-foreground">Loading…</p>
          ) : null}

          {unlinked.length === 0 && !refreshing ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              {overview?.unlinked || unlinkedTotal
                ? "No matches for this search."
                : "Every barcoded product is on both General Trade and Modern Trade in SFA."}
            </p>
          ) : (
            <div
              className={cn(
                "overflow-x-auto px-4 transition-opacity duration-300 ease-out",
                refreshing ? "opacity-0" : "opacity-100"
              )}
            >
              <table className="w-full text-sm">
                <thead className="bg-card">
                  <tr className="border-b">
                    <th className="bg-card text-left py-1.5 pr-4 font-medium text-muted-foreground">
                      Product
                    </th>
                    <th className="bg-card text-left py-1.5 pr-4 font-medium text-muted-foreground">
                      SKU
                    </th>
                    <th className="bg-card text-left py-1.5 pr-4 font-medium text-muted-foreground">
                      Barcode
                    </th>
                    <th className="bg-card text-left py-1.5 pr-4 font-medium text-muted-foreground">
                      General trade
                    </th>
                    <th className="bg-card text-left py-1.5 pr-4 font-medium text-muted-foreground">
                      Modern trade
                    </th>
                    <th className="bg-card text-left py-1.5 font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {unlinked.map((p) => (
                    <tr key={p.productId} className="border-b hover:bg-muted/30">
                      <td className="py-1.5 pr-4">
                        <Link
                          href={`/master/products/${p.productId}`}
                          className="text-primary hover:underline"
                        >
                          {p.name}
                        </Link>
                      </td>
                      <td className="py-1.5 pr-4 font-mono text-xs text-muted-foreground">
                        {p.sku ?? "—"}
                      </td>
                      <td className="py-1.5 pr-4 font-mono text-xs">{p.barcode ?? "—"}</td>
                      <td className="py-1.5 pr-4">
                        <CatalogPresenceBadge onSfa={p.gtOnSfa} linked={p.gtLinked} />
                      </td>
                      <td className="py-1.5 pr-4">
                        <CatalogPresenceBadge onSfa={p.mtOnSfa} linked={p.mtLinked} />
                      </td>
                      <td className="py-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7"
                          disabled={refreshing}
                          onClick={() => void openBulkSync([p.productId])}
                        >
                          Sync
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {unlinkedTotal > 0 || refreshing ? (
          <TablePagination
            className={`${LIST_TABLE_PAGINATION_CLASS} rounded-none border-0 border-t shadow-none bg-card`}
            pageOffset={pageOffset}
            pageSize={pageSize}
            itemCount={unlinked.length}
            hasMore={pageOffset + unlinked.length < unlinkedTotal}
            loading={refreshing}
            totalCount={unlinkedTotal}
            entityLabel="products"
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPageOffset(0);
            }}
            onPrevious={() => setPageOffset((o) => Math.max(0, o - pageSize))}
            onNext={() => setPageOffset((o) => o + pageSize)}
          />
        ) : null}
      </section>

      <SfaBulkSyncSheet
        productIds={bulkProductIds}
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        onSynced={() => {
          void refreshEnrollment();
          return refresh({ soft: true });
        }}
      />
    </div>
  );
}
