"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { fetchPriceListsForUi } from "@/lib/api/pricing";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { useCopilotStore } from "@/stores/copilot-store";
import { deleteProductApi, fetchProductApi } from "@/lib/api/products";
import { canDeleteEntity } from "@/lib/permissions";
import { t } from "@/lib/terminology";
import { useAuthStore } from "@/stores/auth-store";
import { useTerminology } from "@/stores/orgContextStore";
import {
  fetchProductVatCategoryApi,
  updateProductVatCategoryApi,
  type ProductVatCategory,
} from "@/lib/api/product-vat";
import { fetchProductPackagingApi, fetchProductPricingApi } from "@/lib/api/product-master";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const user = useAuthStore((s) => s.user);
  const canDelete = canDeleteEntity(user);
  const terminology = useTerminology();
  const openWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);
  const [vatCategory, setVatCategory] = React.useState<ProductVatCategory>("standard");
  const [deleting, setDeleting] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [product, setProduct] = React.useState<Awaited<ReturnType<typeof fetchProductApi>> | undefined>(undefined);
  const [packaging, setPackaging] = React.useState<Awaited<ReturnType<typeof fetchProductPackagingApi>>>([]);
  const [prices, setPrices] = React.useState<Awaited<ReturnType<typeof fetchProductPricingApi>>>([]);

  React.useEffect(() => {
    let cancelled = false;
    fetchProductVatCategoryApi(id)
      .then((value) => {
        if (!cancelled) setVatCategory(value);
      })
      .catch(() => {
        if (!cancelled) setVatCategory("standard");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const found = await fetchProductApi(id);
        if (!cancelled) setProduct(found);
      } catch (error) {
        if (!cancelled) {
          toast.error((error as Error).message);
          setProduct(null);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const saveVatCategory = async (v: string) => {
    const next = v as ProductVatCategory;
    setVatCategory(next);
    try {
      await updateProductVatCategoryApi(id, next);
      toast.success("Product VAT category updated.");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  React.useEffect(() => {
    if (!product) return;
    let cancelled = false;
    Promise.all([fetchProductPackagingApi(product.id), fetchProductPricingApi(product.id)])
      .then(([packagingRows, pricingRows]) => {
        if (cancelled) return;
        setPackaging(packagingRows);
        setPrices(pricingRows);
      })
      .catch((error) => {
        if (!cancelled) toast.error((error as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, [product]);

  const [priceLists, setPriceLists] = React.useState<Awaited<ReturnType<typeof fetchPriceListsForUi>>>([]);
  React.useEffect(() => {
    fetchPriceListsForUi().then(setPriceLists).catch(() => {});
  }, []);

  if (product === undefined) {
    return (
      <PageShell>
        <PageHeader
          title="Loading product"
          breadcrumbs={[
            { label: "Masters", href: "/master" },
            { label: t("product", terminology) + "s", href: "/master/products" },
            { label: id },
          ]}
        />
        <div className="p-6 text-sm text-muted-foreground">Loading...</div>
      </PageShell>
    );
  }

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
            {canDelete && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  <Icons.Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
                <ConfirmDialog
                  open={deleteConfirmOpen}
                  onOpenChange={setDeleteConfirmOpen}
                  title="Delete product?"
                  description="This will remove the product. This action cannot be undone."
                  confirmLabel="Delete"
                  cancelLabel="Cancel"
                  variant="destructive"
                  onConfirm={async () => {
                    setDeleting(true);
                    try {
                      await deleteProductApi(id);
                      toast.success("Product deleted.");
                      router.push("/master/products");
                    } catch (err) {
                      toast.error((err as Error).message);
                    } finally {
                      setDeleting(false);
                    }
                  }}
                />
              </>
            )}
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
