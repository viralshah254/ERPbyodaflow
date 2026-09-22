"use client";

import * as React from "react";
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
import { DocumentProductPickerSheet, type CatalogAddItem } from "@/components/docs/DocumentProductPickerSheet";
import { AddPackUomDialog } from "@/components/docs/AddPackUomDialog";
import { cn } from "@/lib/utils";
import {
  productFamilyKey,
  productFamilyLabel,
  compareProductFamilyKeys,
  productFamilySortRank,
} from "@/lib/products/product-family";
import {
  productCategoryKey,
  productCategoryLabelFromKey,
  compareProductCategoryKeys,
} from "@/lib/products/product-category-group";
import { fetchProductVariantsApi } from "@/lib/api/product-master";
import type { ProductVariant } from "@/lib/products/types";
import { resolveFmcgProductSizeLabel } from "@/lib/products/fmcg-size";
import { formatMoney } from "@/lib/money";
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
  /** FMCG: a pack was saved from the line UOM menu. Replace that product's packaging. */
  onPackagingUpdated?: (productId: string, items: ProductPackaging[]) => void;
  /** Fires when the sellable/purchasable product catalog finishes loading (or is not needed). */
  onCatalogReadyChange?: (ready: boolean) => void;
}

const defaultPriceListId = "pl-retail";

function mergeProductIntoCache(product: ProductRow): void {
  const existing = listProducts();
  if (existing.some((row) => row.id === product.id)) {
    setProductsCache(existing.map((row) => (row.id === product.id ? { ...row, ...product } : row)));
    return;
  }
  setProductsCache([...existing, product]);
}

/** Multi-word search: every token must appear somewhere in sku, name, category, description, or productFamily (case-insensitive). */
function productMatchesLineSearch(p: ProductRow, query: string): boolean {
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return true;
  const hay = [p.sku, p.barcode ?? "", p.name, p.size ?? "", p.category ?? "", p.description ?? "", p.productFamily ?? ""]
    .join(" ")
    .toLowerCase();
  return tokens.every((t) => hay.includes(t));
}

/** Trailing whole number, or "x 24", is a quantity when the rest still matches products. */
function splitTrailingQty(raw: string): { text: string; stripped: string | null; qty: number | null } {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(.*?)(?:\s+x)?\s+(\d+)$/i);
  if (!match) return { text: trimmed, qty: null, stripped: null };
  const stripped = match[1].trim();
  const qty = Number(match[2]);
  if (!stripped || !Number.isInteger(qty) || qty < 1) return { text: trimmed, qty: null, stripped: null };
  return { text: trimmed, stripped, qty };
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
  onPackagingUpdated,
  onCatalogReadyChange,
}: DocumentLineEditorProps) {
  const linesRef = React.useRef(lines);
  linesRef.current = lines;
  const editorRef = React.useRef<HTMLDivElement | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const setProductRef = React.useRef<(lineId: string, productId: string) => void>(() => {});
  const [productPickerOpen, setProductPickerOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [highlightIndex, setHighlightIndex] = React.useState(0);
  const [categoryChip, setCategoryChip] = React.useState<string | null>(null);
  const [swapLineId, setSwapLineId] = React.useState<string | null>(null);
  const [pendingQtyFocusId, setPendingQtyFocusId] = React.useState<string | null>(null);
  const [expandedLineIds, setExpandedLineIds] = React.useState<Record<string, boolean>>({});
  const [remoteMatches, setRemoteMatches] = React.useState<ProductRow[]>([]);

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

  const [variantsByProductId, setVariantsByProductId] = React.useState<Record<string, ProductVariant[]>>({});
  const ensureVariantsLoaded = React.useCallback((productId: string) => {
    if (variantsByProductId[productId] !== undefined) return;
    fetchProductVariantsApi(productId)
      .then((items) => setVariantsByProductId((prev) => ({ ...prev, [productId]: items })))
      .catch(() => setVariantsByProductId((prev) => ({ ...prev, [productId]: [] })));
  }, [variantsByProductId]);

  React.useEffect(() => {
    if (!fmcgOrg || !isApiConfigured()) return;
    const productIds = [...new Set(lines.map((line) => line.productId).filter(Boolean))];
    for (const productId of productIds) {
      ensureVariantsLoaded(productId);
      const cached = products.find((p) => p.id === productId);
      if (resolveFmcgProductSizeLabel(cached, variantsByProductId[productId])) continue;
      void fetchProductApi(productId)
        .then((full) => {
          if (full) mergeProductIntoCache(full);
        })
        .catch(() => {});
    }
  }, [ensureVariantsLoaded, fmcgOrg, lines, products, variantsByProductId]);

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
  }, [productFilter, mode]);

  React.useEffect(() => {
    const catalogReady = !productFilter || productFilter === "all" || filteredProducts !== null;
    onCatalogReadyChange?.(catalogReady);
  }, [productFilter, filteredProducts, onCatalogReadyChange]);

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

  const commitProducts = React.useCallback(
    (items: CatalogAddItem[], replaceLineId?: string, focusQty = true) => {
      if (!items.length) return;
      if (replaceLineId && items[0]) {
        const cached = listProducts();
        const byId = new Map(cached.map((p) => [p.id, p]));
        byId.set(items[0].product.id, items[0].product);
        setProductsCache([...byId.values()]);
        setProductRef.current(replaceLineId, items[0].product.id);
        if (focusQty) setPendingQtyFocusId(replaceLineId);
        setSwapLineId(null);
        return;
      }

      const cached = listProducts();
      const byId = new Map(cached.map((p) => [p.id, p]));
      for (const item of items) byId.set(item.product.id, item.product);
      setProductsCache([...byId.values()]);

      const stamp = Date.now();
      const created: DocumentLine[] = [];
      const bumpedIds: string[] = [];
      let focusId: string | null = null;
      onLinesChange((prev) => {
        const next = [...prev];
        items.forEach((item, i) => {
          const q = Number.isFinite(item.qty) && item.qty > 0 ? item.qty : 1;
          if (!item.asNewLine) {
            const idx = next.findIndex((l) => l.productId === item.product.id);
            if (idx >= 0) {
              const line = next[idx]!;
              const qty = line.qty + q;
              const baseQty = computeBaseQty(line.productId, line.uom, qty);
              let merged: DocumentLine;
              if (useCostPricing || isPreservedCommercialLine(line)) {
                merged = { ...line, qty, baseQty, amount: qty * line.price };
              } else {
                const { price, reason, discount } = resolvePrice(line.productId, qty, line.uom, line.discount);
                merged = {
                  ...line,
                  qty,
                  baseQty,
                  price,
                  priceReason: reason,
                  discount: discount != null && discount > 0 ? discount : undefined,
                  amount: qty * price,
                };
              }
              const taxed = applyLineTax(merged, taxCodes, linesAreTaxInclusive);
              next[idx] = { ...merged, tax: taxed.tax, amount: taxed.amount };
              bumpedIds.push(line.id);
              focusId = line.id;
              return;
            }
          }
          const p = item.product;
          ensureVariantsLoaded(p.id);
          const packaging = packagingByProductId?.[p.id] ?? [];
          const uom = defaultLineUom(packaging, mode, p, fmcgOrg);
          const baseQty = computeBaseQty(p.id, uom, q);
          const { price, reason, discount } = resolvePrice(p.id, q, uom);
          const draft: DocumentLine = {
            id: `line-${stamp}-${i}-${Math.random().toString(36).slice(2, 9)}`,
            productId: p.id,
            sku: p.sku,
            name: p.name,
            uom,
            qty: q,
            baseQty,
            price,
            priceReason: reason,
            ...(discount != null && discount > 0 ? { discount } : {}),
            amount: q * price,
            taxCodeId: p.defaultTaxCodeId ?? defaultLineTaxCodeId ?? undefined,
          };
          const taxed = applyLineTax(draft, taxCodes, linesAreTaxInclusive);
          const newLine = { ...draft, tax: taxed.tax, amount: taxed.amount };
          next.push(newLine);
          created.push(newLine);
          focusId = newLine.id;
        });
        return next;
      });

      if (bumpedIds.length) {
        setLineFieldDrafts((prev) => {
          const copy = { ...prev };
          for (const id of bumpedIds) {
            const row = copy[id];
            if (!row) continue;
            const { qty: _qty, ...rest } = row;
            if (Object.keys(rest).length === 0) delete copy[id];
            else copy[id] = rest;
          }
          return copy;
        });
      }
      if (focusId && focusQty) setPendingQtyFocusId(focusId);
      if (created.length) onProductsAdded?.(created.map((l) => l.productId));

      if (isApiConfigured()) {
        for (const newLine of created) {
          void fetchProductApi(newLine.productId)
            .then((full) => {
              if (!full?.id) return;
              onLinesChange((prev) => {
                const idx = prev.findIndex((l) => l.id === newLine.id);
                if (idx < 0) return prev;
                const line = prev[idx];
                if (!line || line.productId !== full.id) return prev;
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
      computeBaseQty,
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
      useCostPricing,
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
        void fetchProductApi(productId)
          .then((full) => {
            if (full) mergeProductIntoCache(full);
            applyRow(full ?? p);
          })
          .catch(() => applyRow(p));
      } else {
        applyRow(p);
      }
      return;
    }
    if (isApiConfigured()) {
      void fetchProductApi(productId)
        .then((full) => {
          if (full) {
            mergeProductIntoCache(full);
            applyRow(full);
          }
        })
        .catch(() => {});
    }
  };
  setProductRef.current = setProduct;

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
  const showDiscount = !useCostPricing;

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

  const productGroupKey = React.useCallback(
    (p: ProductRow) => (fmcgOrg ? productCategoryKey(p) : productFamilyKey(p)),
    [fmcgOrg]
  );
  const productGroupLabel = React.useCallback(
    (key: string) => (fmcgOrg ? productCategoryLabelFromKey(key, products) : productFamilyLabel(key)),
    [fmcgOrg, products]
  );
  const priceLabelFor = React.useCallback(
    (p: ProductRow) => {
      if (useCostPricing) return "Enter cost";
      const uom = defaultLineUom(packagingByProductId?.[p.id] ?? [], mode, p, fmcgOrg);
      const { price } = resolvePrice(p.id, 1, uom);
      return formatMoney(price, currency);
    },
    [currency, fmcgOrg, mode, packagingByProductId, resolvePrice, useCostPricing]
  );

  const searchSplit = splitTrailingQty(searchQuery);
  const inChip = React.useCallback(
    (p: ProductRow) => !categoryChip || productGroupKey(p) === categoryChip,
    [categoryChip, productGroupKey]
  );
  const strippedMatchesLocal = Boolean(
    searchSplit.stripped &&
      products.some((p) => inChip(p) && productMatchesLineSearch(p, searchSplit.stripped!))
  );
  const remoteSupportsQty = Boolean(
    searchSplit.stripped &&
      remoteMatches.some((p) => inChip(p) && productMatchesLineSearch(p, searchSplit.stripped!))
  );
  const useQtyFromSearch = strippedMatchesLocal || remoteSupportsQty;
  const queryForList = useQtyFromSearch && searchSplit.stripped ? searchSplit.stripped : searchSplit.text;
  const qtyForAdd = useQtyFromSearch ? searchSplit.qty : null;

  React.useEffect(() => {
    if (!searchOpen || !isApiConfigured() || !productFilter || productFilter === "all") {
      setRemoteMatches([]);
      return;
    }
    const queries = [searchSplit.text, searchSplit.stripped]
      .map((q) => q?.trim() ?? "")
      .filter((q, i, all) => q.length > 0 && all.indexOf(q) === i);
    if (!queries.length) {
      setRemoteMatches([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void Promise.all(
        queries.map((search) =>
          fetchProductsApi({
            purchasable: productFilter === "purchasable" ? true : undefined,
            sellable: productFilter === "sellable" ? true : undefined,
            search,
            limit: 30,
            includeStock: false,
          }).catch(() => [] as ProductRow[])
        )
      ).then((pages) => {
        if (cancelled) return;
        const byId = new Map<string, ProductRow>();
        for (const page of pages) for (const row of page) byId.set(row.id, row);
        setRemoteMatches([...byId.values()]);
      });
    }, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [productFilter, searchOpen, searchSplit.stripped, searchSplit.text]);

  const searchResults = React.useMemo(() => {
    const byId = new Map<string, ProductRow>();
    for (const p of products) byId.set(p.id, p);
    for (const p of remoteMatches) byId.set(p.id, p);
    const q = queryForList.trim();
    return [...byId.values()]
      .filter((p) => inChip(p) && (!q || productMatchesLineSearch(p, q)))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, q ? 40 : 30);
  }, [inChip, products, queryForList, remoteMatches]);

  React.useEffect(() => {
    setHighlightIndex(0);
  }, [searchQuery, categoryChip]);

  React.useEffect(() => {
    if (!pendingQtyFocusId) return;
    const id = pendingQtyFocusId;
    const timer = window.setTimeout(() => {
      const el = editorRef.current?.querySelector<HTMLInputElement>(
        `[data-line-qty="${CSS.escape(id)}"]`
      );
      if (!el) return;
      el.focus();
      window.setTimeout(() => el.select(), 30);
      el.closest("[data-line-row]")?.scrollIntoView({ block: "nearest" });
      setPendingQtyFocusId(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [lines, pendingQtyFocusId]);

  React.useEffect(() => {
    if (!searchOpen) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (editorRef.current?.querySelector("[data-line-composer]")?.contains(target)) return;
      setSearchOpen(false);
      setSwapLineId(null);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [searchOpen]);

  const addFromSearch = (product: ProductRow, keepSearch: boolean) => {
    const qty = qtyForAdd && qtyForAdd > 0 ? qtyForAdd : 1;
    const replacing = swapLineId;
    commitProducts([{ product, qty, asNewLine: false }], replacing ?? undefined, !keepSearch || Boolean(replacing));
    setSearchQuery("");
    setCategoryChip(null);
    if (keepSearch && !replacing) {
      setSearchOpen(true);
      searchInputRef.current?.focus();
    } else {
      setSearchOpen(false);
    }
  };

  const moveFieldFocus = (lineId: string, field: "qty" | "price", dir: -1 | 1) => {
    const idx = lines.findIndex((l) => l.id === lineId);
    const next = lines[idx + dir];
    if (!next) return;
    const el = editorRef.current?.querySelector<HTMLInputElement>(
      `[data-line-id="${CSS.escape(next.id)}"][data-line-field="${field}"]`
    );
    if (!el) return;
    el.focus();
    window.setTimeout(() => el.select(), 30);
  };

  const onFieldKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    lineId: string,
    field: "qty" | "price"
  ) => {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      moveFieldFocus(lineId, field, event.key === "ArrowUp" ? -1 : 1);
    }
  };

  const onEditorKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" || !event.shiftKey) return;
    if (productPickerOpen) return;
    if (document.querySelector("[data-radix-select-content]")) return;
    event.preventDefault();
    const target = event.target;
    const inSearch = target === searchInputRef.current;
    if (inSearch && searchOpen && searchResults[highlightIndex]) {
      addFromSearch(searchResults[highlightIndex]!, true);
      return;
    }
    if (target instanceof HTMLElement && target !== searchInputRef.current) target.blur();
    setSearchOpen(true);
    setSwapLineId(null);
    searchInputRef.current?.focus();
  };

  const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSearchOpen(true);
      setHighlightIndex((i) => Math.min(i + 1, Math.max(searchResults.length - 1, 0)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSearchOpen(true);
      setHighlightIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (event.key === "Escape") {
      setSearchOpen(false);
      setSwapLineId(null);
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const product = searchResults[highlightIndex];
      if (product) addFromSearch(product, false);
    }
  };

  const showChips = searchOpen && !searchQuery.trim() && groupOptions.length > 0;
  const swapLine = swapLineId ? lines.find((l) => l.id === swapLineId) : undefined;

  return (
    <div ref={editorRef} className="min-w-0 space-y-3" onKeyDown={onEditorKeyDown}>
      <Label>{lineItemsLabel}</Label>
      <div data-line-composer className="relative space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Icons.Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              value={searchQuery}
              disabled={productListLoading}
              placeholder={productListLoading ? "Loading products…" : "Search name, SKU, or barcode"}
              className="h-9 pl-9"
              onChange={(e) => {
                const value = e.target.value;
                setSearchQuery(value);
                if (!value.trim()) setCategoryChip(null);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={onSearchKeyDown}
              aria-label="Search products to add"
              aria-expanded={searchOpen}
              aria-controls="line-product-results"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => setProductPickerOpen(true)}
            disabled={productListLoading}
          >
            Browse
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          <kbd className="rounded border px-1 py-0.5 font-mono text-[10px]">Shift+Enter</kbd> new line
          <span className="mx-1.5">·</span>
          Type a quantity, like seasoning 24
        </p>
        {swapLine ? (
          <p className="text-xs text-muted-foreground">
            Replacing {swapLine.name}. Pick a product, or press Escape to keep it.
          </p>
        ) : null}
        {searchOpen ? (
          <div
            id="line-product-results"
            className="max-h-80 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-sm"
          >
            {showChips ? (
              <div className="flex flex-wrap gap-1.5 border-b p-2">
                {groupOptions.map((key) => {
                  const active = categoryChip === key;
                  const label = productGroupLabel(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs",
                        active
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:bg-muted/60"
                      )}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setCategoryChip(active ? null : key)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            ) : null}
            {searchResults.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">No products match.</p>
            ) : (
              <ul>
                {searchResults.map((p, index) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-start gap-3 px-3 py-2 text-left",
                        index === highlightIndex ? "bg-muted" : "hover:bg-muted/60"
                      )}
                      onMouseEnter={() => setHighlightIndex(index)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => addFromSearch(p, false)}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium leading-snug">{p.name}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {[p.sku, p.size?.trim(), productGroupLabel(productGroupKey(p))]
                            .filter(Boolean)
                            .join(" · ")}
                          {qtyForAdd ? ` · Add at qty ${qtyForAdd}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm tabular-nums">{priceLabelFor(p)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>

      <DocumentProductPickerSheet
        open={productPickerOpen}
        onOpenChange={setProductPickerOpen}
        productFilter={productFilter ?? (mode === "purchasing" ? "purchasable" : "sellable")}
        fmcgOrg={fmcgOrg}
        products={products}
        loading={productListLoading}
        priceLabel={priceLabelFor}
        groupKey={productGroupKey}
        groupLabel={productGroupLabel}
        groupOptions={groupOptions.map((key) => ({ key, label: productGroupLabel(key) }))}
        existingProductIds={lines.map((l) => l.productId)}
        onAddMany={(items) => commitProducts(items)}
      />

      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">No lines yet. Search above to add the first product.</p>
      ) : (
        <div className="min-w-0 space-y-2">
          <div className="min-w-0 overflow-hidden rounded-md border">
            <table className="w-full table-fixed border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="w-[5.25rem] px-2 py-2 font-medium" title={lineColumnLabels?.qtyTooltip}>
                    {lineColumnLabels?.qtyHeader ?? "Qty"}
                  </th>
                  {lineColumnLabels ? (
                    <th className="w-[5.25rem] px-2 py-2 font-medium" title={lineColumnLabels.baseQtyTooltip}>
                      {lineColumnLabels.baseQtyHeader}
                    </th>
                  ) : null}
                  <th className="w-[6rem] px-2 py-2 font-medium">UOM</th>
                  <th className="w-[7rem] px-2 py-2 font-medium">{useCostPricing ? "Cost" : "Price"}</th>
                  <th className="w-[7.25rem] px-2 py-2 font-medium">Total</th>
                  <th className="w-10 px-1 py-2" />
                </tr>
              </thead>
              <tbody>
          {lines.map((l) => {
            const product = products.find((p) => p.id === l.productId);
            const taxCode = taxCodes.find((t) => t.id === l.taxCodeId);
            const baseQtyShown = l.poQty != null ? l.poQty : l.baseQty;
            const baseUnitPrice = computeBaseUnitPrice(l);
            const lineVariants = variantsByProductId[l.productId] ?? [];
            const expanded = Boolean(expandedLineIds[l.id]);
            const taxRateLabel = taxCode ? `${taxCode.rate}%` : null;
            const meta = [l.sku, taxRateLabel].filter(Boolean).join(" · ");
            const colSpan = lineColumnLabels ? 7 : 6;
            return (
              <React.Fragment key={l.id}>
              <tr data-line-row className="border-b align-middle">
                  <td className="min-w-0 px-3 py-2">
                    <div className="flex min-w-0 items-start gap-1">
                      <button
                        type="button"
                        className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-expanded={expanded}
                        aria-label={expanded ? `Hide details for ${l.name}` : `Show details for ${l.name}`}
                        onClick={() =>
                          setExpandedLineIds((prev) => ({ ...prev, [l.id]: !prev[l.id] }))
                        }
                      >
                        {expanded ? (
                          <Icons.ChevronDown className="h-4 w-4" />
                        ) : (
                          <Icons.ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                      <div className="min-w-0">
                        <button
                          type="button"
                          className="line-clamp-2 text-left text-sm font-medium leading-snug hover:underline"
                          onClick={() => {
                            setSwapLineId(l.id);
                            setSearchQuery("");
                            setSearchOpen(true);
                            searchInputRef.current?.focus();
                          }}
                        >
                          {l.name || product?.name || l.sku}
                        </button>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <FormattedDecimalInput
                      data-line-qty={l.id}
                      data-line-id={l.id}
                      data-line-field="qty"
                      className="h-8 w-full px-2"
                      aria-label={`${lineColumnLabels?.qtyHeader ?? "Quantity"} for ${l.name}`}
                      value={lineQtyValue(l)}
                      onValueChange={(raw) => handleLineQtyDraft(l.id, raw)}
                      onBlur={() => finalizeLineQtyDraft(l.id, lineQtyValue(l))}
                      onKeyDown={(event) => onFieldKeyDown(event, l.id, "qty")}
                    />
                  </td>
                  {lineColumnLabels ? (
                    <td className="px-2 py-2 text-sm tabular-nums text-muted-foreground">
                      {formatDecimalDisplay(String(baseQtyShown))}
                    </td>
                  ) : null}
                  <td className="px-2 py-2">
                    <UomSelect
                      lineId={l.id}
                      productId={l.productId}
                      productName={l.name || product?.name}
                      value={l.uom}
                      onChange={setUom}
                      packagingForProduct={packagingByProductId?.[l.productId]}
                      catalogUomCodes={catalogUomCodes}
                      fmcgOrg={fmcgOrg}
                      baseUom={product?.baseUom || product?.unit || "PCS"}
                      onPackagingUpdated={onPackagingUpdated}
                    />
                  </td>
                  <td className="px-2 py-2">
                    {useCostPricing ? (
                      <FormattedDecimalInput
                        data-line-id={l.id}
                        data-line-field="price"
                        className="h-8 w-full px-2"
                        aria-label={`Cost for ${l.name}`}
                        value={linePriceValue(l)}
                        onValueChange={(raw) => handleLinePriceDraft(l.id, raw)}
                        onBlur={() => finalizeLinePriceDraft(l.id, linePriceValue(l))}
                        onKeyDown={(event) => onFieldKeyDown(event, l.id, "price")}
                      />
                    ) : (
                      <span className="block truncate text-sm tabular-nums">{formatMoney(l.price, currency)}</span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <span className="block truncate text-sm font-medium tabular-nums">
                      {formatMoney(l.amount, currency)}
                    </span>
                  </td>
                  <td className="px-1 py-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      aria-label={`Remove ${l.name}`}
                      onClick={() => removeLine(l.id)}
                    >
                      <Icons.Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
              </tr>
                {expanded ? (
                  <tr className="border-b bg-muted/30">
                    <td colSpan={colSpan} className="px-3 py-3">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {showDiscount ? (
                      <label className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">Discount %</span>
                        <FormattedDecimalInput
                          className="h-8 w-24"
                          value={lineDiscountValue(l)}
                          onValueChange={(raw) => handleLineDiscountDraft(l.id, raw)}
                          onBlur={() => finalizeLineDiscountDraft(l.id, lineDiscountValue(l))}
                        />
                      </label>
                    ) : null}
                    {taxCodes.length > 0 ? (
                      <label className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">Tax</span>
                        <Select
                          value={l.taxCodeId ?? "__none__"}
                          onValueChange={(v) => updateLine(l.id, { taxCodeId: v === "__none__" ? undefined : v })}
                        >
                          <SelectTrigger className="h-8 w-full max-w-[14rem]">
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
                        <span className="text-xs text-muted-foreground">
                          {l.tax && l.tax > 0
                            ? linesAreTaxInclusive
                              ? `incl. ${formatMoney(l.tax, currency)}`
                              : `+${formatMoney(l.tax, currency)}`
                            : "No tax"}
                        </span>
                      </label>
                    ) : null}
                    {lineVariants.length > 0 ? (
                      <label className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">Packaging variant</span>
                        <Select value={l.variantId ?? "_none_"} onValueChange={(v) => setVariant(l.id, v)}>
                          <SelectTrigger className="h-8 w-full max-w-[14rem]">
                            <SelectValue placeholder="No variant" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none_">None</SelectItem>
                            {lineVariants
                              .filter((v) => v.status === "ACTIVE")
                              .map((v) => (
                                <SelectItem key={v.id} value={v.id}>
                                  {v.sku}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </label>
                    ) : null}
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">
                        {lineColumnLabels ? "Base price" : `Base qty ${formatDecimalDisplay(String(l.baseQty))}`}
                      </span>
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {baseUnitPrice != null ? formatMoney(baseUnitPrice, currency) : "Same as unit price"}
                      </span>
                      {l.priceReason ? (
                        <span className="text-xs text-muted-foreground">{l.priceReason}</span>
                      ) : null}
                    </div>
                  </div>
                    </td>
                  </tr>
                ) : null}
              </React.Fragment>
            );
          })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <dl className="w-full max-w-xs space-y-1.5 text-sm">
              {totalTax > 0 && !linesAreTaxInclusive ? (
                <>
                  <div className="flex items-baseline justify-between gap-8 text-muted-foreground">
                    <dt>Subtotal</dt>
                    <dd className="tabular-nums">{formatMoney(subtotalSum, currency)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-8 text-muted-foreground">
                    <dt>Tax</dt>
                    <dd className="tabular-nums">{formatMoney(totalTax, currency)}</dd>
                  </div>
                </>
              ) : null}
              <div className="flex items-baseline justify-between gap-8 border-t pt-2 font-medium text-foreground">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatMoney(total, currency)}</dd>
              </div>
              {totalTax > 0 && linesAreTaxInclusive ? (
                <p className="text-right text-xs font-normal text-muted-foreground">
                  Includes {formatMoney(totalTax, currency)} tax
                </p>
              ) : null}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}

function UomSelect({
  lineId,
  productId,
  productName,
  value,
  onChange,
  packagingForProduct = [],
  catalogUomCodes = [],
  fmcgOrg = false,
  baseUom = "PCS",
  onPackagingUpdated,
}: {
  lineId: string;
  productId: string;
  productName?: string;
  value: string;
  onChange: (lineId: string, uom: string) => void;
  packagingForProduct?: ProductPackaging[];
  catalogUomCodes?: string[];
  fmcgOrg?: boolean;
  baseUom?: string;
  onPackagingUpdated?: (productId: string, items: ProductPackaging[]) => void;
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

  const [menuOpen, setMenuOpen] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);

  return (
    <>
      <Select
        open={menuOpen}
        onOpenChange={setMenuOpen}
        value={selectValue}
        onValueChange={(v) => onChange(lineId, v)}
      >
        <SelectTrigger className="h-8 w-full min-w-0 px-2">
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
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => {
                  setMenuOpen(false);
                  setAddOpen(true);
                }}
              >
                <Icons.Plus className="h-3.5 w-3.5 shrink-0" />
                Add pack UOM…
              </button>
            </div>
          ) : null}
        </SelectContent>
      </Select>
      {fmcgOrg && productId ? (
        <AddPackUomDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          productId={productId}
          productName={productName}
          baseUom={baseUom}
          onSaved={(items, uom) => {
            onPackagingUpdated?.(productId, items);
            onChange(lineId, uom);
          }}
        />
      ) : null}
    </>
  );
}
