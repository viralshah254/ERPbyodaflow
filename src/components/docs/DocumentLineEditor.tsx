"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormattedDecimalInput } from "@/components/ui/formatted-decimal-input";
import { formatDecimalDisplay, parseDecimalString } from "@/lib/decimal-input";
import { Label } from "@/components/ui/label";
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
import type { ProductPackaging, ProductPrice } from "@/lib/products/pricing-types";
import {
  listProducts,
  fetchProductsForDocumentLines,
  subscribeProductsCache,
} from "@/lib/data/products.repo";
import type { ProductRow } from "@/lib/types/masters";
import { fetchProductApi } from "@/lib/api/products";
import { isApiConfigured } from "@/lib/api/client";
import { fetchPriceListsForUi } from "@/lib/api/pricing";
import { getPriceForLine, getBaseQty } from "@/lib/products/price-resolver";
import { fetchProductVariantsApi } from "@/lib/api/product-master";
import type { ProductVariant } from "@/lib/products/types";
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
  amount: number;
  /** Computed tax amount for this line (0 when no tax code or rate is 0). */
  tax?: number;
  taxCodeId?: string;
  variantId?: string;
  variantSku?: string;
  /** When this line originates from a PO line, the PO line id for consumption tracking. */
  sourceLineId?: string;
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
  /** When true, unit prices already include VAT — tax is back-calculated. Default: false (tax-exclusive). */
  linesAreTaxInclusive?: boolean;
  /**
   * Org UOM catalog (Settings → UOM). Merged into each line’s UOM dropdown with product packaging UOMs.
   * Packaging defines units-per-base; the catalog ensures codes like KG appear even if packaging fetch failed.
   */
  catalogUomCodes?: string[];
}

const defaultPriceListId = "pl-retail";

/** Default UOM from product packaging (purchase vs sales). */
function pickDefaultUomFromPackaging(
  packaging: ProductPackaging[],
  mode: "sales" | "purchasing"
): string | undefined {
  if (!packaging.length) return undefined;
  if (mode === "purchasing") {
    const p = packaging.find((x) => x.isDefaultPurchaseUom);
    if (p) return p.uom;
  }
  const s = packaging.find((x) => x.isDefaultSalesUom);
  if (s) return s.uom;
  return packaging[0]?.uom;
}

function mergeLineUomOptions(
  packagingForProduct: ProductPackaging[] | undefined,
  catalogUomCodes: string[],
  currentValue?: string
): string[] {
  const fromPack = (packagingForProduct ?? []).map((p) => p.uom);
  const merged = new Set<string>([...fromPack, ...catalogUomCodes]);
  if (currentValue) merged.add(currentValue);
  const arr = [...merged].filter(Boolean);
  arr.sort((a, b) => a.localeCompare(b));
  return arr.length ? arr : ["EA"];
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
  linesAreTaxInclusive = false,
  catalogUomCodes = [],
}: DocumentLineEditorProps) {
  const linesRef = React.useRef(lines);
  linesRef.current = lines;

  const [filteredProducts, setFilteredProducts] = React.useState<ProductRow[] | null>(null);
  /** Re-subscribe when global product cache updates (hydrate) so defaultTaxCodeId etc. are fresh. */
  const cachedProducts = React.useSyncExternalStore(
    subscribeProductsCache,
    listProducts,
    () => []
  );
  const products = React.useMemo(() => {
    if (productFilter && productFilter !== "all") {
      return filteredProducts ?? cachedProducts;
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
        if (!cancelled) setFilteredProducts(rows);
      })
      .catch(() => {
        if (!cancelled) setFilteredProducts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [productFilter]);
  const [priceLists, setPriceLists] = React.useState<Awaited<ReturnType<typeof fetchPriceListsForUi>>>([]);
  React.useEffect(() => {
    fetchPriceListsForUi().then(setPriceLists).catch(() => {});
  }, []);
  const priceListIdResolved = useCostPricing ? "" : (priceListId || priceLists[0]?.id || "pl-retail");

  // Variants per product — loaded lazily when a product with variants is selected
  const [variantsByProductId, setVariantsByProductId] = React.useState<Record<string, ProductVariant[]>>({});
  const ensureVariantsLoaded = React.useCallback((productId: string) => {
    if (variantsByProductId[productId] !== undefined) return;
    fetchProductVariantsApi(productId)
      .then((items) => setVariantsByProductId((prev) => ({ ...prev, [productId]: items })))
      .catch(() => setVariantsByProductId((prev) => ({ ...prev, [productId]: [] })));
  }, [variantsByProductId]);

  const addRow = () => {
    const p = products[0];
    if (!p) {
      toast.error("No products found. Add products in Masters > Finished Good / SKU first.");
      return;
    }
    const build = (row: ProductRow) => {
      const packaging = packagingByProductId?.[row.id] ?? [];
      const uom = pickDefaultUomFromPackaging(packaging, mode) ?? "EA";
      const baseQty = getBaseQty(row.id, uom, 1, packagingByProductId?.[row.id]);
      const { price, reason } = useCostPricing
        ? { price: 0, reason: "Manual" }
        : getPriceForLine(row.id, priceListIdResolved, 1, uom, pricingByProductId?.[row.id]);
      const newLine: DocumentLine = {
        id: `line-${Date.now()}`,
        productId: row.id,
        sku: row.sku,
        name: row.name,
        uom,
        qty: 1,
        baseQty,
        price,
        priceReason: reason,
        amount: price,
        taxCodeId: row.defaultTaxCodeId ?? undefined,
      };
      const taxed = applyLineTax(newLine, taxCodes, linesAreTaxInclusive);
      onLinesChange((prev) => [...prev, { ...newLine, tax: taxed.tax, amount: taxed.amount }]);
    };
    if (isApiConfigured()) {
      void fetchProductApi(p.id).then((full) => build(full ?? p)).catch(() => build(p));
    } else {
      build(p);
    }
  };

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
        next.baseQty = getBaseQty(productId, uom, qty, packagingByProductId?.[productId]);
        if (useCostPricing && patch.productId != null) {
          next.price = 0;
          next.priceReason = "Manual";
        } else if (!useCostPricing) {
          const { price, reason } = getPriceForLine(productId, priceListIdResolved, qty, uom, pricingByProductId?.[productId]);
          next.price = price;
          next.priceReason = reason;
        }
        next.amount = next.qty * next.price;
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

  const setProduct = (lineId: string, productId: string) => {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    const applyRow = (row: ProductRow) => {
      const packaging = packagingByProductId?.[productId] ?? [];
      const uom = pickDefaultUomFromPackaging(packaging, mode) ?? "EA";
      const line = linesRef.current.find((l) => l.id === lineId);
      const qty = line?.qty ?? 1;
      const baseQty = getBaseQty(productId, uom, qty, packagingByProductId?.[productId]);
      const { price, reason } = useCostPricing
        ? { price: 0, reason: "Manual" }
        : getPriceForLine(productId, priceListIdResolved, qty, uom, pricingByProductId?.[productId]);
      updateLine(lineId, {
        productId: row.id,
        sku: row.sku,
        name: row.name,
        uom,
        baseQty,
        price,
        priceReason: reason,
        amount: qty * price,
        taxCodeId: row.defaultTaxCodeId ?? undefined,
        variantId: undefined,
        variantSku: undefined,
      });
      ensureVariantsLoaded(productId);
    };
    if (isApiConfigured()) {
      void fetchProductApi(productId).then((full) => applyRow(full ?? p)).catch(() => applyRow(p));
    } else {
      applyRow(p);
    }
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
      patch.baseQty = getBaseQty(line.productId, uom, line.qty, packagingByProductId?.[line.productId]);
      if (!useCostPricing) {
        const { price, reason } = getPriceForLine(line.productId, priceListIdResolved, line.qty, uom, pricingByProductId?.[line.productId]);
        patch.price = price;
        patch.priceReason = reason;
        patch.amount = line.qty * price;
      }
    }
    updateLine(lineId, patch);
  };

  const setUom = (lineId: string, uom: string) => {
    const line = lines.find((l) => l.id === lineId);
    if (!line) return;
    const baseQty = getBaseQty(line.productId, uom, line.qty, packagingByProductId?.[line.productId]);
    if (useCostPricing) {
      updateLine(lineId, { uom, baseQty, amount: line.qty * line.price });
    } else {
      const { price, reason } = getPriceForLine(line.productId, priceListIdResolved, line.qty, uom, pricingByProductId?.[line.productId]);
      updateLine(lineId, { uom, baseQty, price, priceReason: reason, amount: line.qty * price });
    }
  };

  const setQty = (lineId: string, qty: number) => {
    const line = lines.find((l) => l.id === lineId);
    if (!line) return;
    const baseQty = getBaseQty(line.productId, line.uom, qty, packagingByProductId?.[line.productId]);
    if (useCostPricing) {
      updateLine(lineId, { qty, baseQty, amount: qty * line.price });
    } else {
      const { price, reason } = getPriceForLine(line.productId, priceListIdResolved, qty, line.uom, pricingByProductId?.[line.productId]);
      updateLine(lineId, { qty, baseQty, price, priceReason: reason, amount: qty * price });
    }
  };

  const setPrice = (lineId: string, price: number) => {
    const line = lines.find((l) => l.id === lineId);
    if (!line) return;
    updateLine(lineId, { price, amount: line.qty * price });
  };

  const removeLine = (id: string) => {
    onLinesChange((prev) => prev.filter((l) => l.id !== id));
  };

  const subtotalSum = lines.reduce((s, l) => s + l.qty * l.price, 0);
  const totalTax = lines.reduce((s, l) => s + (l.tax ?? 0), 0);
  const total = lines.reduce((s, l) => s + l.amount, 0);

  // Eagerly load variants for all products already on existing lines
  React.useEffect(() => {
    lines.forEach((l) => ensureVariantsLoaded(l.productId));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lineItemsLabel = useCostPricing
    ? "Line items · Cost / unit (enter or from supplier)"
    : `Line items · Price list: ${priceLists.find((pl) => pl.id === priceListIdResolved)?.name ?? priceListIdResolved}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>{lineItemsLabel}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRow}
          disabled={products.length === 0}
          title={products.length === 0 ? "Add products in Masters first" : undefined}
        >
          <Icons.Plus className="mr-2 h-4 w-4" />
          Add line
        </Button>
      </div>
      {lines.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {useCostPricing
            ? "No lines. Add a line above. Product, UOM, qty, base qty, cost per unit (enter manually)."
            : "No lines. Add a line above. Product, UOM, qty, base qty, price (from price list), price reason."}
        </div>
      ) : (
        <>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="w-24">Qty</TableHead>
                  <TableHead className="w-24">Base qty</TableHead>
                  <TableHead className="w-28">{useCostPricing ? "Cost / unit" : "Price"}</TableHead>
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
                      <Select value={l.productId} onValueChange={(v) => setProduct(l.id, v)}>
                        <SelectTrigger className="w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.sku} — {p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
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
                    <TableCell>
                      <UomSelect
                        lineId={l.id}
                        productId={l.productId}
                        value={l.uom}
                        onChange={setUom}
                        packagingForProduct={packagingByProductId?.[l.productId]}
                        catalogUomCodes={catalogUomCodes}
                      />
                    </TableCell>
                    <TableCell>
                      <FormattedDecimalInput
                        className="w-24"
                        value={String(l.qty)}
                        onValueChange={(raw) => {
                          const n = parseDecimalString(raw);
                          setQty(l.id, Number.isFinite(n) && n >= 0 ? n : 0);
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {formatDecimalDisplay(String(l.baseQty))}
                    </TableCell>
                    <TableCell>
                      {useCostPricing ? (
                        <FormattedDecimalInput
                          className="w-32 min-w-[7rem]"
                          value={String(l.price)}
                          onValueChange={(raw) => {
                            const n = parseDecimalString(raw);
                            setPrice(l.id, Number.isFinite(n) && n >= 0 ? n : 0);
                          }}
                        />
                      ) : (
                        formatMoney(l.price, currency)
                      )}
                    </TableCell>
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
  productId: _productId,
  value,
  onChange,
  packagingForProduct = [],
  catalogUomCodes = [],
}: {
  lineId: string;
  productId: string;
  value: string;
  onChange: (lineId: string, uom: string) => void;
  packagingForProduct?: ProductPackaging[];
  catalogUomCodes?: string[];
}) {
  const options = mergeLineUomOptions(packagingForProduct, catalogUomCodes, value);

  return (
    <Select value={value} onValueChange={(v) => onChange(lineId, v)}>
      <SelectTrigger className="w-24 min-w-[5.5rem]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((u) => (
          <SelectItem key={u} value={u}>{u}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
