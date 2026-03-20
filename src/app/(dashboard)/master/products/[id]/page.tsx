"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { useCopilotStore } from "@/stores/copilot-store";
import {
  deleteProductApi,
  fetchProductApi,
  patchProductApi,
  applyProductPricingTemplateApi,
} from "@/lib/api/products";
import {
  fetchProductPackagingApi,
  saveProductPackagingApi,
  fetchProductPricingApi,
  saveProductPricingApi,
  fetchProductVariantsApi,
  createProductVariantApi,
  updateProductVariantApi,
  deleteProductVariantApi,
  fetchProductAttributeDefsApi,
  createProductAttributeDefApi,
  updateProductAttributeDefApi,
  deleteProductAttributeDefApi,
} from "@/lib/api/product-master";
import { fetchPriceListsForUi } from "@/lib/api/pricing";
import {
  fetchProductVatCategoryApi,
  updateProductVatCategoryApi,
  type ProductVatCategory,
} from "@/lib/api/product-vat";
import type { ProductPackaging, ProductPrice, PricingTier } from "@/lib/products/pricing-types";
import type { ProductVariant, ProductAttributeDef, VariantAttribute } from "@/lib/products/types";
import { validateProductPackaging } from "@/lib/products/validation";
import { validateTiers } from "@/lib/pricing/validation";
import { fetchProductUomsApi } from "@/lib/api/uom";
import { formatMoney } from "@/lib/money";
import { t } from "@/lib/terminology";
import { useAuthStore } from "@/stores/auth-store";
import { useTerminology } from "@/stores/orgContextStore";
import { toast } from "sonner";
import * as Icons from "lucide-react";

// ─── Product type helpers ────────────────────────────────────────────────────

type ProductType = "RAW" | "FINISHED" | "BOTH" | undefined;

function productTypeLabel(type: ProductType): string {
  if (type === "RAW") return "Purchased item";
  if (type === "FINISHED") return "Sellable item";
  return "Stock item";
}

function ProductTypeBadge({ type }: { type: ProductType }) {
  const label = productTypeLabel(type);
  const cls =
    type === "RAW"
      ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
      : type === "FINISHED"
      ? "border-green-500/30 bg-green-500/10 text-green-400"
      : "border-purple-500/30 bg-purple-500/10 text-purple-400";
  return (
    <Badge variant="outline" className={cls}>
      {label}
    </Badge>
  );
}

/** Whether a given section is relevant to this product type. */
function showSection(
  section: "purchase" | "sales" | "vat" | "variants",
  type: ProductType
): boolean {
  if (section === "purchase") return type !== "FINISHED";
  if (section === "sales") return type !== "RAW";
  if (section === "vat") return type !== "RAW";
  return true; // variants: always
}

function effectivePerBase(
  tier: PricingTier,
  packaging: { uom: string; unitsPer: number; baseUom: string }[]
): number | null {
  const p = packaging.find((x) => x.uom === tier.uom);
  if (!p || p.unitsPer <= 0) return null;
  return tier.price / p.unitsPer;
}

// ─── Cross-product helper for matrix generator ──────────────────────────────

function crossProduct(arrays: string[][]): string[][] {
  if (arrays.length === 0) return [[]];
  const [first, ...rest] = arrays;
  const restProduct = crossProduct(rest);
  return first.flatMap((v) => restProduct.map((row) => [v, ...row]));
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const permissions = useAuthStore((s) => s.permissions);
  const canDelete = permissions.includes("admin.settings");
  const terminology = useTerminology();
  const openWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);

  type ProductRow = Awaited<ReturnType<typeof fetchProductApi>>;
  const [product, setProduct] = React.useState<ProductRow | null | undefined>(undefined);
  const [vatCategory, setVatCategory] = React.useState<ProductVatCategory>("standard");
  const [deleting, setDeleting] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);

  // Packaging
  const [packaging, setPackaging] = React.useState<ProductPackaging[]>([]);
  const [packSheetOpen, setPackSheetOpen] = React.useState(false);
  const [editingPackIdx, setEditingPackIdx] = React.useState<number | null>(null);
  const [allowDecimals, setAllowDecimals] = React.useState(false);

  // Pricing
  const [priceLists, setPriceLists] = React.useState<Awaited<ReturnType<typeof fetchPriceListsForUi>>>([]);
  const [allPrices, setAllPrices] = React.useState<ProductPrice[]>([]);
  const [selectedListId, setSelectedListId] = React.useState("");
  const [draftTiers, setDraftTiers] = React.useState<PricingTier[]>([]);
  const [compareView, setCompareView] = React.useState(false);
  const [tierSheetOpen, setTierSheetOpen] = React.useState(false);
  const [editingTierIdx, setEditingTierIdx] = React.useState<number | null>(null);
  const [applyingTemplate, setApplyingTemplate] = React.useState(false);

  // Variants
  const [variants, setVariants] = React.useState<ProductVariant[]>([]);
  const [attributeDefs, setAttributeDefs] = React.useState<ProductAttributeDef[]>([]);
  const [variantSheetOpen, setVariantSheetOpen] = React.useState(false);
  const [editingVariant, setEditingVariant] = React.useState<ProductVariant | null>(null);
  const [attrSheetOpen, setAttrSheetOpen] = React.useState(false);
  const [editingAttr, setEditingAttr] = React.useState<ProductAttributeDef | null>(null);
  const [matrixSheetOpen, setMatrixSheetOpen] = React.useState(false);
  const [uomOptions, setUomOptions] = React.useState<string[]>(["EA", "KG", "L", "M", "PCS"]);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  // Load all data in parallel
  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchProductApi(id),
      fetchProductVatCategoryApi(id).catch((): ProductVatCategory => "standard"),
      fetchProductPackagingApi(id).catch(() => [] as ProductPackaging[]),
      fetchProductPricingApi(id).catch(() => [] as ProductPrice[]),
      fetchProductVariantsApi(id).catch(() => [] as ProductVariant[]),
      fetchProductAttributeDefsApi().catch(() => [] as ProductAttributeDef[]),
      fetchPriceListsForUi().catch(() => []),
    ]).then(([prod, vat, pack, prices, vars, attrs, lists]) => {
      if (cancelled) return;
      setProduct(prod);
      setVatCategory(vat);
      setPackaging(pack);
      setAllPrices(prices);
      setVariants(vars);
      setAttributeDefs(attrs);
      setPriceLists(lists);
    }).catch((err) => {
      if (!cancelled) {
        toast.error((err as Error).message);
        setProduct(null);
      }
    });
    return () => { cancelled = true; };
  }, [id]);

  React.useEffect(() => {
    fetchProductUomsApi()
      .then((list) => {
        const codes = list.map((u) => u.code);
        setUomOptions(codes.length > 0 ? codes : ["EA", "KG", "L", "M", "PCS"]);
      })
      .catch(() => setUomOptions(["EA", "KG", "L", "M", "PCS"]));
  }, []);

  // Sync draft tiers when price list changes
  const tiers = React.useMemo(
    () => allPrices.find((p) => p.priceListId === selectedListId)?.tiers ?? [],
    [allPrices, selectedListId]
  );
  React.useEffect(() => { setDraftTiers(tiers); }, [tiers, selectedListId]);
  React.useEffect(() => {
    if (priceLists.length && !selectedListId) setSelectedListId(priceLists[0].id);
  }, [priceLists, selectedListId]);

  const pl = priceLists.find((l) => l.id === selectedListId);
  const currency = pl?.currency ?? "KES";
  const baseUom = product?.baseUom ?? product?.unit ?? "EA";
  const tierValidation = React.useMemo(
    () => validateTiers(draftTiers, packaging, { unitCost: undefined }),
    [draftTiers, packaging]
  );
  const packValidation = React.useMemo(
    () => product
      ? validateProductPackaging(baseUom, packaging, { checkUomCatalog: true })
      : { ok: true, errors: [] as string[], warnings: [] as string[] },
    [product, baseUom, packaging]
  );

  const KINDS: ProductAttributeDef["kind"][] = ["size", "grade", "flavor", "packagingType", "spec", "custom"];
  const sortedDefs = React.useMemo(() => {
    const order = new Map<ProductAttributeDef["kind"], number>(KINDS.map((k, i) => [k, i]));
    return [...attributeDefs].sort((a, b) => {
      const ai = order.get(a.kind) ?? 999;
      const bi = order.get(b.kind) ?? 999;
      return ai !== bi ? ai - bi : a.name.localeCompare(b.name);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attributeDefs]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const saveVatCategory = async (v: string) => {
    const next = v as ProductVatCategory;
    setVatCategory(next);
    try {
      await updateProductVatCategoryApi(id, next);
      toast.success("VAT category updated.");
    } catch (err) { toast.error((err as Error).message); }
  };

  const patchType = async (v: string) => {
    const next = v === "__default__" ? "BOTH" : (v as "RAW" | "FINISHED" | "BOTH");
    try {
      await patchProductApi(id, { productType: next });
      setProduct((p) => (p ? { ...p, productType: next } : p));
      toast.success("Product type updated.");
    } catch (err) { toast.error((err as Error).message); }
  };

  const handleSaveTiers = () => {
    if (!product) return;
    const pp: ProductPrice = {
      productId: product.id,
      priceListId: selectedListId,
      tiers: draftTiers,
      startDate: allPrices.find((r) => r.priceListId === selectedListId)?.startDate,
      endDate: allPrices.find((r) => r.priceListId === selectedListId)?.endDate,
      notes: allPrices.find((r) => r.priceListId === selectedListId)?.notes,
    };
    void saveProductPricingApi(product.id, [pp])
      .then(() => {
        setAllPrices((prev) => {
          const rest = prev.filter((r) => !(r.productId === pp.productId && r.priceListId === pp.priceListId));
          return [...rest, pp];
        });
        toast.success("Pricing saved.");
      })
      .catch((err) => toast.error((err as Error).message));
    setTierSheetOpen(false);
    setEditingTierIdx(null);
  };

  const handleApplyTemplate = async () => {
    if (!product || !selectedListId) { toast.error("Select a price list first."); return; }
    setApplyingTemplate(true);
    try {
      await applyProductPricingTemplateApi(product.id, selectedListId);
      toast.success("Pricing template applied.");
    } catch (e) { toast.error((e as Error).message); }
    finally { setApplyingTemplate(false); }
  };

  const handleSavePackaging = async (p: ProductPackaging) => {
    const next = [...packaging];
    if (editingPackIdx != null && editingPackIdx >= 0) next[editingPackIdx] = p;
    else next.push(p);
    setPackaging(next);
    if (product) { try { await saveProductPackagingApi(product.id, next); toast.success("Packaging saved."); } catch (e) { toast.error((e as Error).message); } }
    setPackSheetOpen(false);
    setEditingPackIdx(null);
  };

  const handleRemovePackaging = async (idx: number) => {
    const next = packaging.filter((_, i) => i !== idx);
    setPackaging(next);
    if (product) { try { await saveProductPackagingApi(product.id, next); } catch (e) { toast.error((e as Error).message); } }
  };

  const handleSaveVariant = async (v: Omit<ProductVariant, "id" | "productId">) => {
    if (!product) return;
    try {
      if (editingVariant) await updateProductVariantApi(product.id, editingVariant.id, v);
      else await createProductVariantApi(product.id, v);
      setVariants(await fetchProductVariantsApi(product.id));
      setVariantSheetOpen(false);
      setEditingVariant(null);
      toast.success(editingVariant ? "Variant updated." : "Variant created.");
    } catch (err) { toast.error((err as Error).message); }
  };

  const handleRemoveVariant = async (variantId: string) => {
    if (!product) return;
    try {
      await deleteProductVariantApi(product.id, variantId);
      setVariants(await fetchProductVariantsApi(product.id));
    } catch (err) { toast.error((err as Error).message); }
  };

  const handleSaveAttr = async (d: Omit<ProductAttributeDef, "id">) => {
    try {
      if (editingAttr) await updateProductAttributeDefApi(editingAttr.id, d);
      else await createProductAttributeDefApi(d);
      setAttributeDefs(await fetchProductAttributeDefsApi());
      setAttrSheetOpen(false);
      setEditingAttr(null);
    } catch (err) { toast.error((err as Error).message); }
  };

  const handleRemoveAttr = async (defId: string) => {
    try {
      await deleteProductAttributeDefApi(defId);
      setAttributeDefs(await fetchProductAttributeDefsApi());
    } catch (err) { toast.error((err as Error).message); }
  };

  // ── Hydration guard: defer full render until client to avoid SSR mismatch ───
  if (!mounted) {
    return (
      <PageShell>
        <PageHeader
          title="Loading..."
          breadcrumbs={[
            { label: "Masters", href: "/master" },
            { label: "Products", href: "/master/products" },
            { label: "Loading..." },
          ]}
        />
        <div className="p-6 text-sm text-muted-foreground">Loading product...</div>
      </PageShell>
    );
  }

  // ── Loading / not found states ─────────────────────────────────────────────

  if (product === undefined) {
    return (
      <PageShell>
        <PageHeader
          title="Loading..."
          breadcrumbs={[
            { label: "Masters", href: "/master" },
            { label: t("product", terminology) + "s", href: "/master/products" },
            { label: "Loading..." },
          ]}
        />
        <div className="p-6 text-sm text-muted-foreground">Loading product...</div>
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
            { label: "Not found" },
          ]}
        />
        <div className="p-6">
          <p className="text-muted-foreground mb-4">Product not found.</p>
          <Button variant="outline" asChild>
            <Link href="/master/products">Back to list</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const productType = product.productType as ProductType;
  const editingPackagingRow = editingPackIdx != null ? packaging[editingPackIdx] ?? null : null;
  const editingTier = editingTierIdx != null ? draftTiers[editingTierIdx] ?? null : null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <PageShell>
      <PageHeader
        title={`${product.sku} — ${product.name}`}
        description={`${product.category ?? "—"} · Base UOM: ${baseUom}`}
        breadcrumbs={[
          { label: "Masters", href: "/master" },
          { label: t("product", terminology) + "s", href: "/master/products" },
          { label: product.name || product.sku },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <ProductTypeBadge type={productType} />
            <ExplainThis
              prompt={`Explain product ${product.sku} (${product.name}): type, packaging, pricing.`}
              label="Explain"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => openWithPrompt(`Suggest pricing and variant strategy for ${product.sku} (${product.name}).`)}
            >
              <Icons.Sparkles className="mr-2 h-4 w-4" />
              Copilot
            </Button>
            {canDelete && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={deleting}
                >
                  <Icons.Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
                <ConfirmDialog
                  open={deleteConfirmOpen}
                  onOpenChange={setDeleteConfirmOpen}
                  title="Delete product?"
                  description="This will remove the product permanently. This action cannot be undone."
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
                    } finally { setDeleting(false); }
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

      <div className="p-6">
        <Tabs defaultValue="overview">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">
              <Icons.Info className="mr-2 h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="pricing">
              <Icons.Tag className="mr-2 h-4 w-4" />
              Pricing
            </TabsTrigger>
            <TabsTrigger value="packaging">
              <Icons.Package className="mr-2 h-4 w-4" />
              Packaging / UOM
            </TabsTrigger>
            <TabsTrigger value="variants">
              <Icons.Layers className="mr-2 h-4 w-4" />
              Variants
              {variants.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                  {variants.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Overview Tab ──────────────────────────────────────────────── */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Core details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Product details</CardTitle>
                  <CardDescription>Identity, category, and base unit.</CardDescription>
                </CardHeader>
                <CardContent className="text-sm space-y-3">
                  <div className="grid grid-cols-[120px_1fr] gap-y-2">
                    <span className="text-muted-foreground">SKU</span>
                    <span className="font-mono font-medium">{product.sku}</span>
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{product.name}</span>
                    <span className="text-muted-foreground">Category</span>
                    <span>{product.category ?? "—"}</span>
                    <span className="text-muted-foreground">Base UOM</span>
                    <span>{baseUom}</span>
                    <span className="text-muted-foreground">Status</span>
                    <span>
                      <Badge variant={product.status === "ACTIVE" ? "secondary" : "outline"}>
                        {product.status}
                      </Badge>
                    </span>
                    {product.currentStock != null && (
                      <>
                        <span className="text-muted-foreground">Current stock</span>
                        <span>{product.currentStock}</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Product type + conditional fields */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Classification</CardTitle>
                  <CardDescription>
                    Determines which flows this product appears in.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Product type</Label>
                    <Select
                      value={product.productType ?? "__default__"}
                      onValueChange={patchType}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RAW">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-blue-400" />
                            Purchased item — appears on purchase orders
                          </span>
                        </SelectItem>
                        <SelectItem value="FINISHED">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-green-400" />
                            Sellable item — appears on sales orders
                          </span>
                        </SelectItem>
                        <SelectItem value="__default__">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-purple-400" />
                            Stock item — buy and sell
                          </span>
                        </SelectItem>
                        <SelectItem value="BOTH">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-purple-400" />
                            Stock item (both)
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {productType === "RAW"
                        ? "Only shows on purchase orders and supplier invoices."
                        : productType === "FINISHED"
                        ? "Only shows on sales orders and customer invoices."
                        : "Shows on both purchase and sales documents."}
                    </p>
                  </div>

                  {/* VAT — only relevant for sellable/both */}
                  {showSection("vat", productType) && (
                    <div className="space-y-2">
                      <Label>VAT category</Label>
                      <Select value={vatCategory} onValueChange={saveVatCategory}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard (16%)</SelectItem>
                          <SelectItem value="zero">Zero-rated</SelectItem>
                          <SelectItem value="exempt">Exempt</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Packaging + Pricing previews */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-base">Packaging / UOM</CardTitle>
                    <CardDescription className="text-xs">UOM conversions defined.</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => { setEditingPackIdx(null); setPackSheetOpen(true); }}
                  >
                    <Icons.Plus className="mr-1 h-3.5 w-3.5" />
                    Add UOM
                  </Button>
                </CardHeader>
                <CardContent>
                  {packaging.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No UOM conversions yet.</p>
                  ) : (
                    <ul className="text-sm space-y-1">
                      {packaging.map((p) => (
                        <li key={p.uom} className="flex items-center gap-2">
                          <span className="font-mono font-medium">{p.uom}</span>
                          <span className="text-muted-foreground">= {p.unitsPer} {p.baseUom}</span>
                          {p.isDefaultSalesUom && <Badge variant="outline" className="text-[10px] px-1 py-0">default sales</Badge>}
                          {p.isDefaultPurchaseUom && <Badge variant="outline" className="text-[10px] px-1 py-0">default purchase</Badge>}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-base">Pricing</CardTitle>
                    <CardDescription className="text-xs">Price lists configured.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  {allPrices.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No pricing configured yet.</p>
                  ) : (
                    <ul className="text-sm space-y-1">
                      {allPrices.map((pr) => {
                        const list = priceLists.find((l) => l.id === pr.priceListId);
                        return (
                          <li key={pr.priceListId} className="flex items-center gap-2">
                            <span className="font-medium">{list?.name ?? pr.priceListId}</span>
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              {pr.tiers.length} tier{pr.tiers.length !== 1 ? "s" : ""}
                            </Badge>
                            {pr.startDate && (
                              <span className="text-muted-foreground text-xs">from {pr.startDate}</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Pricing Tab ───────────────────────────────────────────────── */}
          <TabsContent value="pricing" className="space-y-4">
            {/* Context banner */}
            <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-4 py-3">
              <ProductTypeBadge type={productType} />
              <p className="text-sm text-muted-foreground">
                {!showSection("purchase", productType)
                  ? "Sellable item — configure customer-facing sales price lists below."
                  : !showSection("sales", productType)
                  ? "Purchased item — configure cost / purchase price lists below."
                  : "Stock item — configure both purchase cost and sales price lists below."}
              </p>
              <div className="ml-auto flex gap-2">
                <ExplainThis prompt="Explain tiered pricing and effective unit price." label="Explain" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openWithPrompt(`Suggest pricing tiers for ${product.sku}. Detect margin issues.`)}
                >
                  <Icons.Sparkles className="mr-2 h-4 w-4" />
                  Copilot
                </Button>
                <Button variant="outline" size="sm" disabled={applyingTemplate} onClick={handleApplyTemplate}>
                  Apply template
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/analytics/simulations">Simulate</Link>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCompareView(!compareView)}>
                  {compareView ? "Tiers" : "Compare lists"}
                </Button>
              </div>
            </div>

            {/* Price list selector */}
            <div className="flex items-center gap-4">
              <div className="space-y-1 w-64">
                <Label>Price list</Label>
                <Select value={selectedListId} onValueChange={setSelectedListId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select price list" />
                  </SelectTrigger>
                  <SelectContent>
                    {priceLists.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name} ({l.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tier validation warnings */}
            {[...tierValidation.errors, ...tierValidation.warnings].length > 0 && (
              <Card className="border-amber-500/50 bg-amber-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Validations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm list-disc list-inside space-y-1">
                    {[...tierValidation.errors, ...tierValidation.warnings].map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {compareView ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Compare price lists</CardTitle>
                  <CardDescription>Effective per {baseUom} across all price lists.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>List</TableHead>
                        <TableHead>Currency</TableHead>
                        <TableHead>Channel</TableHead>
                        <TableHead>Min price / {baseUom}</TableHead>
                        <TableHead>Tiers</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {priceLists.map((l) => {
                        const pp = allPrices.find((r) => r.priceListId === l.id);
                        const trs = pp?.tiers ?? [];
                        const minEff = trs.length
                          ? Math.min(...trs.map((t) => effectivePerBase(t, packaging)).filter((n): n is number => n != null))
                          : null;
                        return (
                          <TableRow key={l.id}>
                            <TableCell className="font-medium">{l.name}</TableCell>
                            <TableCell>{l.currency}</TableCell>
                            <TableCell className="text-muted-foreground">{l.channel ?? "—"}</TableCell>
                            <TableCell>{minEff != null ? formatMoney(minEff, l.currency) : "—"}</TableCell>
                            <TableCell>{trs.length}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Tiers — {pl?.name ?? (selectedListId || "no list selected")}
                  </CardTitle>
                  <CardDescription>Min / max qty, UOM, price. Effective per base unit.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {draftTiers.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      No tiers. Add one below.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Min qty</TableHead>
                          <TableHead>Max qty</TableHead>
                          <TableHead>UOM</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Effective / {baseUom}</TableHead>
                          <TableHead className="w-[100px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {draftTiers.map((tier, i) => {
                          const eff = effectivePerBase(tier, packaging);
                          return (
                            <TableRow key={i}>
                              <TableCell>{tier.minQty}</TableCell>
                              <TableCell>{tier.maxQty ?? "∞"}</TableCell>
                              <TableCell>{tier.uom}</TableCell>
                              <TableCell className="font-medium">{formatMoney(tier.price, currency)}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {eff != null ? formatMoney(eff, currency) : "—"}
                              </TableCell>
                              <TableCell className="space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => { setEditingTierIdx(i); setTierSheetOpen(true); }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDraftTiers((prev) => prev.filter((_, j) => j !== i))}
                                >
                                  Remove
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                  <div className="p-4 border-t flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setEditingTierIdx(null); setTierSheetOpen(true); }}
                    >
                      <Icons.Plus className="mr-2 h-4 w-4" />
                      Add tier
                    </Button>
                    <Button size="sm" onClick={handleSaveTiers} disabled={!selectedListId}>
                      Save tiers
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Packaging / UOM Tab ───────────────────────────────────────── */}
          <TabsContent value="packaging" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">UOM conversions</h3>
                <p className="text-xs text-muted-foreground">
                  Base UOM: <span className="font-mono font-medium">{baseUom}</span>. Define conversions for cartons, bundles, etc.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="decimals"
                    checked={allowDecimals}
                    onCheckedChange={(c) => setAllowDecimals(c === true)}
                  />
                  <Label htmlFor="decimals" className="text-xs">Allow decimals</Label>
                </div>
                <Button
                  size="sm"
                  onClick={() => { setEditingPackIdx(null); setPackSheetOpen(true); }}
                >
                  <Icons.Plus className="mr-2 h-4 w-4" />
                  Add UOM
                </Button>
              </div>
            </div>

            {(packValidation.errors.length > 0 || packValidation.warnings.length > 0) && (
              <Card className={packValidation.errors.length > 0 ? "border-destructive/50 bg-destructive/5" : "border-amber-500/50 bg-amber-500/5"}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{packValidation.errors.length > 0 ? "Validation errors" : "Warnings"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm list-disc list-inside space-y-1">
                    {packValidation.errors.map((e, i) => <li key={`e-${i}`} className="text-destructive">{e}</li>)}
                    {packValidation.warnings.map((w, i) => <li key={`w-${i}`}>{w}</li>)}
                  </ul>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-0">
                {packaging.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    No packaging configured. Add UOM conversions above.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>UOM</TableHead>
                        <TableHead>Units per</TableHead>
                        <TableHead>Base UOM</TableHead>
                        <TableHead>Default sales</TableHead>
                        <TableHead>Default purchase</TableHead>
                        <TableHead>Barcode</TableHead>
                        <TableHead>Dimensions / Weight</TableHead>
                        <TableHead className="w-[80px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {packaging.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono font-medium">{p.uom}</TableCell>
                          <TableCell>{p.unitsPer}</TableCell>
                          <TableCell>{p.baseUom}</TableCell>
                          <TableCell>{p.isDefaultSalesUom ? "Yes" : "—"}</TableCell>
                          <TableCell>{p.isDefaultPurchaseUom ? "Yes" : "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{p.barcode ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {p.dimensions && `${p.dimensions.l}×${p.dimensions.w}×${p.dimensions.h} ${p.dimensions.unit}`}
                            {p.weight && ` · ${p.weight.value}${p.weight.unit}`}
                            {!p.dimensions && !p.weight && "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setEditingPackIdx(i); setPackSheetOpen(true); }}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemovePackaging(i)}
                              >
                                Remove
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Variants Tab ──────────────────────────────────────────────── */}
          <TabsContent value="variants" className="space-y-6">
            {/* Option types (attribute defs) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base">Option types</CardTitle>
                  <CardDescription>
                    Define the options available for variants (e.g. Size: 1kg, 5kg; Grade: A, B).
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {sortedDefs.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setMatrixSheetOpen(true)}
                    >
                      <Icons.LayoutGrid className="mr-2 h-4 w-4" />
                      Generate variants
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => { setEditingAttr(null); setAttrSheetOpen(true); }}
                  >
                    <Icons.Plus className="mr-2 h-4 w-4" />
                    Add option type
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {sortedDefs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No option types defined yet. Add a Size, Grade, or Flavor option type to start creating variants.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {sortedDefs.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center gap-3 rounded-md border bg-muted/20 px-3 py-2"
                      >
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {d.kind}
                        </Badge>
                        <span className="text-sm font-medium">{d.name}</span>
                        <div className="flex flex-wrap gap-1 flex-1">
                          {d.options.map((opt) => (
                            <Badge key={opt} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {opt}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setEditingAttr(d); setAttrSheetOpen(true); }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleRemoveAttr(d.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Variants list */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base">Variants</CardTitle>
                  <CardDescription>
                    Each variant has a unique SKU. {variants.length} variant{variants.length !== 1 ? "s" : ""} defined.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => openWithPrompt(`Suggest variants for ${product.sku} (${product.name}).`)}
                    variant="outline"
                  >
                    <Icons.Sparkles className="mr-2 h-4 w-4" />
                    Copilot
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => { setEditingVariant(null); setVariantSheetOpen(true); }}
                  >
                    <Icons.Plus className="mr-2 h-4 w-4" />
                    Add variant
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Attributes</TableHead>
                      <TableHead>Barcode</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-32" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variants.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No variants yet. {sortedDefs.length > 0 ? 'Click "Generate variants" to create combinations.' : 'Add option types above, then generate variants.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      variants.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-mono font-medium">{v.sku}</TableCell>
                          <TableCell>{v.name ?? "—"}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {v.attributes.length > 0
                                ? v.attributes.map((a) => (
                                    <Badge
                                      key={`${v.id}-${a.key}`}
                                      variant="outline"
                                      className="text-[10px] px-1.5 py-0"
                                    >
                                      {a.key}: {a.value}
                                    </Badge>
                                  ))
                                : <span className="text-muted-foreground text-xs">—</span>
                              }
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground font-mono text-xs">{v.barcode ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant={v.status === "ACTIVE" ? "secondary" : "outline"}>
                              {v.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setEditingVariant(v); setVariantSheetOpen(true); }}
                            >
                              Edit
                            </Button>
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() => handleRemoveVariant(v.id)}
                              >
                                Remove
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Pricing tier sheet ─────────────────────────────────────────────── */}
      <TierSheet
        open={tierSheetOpen}
        onOpenChange={setTierSheetOpen}
        packaging={packaging}
        currency={currency}
        baseUom={baseUom}
        initial={editingTier}
        uomOptions={uomOptions}
        isEdit={editingTierIdx != null}
        onAdd={(tier) => { setDraftTiers((prev) => [...prev, tier]); setTierSheetOpen(false); setEditingTierIdx(null); }}
        onUpdate={(tier) => {
          if (editingTierIdx == null) return;
          setDraftTiers((prev) => { const n = [...prev]; n[editingTierIdx] = tier; return n; });
          setTierSheetOpen(false);
          setEditingTierIdx(null);
        }}
        onCancel={() => { setTierSheetOpen(false); setEditingTierIdx(null); }}
      />

      {/* ── Packaging sheet ────────────────────────────────────────────────── */}
      <PackagingSheet
        open={packSheetOpen}
        onOpenChange={setPackSheetOpen}
        baseUom={baseUom}
        allowDecimals={allowDecimals}
        uomOptions={uomOptions}
        initial={editingPackagingRow}
        onSave={handleSavePackaging}
        onCancel={() => { setPackSheetOpen(false); setEditingPackIdx(null); }}
      />

      {/* ── Variant sheet ──────────────────────────────────────────────────── */}
      {variantSheetOpen && (
        <VariantSheet
          initial={editingVariant}
          attributeDefs={attributeDefs}
          baseSku={product.sku}
          productName={product.name}
          packaging={packaging}
          existingVariants={variants}
          onSave={handleSaveVariant}
          onClose={() => { setVariantSheetOpen(false); setEditingVariant(null); }}
        />
      )}

      {/* ── Attribute def sheet ────────────────────────────────────────────── */}
      {attrSheetOpen && (
        <AttributeDefSheet
          initial={editingAttr}
          kinds={KINDS}
          onSave={handleSaveAttr}
          onClose={() => { setAttrSheetOpen(false); setEditingAttr(null); }}
        />
      )}

      {/* ── Matrix generator sheet ─────────────────────────────────────────── */}
      {matrixSheetOpen && product && (
        <MatrixGeneratorSheet
          product={product}
          attributeDefs={sortedDefs}
          existingVariantSkus={variants.map((v) => v.sku)}
          onGenerated={async () => {
            setVariants(await fetchProductVariantsApi(product.id));
            setMatrixSheetOpen(false);
          }}
          onClose={() => setMatrixSheetOpen(false)}
        />
      )}
    </PageShell>
  );
}

// ─── Tier Sheet ──────────────────────────────────────────────────────────────

function TierSheet({
  open,
  onOpenChange,
  packaging,
  currency,
  baseUom,
  uomOptions,
  initial,
  isEdit,
  onAdd,
  onUpdate,
  onCancel,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  packaging: { uom: string; unitsPer: number; baseUom: string }[];
  currency: string;
  baseUom: string;
  uomOptions: string[];
  initial: PricingTier | null;
  isEdit: boolean;
  onAdd: (t: PricingTier) => void;
  onUpdate: (t: PricingTier) => void;
  onCancel: () => void;
}) {
  const [minQty, setMinQty] = React.useState(initial?.minQty ?? 1);
  const [maxQty, setMaxQty] = React.useState<string>(
    initial?.maxQty != null ? String(initial.maxQty) : ""
  );
  const [uom, setUom] = React.useState(initial?.uom ?? "EA");
  const [price, setPrice] = React.useState(initial?.price ?? 0);

  React.useEffect(() => {
    if (!open) return;
    setMinQty(initial?.minQty ?? 1);
    setMaxQty(initial?.maxQty != null ? String(initial.maxQty) : "");
    setUom(initial?.uom ?? "EA");
    setPrice(initial?.price ?? 0);
  }, [open, initial]);

  const p = packaging.find((x) => x.uom === uom);
  const eff = p && p.unitsPer > 0 ? price / p.unitsPer : null;

  const handleSubmit = () => {
    const tier: PricingTier = {
      minQty,
      maxQty: maxQty === "" ? undefined : Number(maxQty),
      uom,
      price,
    };
    if (isEdit) onUpdate(tier);
    else onAdd(tier);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit tier" : "Add tier"}</SheetTitle>
          <SheetDescription>Min/max qty, UOM, price. Effective per {baseUom}.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Min qty</Label>
            <Input
              type="number"
              min={0}
              value={minQty}
              onChange={(e) => setMinQty(Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label>Max qty (optional)</Label>
            <Input
              type="number"
              min={0}
              placeholder="∞"
              value={maxQty}
              onChange={(e) => setMaxQty(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>UOM</Label>
            <Select value={uom} onValueChange={setUom}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {uomOptions.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Price ({currency})</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value) || 0)}
            />
          </div>
          {eff != null && (
            <p className="text-sm text-muted-foreground">
              Effective per {baseUom}: <span className="font-medium">{formatMoney(eff, currency)}</span>
            </p>
          )}
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSubmit}>{isEdit ? "Update" : "Add"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ─── Packaging Sheet ─────────────────────────────────────────────────────────

function PackagingSheet({
  open,
  onOpenChange,
  baseUom,
  allowDecimals,
  uomOptions,
  initial,
  onSave,
  onCancel,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  baseUom: string;
  allowDecimals: boolean;
  uomOptions: string[];
  initial: ProductPackaging | null;
  onSave: (p: ProductPackaging) => void;
  onCancel: () => void;
}) {
  const [uom, setUom] = React.useState(initial?.uom ?? "EA");
  const [unitsPer, setUnitsPer] = React.useState<number | string>(initial?.unitsPer ?? 1);
  const [barcode, setBarcode] = React.useState(initial?.barcode ?? "");
  const [defSales, setDefSales] = React.useState(!!initial?.isDefaultSalesUom);
  const [defPurchase, setDefPurchase] = React.useState(!!initial?.isDefaultPurchaseUom);
  const [dimL, setDimL] = React.useState<string>(initial?.dimensions?.l != null ? String(initial.dimensions.l) : "");
  const [dimW, setDimW] = React.useState<string>(initial?.dimensions?.w != null ? String(initial.dimensions.w) : "");
  const [dimH, setDimH] = React.useState<string>(initial?.dimensions?.h != null ? String(initial.dimensions.h) : "");
  const [dimUnit, setDimUnit] = React.useState<"cm" | "in">(initial?.dimensions?.unit ?? "cm");
  const [weightVal, setWeightVal] = React.useState<string>(initial?.weight?.value != null ? String(initial.weight.value) : "");
  const [weightUnit, setWeightUnit] = React.useState<"kg" | "g">(initial?.weight?.unit ?? "kg");

  React.useEffect(() => {
    if (!open) return;
    setUom(initial?.uom ?? "EA");
    setUnitsPer(initial?.unitsPer ?? 1);
    setBarcode(initial?.barcode ?? "");
    setDefSales(!!initial?.isDefaultSalesUom);
    setDefPurchase(!!initial?.isDefaultPurchaseUom);
    setDimL(initial?.dimensions?.l != null ? String(initial.dimensions.l) : "");
    setDimW(initial?.dimensions?.w != null ? String(initial.dimensions.w) : "");
    setDimH(initial?.dimensions?.h != null ? String(initial.dimensions.h) : "");
    setDimUnit(initial?.dimensions?.unit ?? "cm");
    setWeightVal(initial?.weight?.value != null ? String(initial.weight.value) : "");
    setWeightUnit(initial?.weight?.unit ?? "kg");
  }, [open, initial]);

  const handleSubmit = () => {
    const p: ProductPackaging = {
      uom,
      unitsPer: Number(unitsPer) || 1,
      baseUom,
      barcode: barcode.trim() || undefined,
      isDefaultSalesUom: defSales,
      isDefaultPurchaseUom: defPurchase,
    };
    if (dimL !== "" || dimW !== "" || dimH !== "") {
      p.dimensions = { l: Number(dimL) || 0, w: Number(dimW) || 0, h: Number(dimH) || 0, unit: dimUnit };
    }
    if (weightVal !== "") {
      p.weight = { value: Number(weightVal) || 0, unit: weightUnit };
    }
    onSave(p);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{initial ? "Edit UOM" : "Add UOM"}</SheetTitle>
          <SheetDescription>Conversion to base UOM ({baseUom}), barcode, dimensions.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>UOM</Label>
            <Select value={uom} onValueChange={setUom}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {uomOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Units per (base: {baseUom})</Label>
            <Input
              type="number"
              min={0}
              step={allowDecimals ? 0.01 : 1}
              value={unitsPer}
              onChange={(e) => setUnitsPer(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Barcode (optional)</Label>
            <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Optional" />
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Checkbox id="ds" checked={defSales} onCheckedChange={(c) => setDefSales(c === true)} />
              <Label htmlFor="ds" className="text-sm">Default sales UOM</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="dp" checked={defPurchase} onCheckedChange={(c) => setDefPurchase(c === true)} />
              <Label htmlFor="dp" className="text-sm">Default purchase UOM</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Dimensions L × W × H (optional)</Label>
            <div className="flex gap-2">
              <Input type="number" placeholder="L" value={dimL} onChange={(e) => setDimL(e.target.value)} />
              <Input type="number" placeholder="W" value={dimW} onChange={(e) => setDimW(e.target.value)} />
              <Input type="number" placeholder="H" value={dimH} onChange={(e) => setDimH(e.target.value)} />
              <Select value={dimUnit} onValueChange={(v) => setDimUnit(v as "cm" | "in")}>
                <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cm">cm</SelectItem>
                  <SelectItem value="in">in</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Weight (optional)</Label>
            <div className="flex gap-2">
              <Input type="number" placeholder="Value" value={weightVal} onChange={(e) => setWeightVal(e.target.value)} />
              <Select value={weightUnit} onValueChange={(v) => setWeightUnit(v as "kg" | "g")}>
                <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="g">g</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSubmit}>Save</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ─── Variant Sheet ───────────────────────────────────────────────────────────

function VariantSheet({
  initial,
  attributeDefs,
  baseSku,
  productName,
  packaging,
  existingVariants,
  onSave,
  onClose,
}: {
  initial: ProductVariant | null;
  attributeDefs: ProductAttributeDef[];
  baseSku: string;
  productName: string;
  packaging: ProductPackaging[];
  existingVariants: ProductVariant[];
  onSave: (v: Omit<ProductVariant, "id" | "productId">) => void;
  onClose: () => void;
}) {
  const [sku, setSku] = React.useState(initial?.sku ?? "");
  const [name, setName] = React.useState(initial?.name ?? "");
  const [size, setSize] = React.useState(initial?.size ?? "");
  const [packagingType, setPackagingType] = React.useState(initial?.packagingType ?? "");
  const [grade, setGrade] = React.useState(initial?.grade ?? "");
  const [barcode, setBarcode] = React.useState(initial?.barcode ?? "");
  const [status, setStatus] = React.useState<"ACTIVE" | "INACTIVE">(initial?.status ?? "ACTIVE");
  const [skuEdited, setSkuEdited] = React.useState(!!initial);

  const sizeOpts = attributeDefs.find((a) => a.kind === "size")?.options ?? [];
  const gradeOpts = attributeDefs.find((a) => a.kind === "grade")?.options ?? [];

  // Merge UOM codes from packaging + attribute def options for packaging type
  const uomAsPackaging = packaging.map((p) => p.uom);
  const attrPackOpts = attributeDefs.find((a) => a.kind === "packagingType")?.options ?? [];
  const packOpts = [...new Set([...uomAsPackaging, ...attrPackOpts])];

  // Other variants for uniqueness checks (excluding current when editing)
  const otherVariants = existingVariants.filter((v) => !initial || v.id !== initial.id);
  const otherSkus = otherVariants.map((v) => v.sku);

  // Auto-suggest SKU on mount (new only) and reactive to packagingType / size changes
  React.useEffect(() => {
    if (skuEdited) return;
    const n = existingVariants.length + 1;
    if (packagingType && size) {
      setSku(`${baseSku}-${packagingType.replace(/\s+/g, "").toUpperCase().slice(0, 6)}-${size.replace(/\s+/g, "").toUpperCase().slice(0, 6)}`);
    } else if (packagingType) {
      setSku(`${baseSku}-${packagingType.replace(/\s+/g, "").toUpperCase().slice(0, 8)}`);
    } else if (size) {
      setSku(`${baseSku}-${size.replace(/\s+/g, "").toUpperCase().slice(0, 8)}`);
    } else {
      setSku(`${baseSku}-V${n}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packagingType, size]);

  // Auto-fill barcode from packaging UOM when packagingType is selected
  React.useEffect(() => {
    if (initial?.barcode) return; // don't override when editing
    const matchedPack = packaging.find((p) => p.uom === packagingType);
    if (matchedPack?.barcode) setBarcode(matchedPack.barcode);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packagingType]);

  // Auto-populate display name when name is empty and attributes are set
  React.useEffect(() => {
    if (name || initial?.name) return;
    const parts = [productName, size, packagingType].filter(Boolean);
    if (parts.length > 1) setName(parts.join(" "));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, packagingType]);

  // Duplicate SKU check (case-insensitive, exclude current when editing)
  const skuConflict = !initial && sku.trim().length > 0
    && otherSkus.some((s) => s.toLowerCase() === sku.trim().toLowerCase());

  // Combination uniqueness fingerprint
  const fingerprint = [size, packagingType, grade].filter(Boolean).join("|");
  const comboDuplicate = fingerprint.length > 0 && otherVariants.some((v) => {
    const fp = [v.size ?? "", v.packagingType ?? "", v.grade ?? ""].filter(Boolean).join("|");
    return fp === fingerprint;
  });

  const handleSave = () => {
    const attrs: VariantAttribute[] = [];
    if (size) attrs.push({ key: "size", value: size });
    if (packagingType) attrs.push({ key: "packagingType", value: packagingType });
    if (grade) attrs.push({ key: "grade", value: grade });
    const packUom = packaging.find((p) => p.uom === packagingType);
    onSave({
      sku: sku.trim(),
      name: name.trim() || undefined,
      attributes: attrs,
      size: size || undefined,
      packagingType: packagingType || undefined,
      packagingUomCode: packUom?.uom ?? (packagingType || undefined),
      grade: grade || undefined,
      barcode: barcode.trim() || undefined,
      status,
    });
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{initial ? "Edit variant" : "Add variant"}</SheetTitle>
          <SheetDescription>SKU, size, packaging type, grade.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-6">
          {/* SKU */}
          <div className="space-y-2">
            <Label>SKU</Label>
            <Input
              value={sku}
              onChange={(e) => { setSku(e.target.value); setSkuEdited(true); }}
              placeholder={`${baseSku}-V1`}
              disabled={!!initial}
              className={skuConflict ? "border-destructive" : ""}
            />
            {!!initial && <p className="text-xs text-muted-foreground">SKU cannot be changed after creation.</p>}
            {skuConflict && (
              <p className="text-xs text-destructive">This SKU already exists on another variant.</p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label>Name (optional)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" />
          </div>

          {/* Size */}
          <div className="space-y-2">
            <Label>Size</Label>
            {sizeOpts.length > 0 ? (
              <Select value={size || "_"} onValueChange={(v) => setSize(v === "_" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_">—</SelectItem>
                  {sizeOpts.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g. 1kg" />
            )}
          </div>

          {/* Packaging type — always a dropdown, driven by UOM conversions */}
          <div className="space-y-2">
            <Label>Packaging type</Label>
            {packOpts.length > 0 ? (
              <Select value={packagingType || "_"} onValueChange={(v) => setPackagingType(v === "_" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select packaging" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_">—</SelectItem>
                  {packOpts.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-1">
                <p className="text-xs text-amber-500 flex items-center gap-1">
                  <Icons.AlertTriangle className="h-3 w-3 shrink-0" />
                  No packaging configured.{" "}
                  <button
                    type="button"
                    className="underline"
                    onClick={onClose}
                  >
                    Add UOM conversions first →
                  </button>
                </p>
                <Input value={packagingType} onChange={(e) => setPackagingType(e.target.value)} placeholder="e.g. bag, carton" />
              </div>
            )}
          </div>

          {/* Grade */}
          <div className="space-y-2">
            <Label>Grade</Label>
            {gradeOpts.length > 0 ? (
              <Select value={grade || "_"} onValueChange={(v) => setGrade(v === "_" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_">—</SelectItem>
                  {gradeOpts.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="e.g. A, B, Premium" />
            )}
          </div>

          {/* Barcode */}
          <div className="space-y-2">
            <Label>Barcode (optional)</Label>
            <Input
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Auto-filled from packaging UOM"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">Auto-filled when packaging type matches a configured UOM barcode.</p>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as "ACTIVE" | "INACTIVE")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Combination uniqueness warning (non-blocking) */}
          {comboDuplicate && (
            <div className="rounded-md border border-amber-500/50 bg-amber-500/5 px-3 py-2 text-xs text-amber-600 flex items-start gap-2">
              <Icons.AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              Another variant has the same size + packaging type + grade combination. Consider adjusting to keep combinations distinct.
            </div>
          )}
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!sku.trim() || skuConflict}>Save</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ─── Attribute Def Sheet ─────────────────────────────────────────────────────

function AttributeDefSheet({
  initial,
  kinds,
  onSave,
  onClose,
}: {
  initial: ProductAttributeDef | null;
  kinds: ProductAttributeDef["kind"][];
  onSave: (d: Omit<ProductAttributeDef, "id">) => void;
  onClose: () => void;
}) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [kind, setKind] = React.useState<ProductAttributeDef["kind"]>(initial?.kind ?? "custom");
  const [optionsText, setOptionsText] = React.useState(initial?.options?.join(", ") ?? "");

  const handleSave = () => {
    const options = optionsText.split(",").map((s) => s.trim()).filter(Boolean);
    onSave({ name: name.trim(), kind, options });
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{initial ? "Edit option type" : "Add option type"}</SheetTitle>
          <SheetDescription>Define a variant attribute with its allowed values.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-6">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Size" />
          </div>
          <div className="space-y-2">
            <Label>Kind</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as ProductAttributeDef["kind"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {kinds.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Options</Label>
            <Input
              value={optionsText}
              onChange={(e) => setOptionsText(e.target.value)}
              placeholder="1kg, 5kg, 25kg"
            />
            <p className="text-xs text-muted-foreground">Comma-separated. These appear as choices when adding variants.</p>
          </div>
          {optionsText && (
            <div className="flex flex-wrap gap-1">
              {optionsText.split(",").map((s) => s.trim()).filter(Boolean).map((opt) => (
                <Badge key={opt} variant="secondary" className="text-xs">{opt}</Badge>
              ))}
            </div>
          )}
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>Save</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ─── Matrix Generator Sheet ──────────────────────────────────────────────────

type MatrixRow = {
  selected: boolean;
  sku: string;
  attributes: VariantAttribute[];
};

function MatrixGeneratorSheet({
  product,
  attributeDefs,
  existingVariantSkus,
  onGenerated,
  onClose,
}: {
  product: NonNullable<Awaited<ReturnType<typeof fetchProductApi>>>;
  attributeDefs: ProductAttributeDef[];
  existingVariantSkus: string[];
  onGenerated: () => Promise<void>;
  onClose: () => void;
}) {
  // Which defs to include in matrix
  const [selectedDefIds, setSelectedDefIds] = React.useState<Set<string>>(
    new Set(attributeDefs.filter((d) => d.options.length > 0).map((d) => d.id))
  );
  const [generating, setGenerating] = React.useState(false);

  const activeDefs = attributeDefs.filter(
    (d) => selectedDefIds.has(d.id) && d.options.length > 0
  );

  // Build matrix combinations
  const combinations = React.useMemo<MatrixRow[]>(() => {
    if (activeDefs.length === 0) return [];
    const optionArrays = activeDefs.map((d) => d.options);
    const combos = crossProduct(optionArrays);
    return combos.map((combo) => {
      const attrs: VariantAttribute[] = combo.map((value, i) => ({
        key: activeDefs[i].kind,
        value,
      }));
      const suffix = combo.map((v) => v.replace(/\s+/g, "").toUpperCase().slice(0, 5)).join("-");
      const sku = `${product.sku}-${suffix}`;
      const alreadyExists = existingVariantSkus.some((s) => s.toLowerCase() === sku.toLowerCase());
      return { selected: !alreadyExists, sku, attributes: attrs };
    });
  }, [activeDefs, product.sku, existingVariantSkus]);

  const [rows, setRows] = React.useState<MatrixRow[]>(combinations);
  React.useEffect(() => { setRows(combinations); }, [combinations]);

  const selectedRows = rows.filter((r) => r.selected);

  const handleGenerate = async () => {
    if (selectedRows.length === 0) { toast.error("Select at least one combination."); return; }
    setGenerating(true);
    let created = 0;
    let skipped = 0;
    for (const row of selectedRows) {
      if (existingVariantSkus.some((s) => s.toLowerCase() === row.sku.toLowerCase())) {
        skipped++;
        continue;
      }
      try {
        const attrMap: Record<string, string> = {};
        row.attributes.forEach((a) => { attrMap[a.key] = a.value; });
        await createProductVariantApi(product.id, {
          sku: row.sku,
          attributes: row.attributes,
          size: attrMap["size"],
          packagingType: attrMap["packagingType"],
          grade: attrMap["grade"],
          status: "ACTIVE",
        });
        created++;
      } catch {
        skipped++;
      }
    }
    toast.success(`Created ${created} variant${created !== 1 ? "s" : ""}${skipped > 0 ? `. ${skipped} skipped.` : "."}`);
    setGenerating(false);
    await onGenerated();
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Generate variants</SheetTitle>
          <SheetDescription>
            Select which option types to combine. The system will generate all combinations.
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-6">
          {/* Option type toggles */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Include option types</Label>
            <div className="space-y-2">
              {attributeDefs.filter((d) => d.options.length > 0).map((d) => (
                <div key={d.id} className="flex items-center gap-3 rounded-md border px-3 py-2">
                  <Checkbox
                    id={`def-${d.id}`}
                    checked={selectedDefIds.has(d.id)}
                    onCheckedChange={(c) => {
                      setSelectedDefIds((prev) => {
                        const next = new Set(prev);
                        if (c === true) next.add(d.id);
                        else next.delete(d.id);
                        return next;
                      });
                    }}
                  />
                  <Label htmlFor={`def-${d.id}`} className="flex-1 cursor-pointer">
                    <span className="font-medium">{d.name}</span>
                    <span className="ml-2 text-muted-foreground text-xs">
                      {d.options.join(", ")}
                    </span>
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Combination preview */}
          {rows.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">
                  Combinations ({selectedRows.length} / {rows.length} selected)
                </Label>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => setRows((r) => r.map((row) => ({ ...row, selected: true })))}
                  >
                    Select all
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => setRows((r) => r.map((row) => ({ ...row, selected: false })))}
                  >
                    Deselect all
                  </Button>
                </div>
              </div>
              <div className="rounded-md border divide-y max-h-80 overflow-y-auto">
                {rows.map((row, i) => {
                  const alreadyExists = existingVariantSkus.some(
                    (s) => s.toLowerCase() === row.sku.toLowerCase()
                  );
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-3 px-3 py-2 text-sm ${alreadyExists ? "opacity-50" : ""}`}
                    >
                      <Checkbox
                        checked={row.selected && !alreadyExists}
                        disabled={alreadyExists}
                        onCheckedChange={(c) => {
                          setRows((prev) => prev.map((r, j) => j === i ? { ...r, selected: c === true } : r));
                        }}
                      />
                      <div className="flex-1 flex items-center gap-2 flex-wrap">
                        <Input
                          className="h-7 w-48 font-mono text-xs"
                          value={row.sku}
                          onChange={(e) => {
                            setRows((prev) => prev.map((r, j) => j === i ? { ...r, sku: e.target.value } : r));
                          }}
                          disabled={alreadyExists}
                        />
                        {row.attributes.map((a) => (
                          <Badge key={a.key} variant="outline" className="text-[10px] px-1.5">
                            {a.key}: {a.value}
                          </Badge>
                        ))}
                        {alreadyExists && (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            already exists
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select at least one option type with values to see combinations.
            </p>
          )}
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleGenerate}
            disabled={generating || selectedRows.length === 0}
          >
            {generating ? "Generating..." : `Generate ${selectedRows.length} variant${selectedRows.length !== 1 ? "s" : ""}`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
