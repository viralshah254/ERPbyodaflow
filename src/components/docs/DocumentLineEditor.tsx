"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { listProducts, fetchProductsForDocumentLines } from "@/lib/data/products.repo";
import type { ProductRow } from "@/lib/types/masters";
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
  variantId?: string;
  variantSku?: string;
}

interface DocumentLineEditorProps {
  priceListId?: string;
  /** When true, do not use price list; price is manual (cost from supplier). */
  useCostPricing?: boolean;
  currency: string;
  lines: DocumentLine[];
  onLinesChange: (lines: DocumentLine[]) => void;
  /** Sales vs purchasing: optional supplier price list stub */
  mode?: "sales" | "purchasing";
  /** Preloaded packaging per product (from API); when provided, used instead of localStorage */
  packagingByProductId?: Record<string, ProductPackaging[]>;
  /** Preloaded pricing per product (from API); when provided, used for price resolution */
  pricingByProductId?: Record<string, ProductPrice[]>;
  /** Filter products: purchasable (PO), sellable (SO), or all. */
  productFilter?: "purchasable" | "sellable" | "all";
}

const defaultPriceListId = "pl-retail";

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
}: DocumentLineEditorProps) {
  const [filteredProducts, setFilteredProducts] = React.useState<ProductRow[] | null>(null);
  const cachedProducts = React.useMemo(() => listProducts(), []);
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
    const packaging = packagingByProductId?.[p.id] ?? [];
    const uom = packaging.find((x) => x.isDefaultSalesUom)?.uom ?? packaging[0]?.uom ?? "EA";
    const baseQty = getBaseQty(p.id, uom, 1, packagingByProductId?.[p.id]);
    const { price, reason } = useCostPricing
      ? { price: 0, reason: "Manual" }
      : getPriceForLine(p.id, priceListIdResolved, 1, uom, pricingByProductId?.[p.id]);
    onLinesChange([
      ...lines,
      {
        id: `line-${Date.now()}`,
        productId: p.id,
        sku: p.sku,
        name: p.name,
        uom,
        qty: 1,
        baseQty,
        price,
        priceReason: reason,
        amount: price,
      },
    ]);
  };

  const updateLine = (id: string, patch: Partial<DocumentLine>) => {
    const idx = lines.findIndex((l) => l.id === id);
    if (idx < 0) return;
    const prev = lines[idx];
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
    const arr = [...lines];
    arr[idx] = next;
    onLinesChange(arr);
  };

  const setProduct = (lineId: string, productId: string) => {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    const packaging = packagingByProductId?.[productId] ?? [];
    const uom = packaging.find((x) => x.isDefaultSalesUom)?.uom ?? packaging[0]?.uom ?? "EA";
    const line = lines.find((l) => l.id === lineId);
    const qty = line?.qty ?? 1;
    const baseQty = getBaseQty(productId, uom, qty, packagingByProductId?.[productId]);
    const { price, reason } = useCostPricing
      ? { price: 0, reason: "Manual" }
      : getPriceForLine(productId, priceListIdResolved, qty, uom, pricingByProductId?.[productId]);
    updateLine(lineId, {
      productId: p.id,
      sku: p.sku,
      name: p.name,
      uom,
      baseQty,
      price,
      priceReason: reason,
      amount: qty * price,
      variantId: undefined,
      variantSku: undefined,
    });
    ensureVariantsLoaded(productId);
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
    onLinesChange(lines.filter((l) => l.id !== id));
  };

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
                  <TableHead className="w-28">Amount</TableHead>
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
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        className="w-20"
                        value={l.qty}
                        onChange={(e) => setQty(l.id, Number((e.target as HTMLInputElement).value) || 0)}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{l.baseQty}</TableCell>
                    <TableCell>
                      {useCostPricing ? (
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          className="w-24"
                          value={l.price}
                          onChange={(e) => setPrice(l.id, Number((e.target as HTMLInputElement).value) || 0)}
                        />
                      ) : (
                        formatMoney(l.price, currency)
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{l.priceReason}</TableCell>
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
          <p className="text-sm text-muted-foreground">
            Total: {formatMoney(total, currency)}
          </p>
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
}: {
  lineId: string;
  productId: string;
  value: string;
  onChange: (lineId: string, uom: string) => void;
  packagingForProduct?: ProductPackaging[];
}) {
  const options = packagingForProduct.length ? packagingForProduct.map((p) => p.uom) : ["EA"];

  return (
    <Select value={value} onValueChange={(v) => onChange(lineId, v)}>
      <SelectTrigger className="w-20">
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
