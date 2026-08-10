"use client";

import * as React from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { TopProgressBar } from "@/components/ui/top-progress-bar";
import { cn } from "@/lib/utils";

type Props = {
  canSave: boolean;
  productMappingsCount: number;
};

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
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [overview, setOverview] = React.useState<SfaProductSyncOverview | null>(null);
  const [unlinked, setUnlinked] = React.useState<SfaUnlinkedProduct[]>([]);
  const [unlinkedTotal, setUnlinkedTotal] = React.useState(0);
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  const [priceLists, setPriceLists] = React.useState<PriceList[]>([]);
  const [defaultPriceListId, setDefaultPriceListId] = React.useState("");
  const [defaultGt, setDefaultGt] = React.useState(true);
  const [defaultMt, setDefaultMt] = React.useState(false);
  const [savingDefaults, setSavingDefaults] = React.useState(false);

  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [bulkProductIds, setBulkProductIds] = React.useState<string[]>([]);
  const hasDataRef = React.useRef(false);

  const refresh = React.useCallback(async (opts?: { soft?: boolean }) => {
    const soft = Boolean(opts?.soft && hasDataRef.current);
    if (soft) setRefreshing(true);
    else setLoading(true);
    try {
      const [data, settings, lists] = await Promise.all([
        fetchSfaProductSyncOverviewApi({ search: debouncedSearch || undefined, limit: 50 }),
        fetchSfaSyncSettingsApi(),
        fetchPriceListsForUi(),
      ]);
      setOverview(data.overview);
      setUnlinked(data.unlinked.items);
      setUnlinkedTotal(data.unlinked.total);
      setPriceLists(lists);
      setDefaultPriceListId(settings.defaultPriceListId || lists.find((p) => p.isDefault)?.id || lists[0]?.id || "");
      setDefaultGt(settings.defaultCatalogs.includes("general_trade"));
      setDefaultMt(settings.defaultCatalogs.includes("modern_trade"));
      hasDataRef.current = true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load SFA product sync data.");
      if (!hasDataRef.current) {
        setOverview(null);
        setUnlinked([]);
      }
    } finally {
      if (soft) setRefreshing(false);
      else setLoading(false);
    }
  }, [debouncedSearch]);

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  React.useEffect(() => {
    void refresh({ soft: hasDataRef.current });
  }, [refresh]);

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
    <div className="space-y-6">
      {overview ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active products</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.activeProducts}</div>
              <p className="text-xs text-muted-foreground mt-1">{overview.withBarcode} with barcode</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>GT linked</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{overview.gtLinked}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>MT linked</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{overview.mtLinked}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Missing GT or MT</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${overview.unlinked > 0 ? "text-amber-600" : ""}`}>
                {overview.unlinked}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {overview.sfaLookupOk === false
                  ? "SFA API lookup offline — ERP mappings only"
                  : "Live SFA check via API (barcode + links)"}
              </p>
              {overview.missingBarcode > 0 ? (
                <p className="text-xs text-muted-foreground mt-1">
                  {overview.missingBarcode} active without barcode
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Default sync settings</CardTitle>
          <CardDescription>
            Used when bulk-syncing from the product list or this page. Individual products can still pick a different tag.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Default price tag</Label>
              <Select
                value={defaultPriceListId || "__none__"}
                onValueChange={(v) => setDefaultPriceListId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
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
            <div className="space-y-3">
              <Label>Default catalogs</Label>
              <div className="flex items-center gap-2">
                <Checkbox id="def-gt" checked={defaultGt} onCheckedChange={(v) => setDefaultGt(v === true)} />
                <Label htmlFor="def-gt">General trade</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="def-mt" checked={defaultMt} onCheckedChange={(v) => setDefaultMt(v === true)} />
                <Label htmlFor="def-mt">Modern trade</Label>
              </div>
            </div>
          </div>
          {canSave ? (
            <Button type="button" size="sm" disabled={savingDefaults} onClick={() => void handleSaveDefaults()}>
              {savingDefaults ? "Saving…" : "Save defaults"}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Products missing an SFA catalog</CardTitle>
            <CardDescription>
              Active barcoded SKUs missing General Trade and/or Modern Trade. Presence is checked by
              barcode, SFA entity links (including manual order matches), and ERP catalog mappings.
            </CardDescription>
          </div>
          {(debouncedSearch ? unlinkedTotal : overview?.unlinked ?? unlinkedTotal) > 0 ? (
            <Button
              type="button"
              size="sm"
              onClick={() => void openBulkSync()}
            >
              <Icons.Radio className="mr-2 h-4 w-4" />
              Sync all {debouncedSearch ? unlinkedTotal : overview?.unlinked ?? unlinkedTotal}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search by name, SKU, or barcode…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
          {overview?.sfaLookupOk === false ? (
            <p className="text-xs text-amber-600">
              Could not reach the SFA API for live catalog presence. Check{" "}
              <code className="text-[11px] bg-muted px-1 rounded">ODAFLOW_SFA_API_URL</code> (e.g.
              https://dev.odaflow.com) and{" "}
              <code className="text-[11px] bg-muted px-1 rounded">ODAFLOW_SFA_API_KEY</code>.
            </p>
          ) : null}
          <div className="relative">
            <TopProgressBar active={refreshing} />
            {refreshing ? (
              <p className="absolute right-0 -top-6 text-[11px] text-muted-foreground">
                Updating…
              </p>
            ) : null}
            {unlinked.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {overview?.unlinked
                  ? "No matches for this search."
                  : "Every barcoded product is on both General Trade and Modern Trade in SFA."}
              </p>
            ) : (
              <div
                className={cn(
                  "overflow-x-auto transition-opacity duration-200",
                  refreshing && "opacity-70"
                )}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Product</th>
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">SKU</th>
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Barcode</th>
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">General trade</th>
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Modern trade</th>
                      <th className="text-left py-2 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unlinked.map((p) => (
                      <tr key={p.productId} className="border-b hover:bg-muted/30">
                        <td className="py-2 pr-4">
                          <Link href={`/master/products/${p.productId}`} className="text-primary hover:underline">
                            {p.name}
                          </Link>
                        </td>
                        <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">{p.sku ?? "—"}</td>
                        <td className="py-2 pr-4 font-mono text-xs">{p.barcode ?? "—"}</td>
                        <td className="py-2 pr-4">
                          <CatalogPresenceBadge onSfa={p.gtOnSfa} linked={p.gtLinked} />
                        </td>
                        <td className="py-2 pr-4">
                          <CatalogPresenceBadge onSfa={p.mtOnSfa} linked={p.mtLinked} />
                        </td>
                        <td className="py-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8"
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
          {unlinkedTotal > unlinked.length ? (
            <p className="text-xs text-muted-foreground">
              Showing {unlinked.length} of {unlinkedTotal}. Use{" "}
              <Link href="/master/products" className="text-primary hover:underline">
                Products
              </Link>{" "}
              to search and bulk-sync the full list.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ERP ↔ Odaflow mappings</CardTitle>
          <CardDescription>
            External record mappings written when products sync to SFA or when orders are matched.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="secondary">{productMappingsCount} product mapping{productMappingsCount === 1 ? "" : "s"}</Badge>
          <p className="text-xs text-muted-foreground mt-2">
            Order ingest still uses these mappings to resolve Odaflow line items to ERP SKUs.
          </p>
        </CardContent>
      </Card>

      <SfaBulkSyncSheet
        productIds={bulkProductIds}
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        onSynced={() => refresh({ soft: true })}
      />
    </div>
  );
}
