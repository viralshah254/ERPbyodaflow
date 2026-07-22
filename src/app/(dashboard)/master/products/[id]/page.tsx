"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useCopilotFeatureEnabled } from "@/lib/copilot-feature";
import {
  deleteProductApi,
  fetchProductApi,
  patchProductApi,
  applyProductPricingTemplateApi,
  fetchProductFamiliesApi,
  type ProductPatchPayload,
} from "@/lib/api/products";
import {
  fetchProductCategoriesApi,
  createProductCategoryApi,
  normalizeCategoryCode,
  updateProductCategoryApi,
  deleteProductCategoryApi,
} from "@/lib/api/product-categories";
import { Combobox } from "@/components/ui/combobox";
import { fetchFinancialTaxesApi } from "@/lib/api/financial-taxes";
import type { TaxRow } from "@/lib/types/taxes";
import { FmcgProductPacksEditor } from "@/components/products/FmcgProductPacksEditor";
import {
  fetchProductPackagingDetailApi,
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
import { fetchPriceListsApi, fetchPriceListsForUi } from "@/lib/api/pricing";
import {
  fetchProductVatCategoryApi,
  updateProductVatCategoryApi,
  type ProductVatCategory,
} from "@/lib/api/product-vat";
import type { ProductPackaging, ProductPrice, PricingTier } from "@/lib/products/pricing-types";
import type { ProductVariant, ProductAttributeDef, VariantAttribute } from "@/lib/products/types";
import { validateProductPackaging } from "@/lib/products/validation";
import { validateTiers } from "@/lib/pricing/validation";
import { createUomApi, fetchProductUomsApi } from "@/lib/api/uom";

/** Common sell packs for FMCG manufacturers — select or create if missing. */
const FMCG_PACK_PRESETS = ["CARTON", "OUTER", "BALE", "BOX", "PACK", "DOZEN"] as const;
import { formatMoney } from "@/lib/money";
import { t } from "@/lib/terminology";
import { useCanWriteInventory } from "@/lib/rbac/use-write-guard";
import { useAuthStore } from "@/stores/auth-store";
import { useOrgContextStore, useTerminology } from "@/stores/orgContextStore";
import { isSeafoodOrg } from "@/config/industry";
import { isFmcgOrg } from "@/lib/fmcg/sfa-customer";
import {
  composeFmcgSize,
  FMCG_SIZE_UOMS,
  parseFmcgSize,
} from "@/lib/products/fmcg-size";
import { ProductTypeBadge } from "@/components/products/ProductTypeBadge";
import { toast } from "sonner";
import * as Icons from "lucide-react";

type ProductType = "RAW" | "FINISHED" | "BOTH" | undefined;

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
  const searchParams = useSearchParams();
  const id = params.id as string;
  const tabParam = (searchParams.get("tab") ?? "").trim().toLowerCase();
  const initialTab =
    tabParam === "packaging" || tabParam === "packs"
      ? "packaging"
      : tabParam === "pricing"
        ? "pricing"
        : tabParam === "variants"
          ? "variants"
          : "overview";
  const [activeTab, setActiveTab] = React.useState(initialTab);
  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  const permissions = useAuthStore((s) => s.permissions);
  const canDelete = permissions.includes("admin.settings");
  const canWrite = useCanWriteInventory();
  const terminology = useTerminology();
  const templateId = useOrgContextStore((s) => s.templateId);
  const industryCategory = useOrgContextStore((s) => s.industryCategory);
  const seafoodOrg = isSeafoodOrg(templateId, industryCategory);
  const fmcgOrg = isFmcgOrg(templateId) || industryCategory === "FMCG";
  const copilotEnabled = useCopilotFeatureEnabled();
  const openWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);

  type ProductRow = Awaited<ReturnType<typeof fetchProductApi>>;
  const [product, setProduct] = React.useState<ProductRow | null | undefined>(undefined);
  const [vatCategory, setVatCategory] = React.useState<ProductVatCategory>("standard");
  const [taxCodes, setTaxCodes] = React.useState<TaxRow[]>([]);
  const [defaultTaxCodeId, setDefaultTaxCodeId] = React.useState<string>("");
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
  /** FMCG: price tags that include this SKU (piece price). */
  const [fmcgTagPrices, setFmcgTagPrices] = React.useState<
    Array<{ id: string; name: string; currency: string; price: number; discountPercent?: number }>
  >([]);
  const [fmcgTagPricesLoading, setFmcgTagPricesLoading] = React.useState(false);

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
  const [nameDraft, setNameDraft] = React.useState("");
  const [barcodeDraft, setBarcodeDraft] = React.useState("");
  const [descriptionDraft, setDescriptionDraft] = React.useState("");
  const [productFamilyDraft, setProductFamilyDraft] = React.useState("");
  const [productTypeDraft, setProductTypeDraft] = React.useState("");
  const [baseUomDraft, setBaseUomDraft] = React.useState("");
  const [categoryDraft, setCategoryDraft] = React.useState("");
  const [sizeValueDraft, setSizeValueDraft] = React.useState("");
  const [sizeUomDraft, setSizeUomDraft] = React.useState("g");
  const [categoryList, setCategoryList] = React.useState<{ id: string; name: string }[]>([]);
  const [familyOptions, setFamilyOptions] = React.useState<string[]>([]);
  const [savingAll, setSavingAll] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (product === undefined) return;
    if (product === null) {
      setNameDraft("");
      setBarcodeDraft("");
      setDescriptionDraft("");
      setProductFamilyDraft("");
      setProductTypeDraft("");
      setBaseUomDraft("");
      setCategoryDraft("");
      setSizeValueDraft("");
      setSizeUomDraft("g");
      return;
    }
    setNameDraft(product.name ?? "");
    setBarcodeDraft(product.barcode ?? "");
    setDescriptionDraft(product.description ?? "");
    setProductFamilyDraft(product.productFamily ?? "");
    setProductTypeDraft(product.productType ?? "");
    setBaseUomDraft(product.baseUom ?? product.unit ?? "");
    setCategoryDraft(product.category ?? "");
    const parsed = parseFmcgSize(product.size);
    setSizeValueDraft(parsed.value);
    setSizeUomDraft(parsed.uom);
  }, [product]);

  // Load all data in parallel
  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchProductApi(id),
      fetchProductVatCategoryApi(id).catch((): ProductVatCategory => "standard"),
      fetchProductPackagingDetailApi(id).catch(() => ({
        items: [] as ProductPackaging[],
        hasProductOverride: false,
        defaults: [] as ProductPackaging[],
        source: "defaults" as const,
      })),
      fetchProductPricingApi(id).catch(() => [] as ProductPrice[]),
      fetchProductVariantsApi(id).catch(() => [] as ProductVariant[]),
      fetchProductAttributeDefsApi().catch(() => [] as ProductAttributeDef[]),
      fetchPriceListsForUi().catch(() => []),
      fetchFinancialTaxesApi().catch(() => [] as TaxRow[]),
    ]).then(([prod, vat, packDetail, prices, vars, attrs, lists, taxes]) => {
      if (cancelled) return;
      setProduct(prod);
      setVatCategory(vat);
      const effectivePack =
        packDetail.hasProductOverride
          ? packDetail.items
          : packDetail.defaults.length > 0
            ? packDetail.defaults
            : packDetail.items;
      setPackaging(effectivePack);
      setAllPrices(prices);
      setVariants(vars);
      setAttributeDefs(attrs);
      setPriceLists(lists);
      setTaxCodes(taxes);
      setDefaultTaxCodeId((prod as (typeof prod & { defaultTaxCodeId?: string }) | null)?.defaultTaxCodeId ?? "");
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

  const loadCategories = React.useCallback(async () => {
    try {
      const list = await fetchProductCategoriesApi();
      setCategoryList(list.filter((c) => c.isActive).map((c) => ({ id: c.id, name: c.name })));
    } catch {
      setCategoryList([]);
    }
  }, []);

  React.useEffect(() => { void loadCategories(); }, [loadCategories]);
  React.useEffect(() => {
    fetchProductFamiliesApi()
      .then(setFamilyOptions)
      .catch(() => setFamilyOptions([]));
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

  React.useEffect(() => {
    if (!fmcgOrg || !id) {
      setFmcgTagPrices([]);
      return;
    }
    let cancelled = false;
    setFmcgTagPricesLoading(true);
    fetchPriceListsApi()
      .then((lists) => {
        if (cancelled) return;
        const rows = lists
          .map((list) => {
            const item = (list.items ?? []).find((i) => i.productId === id);
            if (!item || item.price == null || !Number.isFinite(Number(item.price))) return null;
            return {
              id: list.id,
              name: list.name,
              currency: list.currency ?? "KES",
              price: Number(item.price),
              discountPercent: item.discountPercent,
            };
          })
          .filter((r): r is NonNullable<typeof r> => r != null)
          .sort((a, b) => a.name.localeCompare(b.name));
        setFmcgTagPrices(rows);
      })
      .catch(() => {
        if (!cancelled) setFmcgTagPrices([]);
      })
      .finally(() => {
        if (!cancelled) setFmcgTagPricesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fmcgOrg, id]);

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

  const existingVariantSkus = React.useMemo(() => variants.map((v) => v.sku), [variants]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const saveVatCategory = async (v: string) => {
    const next = v as ProductVatCategory;
    setVatCategory(next);
    try {
      await updateProductVatCategoryApi(id, next);
      toast.success("VAT category updated.");
    } catch (err) { toast.error((err as Error).message); }
  };

  const overviewDirty = React.useMemo(() => {
    if (!product) return false;
    const nameChanged = nameDraft.trim() !== (product.name ?? "");
    const barcodeChanged = (barcodeDraft.trim() || "") !== (product.barcode ?? "");
    const familyChanged =
      !fmcgOrg && (productFamilyDraft.trim() || "") !== (product.productFamily ?? "");
    const notesChanged = descriptionDraft !== (product.description ?? "");
    const typeChanged = Boolean(productTypeDraft) && productTypeDraft !== (product.productType ?? "");
    const taxChanged = (defaultTaxCodeId || "") !== (product.defaultTaxCodeId ?? "");
    const uomChanged =
      !fmcgOrg && Boolean(baseUomDraft) && baseUomDraft !== (product.baseUom ?? product.unit ?? "");
    const categoryChanged = (categoryDraft || "") !== (product.category ?? "");
    const sizeChanged =
      fmcgOrg &&
      (composeFmcgSize(sizeValueDraft, sizeUomDraft) ?? "") !== (product.size ?? "");
    return (
      nameChanged ||
      barcodeChanged ||
      familyChanged ||
      notesChanged ||
      typeChanged ||
      taxChanged ||
      uomChanged ||
      categoryChanged ||
      sizeChanged
    );
  }, [
    product,
    fmcgOrg,
    nameDraft,
    barcodeDraft,
    productFamilyDraft,
    descriptionDraft,
    sizeValueDraft,
    sizeUomDraft,
    productTypeDraft,
    defaultTaxCodeId,
    baseUomDraft,
    categoryDraft,
  ]);

  /** Single CTA: commit every editable Overview field in one PATCH. */
  const saveAllOverview = async () => {
    if (!product) return;
    const nameNext = nameDraft.trim();
    if (!nameNext) {
      toast.error("Name cannot be empty.");
      return;
    }
    const patch: ProductPatchPayload = {};
    if (nameNext !== (product.name ?? "")) patch.name = nameNext;
    const barcodeNext = barcodeDraft.trim() || undefined;
    if ((barcodeNext ?? "") !== (product.barcode ?? "")) patch.barcode = barcodeNext ?? "";
    if (!fmcgOrg) {
      const familyNext = productFamilyDraft.trim() || undefined;
      if ((familyNext ?? "") !== (product.productFamily ?? "")) patch.productFamily = familyNext;
      const uomNext = baseUomDraft.trim();
      if (uomNext && uomNext !== (product.baseUom ?? product.unit ?? "")) patch.baseUom = uomNext;
    }
    const notesNext = descriptionDraft.trim() || undefined;
    if (descriptionDraft !== (product.description ?? "")) patch.description = notesNext;
    const typeNext = (productTypeDraft || undefined) as "RAW" | "FINISHED" | "BOTH" | undefined;
    if (typeNext && typeNext !== (product.productType ?? "")) patch.productType = typeNext;
    const taxNext = defaultTaxCodeId || undefined;
    if ((taxNext ?? "") !== (product.defaultTaxCodeId ?? "")) patch.defaultTaxCodeId = taxNext;
    const categoryNext = categoryDraft || undefined;
    if ((categoryNext ?? "") !== (product.category ?? "")) patch.category = categoryNext;
    if (fmcgOrg) {
      const sizeNext = composeFmcgSize(sizeValueDraft, sizeUomDraft) ?? "";
      if (sizeNext !== (product.size ?? "")) patch.size = sizeNext;
    }

    if (Object.keys(patch).length === 0) return;
    setSavingAll(true);
    try {
      await patchProductApi(id, patch);
      // Keep derived display fields (unit, categoryName) in sync with the saved values.
      const merged: Record<string, unknown> = { ...patch };
      if (patch.baseUom !== undefined) merged.unit = patch.baseUom;
      if (patch.category !== undefined) {
        merged.categoryName = categoryList.find((c) => c.id === patch.category)?.name;
      }
      setProduct((p) => (p ? { ...p, ...merged } : p));
      toast.success("Changes saved.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingAll(false);
    }
  };

  const createCategory = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = categoryList.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      setCategoryDraft(existing.id);
      return;
    }
    try {
      const code =
        normalizeCategoryCode(trimmed.replace(/\s+/g, "-"), 20) ||
        `CAT-${Date.now().toString().slice(-4)}`;
      const { id: newId } = await createProductCategoryApi({ code, name: trimmed });
      setCategoryList((prev) =>
        [...prev, { id: newId, name: trimmed }].sort((a, b) => a.name.localeCompare(b.name))
      );
      setCategoryDraft(newId);
      toast.success(`Category “${trimmed}” created.`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const renameCategory = async (catId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await updateProductCategoryApi(catId, { name: trimmed });
      setCategoryList((prev) =>
        prev.map((c) => (c.id === catId ? { ...c, name: trimmed } : c)).sort((a, b) => a.name.localeCompare(b.name))
      );
      setProduct((p) => (p && p.category === catId ? { ...p, categoryName: trimmed } : p));
      toast.success("Category renamed.");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const deleteCategory = async (catId: string) => {
    try {
      const { detachedProducts } = await deleteProductCategoryApi(catId);
      setCategoryList((prev) => prev.filter((c) => c.id !== catId));
      if (categoryDraft === catId) setCategoryDraft("");
      setProduct((p) =>
        p && p.category === catId ? { ...p, category: "", categoryName: undefined } : p
      );
      toast.success(
        detachedProducts > 0
          ? `Category deleted · removed from ${detachedProducts} product${detachedProducts === 1 ? "" : "s"}.`
          : "Category deleted."
      );
    } catch (err) {
      toast.error((err as Error).message);
    }
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
    if (product) {
      try {
        await saveProductPackagingApi(product.id, next);
        toast.success(fmcgOrg ? "Pack saved." : "Packaging saved.");
      } catch (e) {
        toast.error((e as Error).message);
      }
    }
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

  const loadingView = (
    <PageShell>
      <PageHeader
        title="Loading…"
        breadcrumbs={[
          { label: "Masters", href: "/master" },
          { label: t("product", terminology) + "s", href: "/master/products" },
          { label: "Loading…" },
        ]}
      />
      <div className="p-6 space-y-6">
        {/* Tabs row */}
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-32 rounded-md" />
          ))}
        </div>
        {/* Two detail cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-6 space-y-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
              <div className="space-y-3 pt-2">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="grid grid-cols-[110px_1fr] items-center gap-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {/* Two preview cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-6 space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );

  // ── Hydration guard: defer full render until client to avoid SSR mismatch ───
  if (!mounted) {
    return loadingView;
  }

  // ── Loading / not found states ─────────────────────────────────────────────

  if (product === undefined) {
    return loadingView;
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
        description={
          fmcgOrg
            ? [
                product.categoryName,
                product.size?.trim() || composeFmcgSize(sizeValueDraft, sizeUomDraft),
                product.barcode,
              ]
                .filter(Boolean)
                .join(" · ") || undefined
            : `${product.categoryName ? `${product.categoryName} · ` : ""}Base UOM: ${baseUom}`
        }
        breadcrumbs={[
          { label: "Masters", href: "/master" },
          { label: t("product", terminology) + "s", href: "/master/products" },
          { label: product.name || product.sku },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <ProductTypeBadge type={productType} whenUnset="stock" />
            {canWrite && (
              <Button
                type="button"
                size="sm"
                onClick={() => void saveAllOverview()}
                disabled={!overviewDirty || savingAll}
              >
                <Icons.Save className="mr-2 h-4 w-4" />
                {savingAll ? "Saving…" : "Save changes"}
              </Button>
            )}
            <ExplainThis
              prompt={`Explain product ${product.sku} (${product.name}): type, packaging, pricing.`}
              label="Explain"
            />
            {copilotEnabled ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => openWithPrompt(`Suggest pricing and variant strategy for ${product.sku} (${product.name}).`)}
              >
                <Icons.Sparkles className="mr-2 h-4 w-4" />
                Copilot
              </Button>
            ) : null}
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
        <Tabs value={activeTab} onValueChange={setActiveTab}>
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
              {fmcgOrg ? "Packs" : "Packaging / UOM"}
            </TabsTrigger>
            {!fmcgOrg ? (
              <TabsTrigger value="variants">
                <Icons.Layers className="mr-2 h-4 w-4" />
                Variants
                {variants.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                    {variants.length}
                  </Badge>
                )}
              </TabsTrigger>
            ) : null}
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
                    <span className="text-muted-foreground align-top pt-1.5">Barcode</span>
                    <div className="min-w-0">
                      <Input
                        id="product-barcode"
                        value={barcodeDraft}
                        onChange={(e) => setBarcodeDraft(e.target.value)}
                        placeholder="EAN / UPC"
                        className="font-mono"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void saveAllOverview();
                          }
                        }}
                      />
                    </div>
                    <span className="text-muted-foreground align-top pt-1.5">Name</span>
                    <div className="min-w-0">
                      <Input
                        id="product-name"
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        placeholder="Product display name"
                        className="font-medium"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void saveAllOverview();
                          }
                        }}
                      />
                    </div>
                    {seafoodOrg ? (
                      <>
                        <span className="text-muted-foreground align-top pt-1.5">Product family</span>
                        <div className="min-w-0">
                          <Combobox
                            value={productFamilyDraft}
                            onChange={setProductFamilyDraft}
                            options={familyOptions.map((f) => ({ value: f, label: f }))}
                            placeholder="Select or create a family"
                            searchPlaceholder="Search or type a new family…"
                            emptyMessage="No families yet — type to create one."
                            onCreate={(label) => {
                              setProductFamilyDraft(label);
                              setFamilyOptions((prev) =>
                                prev.includes(label) ? prev : [...prev, label].sort((a, b) => a.localeCompare(b))
                              );
                            }}
                          />
                        </div>
                      </>
                    ) : null}
                    {fmcgOrg ? (
                      <>
                        <span className="text-muted-foreground align-top pt-1.5">Size</span>
                        <div className="min-w-0 grid grid-cols-[1fr_7rem] gap-2">
                          <Input
                            inputMode="decimal"
                            placeholder="e.g. 50 or 100"
                            value={sizeValueDraft}
                            onChange={(e) => setSizeValueDraft(e.target.value)}
                          />
                          <Select value={sizeUomDraft} onValueChange={setSizeUomDraft}>
                            <SelectTrigger>
                              <SelectValue placeholder="UOM" />
                            </SelectTrigger>
                            <SelectContent>
                              {FMCG_SIZE_UOMS.map((u) => (
                                <SelectItem key={u} value={u}>
                                  {u}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    ) : null}
                    <span className="text-muted-foreground align-top pt-1.5">Category</span>
                    <div className="min-w-0">
                      <Combobox
                        value={categoryDraft}
                        onChange={setCategoryDraft}
                        options={categoryList.map((c) => ({ value: c.id, label: c.name }))}
                        placeholder="Select a category"
                        searchPlaceholder="Search or create a category…"
                        emptyMessage="No categories yet."
                        onCreate={createCategory}
                        onRename={renameCategory}
                        onDelete={deleteCategory}
                        deleteHint={() =>
                          "Any products using it will have their category cleared. This can’t be undone."
                        }
                      />
                    </div>
                    {!fmcgOrg ? (
                      <>
                        <span className="text-muted-foreground align-top pt-1.5">Base UOM</span>
                        <div className="min-w-0">
                          <Combobox
                            value={baseUomDraft}
                            onChange={setBaseUomDraft}
                            options={[
                              ...new Set([...(baseUomDraft ? [baseUomDraft] : []), ...uomOptions]),
                            ].map((u) => ({ value: u, label: u }))}
                            placeholder="Select unit"
                            searchPlaceholder="Search units…"
                            emptyMessage="No units."
                          />
                        </div>
                      </>
                    ) : null}
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
                  <div className="space-y-2 pt-2 border-t border-border">
                    <Label htmlFor="product-notes">Notes</Label>
                    <Textarea
                      id="product-notes"
                      value={descriptionDraft}
                      onChange={(e) => setDescriptionDraft(e.target.value)}
                      placeholder="Internal notes about this product…"
                      rows={3}
                      className="resize-y min-h-[72px]"
                    />
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
                      value={productTypeDraft || "__default__"}
                      onValueChange={(v) =>
                        setProductTypeDraft(v === "__default__" ? "BOTH" : v)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RAW">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-blue-400" />
                            Purchased product — appears on purchase orders
                          </span>
                        </SelectItem>
                        <SelectItem value="FINISHED">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-green-400" />
                            Finished product — appears on sales orders
                          </span>
                        </SelectItem>
                        <SelectItem value="__default__">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-purple-400" />
                            Stock product — buy and sell
                          </span>
                        </SelectItem>
                        <SelectItem value="BOTH">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-purple-400" />
                            Stock product (explicit)
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {productTypeDraft === "RAW"
                        ? "Only shows on purchase orders and supplier invoices."
                        : productTypeDraft === "FINISHED"
                        ? "Only shows on sales orders and customer invoices."
                        : "Shows on both purchase and sales documents."}
                    </p>
                  </div>

                  {/* Default tax code — applies to all document lines when this product is selected */}
                  <div className="space-y-2">
                    <Label>Default tax code</Label>
                    <Select
                      value={defaultTaxCodeId || "__none__"}
                      onValueChange={(v) => setDefaultTaxCodeId(v === "__none__" ? "" : v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {taxCodes.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.code} — {t.name} ({t.rate}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Auto-applied when this product is added to a sales or purchase document line.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Packaging + Pricing previews */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-base">{fmcgOrg ? "Sell packs" : "Packaging / UOM"}</CardTitle>
                    <CardDescription className="text-xs">
                      {fmcgOrg
                        ? "Inherited from manufacturer packs — toggle off or edit pieces per product."
                        : "UOM conversions defined."}
                    </CardDescription>
                  </div>
                  {!fmcgOrg ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => { setEditingPackIdx(null); setPackSheetOpen(true); }}
                    >
                      <Icons.Plus className="mr-1 h-3.5 w-3.5" />
                      Add UOM
                    </Button>
                  ) : null}
                </CardHeader>
                <CardContent>
                  {fmcgOrg ? (
                    packaging.length === 0 ? (
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>
                          No packs yet. Open the Packs tab and set pieces per carton/bale/outer for this
                          product — there is no company-wide default.
                        </p>
                      </div>
                    ) : (
                      <ul className="text-sm space-y-2">
                        {packaging.map((p) => (
                          <li
                            key={p.uom}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-2 py-1.5"
                          >
                            <span className="font-mono font-medium">{p.uom}</span>
                            <span className="text-muted-foreground">= {p.unitsPer} pieces</span>
                          </li>
                        ))}
                        <li className="pt-1">
                          <p className="text-xs text-muted-foreground">
                            Edit on the Packs tab. Required before converting sales orders that use these packs.
                          </p>
                        </li>
                      </ul>
                    )
                  ) : packaging.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No UOM conversions yet.</p>
                  ) : (
                    <ul className="text-sm space-y-2">
                      {packaging.map((p, i) => (
                        <li key={p.uom} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-2 py-1.5">
                          <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <span className="font-mono font-medium">{p.uom}</span>
                            <span className="text-muted-foreground">
                              = {p.unitsPer} {p.baseUom}
                            </span>
                            {p.isDefaultSalesUom && <Badge variant="outline" className="text-[10px] px-1 py-0">default sales</Badge>}
                            {p.isDefaultPurchaseUom && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">default purchase</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                setEditingPackIdx(i);
                                setPackSheetOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-destructive hover:text-destructive"
                              onClick={() => void handleRemovePackaging(i)}
                            >
                              Remove
                            </Button>
                          </div>
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
                    <CardDescription className="text-xs">
                      {fmcgOrg ? "Piece prices by price tag." : "Price lists configured."}
                    </CardDescription>
                  </div>
                  {fmcgOrg ? (
                    <Button variant="ghost" size="sm" className="text-xs" asChild>
                      <Link href="/pricing/workspace/lists">Price tags</Link>
                    </Button>
                  ) : null}
                </CardHeader>
                <CardContent>
                  {fmcgOrg ? (
                    fmcgTagPricesLoading ? (
                      <p className="text-sm text-muted-foreground">Loading…</p>
                    ) : fmcgTagPrices.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Not on any price tag yet. Set piece prices under Pricing → Price tags.
                      </p>
                    ) : (
                      <ul className="text-sm space-y-1">
                        {fmcgTagPrices.map((row) => (
                          <li key={row.id} className="flex items-center gap-2">
                            <span className="font-medium">{row.name}</span>
                            <span className="text-muted-foreground">
                              {formatMoney(row.price, row.currency)} / piece
                            </span>
                          </li>
                        ))}
                      </ul>
                    )
                  ) : allPrices.length === 0 ? (
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
            {fmcgOrg ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 px-4 py-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium text-foreground">Prices live on price tags</p>
                    <p className="text-sm text-muted-foreground">
                      Customers get a tag (e.g. Naivas). Each tag has a piece price for this product —
                      not qty tiers on the product itself.
                    </p>
                  </div>
                  <Button asChild>
                    <Link href="/pricing/workspace/lists">
                      <Icons.Tags className="mr-2 h-4 w-4" />
                      Open price tags
                    </Link>
                  </Button>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">This product on price tags</CardTitle>
                    <CardDescription>
                      Piece price by tag. Edit prices in Pricing → Price tags.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {fmcgTagPricesLoading ? (
                      <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
                    ) : fmcgTagPrices.length === 0 ? (
                      <div className="p-8 text-center space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Not priced on any tag yet. Open Price tags, pick a tag, and set the piece price.
                        </p>
                        <Button variant="outline" size="sm" asChild>
                          <Link href="/pricing/workspace/lists">Go to price tags</Link>
                        </Button>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Price tag</TableHead>
                            <TableHead>Price / piece</TableHead>
                            <TableHead>Discount</TableHead>
                            <TableHead className="w-[100px]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fmcgTagPrices.map((row) => (
                            <TableRow key={row.id}>
                              <TableCell className="font-medium">{row.name}</TableCell>
                              <TableCell>
                                {formatMoney(row.price, row.currency)}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {row.discountPercent != null && row.discountPercent > 0
                                  ? `${row.discountPercent}%`
                                  : "—"}
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm" asChild>
                                  <Link href="/pricing/workspace/lists">Edit</Link>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
            {/* Context banner */}
            <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-4 py-3">
              <ProductTypeBadge type={productType} whenUnset="stock" />
              <p className="text-sm text-muted-foreground">
                {!showSection("purchase", productType)
                  ? "Finished product — configure customer-facing sales price lists below."
                  : !showSection("sales", productType)
                  ? "Purchased product — configure cost / purchase price lists below."
                  : "Stock product — configure both purchase cost and sales price lists below."}
              </p>
              <div className="ml-auto flex gap-2">
                <ExplainThis prompt="Explain tiered pricing and effective unit price." label="Explain" />
                {copilotEnabled ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openWithPrompt(`Suggest pricing tiers for ${product.sku}. Detect margin issues.`)}
                  >
                    <Icons.Sparkles className="mr-2 h-4 w-4" />
                    Copilot
                  </Button>
                ) : null}
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
                    {canWrite && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setEditingTierIdx(null); setTierSheetOpen(true); }}
                      >
                        <Icons.Plus className="mr-2 h-4 w-4" />
                        Add tier
                      </Button>
                    )}
                    {canWrite && (
                      <Button size="sm" onClick={handleSaveTiers} disabled={!selectedListId}>
                        Save tiers
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
              </>
            )}
          </TabsContent>

          {/* ── Packaging / Packs Tab ───────────────────────────────────────── */}
          <TabsContent value="packaging" className="space-y-4">
            {fmcgOrg ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sell packs</CardTitle>
                  <CardDescription>
                    Set packing for this product only — how many pieces are in each carton, bale, or outer.
                    Counts vary by SKU; there is no company-wide default.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FmcgProductPacksEditor
                    productId={id}
                    canWrite={canWrite}
                    onChanged={setPackaging}
                  />
                </CardContent>
              </Card>
            ) : (
              <>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">UOM conversions</h3>
                <p className="text-xs text-muted-foreground">
                  Base UOM: <span className="font-mono font-medium">{baseUom}</span>. Define
                  conversions for cartons, bundles, etc.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="decimals"
                    checked={allowDecimals}
                    onCheckedChange={(c) => setAllowDecimals(c === true)}
                  />
                  <Label htmlFor="decimals" className="text-xs">Allow decimals</Label>
                </div>
                {canWrite && (
                  <Button
                    size="sm"
                    onClick={() => { setEditingPackIdx(null); setPackSheetOpen(true); }}
                  >
                    <Icons.Plus className="mr-2 h-4 w-4" />
                    Add UOM
                  </Button>
                )}
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
              </>
            )}
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
                  {canWrite && sortedDefs.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setMatrixSheetOpen(true)}
                    >
                      <Icons.LayoutGrid className="mr-2 h-4 w-4" />
                      Generate variants
                    </Button>
                  )}
                  {canWrite && (
                    <Button
                      size="sm"
                      onClick={() => { setEditingAttr(null); setAttrSheetOpen(true); }}
                    >
                      <Icons.Plus className="mr-2 h-4 w-4" />
                      Add option type
                    </Button>
                  )}
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
                  {copilotEnabled ? (
                    <Button
                      size="sm"
                      onClick={() => openWithPrompt(`Suggest variants for ${product.sku} (${product.name}).`)}
                      variant="outline"
                    >
                      <Icons.Sparkles className="mr-2 h-4 w-4" />
                      Copilot
                    </Button>
                  ) : null}
                  {canWrite && (
                    <Button
                      size="sm"
                      onClick={() => { setEditingVariant(null); setVariantSheetOpen(true); }}
                    >
                      <Icons.Plus className="mr-2 h-4 w-4" />
                      Add variant
                    </Button>
                  )}
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
        baseUom={fmcgOrg ? "PCS" : baseUom}
        allowDecimals={fmcgOrg ? false : allowDecimals}
        uomOptions={uomOptions}
        fmcgMode={fmcgOrg}
        onUomCreated={(code) => {
          setUomOptions((prev) =>
            prev.includes(code) ? prev : [...prev, code].sort((a, b) => a.localeCompare(b))
          );
        }}
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
          existingVariantSkus={existingVariantSkus}
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
  fmcgMode = false,
  onUomCreated,
  initial,
  onSave,
  onCancel,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  baseUom: string;
  allowDecimals: boolean;
  uomOptions: string[];
  fmcgMode?: boolean;
  onUomCreated?: (code: string) => void;
  initial: ProductPackaging | null;
  onSave: (p: ProductPackaging) => void;
  onCancel: () => void;
}) {
  const [uom, setUom] = React.useState(initial?.uom ?? (fmcgMode ? "CARTON" : "EA"));
  const [customPackName, setCustomPackName] = React.useState("");
  const [useCustomPack, setUseCustomPack] = React.useState(false);
  const [unitsPer, setUnitsPer] = React.useState<number | string>(initial?.unitsPer ?? (fmcgMode ? 24 : 1));
  const [barcode, setBarcode] = React.useState(initial?.barcode ?? "");
  const [defSales, setDefSales] = React.useState(!!initial?.isDefaultSalesUom);
  const [defPurchase, setDefPurchase] = React.useState(!!initial?.isDefaultPurchaseUom);
  const [saving, setSaving] = React.useState(false);
  const [dimL, setDimL] = React.useState<string>(initial?.dimensions?.l != null ? String(initial.dimensions.l) : "");
  const [dimW, setDimW] = React.useState<string>(initial?.dimensions?.w != null ? String(initial.dimensions.w) : "");
  const [dimH, setDimH] = React.useState<string>(initial?.dimensions?.h != null ? String(initial.dimensions.h) : "");
  const [dimUnit, setDimUnit] = React.useState<"cm" | "in">(initial?.dimensions?.unit ?? "cm");
  const [weightVal, setWeightVal] = React.useState<string>(initial?.weight?.value != null ? String(initial.weight.value) : "");
  const [weightUnit, setWeightUnit] = React.useState<"kg" | "g">(initial?.weight?.unit ?? "kg");

  const fmcgPackOptions = React.useMemo(() => {
    const codes = new Set<string>([...FMCG_PACK_PRESETS, ...uomOptions]);
    // Piece UOMs are not sell packs in this sheet
    for (const piece of ["EA", "PC", "PCS", "PIECE", "UNIT", "RRP"]) codes.delete(piece);
    if (initial?.uom) codes.add(initial.uom.toUpperCase());
    return [...codes].sort((a, b) => a.localeCompare(b));
  }, [uomOptions, initial?.uom]);

  React.useEffect(() => {
    if (!open) return;
    const startUom = (initial?.uom ?? (fmcgMode ? "CARTON" : "EA")).toUpperCase();
    setUom(startUom);
    setUseCustomPack(false);
    setCustomPackName("");
    setUnitsPer(initial?.unitsPer ?? (fmcgMode ? 24 : 1));
    setBarcode(initial?.barcode ?? "");
    setDefSales(!!initial?.isDefaultSalesUom);
    setDefPurchase(!!initial?.isDefaultPurchaseUom);
    setDimL(initial?.dimensions?.l != null ? String(initial.dimensions.l) : "");
    setDimW(initial?.dimensions?.w != null ? String(initial.dimensions.w) : "");
    setDimH(initial?.dimensions?.h != null ? String(initial.dimensions.h) : "");
    setDimUnit(initial?.dimensions?.unit ?? "cm");
    setWeightVal(initial?.weight?.value != null ? String(initial.weight.value) : "");
    setWeightUnit(initial?.weight?.unit ?? "kg");
    setSaving(false);
  }, [open, initial, fmcgMode]);

  const resolvedPackCode = () => {
    if (fmcgMode && useCustomPack) {
      return customPackName.trim().replace(/\s+/g, "_").toUpperCase();
    }
    return uom.trim().toUpperCase();
  };

  const handleSubmit = async () => {
    const code = resolvedPackCode();
    if (!code) {
      toast.error(fmcgMode ? "Enter or select a pack name." : "Select a UOM.");
      return;
    }
    const pieces = Number(unitsPer);
    if (!Number.isFinite(pieces) || pieces <= 0) {
      toast.error(fmcgMode ? "Enter pieces packed (greater than 0)." : "Enter units per base UOM.");
      return;
    }

    setSaving(true);
    try {
      if (fmcgMode && !uomOptions.some((c) => c.toUpperCase() === code)) {
        try {
          await createUomApi({
            code,
            name: code.replace(/_/g, " "),
            category: "count",
            decimals: 0,
            isBase: true,
          });
          onUomCreated?.(code);
        } catch (e) {
          const msg = (e as Error)?.message ?? "";
          // Already exists / no settings write — still attach pack on the product
          if (/already|duplicate|exists/i.test(msg)) {
            onUomCreated?.(code);
          } else {
            onUomCreated?.(code);
            toast.message("Pack will save on the product; UOM catalog create was skipped.", {
              description: msg || undefined,
            });
          }
        }
      }

      const p: ProductPackaging = {
        uom: code,
        unitsPer: pieces,
        baseUom: fmcgMode ? "PCS" : baseUom,
        barcode: barcode.trim() || undefined,
        isDefaultSalesUom: defSales,
        isDefaultPurchaseUom: fmcgMode ? false : defPurchase,
      };
      if (!fmcgMode) {
        if (dimL !== "" || dimW !== "" || dimH !== "") {
          p.dimensions = { l: Number(dimL) || 0, w: Number(dimW) || 0, h: Number(dimH) || 0, unit: dimUnit };
        }
        if (weightVal !== "") {
          p.weight = { value: Number(weightVal) || 0, unit: weightUnit };
        }
      }
      onSave(p);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {fmcgMode
              ? initial
                ? "Edit pack"
                : "Add pack"
              : initial
                ? "Edit UOM"
                : "Add UOM"}
          </SheetTitle>
          <SheetDescription>
            {fmcgMode
              ? "Pick a pack name (or create one), then how many pieces are inside. Orders in that pack price as pieces × price/pc."
              : `Conversion to base UOM (${baseUom}), barcode, dimensions.`}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-4">
          {fmcgMode ? (
            <>
              <div className="space-y-2">
                <Label>Pack name</Label>
                {useCustomPack ? (
                  <div className="space-y-2">
                    <Input
                      value={customPackName}
                      onChange={(e) => setCustomPackName(e.target.value)}
                      placeholder="Type new pack name…"
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-0 text-xs"
                      onClick={() => {
                        setUseCustomPack(false);
                        setCustomPackName("");
                      }}
                    >
                      Choose from list instead
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Select
                      value={uom}
                      onValueChange={(v) => {
                        setUseCustomPack(false);
                        setUom(v);
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select pack" />
                      </SelectTrigger>
                      <SelectContent>
                        {fmcgPackOptions.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      title="Add pack name"
                      aria-label="Add pack name"
                      onClick={() => {
                        setUseCustomPack(true);
                        setCustomPackName("");
                      }}
                    >
                      <Icons.Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Pieces packed</Label>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={unitsPer}
                  onChange={(e) => setUnitsPer(e.target.value)}
                  placeholder="e.g. 24"
                />
                <p className="text-xs text-muted-foreground">
                  1 {useCustomPack ? (customPackName.trim() || "pack") : uom} = {unitsPer || "?"} pieces
                </p>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
          <div className="space-y-2">
            <Label>{fmcgMode ? "Pack barcode (optional)" : "Barcode (optional)"}</Label>
            <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Optional" />
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Checkbox id="ds" checked={defSales} onCheckedChange={(c) => setDefSales(c === true)} />
              <Label htmlFor="ds" className="text-sm">
                {fmcgMode ? "Default sell pack" : "Default sales UOM"}
              </Label>
            </div>
            {!fmcgMode ? (
            <div className="flex items-center gap-2">
              <Checkbox id="dp" checked={defPurchase} onCheckedChange={(c) => setDefPurchase(c === true)} />
              <Label htmlFor="dp" className="text-sm">Default purchase UOM</Label>
            </div>
            ) : null}
          </div>
          {!fmcgMode ? (
            <>
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
            </>
          ) : null}
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
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
    const parts = [productName, size, grade, packagingType].filter(Boolean);
    if (parts.length > 1) setName(parts.join(" "));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, grade, packagingType]);

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

  const activeDefs = React.useMemo(
    () => attributeDefs.filter((d) => selectedDefIds.has(d.id) && d.options.length > 0),
    [attributeDefs, selectedDefIds]
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
