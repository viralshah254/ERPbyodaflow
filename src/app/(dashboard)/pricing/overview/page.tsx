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
import { listPriceLists, listDiscountPolicies } from "@/lib/data/pricing.repo";
import { listProducts } from "@/lib/data/products.repo";
import { listProductPrices } from "@/lib/data/products.repo";
import { formatMoney } from "@/lib/money";
import * as Icons from "lucide-react";

export default function PricingOverviewPage() {
  const priceLists = React.useMemo(() => listPriceLists(), []);
  const policies = React.useMemo(() => listDiscountPolicies(), []);
  const products = React.useMemo(() => listProducts(), []);

  const productsWithPricing = React.useMemo(() => {
    return products.filter((p) => {
      const pp = listProductPrices(p.id);
      return pp.length > 0;
    });
  }, [products]);

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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Simulate</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" asChild>
                <Link href="/analytics/simulations">Pricing what-if</Link>
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
                      const pp = listProductPrices(p.id);
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
