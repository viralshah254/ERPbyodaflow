"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  simulateManufacturingBomCost,
  type ManufacturingBom,
  type RecipeCostSimulation,
} from "@/lib/api/manufacturing";
import { cn } from "@/lib/utils";
import { CAPS_ON_PRODUCT_CLASS } from "@/lib/org/product-text";

type SimRow = {
  productId: string;
  label: string;
  uom: string;
  recipeQuantity: number;
  unitCost?: number;
  scrapFactor?: number;
  scrapFactorMode?: "RATIO" | "PERCENT";
  /** Batch quantity to try; empty keeps the recipe quantity. */
  tryQuantity: string;
  /** Cost per unit to try (excl. VAT); empty keeps today's cost. */
  tryCost: string;
};

const DEBOUNCE_MS = 500;

function rowsFromBom(bom: ManufacturingBom): SimRow[] {
  return bom.items.map((item) => ({
    productId: item.productId,
    label: [item.productSku, item.productName].filter(Boolean).join(" — ") || item.productId,
    uom: item.uom || "EA",
    recipeQuantity: item.quantity,
    unitCost: item.unitCost,
    scrapFactor: item.scrapFactor,
    scrapFactorMode: item.scrapFactorMode,
    tryQuantity: "",
    tryCost: "",
  }));
}

function money(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? "—" : value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function qty(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

function positiveNumber(text: string): number | null {
  if (!text.trim()) return null;
  const value = Number(text);
  return Number.isFinite(value) && value >= 0 ? value : NaN;
}

/** Cost went up → red; went down → green. For margins pass invert. */
function Change({ from, to, invert = false }: { from: number | null | undefined; to: number | null | undefined; invert?: boolean }) {
  if (from == null || to == null) return <span className="text-muted-foreground">—</span>;
  const diff = to - from;
  if (Math.abs(diff) < 0.005) return <span className="text-muted-foreground">No change</span>;
  const worse = invert ? diff < 0 : diff > 0;
  const pct = from !== 0 ? ` (${diff > 0 ? "+" : ""}${((diff / Math.abs(from)) * 100).toFixed(1)}%)` : "";
  return (
    <span className={cn("tabular-nums", worse ? "text-destructive" : "text-emerald-600 dark:text-emerald-400")}>
      {diff > 0 ? "+" : ""}
      {money(diff)}
      {pct}
    </span>
  );
}

function Stat({ label, now, after, invert, note }: { label: string; now: number | null | undefined; after: number | null | undefined; invert?: boolean; note?: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">
        {money(now)} <span className="text-muted-foreground">→</span> {money(after)}
      </p>
      <p className="text-xs">
        <Change from={now} to={after} invert={invert} />
      </p>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

export function RecipePriceSimulator({ bom }: { bom: ManufacturingBom }) {
  const outputQuantity = bom.quantity > 0 ? bom.quantity : 1;
  const [rows, setRows] = React.useState<SimRow[]>(() => rowsFromBom(bom));
  const [batch, setBatch] = React.useState(String(outputQuantity));
  const [result, setResult] = React.useState<RecipeCostSimulation | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setRows(rowsFromBom(bom));
    setBatch(String(bom.quantity > 0 ? bom.quantity : 1));
  }, [bom]);

  const batchValue = Number(batch);
  const scale = Number.isFinite(batchValue) && batchValue > 0 ? batchValue / outputQuantity : 1;
  const invalid = rows.some((row) => Number.isNaN(positiveNumber(row.tryQuantity)) || Number.isNaN(positiveNumber(row.tryCost)));
  const changed = rows.some((row) => row.tryQuantity.trim() || row.tryCost.trim());

  const proposedItems = React.useMemo(
    () =>
      rows.map((row) => {
        const tryQuantity = positiveNumber(row.tryQuantity);
        const tryCost = positiveNumber(row.tryCost);
        return {
          productId: row.productId,
          uom: row.uom,
          quantity: tryQuantity != null && !Number.isNaN(tryQuantity) ? tryQuantity / scale : row.recipeQuantity,
          unitCost: tryCost != null && !Number.isNaN(tryCost) ? tryCost : row.unitCost,
          scrapFactor: row.scrapFactor,
          scrapFactorMode: row.scrapFactorMode,
        };
      }),
    [rows, scale],
  );
  const request = JSON.stringify(proposedItems);

  React.useEffect(() => {
    if (invalid) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      simulateManufacturingBomCost(bom.id, JSON.parse(request) as typeof proposedItems)
        .then((next) => {
          if (!cancelled) setResult(next);
        })
        .catch((e: unknown) => {
          if (!cancelled) setError(e instanceof Error ? e.message : "Could not run the simulation.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [bom.id, request, invalid]);

  function updateRow(index: number, patch: Partial<SimRow>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  const unit = result?.baseUom ?? bom.uom;
  const batchLabel = `${qty(scale * outputQuantity)} ${bom.uom}`;
  const affected = result?.affected ?? [];
  const incomplete = (result?.current.unpricedLines ?? 0) + (result?.proposed.unpricedLines ?? 0) > 0;

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="sim-batch">Batch size ({bom.uom})</Label>
          <Input id="sim-batch" className="h-9 w-32 tabular-nums" inputMode="decimal" value={batch} onChange={(e) => setBatch(e.target.value)} />
        </div>
        <Button type="button" variant="outline" size="sm" disabled={!changed} onClick={() => setRows(rowsFromBom(bom))}>
          Reset to current recipe
        </Button>
        <p className="text-xs text-muted-foreground sm:ml-auto">
          {loading ? "Calculating…" : "Simulation only. Nothing here changes the recipe, stock or prices."}
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ingredient</TableHead>
            <TableHead className="text-right">Now (batch)</TableHead>
            <TableHead className="w-32">Try quantity</TableHead>
            <TableHead className="text-right">Cost / unit now</TableHead>
            <TableHead className="w-32">Try cost / unit</TableHead>
            <TableHead className="text-right">Line cost now</TableHead>
            <TableHead className="text-right">Line cost after</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => {
            const now = result?.current.lines[index];
            const after = result?.proposed.lines[index];
            return (
              <TableRow key={`${row.productId}-${index}`}>
                <TableCell className={cn("font-medium", CAPS_ON_PRODUCT_CLASS)}>{row.label}</TableCell>
                <TableCell className="text-right tabular-nums">{qty(row.recipeQuantity * scale)} {row.uom}</TableCell>
                <TableCell>
                  <Input
                    data-arrow-field="try-qty"
                    className={cn("h-8 tabular-nums", Number.isNaN(positiveNumber(row.tryQuantity)) && "border-destructive")}
                    inputMode="decimal"
                    placeholder={qty(row.recipeQuantity * scale)}
                    aria-label={`Try quantity of ${row.label}`}
                    value={row.tryQuantity}
                    onChange={(e) => updateRow(index, { tryQuantity: e.target.value })}
                  />
                </TableCell>
                <TableCell className="text-right tabular-nums">{now?.unitCost == null ? "No price" : money(now.unitCost)}</TableCell>
                <TableCell>
                  <Input
                    data-arrow-field="try-cost"
                    className={cn("h-8 tabular-nums", Number.isNaN(positiveNumber(row.tryCost)) && "border-destructive")}
                    inputMode="decimal"
                    placeholder={now?.unitCost != null ? money(now.unitCost) : "Price"}
                    aria-label={`Try cost per ${row.uom} of ${row.label}`}
                    value={row.tryCost}
                    onChange={(e) => updateRow(index, { tryCost: e.target.value })}
                  />
                </TableCell>
                <TableCell className="text-right tabular-nums">{money(now?.cost == null ? null : now.cost * scale)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(after?.cost == null ? null : after.cost * scale)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {invalid && <p className="text-sm text-destructive">Quantities and costs must be numbers of zero or more.</p>}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={`Batch cost (${batchLabel}, excl. VAT)`} now={result ? result.current.total * scale : null} after={result ? result.proposed.total * scale : null} />
        <Stat label={`Cost per ${unit} (excl. VAT)`} now={result?.current.perUnit} after={result?.proposed.perUnit} />
        {result?.margin ? (
          <Stat
            label={`Margin per ${unit}`}
            now={result.margin.current}
            after={result.margin.proposed}
            invert
            note={`Selling ${money(result.margin.sellingPriceIncl)} incl. VAT = ${money(result.margin.sellingPriceExcl)} excl. ${result.margin.vatRate}% VAT`}
          />
        ) : (
          <div className="rounded-md border p-3 text-xs text-muted-foreground">
            {affected.length
              ? `This is an ingredient. See below how the change reaches the ${affected.length} products made from it.`
              : "No selling price on this product, so there is no margin to show."}
          </div>
        )}
      </div>
      {incomplete && (
        <p className="text-xs text-muted-foreground">Some ingredients have no price, so these totals leave them out. Set a cost to try, or add the price on the product.</p>
      )}

      {affected.length > 0 && (
        <div className="space-y-2">
          <div>
            <h3 className="text-sm font-semibold">Products made from this recipe ({affected.length})</h3>
            <p className="text-xs text-muted-foreground">
              Cost per unit with the new {result?.name ?? "recipe"} cost rolled in, and margin against each product&apos;s selling price excl. VAT. Biggest changes first.
            </p>
          </div>
          <div className="max-h-[32rem] overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Cost now</TableHead>
                  <TableHead className="text-right">Cost after</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead className="text-right">Selling excl. VAT</TableHead>
                  <TableHead className="text-right">Margin now</TableHead>
                  <TableHead className="text-right">Margin after</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {affected.map((item) => (
                  <TableRow key={item.recipeId}>
                    <TableCell>
                      <Link href={`/manufacturing/boms/${encodeURIComponent(item.recipeId)}`} className={cn("font-medium hover:underline", CAPS_ON_PRODUCT_CLASS)}>
                        {[item.sku, item.name].filter(Boolean).join(" — ")}
                      </Link>
                      {item.current.unpricedLines > 0 && (
                        <span className="block text-xs text-muted-foreground">
                          {item.current.unpricedLines === 1 ? "1 ingredient" : `${item.current.unpricedLines} ingredients`} without a price
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{money(item.current.perUnit)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(item.proposed.perUnit)}</TableCell>
                    <TableCell className="text-right"><Change from={item.current.perUnit} to={item.proposed.perUnit} /></TableCell>
                    <TableCell className="text-right tabular-nums">{item.margin ? money(item.margin.sellingPriceExcl) : "No price"}</TableCell>
                    <TableCell className={cn("text-right tabular-nums", (item.margin?.current ?? 0) < 0 && "text-destructive")}>{money(item.margin?.current)}</TableCell>
                    <TableCell className={cn("text-right tabular-nums", (item.margin?.proposed ?? 0) < 0 && "text-destructive")}>{money(item.margin?.proposed)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
