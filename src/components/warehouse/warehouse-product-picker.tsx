"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchProductsPageApi } from "@/lib/api/products";
import type { ProductRow } from "@/lib/types/masters";
import { cn } from "@/lib/utils";
import {
  formatShortAvailSuffix,
} from "@/lib/warehouse/pick-pack-task-stock";
import * as Icons from "lucide-react";

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 250;
const SCROLL_LOAD_THRESHOLD_PX = 48;

export function productPickerAvailability(p: Pick<ProductRow, "availableQuantity" | "currentStock">): number | undefined {
  if (typeof p.availableQuantity === "number" && Number.isFinite(p.availableQuantity)) {
    return p.availableQuantity;
  }
  if (typeof p.currentStock === "number" && Number.isFinite(p.currentStock)) {
    return p.currentStock;
  }
  return undefined;
}

export function formatProductPickerLabel(
  p: Pick<ProductRow, "sku" | "name">,
  avail?: number,
  stockKnown = true
): string {
  const base = p.sku ? `${p.sku} — ${p.name}` : p.name;
  if (stockKnown && typeof avail === "number" && Number.isFinite(avail)) {
    return `${base} · ${formatShortAvailSuffix(avail, false)}`;
  }
  if (!stockKnown && typeof avail === "number" && Number.isFinite(avail)) {
    return `${base} · ${formatShortAvailSuffix(avail, false)}`;
  }
  return base;
}

function productToOption(
  p: ProductRow,
  stockKnown: boolean,
  allowZeroStockProductId?: string,
  getTaskStockForProduct?: (productId: string, sku?: string) => TaskStockForProduct | undefined
) {
  const apiAvail = productPickerAvailability(p);
  const taskStock = getTaskStockForProduct?.(p.id, p.sku);
  const warehouseTotal =
    taskStock != null
      ? Math.max(taskStock.warehouseTotal, apiAvail ?? 0)
      : (apiAvail ?? 0);
  const claimedOther = taskStock?.claimedOtherLines ?? 0;
  const effective =
    stockKnown && taskStock != null
      ? Math.max(0, warehouseTotal - claimedOther)
      : stockKnown
        ? (apiAvail ?? 0)
        : apiAvail;
  const disabled =
    stockKnown &&
    (effective ?? 0) <= 0 &&
    p.id !== allowZeroStockProductId;
  const base = p.sku ? `${p.sku} — ${p.name}` : p.name;
  const availSuffix =
    stockKnown && typeof effective === "number"
      ? formatShortAvailSuffix(effective, claimedOther > 0)
      : typeof apiAvail === "number"
        ? formatShortAvailSuffix(apiAvail, false)
        : "";
  const label = availSuffix ? `${base} · ${availSuffix}` : base;
  return {
    product: p,
    label,
    disabled,
    effectiveRemaining: effective,
  };
}

export type TaskStockForProduct = {
  warehouseTotal: number;
  claimedOtherLines: number;
  remaining: number;
};

export type WarehouseProductPickerSelection = {
  id: string;
  sku?: string;
  name?: string;
  availableQuantity?: number;
};

type WarehouseProductPickerProps = {
  value: string;
  onValueChange: (productId: string) => void;
  warehouseId?: string;
  disabled?: boolean;
  /** Keep this product selectable even when warehouse avail is 0. */
  allowZeroStockProductId?: string;
  selectedProduct?: WarehouseProductPickerSelection | null;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  triggerClassName?: string;
  portalContainer?: HTMLElement | null;
  floating?: boolean;
  /** Adjust avail labels for stock already picked on other lines of this task. */
  getTaskStockForProduct?: (productId: string, sku?: string) => TaskStockForProduct | undefined;
};

export function WarehouseProductPicker({
  value,
  onValueChange,
  warehouseId,
  disabled = false,
  allowZeroStockProductId,
  selectedProduct,
  placeholder = "Select product…",
  searchPlaceholder = "Search SKU or name…",
  emptyMessage = "No products found.",
  className,
  triggerClassName,
  portalContainer = null,
  floating = true,
  getTaskStockForProduct,
}: WarehouseProductPickerProps) {
  const stockKnown = Boolean(warehouseId?.trim());

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [items, setItems] = React.useState<ProductRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const [lastSelected, setLastSelected] = React.useState<WarehouseProductPickerSelection | null>(
    selectedProduct ?? null
  );

  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const nextCursorRef = React.useRef<string | null>("0");
  const requestIdRef = React.useRef(0);
  const optionRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const [floatingPos, setFloatingPos] = React.useState<{
    top: number;
    left: number;
    width: number;
    maxH: number;
  } | null>(null);

  React.useEffect(() => {
    if (selectedProduct?.id === value) {
      setLastSelected(selectedProduct);
    }
  }, [selectedProduct, value]);

  const options = React.useMemo(
    () =>
      items.map((p) =>
        productToOption(p, stockKnown, allowZeroStockProductId, getTaskStockForProduct)
      ),
    [items, stockKnown, allowZeroStockProductId, getTaskStockForProduct]
  );

  const selectableOptions = React.useMemo(
    () => options.filter((o) => !o.disabled),
    [options]
  );

  const effectiveSelected = React.useMemo(() => {
    const fromList = items.find((p) => p.id === value);
    const selSku =
      fromList?.sku ?? (lastSelected?.id === value ? lastSelected.sku : selectedProduct?.sku);
    const taskStock = getTaskStockForProduct?.(value, selSku);
    if (fromList) {
      const apiAvail = productPickerAvailability(fromList);
      const remaining = taskStock?.remaining ?? apiAvail;
      return {
        id: fromList.id,
        sku: fromList.sku,
        name: fromList.name,
        availableQuantity: remaining,
        warehouseTotal: taskStock?.warehouseTotal ?? apiAvail,
        claimedOtherLines: taskStock?.claimedOtherLines ?? 0,
      };
    }
    if (lastSelected?.id === value) {
      const taskStockForLast = getTaskStockForProduct?.(value, lastSelected.sku);
      return {
        ...lastSelected,
        availableQuantity: taskStockForLast?.remaining ?? lastSelected.availableQuantity,
        warehouseTotal: taskStockForLast?.warehouseTotal,
        claimedOtherLines: taskStockForLast?.claimedOtherLines ?? 0,
      };
    }
    if (selectedProduct?.id === value) {
      const taskStockForSel = getTaskStockForProduct?.(value, selectedProduct.sku);
      return {
        ...selectedProduct,
        availableQuantity: taskStockForSel?.remaining ?? selectedProduct.availableQuantity,
        warehouseTotal: taskStockForSel?.warehouseTotal,
        claimedOtherLines: taskStockForSel?.claimedOtherLines ?? 0,
      };
    }
    return null;
  }, [items, lastSelected, selectedProduct, value, getTaskStockForProduct]);

  const displayLabel = effectiveSelected
    ? effectiveSelected.sku
      ? `${effectiveSelected.sku} — ${effectiveSelected.name ?? effectiveSelected.id}`
      : (effectiveSelected.name ?? effectiveSelected.id)
    : placeholder;

  const updateFloatingPosition = React.useCallback(() => {
    const btn = triggerRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const minPanelW = 320;
    let width = Math.max(rect.width, minPanelW);
    width = Math.min(width, vw - margin * 2);
    let left = rect.left;
    if (left + width > vw - margin) {
      left = Math.max(margin, vw - width - margin);
    }
    const searchBlock = 48;
    const belowTop = rect.bottom + margin;
    const spaceBelow = vh - belowTop - margin;
    const spaceAbove = rect.top - margin;
    let top: number;
    let maxH: number;
    if (spaceBelow >= 200 || spaceBelow >= spaceAbove) {
      top = belowTop;
      maxH = Math.max(160, Math.min(480, spaceBelow));
    } else {
      maxH = Math.max(160, Math.min(480, spaceAbove - searchBlock - margin));
      top = Math.max(margin, rect.top - maxH - searchBlock - margin * 2);
    }
    setFloatingPos({ top, left, width, maxH });
  }, []);

  React.useLayoutEffect(() => {
    if (!open || !floating) {
      setFloatingPos(null);
      return;
    }
    updateFloatingPosition();
    const onScrollOrResize = () => updateFloatingPosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, floating, updateFloatingPosition]);

  React.useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      const t = event.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      const el = t instanceof Element ? t : t.parentElement;
      if (el?.closest?.("[data-warehouse-product-picker-panel]")) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const fetchPage = React.useCallback(
    async (search: string, cursor: string | null, append: boolean) => {
      const whId = warehouseId?.trim();
      const requestId = ++requestIdRef.current;
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const page = await fetchProductsPageApi({
          sellable: true,
          limit: PAGE_SIZE,
          cursor: cursor ?? "0",
          search: search || undefined,
          includeStock: Boolean(whId),
          warehouseId: whId,
        });
        if (requestId !== requestIdRef.current) return;

        setItems((prev) => {
          if (!append) return page.items;
          const seen = new Set(prev.map((p) => p.id));
          const merged = [...prev];
          for (const item of page.items) {
            if (!seen.has(item.id)) merged.push(item);
          }
          return merged;
        });
        nextCursorRef.current = page.nextCursor;
        setHasMore(page.hasMore);
        if (!append) {
          setHighlightedIndex(page.items.length > 0 ? 0 : -1);
        }
      } catch {
        if (requestId !== requestIdRef.current) return;
        if (!append) {
          setItems([]);
          setHighlightedIndex(-1);
        }
        setHasMore(false);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [warehouseId]
  );

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setItems([]);
      setLoading(false);
      setLoadingMore(false);
      setHasMore(false);
      setHighlightedIndex(-1);
      nextCursorRef.current = "0";
      return;
    }

    const timeoutId = window.setTimeout(() => {
      nextCursorRef.current = "0";
      void fetchPage(query.trim(), "0", false);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [open, query, fetchPage]);

  const loadMore = React.useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    const cursor = nextCursorRef.current;
    if (!cursor) return;
    void fetchPage(query.trim(), cursor, true);
  }, [fetchPage, hasMore, loading, loadingMore, query]);

  const handleListScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight > SCROLL_LOAD_THRESHOLD_PX) return;
    loadMore();
  };

  React.useEffect(() => {
    if (highlightedIndex < 0) return;
    optionRefs.current[highlightedIndex]?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  const commitSelection = React.useCallback(
    (product: ProductRow) => {
      const option = productToOption(
        product,
        stockKnown,
        allowZeroStockProductId,
        getTaskStockForProduct
      );
      if (option.disabled) return;
      const taskStock = getTaskStockForProduct?.(product.id, product.sku);
      const apiAvail = productPickerAvailability(product);
      setLastSelected({
        id: product.id,
        sku: product.sku,
        name: product.name,
        availableQuantity: taskStock?.remaining ?? apiAvail,
      });
      onValueChange(product.id);
      setOpen(false);
    },
    [allowZeroStockProductId, getTaskStockForProduct, onValueChange, stockKnown]
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((current) => {
        if (options.length === 0) return -1;
        let next = current < options.length - 1 ? current + 1 : 0;
        for (let i = 0; i < options.length; i++) {
          const idx = (next + i) % options.length;
          if (!options[idx].disabled) return idx;
        }
        return current;
      });
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((current) => {
        if (options.length === 0) return -1;
        let next = current > 0 ? current - 1 : options.length - 1;
        for (let i = 0; i < options.length; i++) {
          const idx = (next - i + options.length) % options.length;
          if (!options[idx].disabled) return idx;
        }
        return current;
      });
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const pick =
        highlightedIndex >= 0 && options[highlightedIndex] && !options[highlightedIndex].disabled
          ? options[highlightedIndex]
          : selectableOptions[0];
      if (pick) commitSelection(pick.product);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  };

  const listScrollStyle =
    floating && floatingPos ? { maxHeight: floatingPos.maxH } : undefined;

  const panelInner = (
    <>
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={searchPlaceholder}
        autoFocus
        className="bg-background"
      />
      <div
        ref={listRef}
        className={cn(
          "mt-2 overflow-auto rounded-md border bg-muted/20",
          !(floating && floatingPos) && "max-h-[min(24rem,50vh)]"
        )}
        style={listScrollStyle}
        onScroll={handleListScroll}
      >
        {loading && items.length === 0 ? (
          <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
            <Icons.Loader2 className="h-4 w-4 animate-spin" />
            Loading products…
          </div>
        ) : options.length === 0 ? (
          <div className="p-3 text-sm text-muted-foreground">{emptyMessage}</div>
        ) : (
          options.map((option, index) => (
            <button
              key={option.product.id}
              type="button"
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              disabled={option.disabled}
              className={cn(
                "flex w-full items-start justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted",
                highlightedIndex === index && !option.disabled ? "bg-muted" : "",
                option.disabled ? "cursor-not-allowed opacity-50" : ""
              )}
              onMouseEnter={() => {
                if (!option.disabled) setHighlightedIndex(index);
              }}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!option.disabled) commitSelection(option.product);
              }}
            >
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {option.product.id === value ? <Icons.Check className="mt-0.5 h-4 w-4 shrink-0" /> : null}
            </button>
          ))
        )}
        {loadingMore ? (
          <div className="flex items-center justify-center gap-2 border-t px-3 py-2 text-xs text-muted-foreground">
            <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading more…
          </div>
        ) : hasMore && items.length > 0 ? (
          <div className="border-t px-3 py-2 text-center text-xs text-muted-foreground">
            Scroll for more products
          </div>
        ) : null}
      </div>
    </>
  );

  const panelShell = (opts: { className?: string; style?: React.CSSProperties }) => (
    <div
      ref={panelRef}
      data-warehouse-product-picker-panel=""
      className={opts.className}
      style={opts.style}
      role="listbox"
      aria-label={searchPlaceholder}
    >
      {panelInner}
    </div>
  );

  const floatingReady = floating && open && floatingPos && typeof document !== "undefined";
  const portalTarget =
    portalContainer != null ? portalContainer : typeof document !== "undefined" ? document.body : null;

  return (
    <div className={cn(!floating && "relative", className)}>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        className={cn(
          "w-full justify-between font-normal gap-2 h-auto min-h-9 py-1.5",
          triggerClassName
        )}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="listbox"
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="truncate text-left flex-1 min-w-0">{displayLabel}</span>
        <Icons.ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" />
      </Button>
      {open && !floating
        ? panelShell({
            className: cn(
              "absolute z-50 mt-2 left-0 rounded-lg border bg-popover p-2 text-popover-foreground shadow-xl",
              "min-w-full w-max max-w-[min(100vw-1.5rem,48rem)]"
            ),
          })
        : null}
      {floatingReady && portalTarget
        ? createPortal(
            panelShell({
              className: cn(
                "fixed z-[400] rounded-lg border bg-popover p-2 text-popover-foreground shadow-2xl outline-none",
                "ring-1 ring-border/60 animate-in fade-in-0 zoom-in-95 duration-100"
              ),
              style: {
                top: floatingPos!.top,
                left: floatingPos!.left,
                width: floatingPos!.width,
                maxHeight: floatingPos!.maxH + 120,
              },
            }),
            portalTarget
          )
        : null}
    </div>
  );
}
