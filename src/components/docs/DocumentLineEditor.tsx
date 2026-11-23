"use client";
import { salesUnitFromPackSizeInName, retailPackPricingRows } from "@/lib/docs/finished-goods-sales-unit";
import { Table as InteractiveTable } from "@/components/ui/table";


import * as React from "react";
import { productMatchesSearch, preferExactProductIdentifiers, splitProductSearchQuantity } from "@/lib/products/product-search";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  getProductById,
  fetchFinishedGoodsPage,
  fetchProductsForDocumentLines,
  setProductsCache,
  subscribeProductsCache,
} from "@/lib/data/products.repo";
import { displayItemCode, numericItemCodeSort } from "@/lib/products/item-code";
import type { ProductRow } from "@/lib/types/masters";
import { fetchProductApi, fetchProductsApi, fetchProductsPageApi } from "@/lib/api/products";
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
import { activeDocumentAlternates, defaultDocumentLineUom, documentLineBaseUom } from "@/lib/docs/default-line-uom";
import { AddPackUomDialog } from "@/components/docs/AddPackUomDialog";
import { cn } from "@/lib/utils";
import { CAPS_ON_PRODUCT_CLASS } from "@/lib/org/product-text";
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
import { fetchProductVariantsApi, fetchDocumentProductDataApi } from "@/lib/api/product-master";
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
  /** Local UI revision only; never included in document payloads. */
  appliedPricingRevision?: number;
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
  /**
   * Lists every active finished good inline with a zero quantity.
   * Users enter quantities directly; no add-products dialog is needed.
   */
  sheetFinishedGoods?: boolean;
  lineByLine?: boolean;
  /** Increment only on an intentional customer/price-tag change, never on initial hydration. */
  repriceExistingRevision?: number;
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
   * Override the Qty and Base qty column labels + help tooltips. Pass when the doc type gives these
   * columns specific meaning — e.g. for GRN: received quantity and the original PO quantity.
   */
  lineColumnLabels?: {
    qtyHeader: string;
    qtyTooltip: string;
    baseQtyHeader: string;
    baseQtyBasis?: "stock" | "ordered";
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
  /** Manufacturer and bakery plants. The picker lists finished goods, raw materials, and packaging. */
  plantCatalogue?: boolean;
  packSizeFromName?: boolean;
  /** Load packaging / pricing for products just added from the picker. */
  onProductsAdded?: (productIds: string[]) => void;
  /** FMCG: a pack was saved from the line UOM menu. Replace that product's packaging. */
  onPackagingUpdated?: (productId: string, items: ProductPackaging[]) => void;
  /** Fires when the sellable/purchasable product catalog finishes loading (or is not needed). */
  onCatalogReadyChange?: (ready: boolean) => void;
  onDocumentProductData?: (data: Awaited<ReturnType<typeof fetchDocumentProductDataApi>>) => void;
  /** Products the chosen store cannot cover. Those rows are outlined in red. */
  stockShortByProductId?: Record<string, { need: number; available: number }>;
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

function productMatchesLineSearch(p: ProductRow, query: string): boolean {
  return !query.trim() || productMatchesSearch(p, query);
}

function defaultLineUom(
  packaging: ProductPackaging[],
  mode: "sales" | "purchasing",
  product: Pick<ProductRow, "unit" | "baseUom">,
  fmcgOrg: boolean
): string {
  return defaultDocumentLineUom({
    packaging,
    mode,
    baseUom: product.baseUom,
    unit: product.unit,
    fmcgOrg,
  });
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
  sheetFinishedGoods = false,
  lineByLine = false,
  repriceExistingRevision = 0,
  taxCodes = [],
  defaultLineTaxCodeId,
  linesAreTaxInclusive = false,
  lineColumnLabels,
  dailyPricesByProductId,
  catalogPricesByProductId,
  fmcgCatalogByProductId,
  fmcgOrg = false,
  plantCatalogue = false,
  packSizeFromName = false,
  onProductsAdded,
  onPackagingUpdated,
  onCatalogReadyChange,
  onDocumentProductData,
  stockShortByProductId,
}: DocumentLineEditorProps) {
  const inlineCatalogue = lineByLine && !fmcgOrg;
  const linesRef = React.useRef(lines);
  linesRef.current = lines;
  const editorRef = React.useRef<HTMLDivElement | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const searchResultsId = React.useId();
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
  const [remoteSearchKey, setRemoteSearchKey] = React.useState("");
  const [pickedProducts, setPickedProducts] = React.useState<Map<string, ProductRow>>(() => new Map());
  const [qtyDraftByProductId, setQtyDraftByProductId] = React.useState<Record<string, string>>({});
  /** Further catalogue pages after the first 100, for browsing without a product name. */
  const [browseCursor, setBrowseCursor] = React.useState<string | null>(null);
  const [browseHasMore, setBrowseHasMore] = React.useState(false);
  const [browseLoading, setBrowseLoading] = React.useState(false);
  const searchListRef = React.useRef<HTMLDivElement | null>(null);
  const browseSentinelRef = React.useRef<HTMLDivElement | null>(null);
  const browsePagingRef = React.useRef(false);
  /** Inline sales sheet: next catalogue page, or null once every finished good is loaded. */
  const [sheetCursor, setSheetCursor] = React.useState<string | null>(null);
  const sheetGenerationRef = React.useRef(0);

  React.useEffect(() => {
    if (!fmcgOrg || !swapLineId) return;
    const id = window.setTimeout(() => searchInputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [fmcgOrg, swapLineId]);

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
    const partial = raw === "" && (sheetFinishedGoods || lineByLine) ? 0 : parsePartialDecimalString(raw);
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
  const [catalogError, setCatalogError] = React.useState(false);
  const [sheetCatalogReady, setSheetCatalogReady] = React.useState(false);
  const [catalogRetry, setCatalogRetry] = React.useState(0);
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
  const variantsPending = React.useRef(new Set<string>());
  const ensureVariantsLoaded = React.useCallback((productId: string) => {
    if (variantsByProductId[productId] !== undefined || variantsPending.current.has(productId)) return;
    variantsPending.current.add(productId);
    fetchProductVariantsApi(productId)
      .then((items) => setVariantsByProductId((prev) => ({ ...prev, [productId]: items })))
      .catch(() => setVariantsByProductId((prev) => ({ ...prev, [productId]: [] })))
      .finally(() => variantsPending.current.delete(productId));
  }, [variantsByProductId]);

  React.useEffect(() => {
    if (!fmcgOrg || !isApiConfigured()) return;
    const productIds = [...new Set(lines.map((line) => line.productId).filter(Boolean))];
    for (const productId of productIds) {
      ensureVariantsLoaded(productId);
      const cached = products.find((p) => p.id === productId) ?? getProductById(productId);
      if (resolveFmcgProductSizeLabel(cached, variantsByProductId[productId])) continue;
      void fetchProductApi(productId)
        .then((full) => {
          if (full) mergeProductIntoCache(full);
        })
        .catch(() => {});
    }
  }, [ensureVariantsLoaded, fmcgOrg, lines, products, variantsByProductId]);

  const catalogueLinesRef = React.useRef(lines);
  catalogueLinesRef.current = lines;
  const documentDataCallbackRef = React.useRef(onDocumentProductData);
  documentDataCallbackRef.current = onDocumentProductData;

  React.useEffect(() => {
    if (!productFilter || productFilter === "all") {
      setFilteredProducts(null);
      setBrowseCursor(null);
      setBrowseHasMore(false);
      return;
    }
    let cancelled = false;
    setCatalogError(false);
    setSheetCatalogReady(false);
    setFilteredProducts(null);
    setBrowseCursor(null);
    setBrowseHasMore(false);
    browsePagingRef.current = false;
    setSheetCursor(null);
    sheetGenerationRef.current += 1;
    let nextSheetCursor: string | null = null;
    const load = sheetFinishedGoods
      ? fetchFinishedGoodsPage({ finishedGoodsOnly: packSizeFromName }).then((page) => {
          nextSheetCursor = page.nextCursor;
          return page.items;
        })
      : fetchProductsForDocumentLines(productFilter);
    load
      .then(async (rows) => {
        if (sheetFinishedGoods && isApiConfigured()) {
          const ids = [...rows.map((p) => p.id), ...catalogueLinesRef.current.map((line) => line.productId)];
          const data = await fetchDocumentProductDataApi(ids);
          if (cancelled) return;
          documentDataCallbackRef.current?.(data);
        }
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
          setSheetCursor(sheetFinishedGoods ? nextSheetCursor : null);
          setSheetCatalogReady(sheetFinishedGoods);
          const canBrowse = lineByLine && fmcgOrg && !sheetFinishedGoods && rows.length >= 100;
          setBrowseCursor(canBrowse ? String(rows.length) : null);
          setBrowseHasMore(canBrowse);
        }
      })
      .catch(() => {
        if (!cancelled) { setFilteredProducts([]); setCatalogError(true); setBrowseHasMore(false); setBrowseCursor(null); }
      });
    return () => {
      cancelled = true;
    };
  }, [productFilter, mode, sheetFinishedGoods, packSizeFromName, catalogRetry, lineByLine, fmcgOrg]);

  React.useEffect(() => {
    const catalogReady = !catalogError && (!productFilter || productFilter === "all" || filteredProducts !== null);
    onCatalogReadyChange?.(catalogReady);
  }, [productFilter, filteredProducts, onCatalogReadyChange, catalogError]);

  const loadMoreBrowse = React.useCallback(async () => {
    if (!lineByLine || !fmcgOrg || sheetFinishedGoods) return;
    if (!browseHasMore || browseCursor == null || browsePagingRef.current) return;
    if (!isApiConfigured() || !productFilter || productFilter === "all") return;
    browsePagingRef.current = true;
    setBrowseLoading(true);
    try {
      const page = await fetchProductsPageApi({
        purchasable: productFilter === "purchasable" ? true : undefined,
        sellable: productFilter === "sellable" ? true : undefined,
        limit: 100,
        cursor: browseCursor,
        includeStock: false,
      });
      if (!page.items.length || page.nextCursor === browseCursor) {
        setBrowseHasMore(false);
        setBrowseCursor(null);
        return;
      }
      setFilteredProducts((prev) => {
        const seen = new Set((prev ?? []).map((row) => row.id));
        const added = page.items.filter((item) => !seen.has(item.id));
        if (!added.length) return prev ?? [];
        return [...(prev ?? []), ...added];
      });
      setBrowseCursor(page.hasMore ? page.nextCursor : null);
      setBrowseHasMore(page.hasMore && page.nextCursor != null);
    } catch {
      setBrowseHasMore(false);
      setBrowseCursor(null);
    } finally {
      browsePagingRef.current = false;
      setBrowseLoading(false);
    }
  }, [browseCursor, browseHasMore, fmcgOrg, lineByLine, productFilter, sheetFinishedGoods]);

  const filteredProductsRef = React.useRef(filteredProducts);
  filteredProductsRef.current = filteredProducts;

  /** Add sheet rows after their packaging and prices are known, so a new row never shows an unpriced total. */
  const appendSheetProducts = React.useCallback(async (rows: ProductRow[], generation: number) => {
    const seen = new Set((filteredProductsRef.current ?? []).map((row) => row.id));
    const added = rows.filter((row) => !seen.has(row.id));
    if (!added.length) return;
    if (isApiConfigured()) {
      const data = await fetchDocumentProductDataApi(added.map((row) => row.id));
      if (generation !== sheetGenerationRef.current) return;
      documentDataCallbackRef.current?.(data);
    }
    if (generation !== sheetGenerationRef.current) return;
    setFilteredProducts((prev) => {
      const ids = new Set((prev ?? []).map((row) => row.id));
      return [...(prev ?? []), ...added.filter((row) => !ids.has(row.id))];
    });
  }, []);

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
        const product = products.find((p) => p.id === productId) ?? getProductById(productId);
        const rows = packSizeFromName ? retailPackPricingRows(product, packaging, fmcgCatalogByProductId?.[productId]?.packPrices) : packaging;
        const unitsPer = resolveUnitsPerPiece(uom, rows, product?.baseUom ?? product?.unit);
        return Math.round(qty * unitsPer * 1000) / 1000;
      }
      return getBaseQty(productId, uom, qty, packaging);
    },
    [fmcgOrg, packSizeFromName, fmcgCatalogByProductId, packagingByProductId, products]
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
      const unitsPer = computeBaseQty(productId, uom, 1);
      const daily = dailyPricesByProductId?.[productId];
      if (daily?.effectivePrice != null && daily.effectivePrice > 0) {
        const label = daily.isStale
          ? `⚠ Stale${daily.fallbackDate ? ` (${daily.fallbackDate})` : ""}`
          : "Daily price";
        return { price: daily.effectivePrice * unitsPer, reason: label };
      }
      const fmcgItem = fmcgCatalogByProductId?.[productId];
      if (fmcgItem?.pricePerPiece != null && fmcgItem.pricePerPiece > 0) {
        const product = products.find((p) => p.id === productId) ?? getProductById(productId);
        const resolved = resolveFmcgClientLinePrice({
          pricePerPiece: fmcgItem.pricePerPiece,
          uom,
          quantity: qty,
          discountPercent:
            discountOverride != null && Number.isFinite(discountOverride)
              ? discountOverride
              : fmcgItem.discountPercent,
          packaging: packSizeFromName
            ? retailPackPricingRows(product, packagingByProductId?.[productId], fmcgItem.packPrices)
            : packagingByProductId?.[productId],
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
      const tier = getPriceForLine(productId, priceListIdResolved, qty, uom, pricingByProductId?.[productId]);
      if (tier.price > 0) return tier;
      const product = products.find((p) => p.id === productId) ?? getProductById(productId);
      const baseUom = documentLineBaseUom(product ?? {}, fmcgOrg);
      if (uom !== baseUom) {
        const baseTier = getPriceForLine(productId, priceListIdResolved, qty * unitsPer, baseUom, pricingByProductId?.[productId]);
        if (baseTier.price > 0) return { ...baseTier, price: baseTier.price * unitsPer };
      }
      const catalog = catalogPricesByProductId?.[productId];
      if (catalog != null && catalog > 0) {
        return { price: catalog * unitsPer, reason: "Price list" };
      }
      if (daily && daily.effectivePrice == null && catalog == null && !fmcgItem) {
        return { price: 0, reason: "Not priced on list" };
      }
      return tier;
    },
    [
      useCostPricing,
      computeBaseQty,
      fmcgOrg,
      packSizeFromName,
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
    (items: Array<CatalogAddItem & { lineId?: string }>, replaceLineId?: string, focusQty = true) => {
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
          const q = item.qty === 0 ? 0 : Number.isFinite(item.qty) && item.qty > 0 ? item.qty : 1;
          const priceQty = q > 0 ? q : 1;
          if (!item.asNewLine) {
            const idx = next.findIndex((l) => l.productId === item.product.id);
            if (idx >= 0) {
              const line = next[idx]!;
              const qty = q === 0 ? line.qty : line.qty + q;
              const baseQty = qty > 0 ? computeBaseQty(line.productId, line.uom, qty) : 0;
              let merged: DocumentLine;
              if (useCostPricing || isPreservedCommercialLine(line)) {
                merged = { ...line, qty, baseQty, amount: qty * line.price };
              } else {
                const { price, reason, discount } = resolvePrice(line.productId, qty > 0 ? qty : 1, line.uom, line.discount);
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
          // Quantity-sheet rows start in the SKU's own unit, as before batching.
          // A pack (PK/CTN) is an explicit selection, never a timing-dependent default.
          const nameRuleUnit = packSizeFromName ? salesUnitFromPackSizeInName(p, packaging, fmcgCatalogByProductId?.[p.id]?.packPrices) : undefined;
          const uom = nameRuleUnit ?? (sheetFinishedGoods ? documentLineBaseUom(p, fmcgOrg) : defaultLineUom(packaging, mode, p, fmcgOrg));
          const baseQty = q > 0 ? computeBaseQty(p.id, uom, q) : 0;
          const { price, reason, discount } = resolvePrice(p.id, priceQty, uom);
          const draft: DocumentLine = {
            id: item.lineId ?? `line-${stamp}-${i}-${Math.random().toString(36).slice(2, 9)}`,
            productId: p.id,
            sku: displayItemCode(p) || p.sku,
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
      sheetFinishedGoods,
      packSizeFromName,
      fmcgCatalogByProductId,
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
        } else if (!useCostPricing && patch.price == null && !isPreservedCommercialLine(next)) {
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

  React.useEffect(() => {
    if (!repriceExistingRevision) return;
    onLinesChangeRef.current((prev) => {
      let changed = false;
      const next = prev.map((line) => {
        if (line.appliedPricingRevision === repriceExistingRevision) return line;
        changed = true;
        return { ...line, priceReason: "Customer price tag", discount: undefined, appliedPricingRevision: repriceExistingRevision };
      });
      return changed ? next : prev;
    });
  }, [repriceExistingRevision, lineProductIdsKey]);

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
        const priceQty = l.qty > 0 ? l.qty : 1;
        const nextBaseQty = l.qty > 0 ? computeBaseQty(l.productId, l.uom, l.qty) : 0;
        if (isPreservedCommercialLine(l)) {
          if (nextBaseQty === l.baseQty) return l;
          changed = true;
          return { ...l, baseQty: nextBaseQty };
        }
        // Keep line Disc% when set (edit / manual); otherwise use price-tag default.
        const { price, reason, discount } = resolvePriceRef.current(
          l.productId,
          priceQty,
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
    repriceExistingRevision,
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
      const uom = (packSizeFromName ? salesUnitFromPackSizeInName(row, packaging, fmcgCatalogByProductId?.[row.id]?.packPrices) : undefined) ??
        defaultLineUom(packaging, mode, row, fmcgOrg);
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
      const previousFactor = computeBaseQty(line.productId, line.uom, 1);
      const nextFactor = computeBaseQty(line.productId, uom, 1);
      const price = Math.round(line.price * nextFactor / previousFactor * 100) / 100;
      updateLine(lineId, { uom, baseQty, price, amount: line.qty * price });
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

  React.useEffect(() => {
    if (lineByLine && !productListLoading && document.activeElement === document.body) {
      searchInputRef.current?.focus();
    }
  }, [lineByLine, productListLoading]);

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
      if (useCostPricing) return "";
      const packaging = packagingByProductId?.[p.id] ?? [];
      const uom = (packSizeFromName ? salesUnitFromPackSizeInName(p, packaging, fmcgCatalogByProductId?.[p.id]?.packPrices) : undefined) ??
        defaultLineUom(packaging, mode, p, fmcgOrg);
      const { price } = resolvePrice(p.id, 1, uom);
      return formatMoney(price, currency);
    },
    [currency, fmcgOrg, fmcgCatalogByProductId, packSizeFromName, mode, packagingByProductId, resolvePrice, useCostPricing]
  );

  const searchSplit = splitProductSearchQuantity(searchQuery);
  const inChip = React.useCallback(
    (p: ProductRow) => !categoryChip || productGroupKey(p) === categoryChip,
    [categoryChip, productGroupKey]
  );
  const strippedMatchesLocal = Boolean(
    searchSplit.stripped &&
      products.some((p) => inChip(p) && productMatchesLineSearch(p, searchSplit.stripped!))
  );
  const remoteSupportsQty = Boolean(
    remoteSearchKey === searchSplit.text && searchSplit.stripped &&
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
          (sheetFinishedGoods
            ? fetchFinishedGoodsPage({ finishedGoodsOnly: packSizeFromName, search, limit: 30 }).then((page) => page.items)
            : fetchProductsApi({
                purchasable: productFilter === "purchasable" ? true : undefined,
                sellable: productFilter === "sellable" ? true : undefined,
                search,
                limit: 30,
                includeStock: false,
              })
          ).catch(() => [] as ProductRow[])
        )
      ).then((pages) => {
        if (cancelled) return;
        const byId = new Map<string, ProductRow>();
        for (const page of pages) for (const row of page) byId.set(row.id, row);
        setRemoteSearchKey(searchSplit.text);
        setRemoteMatches([...byId.values()]);
      });
    }, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [packSizeFromName, productFilter, searchOpen, searchSplit.stripped, searchSplit.text, sheetFinishedGoods]);

  const browsingCatalogue = lineByLine && fmcgOrg && !queryForList.trim();
  const searchResults = React.useMemo(() => {
    const byId = new Map<string, ProductRow>();
    for (const p of products) byId.set(p.id, p);
    if (remoteSearchKey === searchSplit.text) for (const p of remoteMatches) byId.set(p.id, p);
    const q = queryForList.trim();
    const finishedOnly = sheetFinishedGoods && packSizeFromName;
    const ranked = preferExactProductIdentifiers([...byId.values()]
      .filter((p) => {
        if (finishedOnly && p.itemRole && p.itemRole !== "FINISHED") return false;
        return inChip(p) && (!q || (remoteSearchKey === searchSplit.text && remoteMatches.some((item) => item.id === p.id)) || productMatchesLineSearch(p, q));
      }), q)
      .sort((a, b) => a.name.localeCompare(b.name));
    return browsingCatalogue ? ranked : ranked.slice(0, q ? 40 : 30);
  }, [browsingCatalogue, inChip, packSizeFromName, products, queryForList, remoteMatches, remoteSearchKey, searchSplit.text, sheetFinishedGoods]);

  React.useEffect(() => {
    setHighlightIndex(0);
  }, [searchQuery, categoryChip]);

  React.useEffect(() => {
    if (!searchOpen || !browsingCatalogue || !browseHasMore || browseLoading) return;
    const root = searchListRef.current;
    const sentinel = browseSentinelRef.current;
    if (!root || !sentinel || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMoreBrowse();
      },
      { root, rootMargin: "120px" }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [searchOpen, browsingCatalogue, browseHasMore, browseLoading, loadMoreBrowse, searchResults.length]);

  React.useEffect(() => {
    if (!lineByLine || !searchOpen || highlightIndex === 0) return;
    document.getElementById(`${searchResultsId}-${highlightIndex}`)?.scrollIntoView?.({ block: "nearest" });
  }, [lineByLine, searchOpen, searchResultsId, highlightIndex]);

  React.useEffect(() => {
    if (!pendingQtyFocusId) return;
    const id = pendingQtyFocusId;
    const timer = window.setTimeout(() => {
      const el = Array.from(editorRef.current?.querySelectorAll<HTMLInputElement>("[data-line-qty]") ?? [])
        .find((input) => input.dataset.lineQty === id);
      if (!el) return;
      el.focus();
      if (lineByLine) el.select();
      else window.setTimeout(() => el.select(), 30);
      el.closest("[data-line-row]")?.scrollIntoView?.({ block: "nearest" });
      setPendingQtyFocusId(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [lines, pendingQtyFocusId, lineByLine]);

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

  const draftQty = (productId: string): number | null => {
    const raw = qtyDraftByProductId[productId];
    if (raw == null || raw.trim() === "") return null;
    const n = parseDecimalString(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const addFromSearch = (product: ProductRow, keepSearch: boolean) => {
    const replacing = swapLineId;
    const typedQty = draftQty(product.id);
    const lineId = lineByLine && !replacing ? `line-${Date.now()}-${Math.random().toString(36).slice(2, 9)}` : undefined;
    const qty = qtyForAdd && qtyForAdd > 0 ? qtyForAdd : typedQty ?? (lineByLine ? 0 : 1);
    const addedWithRowQty = typedQty != null && !(qtyForAdd && qtyForAdd > 0) && !replacing;
    commitProducts([{ product, qty, asNewLine: lineByLine, lineId }], replacing ?? undefined, !lineId && (!keepSearch || Boolean(replacing)) && !addedWithRowQty);
    if (lineId && !addedWithRowQty) setPendingQtyFocusId(lineId);
    if (addedWithRowQty) {
      setQtyDraftByProductId((prev) => {
        if (!(product.id in prev)) return prev;
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
    }
    setPickedProducts((prev) => {
      if (!prev.has(product.id)) return prev;
      const next = new Map(prev);
      next.delete(product.id);
      return next;
    });
    setSearchQuery("");
    setCategoryChip(null);
    if ((keepSearch && !replacing) || addedWithRowQty) {
      setSearchOpen(true);
      searchInputRef.current?.focus();
    } else {
      setSearchOpen(false);
    }
  };

  const togglePickedProduct = (product: ProductRow) => {
    setPickedProducts((prev) => {
      const next = new Map(prev);
      if (next.has(product.id)) next.delete(product.id);
      else next.set(product.id, product);
      return next;
    });
    setSearchOpen(true);
  };

  const addPickedProducts = () => {
    const items = [...pickedProducts.values()];
    if (!items.length || swapLineId) return;
    const stamp = Date.now();
    const qtyFor = (product: ProductRow) => draftQty(product.id) ?? (qtyForAdd && qtyForAdd > 0 ? qtyForAdd : lineByLine ? 0 : 1);
    const firstQty = qtyFor(items[0]!);
    const firstId = lineByLine && !(firstQty > 0) ? `line-${stamp}-0` : undefined;
    commitProducts(
      items.map((product, i) => ({
        product,
        qty: qtyFor(product),
        asNewLine: lineByLine,
        lineId: lineByLine ? `line-${stamp}-${i}` : undefined,
      })),
      undefined,
      !lineByLine
    );
    if (firstId) setPendingQtyFocusId(firstId);
    setPickedProducts(new Map());
    setQtyDraftByProductId((prev) => {
      const next = { ...prev };
      for (const product of items) delete next[product.id];
      return next;
    });
    setSearchQuery("");
    setCategoryChip(null);
    setSearchOpen(false);
  };

  const displayedLines = React.useMemo(() => {
    if (!sheetFinishedGoods) return lines;
    const productsById = new Map(products.map((product) => [product.id, product]));
    return lines
      .map((line, index) => ({
        line,
        index,
        code: numericItemCodeSort({ sku: line.sku, code: productsById.get(line.productId)?.code }),
      }))
      .sort((a, b) => a.code - b.code || a.index - b.index)
      .map(({ line }) => line);
  }, [lines, products, sheetFinishedGoods]);

  React.useEffect(() => {
    const query = searchQuery.trim();
    if (!sheetFinishedGoods || !sheetCatalogReady || sheetCursor == null || !query || !isApiConfigured()) return;
    const generation = sheetGenerationRef.current;
    const timer = window.setTimeout(() => {
      void fetchFinishedGoodsPage({ finishedGoodsOnly: packSizeFromName, search: query, limit: 30 })
        .then((page) => appendSheetProducts(page.items, generation))
        .catch(() => {});
    }, 250);
    return () => {
      window.clearTimeout(timer);
    };
  }, [appendSheetProducts, packSizeFromName, searchQuery, sheetCatalogReady, sheetCursor, sheetFinishedGoods]);

  const moveFieldFocus = (lineId: string, field: "qty" | "price", dir: -1 | 1) => {
    const idx = displayedLines.findIndex((l) => l.id === lineId);
    const next = displayedLines[idx + dir];
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
    if (event.nativeEvent.isComposing) return;
    if (lineByLine && field === "qty" && event.key === "Enter") {
      event.preventDefault();
      const qty = parseDecimalString(event.currentTarget.value);
      if (Number.isFinite(qty) && qty > 0) searchInputRef.current?.focus();
      return;
    }
    if (event.key === "ArrowUp" || event.key === "ArrowDown" || (sheetFinishedGoods && event.key === "Enter" && !event.shiftKey)) {
      event.preventDefault();
      moveFieldFocus(lineId, field, event.key === "ArrowUp" ? -1 : 1);
    }
  };

  const onEditorKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (inlineCatalogue) return;
    if (event.key !== "Enter" || !event.shiftKey) return;
    if (productPickerOpen) return;
    if (document.querySelector("[data-radix-select-content]")) return;
    event.preventDefault();
    if (sheetFinishedGoods || (fmcgOrg && !swapLineId)) {
      setProductPickerOpen(true);
      return;
    }
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
    if (event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!inlineCatalogue && !searchQuery.trim()) return;
      setSearchOpen(true);
      setHighlightIndex((i) => searchOpen ? Math.min(i + 1, Math.max(searchResults.length - 1, 0)) : 0);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!inlineCatalogue && !searchQuery.trim()) return;
      setSearchOpen(true);
      setHighlightIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (event.key === "Escape") {
      setSearchOpen(false);
      setSwapLineId(null);
      setPickedProducts(new Map());
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const product = searchResults[highlightIndex];
      if (product && (!lineByLine || searchOpen)) addFromSearch(product, false);
    }
  };

  const LineTable = sheetFinishedGoods || lineByLine ? "table" : InteractiveTable;
  const showChips = !lineByLine && searchOpen && !searchQuery.trim() && groupOptions.length > 0;
  const swapLine = swapLineId ? lines.find((l) => l.id === swapLineId) : undefined;

  const composer = (
      <div data-line-composer className={cn("relative space-y-2", inlineCatalogue && "rounded-lg border bg-muted/20 p-3")}>
        <div className={cn("flex items-center gap-2", !inlineCatalogue && "max-w-md")}>
          <div className="relative min-w-0 flex-1">
            <Icons.Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              value={searchQuery}
              disabled={productListLoading}
              placeholder={productListLoading ? "Loading products…" : "Search name, product code, SKU or barcode"}
              className="h-9 pl-9"
              onChange={(e) => {
                const value = e.target.value;
                setSearchQuery(value);
                if (!value.trim()) setCategoryChip(null);
                setSearchOpen(inlineCatalogue || Boolean(value.trim()));
              }}
              onFocus={() => {
                if (inlineCatalogue || searchQuery.trim()) setSearchOpen(true);
              }}
              onKeyDown={onSearchKeyDown}
              autoComplete="off"
              enterKeyHint={lineByLine ? "next" : undefined}
              aria-label="Search products to add"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={searchOpen}
              aria-controls={searchOpen ? searchResultsId : undefined}
              aria-activedescendant={searchOpen && searchResults[highlightIndex] ? `${searchResultsId}-${highlightIndex}` : undefined}
            />
          </div>
          {!inlineCatalogue ? (
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
          ) : null}
        </div>
        {inlineCatalogue ? (
          <p className="text-xs text-muted-foreground">Scroll the list to find a product. Enter the quantity on the right, then select it. Tick several to add them together.</p>
        ) : sheetFinishedGoods || (fmcgOrg && !swapLineId) ? null : (
        <p className="text-xs text-muted-foreground">
          <kbd className="rounded border px-1 py-0.5 font-mono text-[10px]">Shift+Enter</kbd> new line
          <span className="mx-1.5">·</span>
          Add a quantity explicitly, like seasoning x 24
        </p>
        )}
        {swapLine ? (
          <p className="text-xs text-muted-foreground">
            Replacing {swapLine.name}. Pick a product, or press Escape to keep it.
          </p>
        ) : null}
        {searchOpen ? (
          <div className={cn("absolute left-0 top-full z-40 mt-1 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg", inlineCatalogue ? "right-0" : "w-full max-w-md")}>
          <div
            ref={searchListRef}
            id={searchResultsId}
            role="listbox"
            aria-label="Matching products"
            className="max-h-72 overflow-y-auto"
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
              <p role="status" className="p-3 text-sm text-muted-foreground">No products match.</p>
            ) : (
              <ul role="presentation">
                {searchResults.map((p, index) => (
                  <li key={p.id} role="presentation" className="flex items-center gap-2 pl-2 pr-2">
                    {!swapLineId ? (
                      <Checkbox
                        className="mt-0"
                        checked={pickedProducts.has(p.id)}
                        onCheckedChange={() => togglePickedProduct(p)}
                        onMouseDown={(e) => e.preventDefault()}
                        aria-label={`Select ${p.name}`}
                      />
                    ) : null}
                    <button
                      type="button"
                      id={`${searchResultsId}-${index}`}
                      role="option"
                      aria-selected={index === highlightIndex}
                      tabIndex={-1}
                      className={cn(
                        "flex min-w-0 flex-1 items-start gap-3 px-3 py-2 text-left",
                        index === highlightIndex ? "bg-muted" : "hover:bg-muted/60"
                      )}
                      onMouseEnter={() => setHighlightIndex(index)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => addFromSearch(p, false)}
                    >
                      <span className="min-w-0 flex-1">
                        <span className={cn("block text-sm font-medium leading-snug", CAPS_ON_PRODUCT_CLASS)}>{p.name}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {[p.sku, p.size?.trim(), productGroupLabel(productGroupKey(p))]
                            .filter(Boolean)
                            .join(" · ")}
                          {qtyForAdd ? ` · Add at qty ${qtyForAdd}` : ""}
                        </span>
                      </span>
                    </button>
                    {priceLabelFor(p) ? (
                      <span className="shrink-0 text-sm tabular-nums">{priceLabelFor(p)}</span>
                    ) : null}
                    {lineByLine ? (
                      <Input
                        className="h-8 w-[4.5rem] shrink-0 px-2 text-right tabular-nums"
                        inputMode="decimal"
                        placeholder="Qty"
                        aria-label={`Order quantity for ${p.name}`}
                        value={qtyDraftByProductId[p.id] ?? ""}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const raw = sanitizeDecimalInput(e.target.value);
                          setQtyDraftByProductId((prev) => ({ ...prev, [p.id]: raw }));
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter") return;
                          e.preventDefault();
                          e.stopPropagation();
                          if (draftQty(p.id) == null) return;
                          addFromSearch(p, true);
                        }}
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            {browsingCatalogue && (browseLoading || browseHasMore) ? (
              <div ref={browseSentinelRef} className="px-3 py-2 text-center">
                {browseLoading ? (
                  <p className="text-xs text-muted-foreground">Loading more products…</p>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => void loadMoreBrowse()}
                  >
                    Load more products
                  </Button>
                )}
              </div>
            ) : null}
          </div>
          {!swapLineId ? (
            <div className="flex items-center justify-between gap-2 border-t px-3 py-2">
              <span className="text-xs text-muted-foreground">
                {pickedProducts.size === 0 ? "Tick products to add several at once" : `${pickedProducts.size} selected`}
                {pickedProducts.size > 0 ? (
                  <button
                    type="button"
                    className="ml-2 underline underline-offset-2 hover:text-foreground"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setPickedProducts(new Map())}
                  >
                    Clear
                  </button>
                ) : null}
              </span>
              <Button
                type="button"
                size="sm"
                disabled={pickedProducts.size === 0}
                onMouseDown={(e) => e.preventDefault()}
                onClick={addPickedProducts}
              >
                {pickedProducts.size === 0
                  ? "Add selected"
                  : `Add ${pickedProducts.size} ${pickedProducts.size === 1 ? "product" : "products"}`}
              </Button>
            </div>
          ) : null}
          </div>
        ) : null}
      </div>
  );

  return (
    <div ref={editorRef} className="min-w-0 space-y-3" onKeyDown={onEditorKeyDown}>
      <Label>{lineItemsLabel}</Label>
      {!inlineCatalogue ? composer : null}

      {!inlineCatalogue && <DocumentProductPickerSheet
        open={productPickerOpen}
        onOpenChange={setProductPickerOpen}
        sheetFinishedGoods={sheetFinishedGoods}
        productFilter={productFilter ?? (mode === "purchasing" ? "purchasable" : "sellable")}
        fmcgOrg={fmcgOrg}
        plantCatalogue={plantCatalogue}
        products={products}
        loading={productListLoading}
        priceLabel={priceLabelFor}
        groupKey={productGroupKey}
        groupLabel={productGroupLabel}
        groupOptions={groupOptions.map((key) => ({ key, label: productGroupLabel(key) }))}
        existingProductIds={lines.map((l) => l.productId)}
        onAddMany={(items) => commitProducts(items)}
      />}

      {(sheetFinishedGoods || lineByLine) && catalogError ? (
        <div role="alert" className="space-y-2 rounded border border-destructive p-3">
          <p>Could not load the product catalogue. Your entered quantities are preserved.</p>
          <Button type="button" variant="outline" onClick={() => setCatalogRetry((n) => n + 1)}>Retry catalogue</Button>
        </div>
      ) : null}
      {lines.length === 0 ? (
        inlineCatalogue ? composer : sheetFinishedGoods || fmcgOrg ? (
          <div className="flex items-center justify-center py-10" role="img" aria-label="No products selected">
            <Icons.PackageOpen className="h-9 w-9 text-muted-foreground/70" aria-hidden />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No lines yet. Search above to add the first product.</p>
        )
      ) : (
        <div className="min-w-0 space-y-2">
          <div className="min-w-0 overflow-hidden rounded-md border">
            <LineTable className="w-full table-fixed border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="w-24 px-2 py-2 font-medium">Item</th>
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
          {displayedLines.map((l) => {
            const product = products.find((p) => p.id === l.productId) ?? getProductById(l.productId);
            const nameRuleUnit = packSizeFromName && product
              ? salesUnitFromPackSizeInName(product, packagingByProductId?.[l.productId], fmcgCatalogByProductId?.[l.productId]?.packPrices)
              : undefined;
            const taxCode = taxCodes.find((t) => t.id === l.taxCodeId);
            const baseQtyShown = lineColumnLabels?.baseQtyBasis === "stock" ? l.baseQty : (l.poQty ?? l.baseQty);
            const baseUnitPrice = computeBaseUnitPrice(l);
            const lineVariants = variantsByProductId[l.productId] ?? [];
            const expanded = Boolean(expandedLineIds[l.id]);
            const taxRateLabel = taxCode ? `${taxCode.rate}%` : null;
            const itemId = (product ? displayItemCode(product) : l.sku) || l.sku;
            const colSpan = lineColumnLabels ? 8 : 7;
            const stockShort = stockShortByProductId?.[l.productId];
            return (
              <React.Fragment key={l.id}>
              <tr
                data-line-row
                data-stock-short={stockShort ? "" : undefined}
                className={cn(
                  "border-b align-middle",
                  stockShort && "bg-red-500/10 outline outline-1 -outline-offset-1 outline-red-500"
                )}
              >
                  <td className="px-2 py-2 align-middle">
                    <span className="block truncate text-sm tabular-nums" title={itemId || undefined}>
                      {itemId || "—"}
                    </span>
                  </td>
                  <td className="min-w-0 px-3 py-2">
                    <div className="flex min-w-0 items-start gap-1">
                      <button
                        type="button"
                        className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-expanded={expanded}
                        aria-label={expanded ? `Hide details for ${l.name}` : `Show details for ${l.name}`}
                        onClick={() => {
                          ensureVariantsLoaded(l.productId);
                          setExpandedLineIds((prev) => ({ ...prev, [l.id]: !prev[l.id] }));
                        }}
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
                          className={cn(
                            "line-clamp-2 text-left text-sm font-medium leading-snug hover:underline",
                            CAPS_ON_PRODUCT_CLASS
                          )}
                          onClick={() => {
                            setSwapLineId(l.id);
                            setSearchQuery("");
                            setSearchOpen(true);
                            searchInputRef.current?.focus();
                          }}
                        >
                          {l.name || product?.name || l.sku}
                        </button>
                        {taxRateLabel ? (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">{taxRateLabel}</p>
                        ) : null}
                        {stockShort ? (
                          <p className="mt-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                            Not enough stock: {stockShort.available} available, needs {stockShort.need}
                          </p>
                        ) : null}
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
                      value={lineByLine && l.qty === 0 && lineQtyValue(l) === "0" ? "" : lineQtyValue(l)}
                      placeholder={lineByLine ? "Qty" : undefined}
                      enterKeyHint={lineByLine ? "next" : undefined}
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
                      packagingForProduct={nameRuleUnit === "PACK"
                        ? retailPackPricingRows(product, packagingByProductId?.[l.productId], fmcgCatalogByProductId?.[l.productId]?.packPrices)
                        : packagingByProductId?.[l.productId]}
                      fmcgOrg={fmcgOrg}
                      baseUom={documentLineBaseUom(product ?? {}, fmcgOrg)}
                      equivalentUnit={nameRuleUnit === "PCS" ? nameRuleUnit : undefined}
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
                  <td className="px-2 py-2" data-sort-value={l.amount}>
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
                      {product?.grossWeightKg != null && (
                        <span className="text-xs text-muted-foreground">
                          Gross weight {(l.baseQty * product.grossWeightKg).toLocaleString(undefined, { maximumSignificantDigits: 10 })} kg
                        </span>
                      )}
                      {product?.grossVolumeM3 != null && (
                        <span className="text-xs text-muted-foreground">
                          Gross volume {(l.baseQty * product.grossVolumeM3).toLocaleString(undefined, { maximumSignificantDigits: 10 })} m³
                        </span>
                      )}
                    </div>
                  </div>
                    </td>
                  </tr>
                ) : null}
              </React.Fragment>
            );
          })}
              </tbody>
            </LineTable>
          </div>
          {inlineCatalogue ? composer : null}
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
  fmcgOrg = false,
  baseUom = "PCS",
  equivalentUnit,
  onPackagingUpdated,
}: {
  lineId: string;
  productId: string;
  productName?: string;
  value: string;
  onChange: (lineId: string, uom: string) => void;
  packagingForProduct?: ProductPackaging[];
  fmcgOrg?: boolean;
  baseUom?: string;
  equivalentUnit?: string;
  onPackagingUpdated?: (productId: string, items: ProductPackaging[]) => void;
}) {
  const selectValue = value.trim().toUpperCase() || baseUom;
  const options = [...new Set([
    equivalentUnit ?? baseUom,
    ...activeDocumentAlternates(packagingForProduct).map((row) => row.uom.trim().toUpperCase()),
  ])];
  const historicalUnit = !options.includes(selectValue);

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
          {historicalUnit && <SelectItem value={selectValue} disabled>{selectValue} (existing)</SelectItem>}
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
