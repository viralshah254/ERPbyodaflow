"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getProductById, listPackaging, listProductPrices } from "@/lib/data/products.repo";
import { getMockPriceLists } from "@/lib/mock/products/price-lists";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { useCopilotStore } from "@/stores/copilot-store";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import * as Icons from "lucide-react";

export default function ProductDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const terminology = useTerminology();
  const openWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);

  const [vatCategory, setVatCategory] = React.useState<string>("standard");

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `odaflow_product_vat_${id}`;
    const raw = localStorage.getItem(key);
    if (raw && ["standard", "zero", "exempt"].includes(raw)) setVatCategory(raw);
  }, [id]);

  const saveVatCategory = (v: string) => {
    setVatCategory(v);
    if (typeof window !== "undefined") localStorage.setItem(`odaflow_product_vat_${id}`, v);
  };

  const product = React.useMemo(() => getProductById(id), [id]);
  const packaging = React.useMemo(() => (product ? listPackaging(product.id) : []), [product]);
  const prices = React.useMemo(() => (product ? listProductPrices(product.id) : []), [product]);
  const priceLists = React.useMemo(() => getMockPriceLists(), []);

  if (!product) {
    return (
      <PageShell>
        <PageHeader
          title="Product not found"
          breadcrumbs={[
            { label: "Masters", href: "/master" },
            { label: t("product", terminology) + "s", href: "/master/products" },
            { label: id },
          ]}
        />
        <div className="p-6">
          <p className="text-muted-foreground">Product not found.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/master/products">Back to list</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const baseUom = product.baseUom ?? product.unit ?? "—";

  return (
    <PageShell>
      <PageHeader
        title={`${product.sku} — ${product.name}`}
        description={`${product.category ?? "—"} · Base UOM: ${baseUom}`}
        breadcrumbs={[
          { label: "Masters", href: "/master" },
          { label: t("product", terminology) + "s", href: "/master/products" },
          { label: product.sku },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <ExplainThis
              prompt={`Explain product packaging and multi-pricing for ${product.sku}.`}
              label="Explain"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => openWithPrompt(`Generate pricing suggestions for ${product.sku} (${product.name}).`)}
            >
              <Icons.Sparkles className="mr-2 h-4 w-4" />
              Copilot
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/master/products/${id}/packaging`}>Packaging</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/master/products/${id}/pricing`}>Pricing</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/master/products/${id}/variants`}>Variants</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/master/products/${id}/attributes`}>Attributes</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/master/products">Back to list</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
            <CardDescription>Source of truth for packaging and pricing.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              <span className="text-muted-foreground">SKU:</span> {product.sku}
            </p>
            <p>
              <span className="text-muted-foreground">Name:</span> {product.name}
            </p>
            <p>
              <span className="text-muted-foreground">Category:</span> {product.category ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Base UOM:</span> {baseUom}
            </p>
            <p>
              <span className="text-muted-foreground">Status:</span>{" "}
              <Badge variant={product.status === "ACTIVE" ? "secondary" : "outline"}>{product.status}</Badge>
            </p>
            {product.currentStock != null && (
              <p>
                <span className="text-muted-foreground">Current stock:</span> {product.currentStock}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">VAT category</CardTitle>
            <CardDescription>Per-product VAT assignment for documents.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label>Category</Label>
            <Select value={vatCategory} onValueChange={saveVatCategory}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard (16%)</SelectItem>
                <SelectItem value="zero">Zero-rated</SelectItem>
                <SelectItem value="exempt">Exempt</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Packaging</CardTitle>
              <CardDescription>UOM conversions, barcode, dimensions, weight.</CardDescription>
            </CardHeader>
            <CardContent>
              {packaging.length === 0 ? (
                <p className="text-sm text-muted-foreground">No packaging defined.</p>
              ) : (
                <ul className="text-sm space-y-1">
                  {packaging.map((p) => (
                    <li key={p.uom}>
                      {p.uom}: {p.unitsPer} {p.baseUom}
                      {p.isDefaultSalesUom && " (default sales)"}
                      {p.isDefaultPurchaseUom && " (default purchase)"}
                      {p.barcode && ` · ${p.barcode}`}
                    </li>
                  ))}
                </ul>
              )}
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <Link href={`/master/products/${id}/packaging`}>Edit packaging</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pricing</CardTitle>
              <CardDescription>Tiered pricing per list. Validity dates.</CardDescription>
            </CardHeader>
            <CardContent>
              {prices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pricing defined.</p>
              ) : (
                <ul className="text-sm space-y-2">
                  {prices.map((pr) => {
                    const pl = priceLists.find((l) => l.id === pr.priceListId);
                    return (
                      <li key={pr.priceListId}>
                        <span className="font-medium">{pl?.name ?? pr.priceListId}</span>
                        {" · "}
                        {pr.tiers.length} tier(s)
                        {pr.startDate && ` · from ${pr.startDate}`}
                      </li>
                    );
                  })}
                </ul>
              )}
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <Link href={`/master/products/${id}/pricing`}>Edit pricing</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
