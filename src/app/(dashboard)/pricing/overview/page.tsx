"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchPriceListsForUi, fetchDiscountPolicies, fetchDailyPriceStatusApi, type DailyPriceStatusResponse } from "@/lib/api/pricing";
import { fetchProductsApi } from "@/lib/api/products";
import { fetchProductPricingApi } from "@/lib/api/product-master";
import { fetchBatchCostingReportApi, type BatchCostingRow } from "@/lib/api/reports";
import type { ProductRow } from "@/lib/types/masters";
import * as Icons from "lucide-react";

function fmtKes(n: number | null | undefined): string {
  if (n == null) return "—";
  return `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PricingOverviewPage() {
  const [priceLists, setPriceLists] = React.useState<Awaited<ReturnType<typeof fetchPriceListsForUi>>>([]);
  const [policies, setPolicies] = React.useState<Awaited<ReturnType<typeof fetchDiscountPolicies>>>([]);
  const [batchCosts, setBatchCosts] = React.useState<BatchCostingRow[]>([]);
  const [products, setProducts] = React.useState<ProductRow[]>([]);
  const [pricingByProductId, setPricingByProductId] = React.useState<Record<string, Awaited<ReturnType<typeof fetchProductPricingApi>>>>({});
  const [dailyStatus, setDailyStatus] = React.useState<DailyPriceStatusResponse | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([fetchPriceListsForUi(), fetchDiscountPolicies()]).then(([lists, pols]) => {
      if (!cancelled) {
        setPriceLists(lists);
        setPolicies(pols);
      }
    }).catch(() => {});
    // Fetch recent batch cost data to show cost basis
    fetchBatchCostingReportApi({ margin: 30 })
      .then((data) => { if (!cancelled) setBatchCosts(data.items.slice(0, 6)); })
      .catch(() => {});
    fetchDailyPriceStatusApi()
      .then((s) => { if (!cancelled) setDailyStatus(s); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

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

  const productsWithPricing = React.useMemo(() => {
    return products.filter((p) => (pricingByProductId[p.id]?.length ?? 0) > 0);
  }, [products, pricingByProductId]);

  return (
    <PageShell>
      <PageHeader
        title="Pricing Overview"
        description="Price lists, products with pricing, discount policies. Multi-layer, UOM-aware."
        breadcrumbs={[{ label: "Pricing" }, { label: "Overview" }]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/pricing/price-lists">Price lists</Link>
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
        {/* Cost basis banner */}
        {batchCosts.length > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icons.Calculator className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-base">Cost basis — recent batches</CardTitle>
                    <CardDescription>Set selling prices above the cost/kg below to ensure profitability. Margin shown at 30%.</CardDescription>
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
                        <Link href={`/inventory/receipts/${row.grnId}`} className="text-primary hover:underline">
                          {row.grnNumber ?? row.grnId.slice(0, 8)}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.date ? new Date(row.date).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </TableCell>
                      <TableCell className="text-sm max-w-40 truncate" title={row.products}>{row.products || "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.receivedKg.toLocaleString("en-KE", { maximumFractionDigits: 1 })}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtKes(row.totalLandedCostKes)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtKes(row.costPerKgRaw)}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-green-700">{fmtKes(row.recommendedSellPricePerKg)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Daily pricing alert */}
        {dailyStatus && dailyStatus.totalListsNeedingUpdate > 0 && (
          <div className="flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-2.5 text-sm">
            <Icons.Clock className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-amber-800 dark:text-amber-300">
              <strong>{dailyStatus.totalListsNeedingUpdate} price list{dailyStatus.totalListsNeedingUpdate > 1 ? "s" : ""}</strong> haven't been updated today. Set today's prices before processing orders.
            </span>
            <Button variant="outline" size="sm" className="ml-auto shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100" asChild>
              <Link href="/pricing/price-lists">
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
                <Link href="/pricing/price-lists">Manage</Link>
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
          <Card className={dailyStatus && dailyStatus.totalListsNeedingUpdate > 0 ? "border-amber-200 dark:border-amber-800" : undefined}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Prices today</CardTitle>
            </CardHeader>
            <CardContent>
              {dailyStatus ? (
                dailyStatus.totalListsNeedingUpdate > 0 ? (
                  <>
                    <p className="text-2xl font-bold text-amber-600">{dailyStatus.totalListsNeedingUpdate}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">list{dailyStatus.totalListsNeedingUpdate > 1 ? "s" : ""} need update</p>
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
                <Link href="/pricing/price-lists">Set prices</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Price lists</CardTitle>
            <CardDescription>Currency, channel. Link to product pricing.</CardDescription>
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
                        <Link href={`/pricing/price-lists?list=${pl.id}`}>View</Link>
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
                      const listNames = pp.map((x) => priceLists.find((l) => l.id === x.priceListId)?.name ?? x.priceListId).join(", ");
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
