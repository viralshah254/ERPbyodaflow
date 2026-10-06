"use client";

import * as React from "react";
import { toast } from "sonner";
import type { DocTypeKey } from "@/config/documents/types";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { patchDocumentApi } from "@/lib/api/documents";
import {
  fetchCatalogPricesApi,
  fetchPriceListsForUi,
  resolveCustomerPriceListApi,
  type CatalogPriceItem,
} from "@/lib/api/pricing";
import { catalogUnitsForUom, isPieceUom, piecesChargedPerPack } from "@/lib/fmcg/pricing";

type OrderLine = {
  id?: string;
  description: string;
  productId?: string;
  qty?: number;
  unit?: string;
  unitPrice?: number;
  discount?: number;
  tax?: number;
  taxCodeId?: string;
  amount?: number;
  packing?: string;
  pricedUnitsPer?: number;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function priceForLine(item: CatalogPriceItem, unit: string | undefined, packing?: string) {
  const piece = item.pricePerPiece ?? item.price;
  if (piece == null || !Number.isFinite(piece) || piece <= 0) return null;
  const discount = item.discountPercent ?? 0;
  const pieces = piecesChargedPerPack({
    unit,
    packing,
    catalogUnits: catalogUnitsForUom(item.packPrices, unit),
  });
  if (!isPieceUom(unit ?? "") && pieces > 1) {
    const unitPrice = round2(piece * pieces);
    return {
      unitPrice,
      discount,
      net: round2(unitPrice * (1 - discount / 100)),
      pricedUnitsPer: pieces,
    };
  }
  return { unitPrice: piece, discount, net: round2(piece * (1 - discount / 100)), pricedUnitsPer: undefined };
}

export function DocumentPriceTagControl({
  docType,
  docId,
  partyId,
  priceListId,
  priceListName,
  status,
  lines,
  onApplied,
}: {
  docType: DocTypeKey;
  docId: string;
  partyId?: string;
  priceListId?: string;
  priceListName?: string;
  status: string;
  lines: OrderLine[];
  onApplied: () => void | Promise<void>;
}) {
  const editable = status === "DRAFT";
  const [options, setOptions] = React.useState<Array<{ id: string; label: string }>>([]);
  const [resolved, setResolved] = React.useState<{
    priceListId: string | null;
    source: "party" | "category" | "org" | "none";
  } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const inFlight = React.useRef(false);
  const autoKey = React.useRef<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void fetchPriceListsForUi()
      .then((lists) => {
        if (cancelled) return;
        const next = lists.map((list) => ({ id: list.id, label: list.name }));
        if (priceListId && !next.some((row) => row.id === priceListId)) {
          next.unshift({ id: priceListId, label: priceListName || "Current price tag" });
        }
        setOptions(next);
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [priceListId, priceListName]);

  React.useEffect(() => {
    if (!partyId) {
      setResolved(null);
      return;
    }
    let cancelled = false;
    void resolveCustomerPriceListApi(partyId)
      .then((row) => {
        if (!cancelled) setResolved(row);
      })
      .catch(() => {
        if (!cancelled) setResolved(null);
      });
    return () => {
      cancelled = true;
    };
  }, [partyId]);

  const selected = priceListId || resolved?.priceListId || "";

  const apply = React.useCallback(
    async (listId: string) => {
      if (!editable || !listId || inFlight.current) return;
      inFlight.current = true;
      setBusy(true);
      try {
        const catalog = await fetchCatalogPricesApi(listId);
        const byProduct = new Map(catalog.items.map((item) => [item.productId, item]));
        const missing: string[] = [];
        let priced = 0;
        const nextLines = lines.map((line) => {
          if (!line.productId) return line;
          const item = byProduct.get(line.productId);
          const quote = item ? priceForLine(item, line.unit, line.packing) : null;
          if (!quote) {
            missing.push(line.description || "A product");
            return line;
          }
          priced += 1;
          const qty = line.qty ?? 0;
          return {
            ...line,
            unitPrice: round2(quote.unitPrice),
            discount: quote.discount > 0 ? quote.discount : undefined,
            ...(quote.pricedUnitsPer ? { pricedUnitsPer: quote.pricedUnitsPer } : {}),
            amount: round2(quote.net * qty),
          };
        });
        if (priced === 0) {
          toast.error(
            missing.length
              ? `${missing.join(", ")} is not on this price tag.`
              : "This price tag has no prices for these products."
          );
          return;
        }
        const total = round2(nextLines.reduce((sum, line) => sum + (line.amount ?? 0), 0));
        await patchDocumentApi(docType, docId, {
          priceListId: listId,
          subtotal: total,
          total,
          lines: nextLines.map((line) => ({
            lineId: line.id,
            productId: line.productId,
            description: line.description,
            quantity: line.qty,
            unit: line.unit,
            unitPrice: line.unitPrice,
            ...(line.discount != null ? { discount: line.discount } : {}),
            ...(line.pricedUnitsPer != null && line.pricedUnitsPer > 1
              ? { pricedUnitsPer: line.pricedUnitsPer }
              : {}),
            ...(line.taxCodeId ? { taxCodeId: line.taxCodeId } : {}),
            ...(line.tax != null ? { tax: line.tax } : {}),
            amount: line.amount,
          })),
        });
        const tagName = options.find((row) => row.id === listId)?.label || catalog.priceListName || "Price tag";
        toast.success(
          missing.length
            ? `${tagName} applied. ${missing.join(", ")} is not on this tag.`
            : `${tagName} applied to ${priced} product${priced === 1 ? "" : "s"}.`
        );
        await onApplied();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not apply the price tag");
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [docId, docType, editable, lines, onApplied, options]
  );

  React.useEffect(() => {
    if (!editable || !selected) return;
    const needsPrice = lines.some((line) => line.productId && !((line.unitPrice ?? 0) > 0));
    if (!needsPrice) return;
    const key = `${docId}:${selected}`;
    if (autoKey.current === key) return;
    autoKey.current = key;
    void apply(selected);
  }, [apply, docId, editable, lines, selected]);

  const hint =
    selected && resolved?.priceListId === selected && (resolved.source === "party" || resolved.source === "category")
      ? "Customer price tag"
      : selected && resolved?.priceListId === selected && resolved.source === "org"
        ? "Default price tag"
        : selected
          ? "Chosen for this order"
          : "No price tag yet";

  if (!editable) {
    return (
      <div className="space-y-0.5">
        <span>{priceListName || "—"}</span>
        <p className="text-[11px] font-normal text-muted-foreground">{hint}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <SearchableSelect
        value={selected}
        onValueChange={(value) => {
          if (value && value !== selected) void apply(value);
        }}
        options={options}
        placeholder="Choose a price tag"
        searchPlaceholder="Search price tags"
        disabled={busy || options.length === 0}
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-normal text-muted-foreground">{hint}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 shrink-0"
          disabled={busy || !selected}
          onClick={() => void apply(selected)}
        >
          {busy ? "Applying…" : "Apply"}
        </Button>
      </div>
    </div>
  );
}
