"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { SkeletonDataTable } from "@/components/ui/skeleton";
import { TableLinearProgress } from "@/components/ui/table-linear-progress";
import { TablePagination } from "@/components/ui/table-pagination";
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
  fetchPriceListsPageForUi,
  fetchDiscountPolicies,
  fetchDailyPriceStatusApi,
  fetchCustomerDefaultPriceLists,
  type DailyPriceStatusResponse,
} from "@/lib/api/pricing";
import type { PriceList } from "@/lib/products/pricing-types";
import { fetchProductsApi } from "@/lib/api/products";
import { fetchProductPricingApi } from "@/lib/api/product-master";
import { fetchBatchCostingReportApi, type BatchCostingRow } from "@/lib/api/reports";
import {
  fetchFranchiseOutletSellPublishAlerts,
  type FranchiseOutletSellPublishAlertRow,
} from "@/lib/api/franchise-pricing";
import type { ProductRow } from "@/lib/types/masters";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { isSeafoodOrg } from "@/config/industry";
import { isFmcgOrg } from "@/lib/fmcg/sfa-customer";
import { useOrgContextStore } from "@/stores/orgContextStore";

const SEARCH_DEBOUNCE_MS = 400;
const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

function fmtKes(n: number | null | undefined): string {
  if (n == null) return "—";
  return `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PricingOverviewPage() {
  const templateId = useOrgContextStore((s) => s.templateId);
  const industryCategory = useOrgContextStore((s) => s.industryCategory);
  const seafoodOrg = isSeafoodOrg(templateId, industryCategory);
  const fmcgOrg = isFmcgOrg(templateId) || industryCategory === "FMCG";
  const [priceLists, setPriceLists] = React.useState<Awaited<ReturnType<typeof fetchPriceListsForUi>>>([]);
  const [policies, setPolicies] = React.useState<Awaited<ReturnType<typeof fetchDiscountPolicies>>>([]);
  const [batchCosts, setBatchCosts] = React.useState<BatchCostingRow[]>([]);
  const [products, setProducts] = React.useState<ProductRow[]>([]);
  const [pricingByProductId, setPricingByProductId] = React.useState<
    Record<string, Awaited<ReturnType<typeof fetchProductPricingApi>>>
  >({});
  const [dailyStatus, setDailyStatus] = React.useState<DailyPriceStatusResponse | null>(null);
  const [outletPublishAlerts, setOutletPublishAlerts] = React.useState<FranchiseOutletSellPublishAlertRow[]>([]);
  const [outletPublishToday, setOutletPublishToday] = React.useState<string | null>(null);
  const [customerTagCount, setCustomerTagCount] = React.useState(0);

  const [tagSearchInput, setTagSearchInput] = React.useState("");
  const [tagDebouncedSearch, setTagDebouncedSearch] = React.useState("");
  const [tagRows, setTagRows] = React.useState<PriceList[]>([]);
  const [tagPageOffset, setTagPageOffset] = React.useState(0);
  const [tagPageSize, setTagPageSize] = React.useState(25);
  const [tagHasMore, setTagHasMore] = React.useState(false);
  /** Unfiltered catalog size for the summary card. */
  const [tagCatalogCount, setTagCatalogCount] = React.useState(0);
  /** Matching rows for the current search (pagination summary). */
  const [tagFilteredTotal, setTagFilteredTotal] = React.useState(0);
  const [tagInitialLoading, setTagInitialLoading] = React.useState(true);
  const [tagFetching, setTagFetching] = React.useState(false);
  const tagLoadedOnce = React.useRef(false);

  React.useEffect(() => {
    if (!seafoodOrg) {
      setOutletPublishAlerts([]);
      setOutletPublishToday(null);
      return;
    }
    let cancelled = false;
    fetchFranchiseOutletSellPublishAlerts()
      .then((d) => {
        if (!cancelled) {
          setOutletPublishAlerts(d.items);
          setOutletPublishToday(d.todayISO ?? null);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [seafoodOrg]);

  React.useEffect(() => {
    let cancelled = false;
    if (seafoodOrg) {
      Promise.all([fetchPriceListsForUi(), fetchDiscountPolicies()])
        .then(([lists, pols]) => {
          if (!cancelled) {
            setPriceLists(lists);
            setPolicies(pols);
          }
        })
        .catch(() => {});
      fetchBatchCostingReportApi({ margin: 30 })
        .then((data) => {
          if (!cancelled) setBatchCosts(data.items.slice(0, 6));
        })
        .catch(() => {});
      fetchDailyPriceStatusApi()
        .then((s) => {
          if (!cancelled) setDailyStatus(s);
        })
        .catch(() => {});
    } else {
      setBatchCosts([]);
      setDailyStatus(null);
      setPriceLists([]);
      fetchCustomerDefaultPriceLists()
        .then((rows) => {
          if (!cancelled) setCustomerTagCount(rows.length);
        })
        .catch(() => {
          if (!cancelled) setCustomerTagCount(0);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [seafoodOrg]);

  React.useEffect(() => {
    const id = window.setTimeout(() => setTagDebouncedSearch(tagSearchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [tagSearchInput]);

  const loadTagPage = React.useCallback(
    async (offset: number) => {
      if (seafoodOrg) return;
      const isFirstLoad = !tagLoadedOnce.current;
      if (isFirstLoad) setTagInitialLoading(true);
      else setTagFetching(true);
      try {
        const page = await fetchPriceListsPageForUi({
          limit: tagPageSize,
          cursor: String(offset),
          search: tagDebouncedSearch || undefined,
        });
        setTagRows(page.items);
        setTagPageOffset(page.offset);
        setTagHasMore(page.hasMore);
        if (page.totalCount != null) {
          setTagFilteredTotal(page.totalCount);
          if (!tagDebouncedSearch) setTagCatalogCount(page.totalCount);
        }
        tagLoadedOnce.current = true;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load price tags.");
        setTagRows([]);
        setTagHasMore(false);
      } finally {
        setTagInitialLoading(false);
        setTagFetching(false);
      }
    },
    [seafoodOrg, tagDebouncedSearch, tagPageSize]
  );

  React.useEffect(() => {
    if (seafoodOrg) return;
    void loadTagPage(0);
  }, [seafoodOrg, loadTagPage]);

  React.useEffect(() => {
    let cancelled = false;
    fetchProductsApi()
      .then(async (list) => {
        if (cancelled) return;
        setProducts(list);
        if (seafoodOrg) {
          const results = await Promise.all(list.map((p) => fetchProductPricingApi(p.id)));
          if (cancelled) return;
          const map: Record<string, Awaited<ReturnType<typeof fetchProductPricingApi>>> = {};
          list.forEach((p, i) => {
            map[p.id] = results[i] ?? [];
          });
          setPricingByProductId(map);
        } else {
          setPricingByProductId({});
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [seafoodOrg]);

  const productsWithPricing = React.useMemo(() => {
    return products.filter((p) => (pricingByProductId[p.id]?.length ?? 0) > 0);
  }, [products, pricingByProductId]);

  const tagLabel = fmcgOrg ? "Price tags" : "Price lists";
  const tagSingular = fmcgOrg ? "price tag" : "price list";
  const tagSearchPending = tagSearchInput.trim() !== tagDebouncedSearch.trim();
  const tagTableBusy = tagFetching || tagSearchPending;

  if (!seafoodOrg) {
    return (
      <PageShell>
        <PageHeader
          title="Pricing overview"
          description={
            fmcgOrg
              ? "Named price tags (e.g. Naivas, Premium). Set price per piece, then pick a tag on each order or invoice. Customer defaults are optional."
              : "Named price lists and optional customer defaults."
          }
          breadcrumbs={[{ label: "Pricing" }, { label: "Overview" }]}
          sticky
          showCommandHint
          actions={
            <div className="flex gap-2">
              <Button size="sm" asChild>
                <Link href="/pricing/workspace/lists">{tagLabel}</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/pricing/rules">Customer tags</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/sales/customers">Customers</Link>
              </Button>
            </div>
          }
        />
        <div className="p-6 space-y-6">
          <Card className="border-primary/15 bg-muted/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">How pricing works</CardTitle>
              <CardDescription>
                Named {tagLabel.toLowerCase()} hold piece prices for your products. On a sales order or
                invoice you pick which tag to use — linking a tag to a customer is optional (it only sets
                their default).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
                <li>
                  Create a{" "}
                  <Link href="/pricing/workspace/lists" className="text-primary underline">
                    {tagSingular}
                  </Link>{" "}
                  (e.g. Premium, Naivas).
                </li>
                <li>
                  Open it and set <strong className="text-foreground">price per piece</strong> for each
                  product. Pack and case prices come from pieces × pack size.
                </li>
                <li>
                  When recording an order or invoice, choose the {tagSingular} for that sale. You can
                  change it per document.
                </li>
                <li>
                  Optionally set a default tag on the{" "}
                  <Link href="/sales/customers" className="text-primary underline">
                    customer
                  </Link>{" "}
                  (or under{" "}
                  <Link href="/pricing/rules" className="text-primary underline">
                    Customer tags
                  </Link>
                  ) so new orders start with that tag pre-selected.
                </li>
              </ol>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{tagLabel}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {tagInitialLoading && tagCatalogCount === 0 ? "—" : tagCatalogCount}
                </p>
                <Button variant="link" className="h-auto p-0 mt-1" asChild>
                  <Link href="/pricing/workspace/lists">Manage</Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Sellable products</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{products.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Price them on each tag</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Customers with a tag
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{customerTagCount}</p>
                <Button variant="link" className="h-auto p-0 mt-1" asChild>
                  <Link href="/pricing/rules">Assign tags</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="space-y-3">
              <div>
                <CardTitle className="text-base">{tagLabel}</CardTitle>
                <CardDescription>
                  {fmcgOrg
                    ? "Open a tag to set piece prices. Pack / carton / bale calculate from product packaging."
                    : "Open a list to manage product prices."}
                </CardDescription>
              </div>
              <DataTableToolbar
                searchPlaceholder={`Search ${tagLabel.toLowerCase()}…`}
                searchValue={tagSearchInput}
                onSearchChange={setTagSearchInput}
                className="border-0 bg-transparent p-0 shadow-none"
              />
            </CardHeader>
            <CardContent className="relative p-0">
              {tagInitialLoading ? (
                <div className="p-4">
                  <SkeletonDataTable
                    rows={Math.min(tagPageSize, 8)}
                    columnWidths={["w-40", "w-20", "w-16", "w-28"]}
                  />
                </div>
              ) : tagRows.length === 0 ? (
                <div className="px-6 py-10 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {tagDebouncedSearch
                      ? `No ${tagLabel.toLowerCase()} match “${tagDebouncedSearch}”.`
                      : `No ${tagLabel.toLowerCase()} yet. Create one to start pricing products.`}
                  </p>
                  {!tagDebouncedSearch ? (
                    <Button size="sm" asChild>
                      <Link href="/pricing/workspace/lists">
                        <Icons.Plus className="mr-2 h-4 w-4" />
                        {fmcgOrg ? "Add price tag" : "Add price list"}
                      </Link>
                    </Button>
                  ) : null}
                </div>
              ) : (
                <>
                  <TableLinearProgress active={tagTableBusy} />
                  <div className={cn(tagTableBusy && "pointer-events-none opacity-60")}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Currency</TableHead>
                          <TableHead>Default</TableHead>
                          <TableHead className="w-36"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tagRows.map((pl) => (
                          <TableRow key={pl.id}>
                            <TableCell className="font-medium">{pl.name}</TableCell>
                            <TableCell>{pl.currency}</TableCell>
                            <TableCell>{pl.isDefault ? "Yes" : "—"}</TableCell>
                            <TableCell>
                              <Button variant="default" size="sm" asChild>
                                <Link href={`/pricing/workspace/lists?list=${pl.id}`}>
                                  {fmcgOrg ? "Set piece prices" : "Open"}
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
              <div className="border-t p-3">
                <TablePagination
                  pageOffset={tagPageOffset}
                  pageSize={tagPageSize}
                  itemCount={tagInitialLoading ? 0 : tagRows.length}
                  hasMore={tagHasMore}
                  loading={tagInitialLoading}
                  busy={tagTableBusy}
                  totalCount={tagFilteredTotal}
                  onPrevious={() => {
                    if (tagPageOffset <= 0 || tagInitialLoading || tagFetching) return;
                    void loadTagPage(Math.max(0, tagPageOffset - tagPageSize));
                  }}
                  onNext={() => {
                    if (!tagHasMore || tagInitialLoading || tagFetching) return;
                    void loadTagPage(tagPageOffset + tagPageSize);
                  }}
                  entityLabel={tagLabel.toLowerCase()}
                  pageSizeOptions={[...PAGE_SIZE_OPTIONS]}
                  onPageSizeChange={setTagPageSize}
                  className="border-0 bg-transparent shadow-none"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Pricing Overview"
        description="Price lists, franchise zones, daily kg prices, and discount policies."
        breadcrumbs={[{ label: "Pricing" }, { label: "Overview" }]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/pricing/workspace/lists">Price lists</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/pricing/workspace/commissions">Franchise commissions</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/pricing/rules">Rules</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/analytics/pricing">Analytics: Pricing</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        {outletPublishAlerts.length > 0 && (
          <div className="flex flex-wrap items-start gap-3 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm dark:border-rose-900/40 dark:bg-rose-950/30">
            <Icons.AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <div className="min-w-0 flex-1 text-rose-900 dark:text-rose-200">
              <p className="font-semibold">Franchise outlets — missing today&apos;s published shelf price</p>
              <p className="mt-1 text-muted-foreground dark:text-rose-300/90">
                {outletPublishToday ? (
                  <span>
                    For <strong className="text-rose-950 dark:text-rose-100">{outletPublishToday}</strong>, one
                    or more outlet price lists still have SKUs from recent GRNs without a{" "}
                    <strong className="text-rose-950 dark:text-rose-100">DailyPrice</strong> row or a{" "}
                    <strong className="text-rose-950 dark:text-rose-100">published pricing-engine</strong> line.
                    Mobile Sell only lists SKUs after HQ publishes for that day.
                  </span>
                ) : (
                  <span>
                    One or more outlet price lists have SKUs from recent GRNs without{" "}
                    <strong className="text-rose-950 dark:text-rose-100">today&apos;s DailyPrice</strong> or a{" "}
                    <strong className="text-rose-950 dark:text-rose-100">published engine</strong> price.
                  </span>
                )}
              </p>
              <ul className="mt-2 list-disc pl-4 text-xs text-muted-foreground">
                {outletPublishAlerts.slice(0, 5).map((row) => (
                  <li key={row.priceListId}>
                    {row.priceListName ?? row.priceListId.slice(0, 8)} — {row.pendingProductCount} SKU
                    {row.pendingProductCount > 1 ? "s" : ""} missing publish · {row.outletCount} outlet
                    {row.outletCount > 1 ? "s" : ""}
                  </li>
                ))}
              </ul>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 border-rose-300 text-rose-900 hover:bg-rose-100"
              asChild
            >
              <Link href="/pricing/workspace/zones">
                <Icons.MapPin className="mr-1.5 h-3.5 w-3.5" />
                Franchise zones
              </Link>
            </Button>
          </div>
        )}

        {batchCosts.length > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icons.Calculator className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-base">Cost basis — recent batches</CardTitle>
                    <CardDescription>
                      Set selling prices above the cost/kg below to ensure profitability. Margin shown at 30%.
                    </CardDescription>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/reports/batch-costing">
                    <Icons.BarChart3 className="h-4 w-4 mr-1.5" />
                    Full batch cost report
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch (GRN)</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead className="text-right">Received kg</TableHead>
                    <TableHead className="text-right">Total cost (KES)</TableHead>
                    <TableHead className="text-right">Cost/kg raw</TableHead>
                    <TableHead className="text-right text-green-700">Sell at (30% margin)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchCosts.map((row) => (
                    <TableRow key={row.grnId}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/inventory/receipts/${row.grnId}`}
                          className="text-primary hover:underline"
                        >
                          {row.grnNumber ?? row.grnId.slice(0, 8)}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.date
                          ? new Date(row.date).toLocaleDateString("en-KE", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm max-w-40 truncate" title={row.products}>
                        {row.products || "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.receivedKg.toLocaleString("en-KE", { maximumFractionDigits: 1 })}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtKes(row.totalLandedCostKes)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmtKes(row.costPerKgRaw)}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-green-700">
                        {fmtKes(row.recommendedSellPricePerKg)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {dailyStatus && dailyStatus.totalListsNeedingUpdate > 0 && (
          <div className="flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-2.5 text-sm">
            <Icons.Clock className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-amber-800 dark:text-amber-300">
              <strong>
                {dailyStatus.totalListsNeedingUpdate} price list
                {dailyStatus.totalListsNeedingUpdate > 1 ? "s" : ""}
              </strong>{" "}
              haven&apos;t been updated today. Set today&apos;s prices before processing orders.
            </span>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100"
              asChild
            >
              <Link href="/pricing/workspace/lists">
                <Icons.Tag className="h-3.5 w-3.5 mr-1.5" />
                Update prices
              </Link>
            </Button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Price lists</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{priceLists.length}</p>
              <Button variant="link" className="h-auto p-0 mt-1" asChild>
                <Link href="/pricing/workspace/lists">Manage</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Products with pricing</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{productsWithPricing.length}</p>
              <span className="text-muted-foreground text-sm">of {products.length} total</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Discount policies</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{policies.length}</p>
              <Button variant="link" className="h-auto p-0 mt-1" asChild>
                <Link href="/pricing/rules">Manage</Link>
              </Button>
            </CardContent>
          </Card>
          <Card
            className={
              dailyStatus && dailyStatus.totalListsNeedingUpdate > 0
                ? "border-amber-200 dark:border-amber-800"
                : undefined
            }
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Prices today</CardTitle>
            </CardHeader>
            <CardContent>
              {dailyStatus ? (
                dailyStatus.totalListsNeedingUpdate > 0 ? (
                  <>
                    <p className="text-2xl font-bold text-amber-600">
                      {dailyStatus.totalListsNeedingUpdate}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      list{dailyStatus.totalListsNeedingUpdate > 1 ? "s" : ""} need update
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-emerald-600">{priceLists.length}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">all up to date</p>
                  </>
                )
              ) : (
                <p className="text-2xl font-bold text-muted-foreground">—</p>
              )}
              <Button variant="link" className="h-auto p-0 mt-1" asChild>
                <Link href="/pricing/workspace/lists">Set prices</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Price lists</CardTitle>
            <CardDescription>Currency, channel, franchise zone linkage.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {priceLists.map((pl) => (
                  <TableRow key={pl.id}>
                    <TableCell className="font-medium">{pl.name}</TableCell>
                    <TableCell>{pl.currency}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{pl.channel}</Badge>
                    </TableCell>
                    <TableCell>{pl.isDefault ? "Yes" : "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/pricing/workspace/lists?list=${pl.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Products with pricing</CardTitle>
            <CardDescription>Products that have tiers on at least one price list.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[40vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Lists</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productsWithPricing.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No products with pricing. Add tiers via product → Pricing.
                      </TableCell>
                    </TableRow>
                  ) : (
                    productsWithPricing.map((p) => {
                      const pp = pricingByProductId[p.id] ?? [];
                      const listNames = pp
                        .map((x) => priceLists.find((l) => l.id === x.priceListId)?.name ?? x.priceListId)
                        .join(", ");
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono font-medium">{p.sku}</TableCell>
                          <TableCell>{p.name}</TableCell>
                          <TableCell className="text-muted-foreground">{listNames || "—"}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/master/products/${p.id}/pricing`}>Edit</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
