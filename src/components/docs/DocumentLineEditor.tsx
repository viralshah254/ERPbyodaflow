"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormattedDecimalInput } from "@/components/ui/formatted-decimal-input";
import { sanitizeDecimalInput, parseDecimalString, parsePartialDecimalString, formatDecimalDisplay } from "@/lib/decimal-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AsyncSearchableSelect, type AsyncSearchableSelectOption } from "@/components/ui/async-searchable-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProductPackaging, ProductPrice } from "@/lib/products/pricing-types";
import {
  listProducts,
  fetchProductsForDocumentLines,
  setProductsCache,
  subscribeProductsCache,
} from "@/lib/data/products.repo";
import type { ProductRow } from "@/lib/types/masters";
import { fetchProductApi, fetchProductsApi } from "@/lib/api/products";
import { isApiConfigured } from "@/lib/api/client";
import { fetchPriceListsForUi } from "@/lib/api/pricing";
import { getPriceForLine, getBaseQty } from "@/lib/products/price-resolver";
import {
  isPieceUom,
  resolveFmcgClientLinePrice,
  resolveUnitsPerPiece,
  type FmcgCatalogItem,
} from "@/lib/fmcg/pricing";
import { DocumentProductPickerSheet } from "@/components/docs/DocumentProductPickerSheet";
import {
  productFamilyKey,
  productFamilyLabel,
  compareProductFamilyKeys,
  lineProductFamilyKey,
  productFamilySortRank,
} from "@/lib/products/product-family";
import {
  productCategoryKey,
  productCategoryLabelFromKey,
  lineProductCategoryKey,
  compareProductCategoryKeys,
} from "@/lib/products/product-category-group";
import { fetchProductVariantsApi } from "@/lib/api/product-master";
import type { ProductVariant } from "@/lib/products/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export interface DocumentLine {
  id: string;
  productId: string;
  sku: string;
  name: string;
  uom: string;
  qty: number;
  baseQty: number;
  price: number;
  priceReason: string;
  /** Price-tag / offered discount percent (0–100). */
  discount?: number;
  amount: number;
  /** Computed tax amount for this line (0 when no tax code or rate is 0). */
  tax?: number;
  taxCodeId?: string;
  variantId?: string;
  variantSku?: string;
  /** When this line originates from a PO line, the PO line id for consumption tracking. */
  sourceLineId?: string;
  /**
   * Original quantity from the purchase order line (frozen at prefill time).
   * Used on GRN to show the user what was ordered, independent of received qty or UOM changes.
   */
  poQty?: number;
}

interface DocumentLineEditorProps {
  priceListId?: string;
  /** When true, do not use price list; price is manual (cost from supplier). */
  useCostPricing?: boolean;
  currency: string;
  lines: DocumentLine[];
  onLinesChange: (
    next: DocumentLine[] | ((prev: DocumentLine[]) => DocumentLine[])
  ) => void;
  /** Sales vs purchasing: optional supplier price list stub */
  mode?: "sales" | "purchasing";
  /** Preloaded packaging per product (from API); when provided, used instead of localStorage */
  packagingByProductId?: Record<string, ProductPackaging[]>;
  /** Preloaded pricing per product (from API); when provided, used for price resolution */
  pricingByProductId?: Record<string, ProductPrice[]>;
  /** Filter products: purchasable (PO), sellable (SO), or all. */
  productFilter?: "purchasable" | "sellable" | "all";
  /** Available tax codes for the tax column select. */
  taxCodes?: Array<{ id: string; code: string; name: string; rate: number }>;
  /**
   * Org-level default tax code id. Applied to new lines when the product has no
   * own defaultTaxCodeId (e.g. to default all lines to KE-VAT0 for a specific org).
   */
  defaultLineTaxCodeId?: string;
  /** When true, unit prices already include VAT — tax is back-calculated. Default: false (tax-exclusive). */
  linesAreTaxInclusive?: boolean;
  /**
   * Org UOM catalog (Settings → UOM). Merged into each line’s UOM dropdown with product packaging UOMs.
   * Packaging defines units-per-base; the catalog ensures codes like KG appear even if packaging fetch failed.
   */
  catalogUomCodes?: string[];
  /**
   * Override the Qty and Base qty column labels + help tooltips. Pass when the doc type gives these
   * columns specific meaning — e.g. for GRN: received quantity and the original PO quantity.
   */
  lineColumnLabels?: {
    qtyHeader: string;
    qtyTooltip: string;
    baseQtyHeader: string;
    baseQtyTooltip: string;
  };
  /**
   * Daily prices keyed by productId. When provided, the effective daily price is used
   * as the primary price source (overriding tier-based pricing).
   * isStale=true means no price was set today — the effective price is from a prior day.
   */
  dailyPricesByProductId?: Record<string, { effectivePrice: number | null; isStale: boolean; fallbackDate?: string | null }>;
  /**
   * Flat catalog prices from PriceList.items (non-FMCG fallback).
   * Used when daily prices are absent — after daily, before tiered product_pricing.
   */
  catalogPricesByProductId?: Record<string, number>;
  /**
   * FMCG only: piece price + discount on the customer's price tag.
   * Pack unit price = pricePerPiece × packaging.unitsPer. Never use for CoolCatch.
   */
  fmcgCatalogByProductId?: Record<string, FmcgCatalogItem>;
  /**
   * FMCG orgs group lines by product category (not CoolCatch product family).
   * Seafood / other templates must leave this false/undefined.
   */
  fmcgOrg?: boolean;
  /** Load packaging / pricing for products just added from the picker. */
  onProductsAdded?: (productIds: string[]) => void;
}

const defaultPriceListId = "pl-retail";

/** Multi-word search: every token must appear somewhere in sku, name, category, description, or productFamily (case-insensitive). */
function productMatchesLineSearch(p: ProductRow, query: string): boolean {
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return true;
  const hay = [p.sku, p.barcode ?? "", p.name, p.category ?? "", p.description ?? "", p.productFamily ?? ""]
    .join(" ")
    .toLowerCase();
  return tokens.every((t) => hay.includes(t));
}

/** Packs that are actually configured (pieces-per-pack > 1). */
function configuredPackUoms(packaging: ProductPackaging[] | undefined): string[] {
  return (packaging ?? [])
    .filter((p) => Number.isFinite(p.unitsPer) && p.unitsPer > 1 && !isPieceUom(p.uom))
    .map((p) => String(p.uom).trim().toUpperCase())
    .filter(Boolean);
}

/** Default UOM from product packaging (purchase vs sales). */
function pickDefaultUomFromPackaging(
  packaging: ProductPackaging[],
  mode: "sales" | "purchasing",
  opts?: { fmcgOrg?: boolean }
): string | undefined {
  const usable = opts?.fmcgOrg
    ? packaging.filter((p) => Number.isFinite(p.unitsPer) && p.unitsPer > 1)
    : packaging;
  if (!usable.length) return undefined;
  if (mode === "purchasing") {
    const p = usable.find((x) => x.isDefaultPurchaseUom);
    if (p) return p.uom;
  }
  const s = usable.find((x) => x.isDefaultSalesUom);
  if (s) return s.uom;
  return usable[0]?.uom;
}

/**
 * Line UOM options.
 * FMCG: base piece UOM (PCS) + only packs saved on that product (no org catalog / defaults).
 * Seafood / other: packaging UOMs merged with org UOM catalog.
 */
function mergeLineUomOptions(
  packagingForProduct: ProductPackaging[] | undefined,
  catalogUomCodes: string[],
  currentValue?: string,
  opts?: { fmcgOrg?: boolean; baseUom?: string }
): string[] {
  if (opts?.fmcgOrg) {
    const base = String(opts.baseUom ?? "PCS").trim().toUpperCase() || "PCS";
    const merged = new Set<string>([base, ...configuredPackUoms(packagingForProduct)]);
    if (currentValue) merged.add(String(currentValue).trim().toUpperCase());
    const arr = [...merged].filter(Boolean);
    arr.sort((a, b) => {
      if (isPieceUom(a) && !isPieceUom(b)) return -1;
      if (!isPieceUom(a) && isPieceUom(b)) return 1;
      return a.localeCompare(b);
    });
    return arr.length ? arr : ["PCS"];
  }
  const fromPack = (packagingForProduct ?? []).map((p) => p.uom);
  const merged = new Set<string>([...fromPack, ...catalogUomCodes]);
  if (currentValue) merged.add(currentValue);
  const arr = [...merged].filter(Boolean);
  arr.sort((a, b) => a.localeCompare(b));
  return arr.length ? arr : ["EA"];
}

function defaultLineUom(
  packaging: ProductPackaging[],
  mode: "sales" | "purchasing",
  product: Pick<ProductRow, "unit" | "baseUom">,
  fmcgOrg: boolean
): string {
  const fromPack = pickDefaultUomFromPackaging(packaging, mode, { fmcgOrg });
  if (fromPack) return fromPack;
  if (fmcgOrg) return "PCS";
  return product.unit ?? product.baseUom ?? "EA";
}

function isPreservedCommercialLine(line: Pick<DocumentLine, "priceReason">): boolean {
  return (
    line.priceReason === "Existing" ||
    (typeof line.priceReason === "string" && line.priceReason.startsWith("Existing"))
  );
}

/** Apply Disc% to a line loaded from an existing doc — uses stored unit price, not price tag. */
function applyDiscountToPreservedLine(
  line: Pick<DocumentLine, "price" | "discount" | "qty">,
  discountPercent: number
): { price: number; discount?: number; priceReason: string; amount: number } {
  const disc = Math.min(100, Math.max(0, Number.isFinite(discountPercent) ? discountPercent : 0));
  const oldDisc = line.discount ?? 0;
  const gross =
    oldDisc > 0 && oldDisc < 100
      ? Math.round((line.price / (1 - oldDisc / 100)) * 100) / 100
      : line.price;
  const net = Math.round(gross * (1 - disc / 100) * 100) / 100;
  return {
    price: net,
    discount: disc,
    priceReason: disc > 0 ? `Existing (−${disc}%)` : "Existing (0% discount)",
    amount: line.qty * net,
  };
}

export function applyLineTax(
  line: DocumentLine,
  taxCodes: Array<{ id: string; code: string; name: string; rate: number }>,
  linesAreTaxInclusive: boolean
): { tax: number; amount: number } {
  const subtotal = line.qty * line.price;
  const taxCode = taxCodes.find((t) => t.id === line.taxCodeId);
  const rate = taxCode?.rate ?? 0;
  if (rate === 0) return { tax: 0, amount: subtotal };
  if (linesAreTaxInclusive) {
    const tax = Math.round((subtotal - subtotal / (1 + rate / 100)) * 100) / 100;
    return { tax, amount: subtotal };
  }
  const tax = Math.round(subtotal * (rate / 100) * 100) / 100;
  return { tax, amount: Math.round((subtotal + tax) * 100) / 100 };
}

/** Net unit price in base UOM (e.g. per piece when line UOM is DOZEN). */
function computeBaseUnitPrice(line: Pick<DocumentLine, "price" | "qty" | "baseQty">): number | null {
  if (line.qty <= 0 || line.baseQty <= 0) return null;
  if (Math.abs(line.baseQty - line.qty) < 0.0001) return null;
  return Math.round(((line.price * line.qty) / line.baseQty) * 100) / 100;
}

export function DocumentLineEditor({
  priceListId = defaultPriceListId,
  useCostPricing = false,
  currency,
  lines,
  onLinesChange,
  mode = "sales",
  packagingByProductId,
  pricingByProductId,
  productFilter,
  taxCodes = [],
  defaultLineTaxCodeId,
  linesAreTaxInclusive = false,
  catalogUomCodes = [],
  lineColumnLabels,
  dailyPricesByProductId,
  catalogPricesByProductId,
  fmcgCatalogByProductId,
  fmcgOrg = false,
  onProductsAdded,
}: DocumentLineEditorProps) {
  const linesRef = React.useRef(lines);
  linesRef.current = lines;
  const [productPickerOpen, setProductPickerOpen] = React.useState(false);

  /** In-progress qty/price/discount text while typing (avoids coercing `3.` → 3 mid-entry). */
  const [lineFieldDrafts, setLineFieldDrafts] = React.useState<
    Record<string, { qty?: string; price?: string; discount?: string }>
  >({});

  const lineQtyValue = (line: DocumentLine) =>
    lineFieldDrafts[line.id]?.qty ?? String(line.qty);

  const linePriceValue = (line: DocumentLine) =>
    lineFieldDrafts[line.id]?.price ?? String(line.price);

  const lineDiscountValue = (line: DocumentLine) =>
    lineFieldDrafts[line.id]?.discount ?? String(line.discount ?? 0);

  const handleLineQtyDraft = (lineId: string, raw: string) => {
    setLineFieldDrafts((prev) => ({ ...prev, [lineId]: { ...prev[lineId], qty: raw } }));
    const partial = parsePartialDecimalString(raw);
    if (partial != null && partial >= 0) setQty(lineId, partial);
  };

  const finalizeLineQtyDraft = (lineId: string, raw: string) => {
    const n = parseDecimalString(raw);
    setQty(lineId, Number.isFinite(n) && n >= 0 ? n : 0);
    setLineFieldDrafts((prev) => {
      const next = { ...prev };
      const row = next[lineId];
      if (!row) return next;
      const { qty: _qty, ...rest } = row;
      if (Object.keys(rest).length === 0) delete next[lineId];
      else next[lineId] = rest;
      return next;
    });
  };

  const handleLinePriceDraft = (lineId: string, raw: string) => {
    setLineFieldDrafts((prev) => ({ ...prev, [lineId]: { ...prev[lineId], price: raw } }));
    const partial = parsePartialDecimalString(raw);
    if (partial != null && partial >= 0) setPrice(lineId, partial);
  };

  const finalizeLinePriceDraft = (lineId: string, raw: string) => {
    const n = parseDecimalString(raw);
    setPrice(lineId, Number.isFinite(n) && n >= 0 ? n : 0);
    setLineFieldDrafts((prev) => {
      const next = { ...prev };
      const row = next[lineId];
      if (!row) return next;
      const { price: _price, ...rest } = row;
      if (Object.keys(rest).length === 0) delete next[lineId];
      else next[lineId] = rest;
      return next;
    });
  };

  const [filteredProducts, setFilteredProducts] = React.useState<ProductRow[] | null>(null);
  /** Re-subscribe when global product cache updates (hydrate) so defaultTaxCodeId etc. are fresh. */
  const cachedProducts = React.useSyncExternalStore(
    subscribeProductsCache,
    listProducts,
    () => []
  );
  /** When filtering by purchasable/sellable, never fall back to the global cache (would mix in wrong product types). */
  const products = React.useMemo(() => {
    if (productFilter && productFilter !== "all") {
      if (filteredProducts === null) return [];
      return filteredProducts;
    }
    return cachedProducts;
  }, [productFilter, filteredProducts, cachedProducts]);

  React.useEffect(() => {
    if (!productFilter || productFilter === "all") {
      setFilteredProducts(null);
      return;
    }
    let cancelled = false;
    fetchProductsForDocumentLines(productFilter)
      .then((rows) => {
        if (!cancelled) {
          const sorted =
            mode === "purchasing"
              ? rows.slice().sort((a, b) => {
                  const scoreA = a.name.toLowerCase().includes("sourcing") ? 0 : a.productType === "RAW" ? 1 : a.productType === "BOTH" ? 2 : 3;
                  const scoreB = b.name.toLowerCase().includes("sourcing") ? 0 : b.productType === "RAW" ? 1 : b.productType === "BOTH" ? 2 : 3;
                  if (scoreA !== scoreB) return scoreA - scoreB;
                  const famCmp = productFamilySortRank(a.productFamily) - productFamilySortRank(b.productFamily);
                  if (famCmp !== 0) return famCmp;
                  return a.name.localeCompare(b.name);
                })
              : rows;
          setFilteredProducts(sorted);
        }
      })
      .catch(() => {
        if (!cancelled) setFilteredProducts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [productFilter]);
  const loadSkuOptionsForLine = React.useCallback(
    async (line: DocumentLine, query: string): Promise<AsyncSearchableSelectOption[]> => {
      const groupKey = fmcgOrg
        ? lineProductCategoryKey(products, line.productId)
        : lineProductFamilyKey(products, line.productId);
      const q = query.trim();
      const mapRows = (rows: ProductRow[]) => {
        const filtered = rows.filter((p) => {
          const inGroup = fmcgOrg
            ? productCategoryKey(p) === groupKey
            : productFamilyKey(p) === groupKey;
          return inGroup && productMatchesLineSearch(p, query);
        });
        const sorted =
          q.length === 0
            ? [...filtered].sort((a, b) => {
                if (mode === "purchasing") {
                  const aS = a.name.toLowerCase().includes("sourcing") ? 0 : 1;
                  const bS = b.name.toLowerCase().includes("sourcing") ? 0 : 1;
                  if (aS !== bS) return aS - bS;
                  const rA = a.productType === "RAW" ? 0 : 1;
                  const rB = b.productType === "RAW" ? 0 : 1;
                  if (rA !== rB) return rA - rB;
                }
                if (!fmcgOrg) {
                  const famCmp = productFamilySortRank(a.productFamily) - productFamilySortRank(b.productFamily);
                  if (famCmp !== 0) return famCmp;
                }
                return a.sku.localeCompare(b.sku);
              }).slice(0, 100)
            : [...filtered].sort((a, b) => a.sku.localeCompare(b.sku));
        return sorted.map((p) => ({
          id: p.id,
          label: `${p.sku} — ${p.name}`,
          description: (p.categoryName ?? p.category)?.trim() || undefined,
        }));
      };
      if (isApiConfigured() && productFilter && productFilter !== "all") {
        try {
          const rows = await fetchProductsApi({
            purchasable: productFilter === "purchasable",
            sellable: productFilter === "sellable",
            ...(q ? { search: q } : {}),
            limit: 50,
            includeStock: false,
          });
          return mapRows(rows);
        } catch {
          return mapRows(products);
        }
      }
      return mapRows(products);
    },
    [products, productFilter, fmcgOrg, mode]
  );
  /** CoolCatch: product family. FMCG: product category. */
  const groupOptions = React.useMemo(() => {
    const keys = new Set<string>();
    for (const p of products) {
      keys.add(fmcgOrg ? productCategoryKey(p) : productFamilyKey(p));
    }
    return [...keys].sort((a, b) => {
      if (mode === "purchasing" && !fmcgOrg) {
        const hasRawA = products.some((p) => productFamilyKey(p) === a && p.productType === "RAW") ? 0 : 1;
        const hasRawB = products.some((p) => productFamilyKey(p) === b && p.productType === "RAW") ? 0 : 1;
        if (hasRawA !== hasRawB) return hasRawA - hasRawB;
      }
      return fmcgOrg
        ? compareProductCategoryKeys(a, b, products)
        : compareProductFamilyKeys(a, b);
    });
  }, [products, mode, fmcgOrg]);
  const [priceLists, setPriceLists] = React.useState<Awaited<ReturnType<typeof fetchPriceListsForUi>>>([]);
  React.useEffect(() => {
    fetchPriceListsForUi().then(setPriceLists).catch(() => {});
  }, []);
  const priceListIdResolved = useCostPricing ? "" : (priceListId || priceLists[0]?.id || "pl-retail");

  const computeBaseQty = React.useCallback(
    (productId: string, uom: string, qty: number): number => {
      const packaging = packagingByProductId?.[productId];
      if (fmcgOrg) {
        const product = products.find((p) => p.id === productId);
        const unitsPer = resolveUnitsPerPiece(uom, packaging, product?.baseUom ?? product?.unit);
        return Math.round(qty * unitsPer * 1000) / 1000;
      }
      return getBaseQty(productId, uom, qty, packaging);
    },
    [fmcgOrg, packagingByProductId, products]
  );

  // Resolve price: daily (seafood) → FMCG piece×pack → flat catalog → tiered product_pricing.
  const resolvePrice = React.useCallback(
    (
      productId: string,
      qty: number,
      uom: string,
      discountOverride?: number
    ): { price: number; reason: string; discount?: number } => {
      if (useCostPricing) return { price: 0, reason: "Manual" };
      const daily = dailyPricesByProductId?.[productId];
      if (daily?.effectivePrice != null && daily.effectivePrice > 0) {
        const label = daily.isStale
          ? `⚠ Stale${daily.fallbackDate ? ` (${daily.fallbackDate})` : ""}`
          : "Daily price";
        return { price: daily.effectivePrice, reason: label };
      }
      const fmcgItem = fmcgCatalogByProductId?.[productId];
      if (fmcgItem?.pricePerPiece != null && fmcgItem.pricePerPiece > 0) {
        const product = products.find((p) => p.id === productId);
        const resolved = resolveFmcgClientLinePrice({
          pricePerPiece: fmcgItem.pricePerPiece,
          uom,
          quantity: qty,
          discountPercent:
            discountOverride != null && Number.isFinite(discountOverride)
              ? discountOverride
              : fmcgItem.discountPercent,
          packaging: packagingByProductId?.[productId],
          productBaseUom: product?.baseUom ?? product?.unit,
        });
        const effectiveDiscount =
          discountOverride != null && Number.isFinite(discountOverride)
            ? discountOverride
            : (fmcgItem.discountPercent ?? 0);
        // Net unit price after price-tag discount; percent kept for print / audit.
        return {
          price: resolved.unitPriceNet,
          reason: resolved.reason,
          ...(discountOverride != null
            ? { discount: effectiveDiscount }
            : effectiveDiscount > 0
              ? { discount: effectiveDiscount }
              : {}),
        };
      }
      const catalog = catalogPricesByProductId?.[productId];
      if (catalog != null && catalog > 0) {
        return { price: catalog, reason: "Price list" };
      }
      const tier = getPriceForLine(productId, priceListIdResolved, qty, uom, pricingByProductId?.[productId]);
      if (tier.price > 0) return tier;
      if (daily && daily.effectivePrice == null && catalog == null && !fmcgItem) {
        return { price: 0, reason: "Not priced on list" };
      }
      return tier;
    },
    [
      useCostPricing,
      dailyPricesByProductId,
      fmcgCatalogByProductId,
      catalogPricesByProductId,
      priceListIdResolved,
      pricingByProductId,
      packagingByProductId,
      products,
    ]
  );

  const resolvePriceRef = React.useRef(resolvePrice);
  resolvePriceRef.current = resolvePrice;

  // Variants per product — loaded lazily when a product with variants is selected
  const [variantsByProductId, setVariantsByProductId] = React.useState<Record<string, ProductVariant[]>>({});
  const ensureVariantsLoaded = React.useCallback((productId: string) => {
    if (variantsByProductId[productId] !== undefined) return;
    fetchProductVariantsApi(productId)
      .then((items) => setVariantsByProductId((prev) => ({ ...prev, [productId]: items })))
      .catch(() => setVariantsByProductId((prev) => ({ ...prev, [productId]: [] })));
  }, [variantsByProductId]);

  const addProductsAsLines = React.useCallback(
    (picked: ProductRow[]) => {
      if (!picked.length) return;
      // Keep category / SKU dropdowns aware of products loaded via search pagination.
      const cached = listProducts();
      const byId = new Map(cached.map((p) => [p.id, p]));
      for (const p of picked) byId.set(p.id, p);
      setProductsCache([...byId.values()]);

      const stamp = Date.now();
      const newLines: DocumentLine[] = picked.map((p, i) => {
        ensureVariantsLoaded(p.id);
        const packaging = packagingByProductId?.[p.id] ?? [];
        const uom = defaultLineUom(packaging, mode, p, fmcgOrg);
        const baseQty = computeBaseQty(p.id, uom, 1);
        const { price, reason, discount } = resolvePrice(p.id, 1, uom);
        const newLine: DocumentLine = {
          id: `line-${stamp}-${i}-${Math.random().toString(36).slice(2, 9)}`,
          productId: p.id,
          sku: p.sku,
          name: p.name,
          uom,
          qty: 1,
          baseQty,
          price,
          priceReason: reason,
          ...(discount != null && discount > 0 ? { discount } : {}),
          amount: price,
          taxCodeId: p.defaultTaxCodeId ?? defaultLineTaxCodeId ?? undefined,
        };
        const taxed = applyLineTax(newLine, taxCodes, linesAreTaxInclusive);
        return { ...newLine, tax: taxed.tax, amount: taxed.amount };
      });
      onLinesChange((prev) => [...prev, ...newLines]);
      onProductsAdded?.(picked.map((p) => p.id));

      if (isApiConfigured()) {
        for (const newLine of newLines) {
          void fetchProductApi(newLine.productId)
            .then((full) => {
              if (!full?.id) return;
              onLinesChange((prev) => {
                const idx = prev.findIndex((l) => l.id === newLine.id);
                if (idx < 0) return prev;
                const line = prev[idx];
                if (line.productId !== full.id) return prev;
                const nextTax =
                  full.defaultTaxCodeId ?? line.taxCodeId ?? defaultLineTaxCodeId ?? undefined;
                if (nextTax === line.taxCodeId) return prev;
                const merged = { ...line, taxCodeId: nextTax };
                const t = applyLineTax(merged, taxCodes, linesAreTaxInclusive);
                const copy = [...prev];
                copy[idx] = { ...merged, tax: t.tax, amount: t.amount };
                return copy;
              });
            })
            .catch(() => {});
        }
      }
    },
    [
      defaultLineTaxCodeId,
      ensureVariantsLoaded,
      fmcgOrg,
      linesAreTaxInclusive,
      mode,
      onLinesChange,
      onProductsAdded,
      packagingByProductId,
      resolvePrice,
      taxCodes,
    ]
  );

  const updateLine = (id: string, patch: Partial<DocumentLine>) => {
    onLinesChange((prevLines) => {
      const idx = prevLines.findIndex((l) => l.id === id);
      if (idx < 0) return prevLines;
      const prev = prevLines[idx];
      let next = { ...prev, ...patch };
      if (patch.productId != null || patch.uom != null || patch.qty != null) {
        const productId = patch.productId ?? prev.productId;
        const uom = patch.uom ?? prev.uom;
        const qty = patch.qty ?? prev.qty;
        next.baseQty = patch.baseQty ?? computeBaseQty(productId, uom, qty);
        if (useCostPricing && patch.productId != null) {
          next.price = 0;
          next.priceReason = "Manual";
          next.discount = undefined;
        } else if (!useCostPricing && patch.price == null) {
          // Only auto-resolve when caller did not already set a pack-aware price.
          const { price, reason, discount } = resolvePrice(
            productId,
            qty,
            uom,
            patch.discount ?? prev.discount
          );
          next.price = price;
          next.priceReason = reason;
          next.discount = discount != null && discount > 0 ? discount : undefined;
        }
        if (patch.amount == null) next.amount = next.qty * next.price;
      }
      const taxed = applyLineTax(next, taxCodes, linesAreTaxInclusive);
      next.tax = taxed.tax;
      next.amount = taxed.amount;
      const arr = [...prevLines];
      arr[idx] = next;
      return arr;
    });
  };

  /** When tax codes load after lines exist (or tax-inclusive toggles), recompute tax/amount from line.taxCodeId. */
  const taxCodesKey = taxCodes.map((t) => `${t.id}:${t.rate}`).join("|");
  const onLinesChangeRef = React.useRef(onLinesChange);
  onLinesChangeRef.current = onLinesChange;
  React.useEffect(() => {
    if (taxCodes.length === 0) return;
    onLinesChangeRef.current((prev) => {
      if (prev.length === 0) return prev;
      return prev.map((l) => {
        const taxed = applyLineTax(l, taxCodes, linesAreTaxInclusive);
        return { ...l, tax: taxed.tax, amount: taxed.amount };
      });
    });
  }, [taxCodesKey, linesAreTaxInclusive, taxCodes.length]);

  /** Ensure packaging is fetched for products already on the document (edit / convert prefills). */
  const lineProductIdsKey = React.useMemo(
    () =>
      [...new Set(lines.map((l) => l.productId).filter(Boolean))]
        .sort()
        .join(","),
    [lines]
  );
  React.useEffect(() => {
    if (!lineProductIdsKey) return;
    onProductsAdded?.(lineProductIdsKey.split(","));
  }, [lineProductIdsKey, onProductsAdded]);

  /** Re-apply prices when daily / catalog / tier / packaging finish loading (avoids stuck KES 0.00). */
  React.useEffect(() => {
    if (useCostPricing) return;
    const dailyKeys = Object.keys(dailyPricesByProductId ?? {});
    const catalogKeys = Object.keys(catalogPricesByProductId ?? {});
    const fmcgKeys = Object.keys(fmcgCatalogByProductId ?? {});
    if (
      dailyKeys.length === 0 &&
      catalogKeys.length === 0 &&
      fmcgKeys.length === 0 &&
      Object.keys(pricingByProductId ?? {}).length === 0
    ) {
      return;
    }
    onLinesChangeRef.current((prev) => {
      if (prev.length === 0) return prev;
      let changed = false;
      const next = prev.map((l) => {
        if (!l.productId) return l;
        // Wait for packaging before re-pricing pack UOMs (avoids 1×piece flash on edit).
        if (fmcgOrg && !isPieceUom(l.uom)) {
          const packs = packagingByProductId?.[l.productId];
          if (!packs?.length) return l;
        }
        const nextBaseQty = computeBaseQty(l.productId, l.uom, l.qty);
        if (isPreservedCommercialLine(l) && l.price > 0) {
          if (l.discount != null) {
            if (nextBaseQty === l.baseQty) return l;
            changed = true;
            return { ...l, baseQty: nextBaseQty };
          }
          const catalog = resolvePriceRef.current(l.productId, l.qty, l.uom, l.discount);
          const looksUnderPriced =
            fmcgOrg &&
            !isPieceUom(l.uom) &&
            catalog.price > 0 &&
            l.price * 1.5 < catalog.price;
          if (!looksUnderPriced) {
            if (nextBaseQty === l.baseQty) return l;
            changed = true;
            return { ...l, baseQty: nextBaseQty };
          }
        }
        // Keep line Disc% when set (edit / manual); otherwise use price-tag default.
        const { price, reason, discount } = resolvePriceRef.current(
          l.productId,
          l.qty,
          l.uom,
          l.discount
        );
        const nextDiscount = discount;
        if (
          price === l.price &&
          reason === l.priceReason &&
          (nextDiscount ?? null) === (l.discount ?? null) &&
          nextBaseQty === l.baseQty
        ) {
          return l;
        }
        changed = true;
        const merged = {
          ...l,
          price,
          priceReason: reason,
          discount: nextDiscount,
          baseQty: nextBaseQty,
          amount: l.qty * price,
        };
        const taxed = applyLineTax(merged, taxCodes, linesAreTaxInclusive);
        return { ...merged, tax: taxed.tax, amount: taxed.amount };
      });
      return changed ? next : prev;
    });
  }, [
    dailyPricesByProductId,
    catalogPricesByProductId,
    fmcgCatalogByProductId,
    priceListIdResolved,
    pricingByProductId,
    packagingByProductId,
    useCostPricing,
    taxCodes,
    linesAreTaxInclusive,
    computeBaseQty,
    fmcgOrg,
  ]);

  const setProduct = (lineId: string, productId: string) => {
    const applyRow = (row: ProductRow) => {
      const packaging = packagingByProductId?.[productId] ?? [];
      const uom = defaultLineUom(packaging, mode, row, fmcgOrg);
      const line = linesRef.current.find((l) => l.id === lineId);
      const qty = line?.qty ?? 1;
      const baseQty = computeBaseQty(productId, uom, qty);
      const { price, reason, discount } = resolvePrice(productId, qty, uom);
      updateLine(lineId, {
        productId: row.id,
        sku: row.sku,
        name: row.name,
        uom,
        baseQty,
        price,
        priceReason: reason,
        discount: discount != null && discount > 0 ? discount : undefined,
        amount: qty * price,
        taxCodeId: row.defaultTaxCodeId ?? defaultLineTaxCodeId ?? undefined,
        variantId: undefined,
        variantSku: undefined,
      });
      ensureVariantsLoaded(productId);
    };
    const p = products.find((x) => x.id === productId);
    if (p) {
      if (isApiConfigured()) {
        void fetchProductApi(productId).then((full) => applyRow(full ?? p)).catch(() => applyRow(p));
      } else {
        applyRow(p);
      }
      return;
    }
    if (isApiConfigured()) {
      void fetchProductApi(productId)
        .then((full) => {
          if (full) applyRow(full);
        })
        .catch(() => {});
    }
  };

  const setLineGroup = (lineId: string, newKey: string) => {
    const line = linesRef.current.find((l) => l.id === lineId);
    if (!line) return;
    const candidates = products
      .filter((p) => (fmcgOrg ? productCategoryKey(p) === newKey : productFamilyKey(p) === newKey))
      .sort((a, b) => {
        if (mode === "purchasing" && !fmcgOrg) {
          const aS = a.name.toLowerCase().includes("sourcing") ? 0 : 1;
          const bS = b.name.toLowerCase().includes("sourcing") ? 0 : 1;
          if (aS !== bS) return aS - bS;
          const rA = a.productType === "RAW" ? 0 : 1;
          const rB = b.productType === "RAW" ? 0 : 1;
          if (rA !== rB) return rA - rB;
        }
        return a.sku.localeCompare(b.sku);
      });
    if (candidates.length === 0) {
      toast.error(fmcgOrg ? "No SKUs in this category." : "No SKUs in this product family.");
      return;
    }
    const cur = products.find((p) => p.id === line.productId);
    if (cur) {
      const curKey = fmcgOrg ? productCategoryKey(cur) : productFamilyKey(cur);
      if (curKey === newKey) return;
    }
    setProduct(lineId, candidates[0]!.id);
  };

  const setVariant = (lineId: string, variantId: string) => {
    const line = lines.find((l) => l.id === lineId);
    if (!line) return;
    const variants = variantsByProductId[line.productId] ?? [];
    if (variantId === "_none_") {
      updateLine(lineId, { variantId: undefined, variantSku: undefined });
      return;
    }
    const variant = variants.find((v) => v.id === variantId);
    if (!variant) return;
    const patch: Partial<DocumentLine> = { variantId: variant.id, variantSku: variant.sku };
    // Override UOM with variant's packagingUomCode if available
    if (variant.packagingUomCode) {
      const uom = variant.packagingUomCode;
      patch.uom = uom;
      patch.baseQty = computeBaseQty(line.productId, uom, line.qty);
      if (!useCostPricing) {
        const { price, reason, discount } = resolvePrice(line.productId, line.qty, uom, line.discount);
        patch.price = price;
        patch.priceReason = reason;
        patch.discount = discount != null && discount > 0 ? discount : undefined;
        patch.amount = line.qty * price;
      }
    }
    updateLine(lineId, patch);
  };

  const setUom = (lineId: string, uom: string) => {
    const line = lines.find((l) => l.id === lineId);
    if (!line) return;
    const baseQty = computeBaseQty(line.productId, uom, line.qty);
    if (useCostPricing) {
      updateLine(lineId, { uom, baseQty, amount: line.qty * line.price });
    } else {
      const { price, reason, discount } = resolvePrice(line.productId, line.qty, uom, line.discount);
      updateLine(lineId, {
        uom,
        baseQty,
        price,
        priceReason: reason,
        discount: discount != null && discount > 0 ? discount : undefined,
        amount: line.qty * price,
      });
    }
  };

  const setQty = (lineId: string, qty: number) => {
    const line = lines.find((l) => l.id === lineId);
    if (!line) return;
    const baseQty = computeBaseQty(line.productId, line.uom, qty);
    if (useCostPricing) {
      updateLine(lineId, { qty, baseQty, amount: qty * line.price });
    } else if (isPreservedCommercialLine(line)) {
      updateLine(lineId, { qty, baseQty, amount: qty * line.price });
    } else {
      const { price, reason, discount } = resolvePrice(line.productId, qty, line.uom, line.discount);
      updateLine(lineId, {
        qty,
        baseQty,
        price,
        priceReason: reason,
        discount: discount != null && discount > 0 ? discount : undefined,
        amount: qty * price,
      });
    }
  };

  const setPrice = (lineId: string, price: number) => {
    const line = lines.find((l) => l.id === lineId);
    if (!line) return;
    // Manual override clears price-tag discount.
    updateLine(lineId, { price, discount: undefined, amount: line.qty * price });
  };

  /** Edit Disc% — on existing docs, discount off stored price; on new lines, use price tag. */
  const setDiscount = (lineId: string, discountPercent: number) => {
    const line = lines.find((l) => l.id === lineId);
    if (!line || useCostPricing) return;
    const disc = Math.min(100, Math.max(0, Number.isFinite(discountPercent) ? discountPercent : 0));

    if (isPreservedCommercialLine(line) && line.price > 0) {
      const next = applyDiscountToPreservedLine(line, disc);
      updateLine(lineId, next);
      return;
    }

    const { price, reason, discount } = resolvePrice(line.productId, line.qty, line.uom, disc);
    if (price > 0) {
      updateLine(lineId, {
        price,
        priceReason: reason,
        ...(discount != null ? { discount } : {}),
        amount: line.qty * price,
      });
      return;
    }
    // Fallback when catalog not loaded: reverse existing net → gross, then apply new %.
    const oldDisc = line.discount ?? 0;
    const gross =
      oldDisc > 0 && oldDisc < 100
        ? Math.round((line.price / (1 - oldDisc / 100)) * 100) / 100
        : line.price;
    const net = Math.round(gross * (1 - disc / 100) * 100) / 100;
    updateLine(lineId, {
      price: net,
      discount: disc,
      priceReason: disc > 0 ? `Manual (−${disc}%)` : "Existing (0% discount)",
      amount: line.qty * net,
    });
  };

  const handleLineDiscountDraft = (lineId: string, raw: string) => {
    setLineFieldDrafts((prev) => ({ ...prev, [lineId]: { ...prev[lineId], discount: raw } }));
    const partial = parsePartialDecimalString(raw);
    if (partial != null && partial >= 0 && partial <= 100) setDiscount(lineId, partial);
  };

  const finalizeLineDiscountDraft = (lineId: string, raw: string) => {
    const n = parseDecimalString(raw);
    setDiscount(lineId, Number.isFinite(n) && n >= 0 ? Math.min(100, n) : 0);
    setLineFieldDrafts((prev) => {
      const next = { ...prev };
      const row = next[lineId];
      if (!row) return next;
      const { discount: _discount, ...rest } = row;
      if (Object.keys(rest).length === 0) delete next[lineId];
      else next[lineId] = rest;
      return next;
    });
  };

  const removeLine = (id: string) => {
    onLinesChange((prev) => prev.filter((l) => l.id !== id));
  };

  const subtotalSum = lines.reduce((s, l) => s + l.qty * l.price, 0);
  const totalTax = lines.reduce((s, l) => s + (l.tax ?? 0), 0);
  const total = lines.reduce((s, l) => s + l.amount, 0);
  // Sales docs: always show Disc% so draft invoices/SOs can edit offered discount.
  const showDiscountCol = !useCostPricing;

  const showVariantColumn = React.useMemo(
    () =>
      lines.some((l) => {
        const v = variantsByProductId[l.productId];
        return Boolean(v && v.length > 0);
      }),
    [lines, variantsByProductId]
  );

  // Eagerly load variants for all products already on existing lines
  React.useEffect(() => {
    lines.forEach((l) => ensureVariantsLoaded(l.productId));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lineItemsLabel = useCostPricing
    ? "Line items · Cost / unit (enter or from supplier)"
    : `Line items · Price list: ${priceLists.find((pl) => pl.id === priceListIdResolved)?.name ?? priceListIdResolved}`;

  const productListLoading = Boolean(
    productFilter && productFilter !== "all" && filteredProducts === null
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>{lineItemsLabel}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setProductPickerOpen(true)}
          disabled={productListLoading}
          title={productListLoading ? "Loading product list…" : "Search and select products to add"}
        >
          <Icons.Plus className="mr-2 h-4 w-4" />
          Add line
        </Button>
      </div>
      <DocumentProductPickerSheet
        open={productPickerOpen}
        onOpenChange={setProductPickerOpen}
        productFilter={productFilter ?? (mode === "purchasing" ? "purchasable" : "sellable")}
        fmcgOrg={fmcgOrg}
        onConfirm={addProductsAsLines}
      />
      {lines.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {useCostPricing
            ? `No lines yet. Use Add line to search and select products. Then set ${fmcgOrg ? "category" : "product family"} / SKU if needed, UOM, ${lineColumnLabels ? lineColumnLabels.qtyHeader.toLowerCase() : "qty"}, and cost per unit.`
            : `No lines yet. Use Add line to search and check products to add. Then set UOM, ${lineColumnLabels ? lineColumnLabels.qtyHeader.toLowerCase() : "qty"}, and confirm price (${fmcgOrg ? "from price tag" : "from price list"}).`}
        </div>
      ) : (
        <>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[8rem] w-[12%]">{fmcgOrg ? "Category" : "Product"}</TableHead>
                  <TableHead className="min-w-[8rem] sm:min-w-[11rem] w-[24%]">SKU</TableHead>
                  {showVariantColumn && <TableHead className="min-w-[7rem]">Packaging variant</TableHead>}
                  <TableHead>UOM</TableHead>
                  <TableHead className="w-28">
                    {lineColumnLabels ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 cursor-default">
                              {lineColumnLabels.qtyHeader}
                              <Icons.HelpCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[260px] text-xs leading-snug">
                            {lineColumnLabels.qtyTooltip}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      "Qty"
                    )}
                  </TableHead>
                  <TableHead className="w-28">
                    {lineColumnLabels ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 cursor-default">
                              {lineColumnLabels.baseQtyHeader}
                              <Icons.HelpCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[260px] text-xs leading-snug">
                            {lineColumnLabels.baseQtyTooltip}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      "Base qty"
                    )}
                  </TableHead>
                  {!lineColumnLabels ? (
                    <TableHead className="w-28">
                      {fmcgOrg ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center gap-1 cursor-default">
                                Base price
                                <Icons.HelpCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[260px] text-xs leading-snug">
                              Net unit price per piece (base UOM) for the selected pack UOM and discount.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        "Base price"
                      )}
                    </TableHead>
                  ) : null}
                  <TableHead className="w-28">{useCostPricing ? "Cost / unit" : "Price"}</TableHead>
                  {showDiscountCol ? (
                    <TableHead className="w-20 whitespace-nowrap">Disc %</TableHead>
                  ) : null}
                  <TableHead>{useCostPricing ? "Source" : "Price reason"}</TableHead>
                  {taxCodes.length > 0 && <TableHead className="w-36">Tax</TableHead>}
                  {taxCodes.length > 0 && <TableHead className="w-28">Tax amount</TableHead>}
                  <TableHead className="w-28">Total</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((l) => {
                  const lineVariants = variantsByProductId[l.productId];
                  return (
                  <TableRow key={l.id}>
                    <TableCell>
                      <Select
                        value={
                          fmcgOrg
                            ? lineProductCategoryKey(products, l.productId)
                            : lineProductFamilyKey(products, l.productId)
                        }
                        onValueChange={(v) => setLineGroup(l.id, v)}
                      >
                        <SelectTrigger className="w-[10rem] sm:w-[12rem]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {groupOptions.map((k) => (
                            <SelectItem key={k} value={k}>
                              {fmcgOrg
                                ? productCategoryLabelFromKey(k, products)
                                : productFamilyLabel(k)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0 max-w-[min(100%,20rem)] w-full">
                        <AsyncSearchableSelect
                          value={l.productId}
                          onValueChange={(v) => setProduct(l.id, v)}
                          loadOptions={(q) => loadSkuOptionsForLine(l, q)}
                          selectedOption={{
                            id: l.productId,
                            label: `${l.sku} — ${l.name}`,
                          }}
                          placeholder={
                            productListLoading ? "Loading products…" : "Search SKU…"
                          }
                          searchPlaceholder={
                            fmcgOrg
                              ? "Type SKU, barcode, name, category, or any words…"
                              : "Type SKU, name, product family, or any words…"
                          }
                          emptyMessage={
                            productListLoading
                              ? "Loading products…"
                              : fmcgOrg
                                ? productFilter === "purchasable"
                                  ? "No purchasable SKUs match in this category. Try another search."
                                  : productFilter === "sellable"
                                    ? "No sellable SKUs match in this category. Try another search."
                                    : "No SKUs match in this category. Try different words."
                                : productFilter === "purchasable"
                                  ? "No purchasable SKUs match in this product family. Try another search."
                                  : productFilter === "sellable"
                                    ? "No sellable SKUs match in this product family. Try another search."
                                    : "No SKUs match in this product family. Try different words."
                          }
                          minSearchLength={0}
                          searchDebounceMs={150}
                          wrapLabels
                          disabled={productListLoading}
                          listMaxHeightClassName="max-h-[min(28rem,55vh)]"
                        />
                      </div>
                    </TableCell>
                    {showVariantColumn && (
                    <TableCell>
                      {lineVariants && lineVariants.length > 0 ? (
                        <Select value={l.variantId ?? "_none_"} onValueChange={(v) => setVariant(l.id, v)}>
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="No variant" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none_">—</SelectItem>
                            {lineVariants.filter((v) => v.status === "ACTIVE").map((v) => (
                              <SelectItem key={v.id} value={v.id}>{v.sku}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    )}
                    <TableCell>
                      <UomSelect
                        lineId={l.id}
                        productId={l.productId}
                        value={l.uom}
                        onChange={setUom}
                        packagingForProduct={packagingByProductId?.[l.productId]}
                        catalogUomCodes={catalogUomCodes}
                        fmcgOrg={fmcgOrg}
                        baseUom={
                          products.find((p) => p.id === l.productId)?.baseUom ||
                          products.find((p) => p.id === l.productId)?.unit ||
                          "PCS"
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <FormattedDecimalInput
                        className="w-24"
                        value={lineQtyValue(l)}
                        onValueChange={(raw) => handleLineQtyDraft(l.id, raw)}
                        onBlur={() => finalizeLineQtyDraft(l.id, lineQtyValue(l))}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {l.poQty != null
                        ? formatDecimalDisplay(String(l.poQty))
                        : formatDecimalDisplay(String(l.baseQty))}
                    </TableCell>
                    {!lineColumnLabels ? (
                      <TableCell className="text-muted-foreground tabular-nums">
                        {(() => {
                          const baseUnitPrice = computeBaseUnitPrice(l);
                          return baseUnitPrice != null ? formatMoney(baseUnitPrice, currency) : "—";
                        })()}
                      </TableCell>
                    ) : null}
                    <TableCell>
                      {useCostPricing ? (
                        <FormattedDecimalInput
                          className="w-32 min-w-[7rem]"
                          value={linePriceValue(l)}
                          onValueChange={(raw) => handleLinePriceDraft(l.id, raw)}
                          onBlur={() => finalizeLinePriceDraft(l.id, linePriceValue(l))}
                        />
                      ) : (
                        formatMoney(l.price, currency)
                      )}
                    </TableCell>
                    {showDiscountCol ? (
                      <TableCell>
                        <FormattedDecimalInput
                          className="w-16"
                          value={lineDiscountValue(l)}
                          onValueChange={(raw) => handleLineDiscountDraft(l.id, raw)}
                          onBlur={() => finalizeLineDiscountDraft(l.id, lineDiscountValue(l))}
                        />
                      </TableCell>
                    ) : null}
                    <TableCell className="text-muted-foreground text-xs">{l.priceReason}</TableCell>
                    {taxCodes.length > 0 && (
                      <TableCell>
                        <Select
                          value={l.taxCodeId ?? "__none__"}
                          onValueChange={(v) => updateLine(l.id, { taxCodeId: v === "__none__" ? undefined : v })}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {taxCodes.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.code} ({t.rate}%)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    )}
                    {taxCodes.length > 0 && (
                      <TableCell className="tabular-nums text-sm text-muted-foreground">
                        {l.tax && l.tax > 0
                          ? (linesAreTaxInclusive ? `incl. ${formatMoney(l.tax, currency)}` : `+${formatMoney(l.tax, currency)}`)
                          : "—"}
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{formatMoney(l.amount, currency)}</TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(l.id)}>
                        <Icons.Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="text-sm text-muted-foreground space-y-0.5">
            {totalTax > 0 && !linesAreTaxInclusive && (
              <p>
                Subtotal: {formatMoney(subtotalSum, currency)}
                <span className="mx-1.5">+</span>
                Tax: {formatMoney(totalTax, currency)}
              </p>
            )}
            <p className="font-medium text-foreground">
              Total: {formatMoney(total, currency)}
              {totalTax > 0 && linesAreTaxInclusive && (
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  (incl. {formatMoney(totalTax, currency)} tax)
                </span>
              )}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function UomSelect({
  lineId,
  productId,
  value,
  onChange,
  packagingForProduct = [],
  catalogUomCodes = [],
  fmcgOrg = false,
  baseUom = "PCS",
}: {
  lineId: string;
  productId: string;
  value: string;
  onChange: (lineId: string, uom: string) => void;
  packagingForProduct?: ProductPackaging[];
  catalogUomCodes?: string[];
  fmcgOrg?: boolean;
  baseUom?: string;
}) {
  // Always keep the line's current UOM in options (e.g. CARTON from SO/DN/invoice)
  // so edit mode does not collapse to PCS before packaging finishes loading.
  const options = mergeLineUomOptions(
    packagingForProduct,
    catalogUomCodes,
    value,
    { fmcgOrg, baseUom }
  );
  const normalizedValue = String(value ?? "").trim().toUpperCase();
  const selectValue = options.includes(normalizedValue)
    ? normalizedValue
    : options.includes(value)
      ? value
      : options[0] ?? value;

  React.useEffect(() => {
    if (!fmcgOrg) return;
    if (!selectValue || selectValue === normalizedValue || selectValue === value) return;
    // Never strip a pack UOM before product packaging has loaded.
    const packsLoaded = (packagingForProduct?.length ?? 0) > 0;
    if (!packsLoaded && normalizedValue && !isPieceUom(normalizedValue)) return;
    onChange(lineId, selectValue);
  }, [fmcgOrg, lineId, onChange, packagingForProduct, selectValue, value, normalizedValue]);

  return (
    <Select value={selectValue} onValueChange={(v) => onChange(lineId, v)}>
      <SelectTrigger className="w-28 min-w-[6rem]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((u) => (
          <SelectItem key={u} value={u}>
            {u}
          </SelectItem>
        ))}
        {fmcgOrg && productId ? (
          <div className="border-t border-border mt-1 pt-1">
            <Link
              href={`/master/products/${productId}?tab=packaging`}
              className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              onPointerDown={(e) => e.preventDefault()}
            >
              <Icons.Plus className="h-3.5 w-3.5 shrink-0" />
              Add pack UOM…
            </Link>
          </div>
        ) : null}
      </SelectContent>
    </Select>
  );
}
