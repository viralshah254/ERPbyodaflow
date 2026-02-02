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
import { listProducts } from "@/lib/data/products.repo";
import { listPackaging } from "@/lib/data/products.repo";
import { getMockPriceLists } from "@/lib/mock/products/price-lists";
import { getPriceForLine, getBaseQty } from "@/lib/products/price-resolver";
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
  amount: number;
}

interface DocumentLineEditorProps {
  priceListId: string;
  currency: string;
  lines: DocumentLine[];
  onLinesChange: (lines: DocumentLine[]) => void;
  /** Sales vs purchasing: optional supplier price list stub */
  mode?: "sales" | "purchasing";
}

const defaultPriceListId = "pl-retail";

export function DocumentLineEditor({
  priceListId = defaultPriceListId,
  currency,
  lines,
  onLinesChange,
  mode = "sales",
}: DocumentLineEditorProps) {
  const products = React.useMemo(() => listProducts(), []);
  const priceLists = React.useMemo(() => getMockPriceLists(), []);
  const priceListIdResolved = priceListId || "pl-retail";

  const addRow = () => {
    const p = products[0];
    if (!p) return;
    const packaging = listPackaging(p.id);
    const uom = packaging.find((x) => x.isDefaultSalesUom)?.uom ?? packaging[0]?.uom ?? "EA";
    const { price, reason } = getPriceForLine(p.id, priceListIdResolved, 1, uom);
    const baseQty = getBaseQty(p.id, uom, 1);
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
      next.baseQty = getBaseQty(productId, uom, qty);
      const { price, reason } = getPriceForLine(productId, priceListId, qty, uom);
      next.price = price;
      next.priceReason = reason;
      next.amount = qty * price;
    }
    const arr = [...lines];
    arr[idx] = next;
    onLinesChange(arr);
  };

  const setProduct = (lineId: string, productId: string) => {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    const packaging = listPackaging(productId);
    const uom = packaging.find((x) => x.isDefaultSalesUom)?.uom ?? packaging[0]?.uom ?? "EA";
    const line = lines.find((l) => l.id === lineId);
    const qty = line?.qty ?? 1;
    const { price, reason } = getPriceForLine(productId, priceListId, qty, uom);
    const baseQty = getBaseQty(productId, uom, qty);
    updateLine(lineId, {
      productId: p.id,
      sku: p.sku,
      name: p.name,
      uom,
      baseQty,
      price,
      priceReason: reason,
      amount: qty * price,
    });
  };

  const setUom = (lineId: string, uom: string) => {
    const line = lines.find((l) => l.id === lineId);
    if (!line) return;
    const { price, reason } = getPriceForLine(line.productId, priceListIdResolved, line.qty, uom);
    const baseQty = getBaseQty(line.productId, uom, line.qty);
    updateLine(lineId, { uom, baseQty, price, priceReason: reason, amount: line.qty * price });
  };

  const setQty = (lineId: string, qty: number) => {
    const line = lines.find((l) => l.id === lineId);
    if (!line) return;
    const { price, reason } = getPriceForLine(line.productId, priceListIdResolved, qty, line.uom);
    const baseQty = getBaseQty(line.productId, line.uom, qty);
    updateLine(lineId, { qty, baseQty, price, priceReason: reason, amount: qty * price });
  };

  const removeLine = (id: string) => {
    onLinesChange(lines.filter((l) => l.id !== id));
  };

  const total = lines.reduce((s, l) => s + l.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Line items · Price list: {priceLists.find((pl) => pl.id === priceListIdResolved)?.name ?? priceListIdResolved}</Label>
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Icons.Plus className="mr-2 h-4 w-4" />
          Add line
        </Button>
      </div>
      {lines.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No lines. Add a line above. Product, UOM, qty, base qty, price (from price list), price reason.
        </div>
      ) : (
        <>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="w-24">Qty</TableHead>
                  <TableHead className="w-24">Base qty</TableHead>
                  <TableHead className="w-28">Price</TableHead>
                  <TableHead>Price reason</TableHead>
                  <TableHead className="w-28">Amount</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((l) => (
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
                      <UomSelect lineId={l.id} productId={l.productId} value={l.uom} onChange={setUom} />
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
                    <TableCell>{formatMoney(l.price, currency)}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{l.priceReason}</TableCell>
                    <TableCell className="font-medium">{formatMoney(l.amount, currency)}</TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(l.id)}>
                        <Icons.Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
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
  productId,
  value,
  onChange,
}: {
  lineId: string;
  productId: string;
  value: string;
  onChange: (lineId: string, uom: string) => void;
}) {
  const packaging = React.useMemo(() => listPackaging(productId), [productId]);
  const options = packaging.length ? packaging.map((p) => p.uom) : ["EA"];

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
