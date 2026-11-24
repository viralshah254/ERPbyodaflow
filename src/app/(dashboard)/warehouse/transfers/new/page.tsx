"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AsyncSearchableSelect, type AsyncSearchableSelectOption } from "@/components/ui/async-searchable-select";
import { createTransfer, fetchTransferStock, type TransferStockRow } from "@/lib/api/warehouse-transfers";
import { fetchWarehouseOptions, type LookupOption } from "@/lib/api/lookups";
import { fetchProductPackagingApi } from "@/lib/api/product-master";
import { activeDocumentAlternates } from "@/lib/docs/default-line-uom";
import type { ProductPackaging } from "@/lib/products/pricing-types";
import { useCanWriteInventory } from "@/lib/rbac/use-write-guard";
import { parseTransferPrefill } from "@/lib/warehouse/transfer-prefill";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

type TransferLineDraft = { productId: string; qty: string; unit: string };
type DoneTransfer = {
  id: string;
  number: string;
  fromLabel: string;
  toLabel: string;
  lines: Array<{ productId: string; name: string; sku?: string; qty: number; unit: string; toAfter: number }>;
};

const RECENT_LIMIT = 5;
const SEARCH_INPUT_ID = "transfer-product-search";
const BROWSE_PAGE = 30;

function formatQty(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

/** Store labels read "CODE - Name". Column headers only need the code. */
function shortStore(label: string | undefined): string {
  if (!label) return "";
  const at = label.indexOf(" - ");
  return at > 0 ? label.slice(0, at) : label;
}

function productCodes(row: TransferStockRow): string {
  return [...new Set([row.sku, row.code, row.barcode].filter(Boolean))].join(" · ");
}

function storeOptions(warehouses: LookupOption[], query: string, showBlock: boolean): AsyncSearchableSelectOption[] {
  const needle = query.trim().toLowerCase();
  return warehouses
    .filter((wh) => !needle || wh.label.toLowerCase().includes(needle))
    .map((wh) => ({ id: wh.id, label: wh.label, ...(showBlock && wh.transferSourceBlock ? { description: wh.transferSourceBlock } : {}) }));
}

function todayInNairobi() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function readStored(key: string): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function writeStored(key: string, values: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(values));
  } catch {
    /* storage full or disabled */
  }
}

function describeLine(line: TransferLineDraft, stock: TransferStockRow | undefined, units: ProductPackaging[] | undefined) {
  const base = stock?.uom || line.unit || "EA";
  const alternates = activeDocumentAlternates(units).filter((row) => row.uom !== base);
  const unit = line.unit || base;
  const factor = unit === base ? 1 : alternates.find((row) => row.uom === unit)?.unitsPer;
  const qty = Number(line.qty);
  const baseQty = qty * (factor ?? 0);
  return { stock, base, alternates, unit, factor, qty, baseQty, over: Boolean(stock && baseQty > stock.available + 1e-9) };
}

function quantityInput(productId: string): HTMLInputElement | undefined {
  return [...document.querySelectorAll<HTMLInputElement>("input[data-transfer-qty]")].find((input) => input.dataset.transferQty === productId);
}

/** Enter in a quantity moves to the next empty quantity, then back to search for the next product. */
function focusAfterQuantity(current: HTMLInputElement) {
  const inputs = [...document.querySelectorAll<HTMLInputElement>("input[data-transfer-qty]:not(:disabled)")];
  const next = inputs.slice(inputs.indexOf(current) + 1).find((input) => !input.value);
  (next ?? document.getElementById(SEARCH_INPUT_ID))?.focus();
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

function StockFigures({ row, fromShort, toShort }: { row: TransferStockRow; fromShort: string; toShort: string }) {
  return (
    <span className="shrink-0 text-right text-xs tabular-nums">
      <span className="block font-medium text-foreground">{formatQty(row.available)} {row.uom} <span className="font-normal text-muted-foreground">at {fromShort}</span></span>
      {row.destination ? <span className="block text-muted-foreground">{formatQty(row.destination.quantity)} at {toShort}</span> : null}
    </span>
  );
}

function ProductSearch({ fromWarehouseId, toWarehouseId, fromShort, toShort, pickedIds, disabled, onPick, onBrowse }: {
  fromWarehouseId: string;
  toWarehouseId: string;
  fromShort: string;
  toShort: string;
  pickedIds: Set<string>;
  disabled: boolean;
  onPick: (row: TransferStockRow) => void;
  onBrowse: () => void;
}) {
  const [text, setText] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [results, setResults] = React.useState<TransferStockRow[]>([]);
  const [resultsFor, setResultsFor] = React.useState("");
  const [active, setActive] = React.useState(0);
  const [pendingEnter, setPendingEnter] = React.useState(false);
  const query = useDebounced(text.trim(), 200);
  const loading = Boolean(text.trim()) && resultsFor !== `${fromWarehouseId}|${toWarehouseId}|${text.trim()}`;

  React.useEffect(() => {
    if (!fromWarehouseId || !query) return;
    let cancelled = false;
    const key = `${fromWarehouseId}|${toWarehouseId}|${query}`;
    fetchTransferStock({ warehouseId: fromWarehouseId, toWarehouseId: toWarehouseId || undefined, search: query, limit: 8 })
      .then((page) => {
        if (cancelled) return;
        setResults(page.items);
        setActive(0);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setResultsFor(key);
      });
    return () => {
      cancelled = true;
    };
  }, [fromWarehouseId, toWarehouseId, query]);

  const choose = React.useCallback((row: TransferStockRow) => {
    onPick(row);
    setText("");
    setOpen(false);
    setPendingEnter(false);
  }, [onPick]);

  React.useEffect(() => {
    if (!pendingEnter || loading) return;
    setPendingEnter(false);
    if (results[0]) choose(results[0]);
  }, [pendingEnter, loading, results, choose]);

  const showPanel = open && Boolean(text.trim());
  const listId = `${SEARCH_INPUT_ID}-results`;

  return (
    <div className="flex w-full flex-wrap items-center gap-2 sm:flex-nowrap">
      <div className="relative min-w-0 flex-1">
        <Icons.Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          id={SEARCH_INPUT_ID}
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label="Find a product to transfer"
          autoComplete="off"
          className="h-11 pl-9 text-base sm:text-sm"
          placeholder={fromWarehouseId ? `Search ${fromShort} by name, SKU, code or scan a barcode` : "Choose the source store first"}
          disabled={disabled || !fromWarehouseId}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActive((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter") {
              event.preventDefault();
              if (!text.trim()) return;
              if (loading) setPendingEnter(true);
              else if (results[active]) choose(results[active]);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        {showPanel ? (
          <div id={listId} role="listbox" aria-label="Matching products"
            className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-lg border bg-popover shadow-lg">
            {loading && !results.length ? (
              <p className="px-3 py-3 text-sm text-muted-foreground">Searching…</p>
            ) : !results.length ? (
              <p className="px-3 py-3 text-sm text-muted-foreground">No product with stock in {fromShort} matches “{text.trim()}”.</p>
            ) : results.map((row, index) => {
              const added = pickedIds.has(row.productId);
              return (
                <button
                  key={row.productId}
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(row)}
                  className={cn("flex w-full items-center gap-3 border-b px-3 py-2.5 text-left last:border-b-0", index === active ? "bg-muted" : "")}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{row.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{productCodes(row)}</span>
                  </span>
                  {added ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Added</span> : null}
                  <StockFigures row={row} fromShort={fromShort} toShort={toShort} />
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      <Button type="button" variant="outline" className="h-11 shrink-0" onClick={onBrowse} disabled={disabled || !fromWarehouseId}>
        <Icons.LayoutList className="mr-2 h-4 w-4" aria-hidden />
        Browse
      </Button>
    </div>
  );
}

function BrowseStockDialog({ open, onOpenChange, fromWarehouseId, toWarehouseId, fromLabel, fromShort, toShort, pickedIds, onAdd }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromWarehouseId: string;
  toWarehouseId: string;
  fromLabel: string;
  fromShort: string;
  toShort: string;
  pickedIds: Set<string>;
  onAdd: (rows: TransferStockRow[]) => void;
}) {
  const [text, setText] = React.useState("");
  const query = useDebounced(text.trim(), 250);
  const [items, setItems] = React.useState<TransferStockRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [checked, setChecked] = React.useState<Map<string, TransferStockRow>>(new Map());
  const loadingMore = React.useRef(false);

  React.useEffect(() => {
    if (!open) {
      setText("");
      setChecked(new Map());
    }
  }, [open]);

  React.useEffect(() => {
    if (!open || !fromWarehouseId) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchTransferStock({ warehouseId: fromWarehouseId, toWarehouseId: toWarehouseId || undefined, search: query || undefined, limit: BROWSE_PAGE })
      .then((page) => {
        if (cancelled) return;
        setItems(page.items);
        setTotal(page.total);
        setHasMore(page.hasMore);
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setItems([]);
          setHasMore(false);
          setError(e.message || "Stock could not load.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, fromWarehouseId, toWarehouseId, query]);

  const loadMore = async () => {
    if (loadingMore.current || !hasMore) return;
    loadingMore.current = true;
    try {
      const page = await fetchTransferStock({ warehouseId: fromWarehouseId, toWarehouseId: toWarehouseId || undefined, search: query || undefined, limit: BROWSE_PAGE, offset: items.length });
      setItems((current) => [...current, ...page.items.filter((item) => !current.some((row) => row.productId === item.productId))]);
      setHasMore(page.hasMore);
    } catch (e) {
      toast.error((e as Error).message || "More stock could not load.");
    } finally {
      loadingMore.current = false;
    }
  };

  const toggle = (row: TransferStockRow) => setChecked((current) => {
    const next = new Map(current);
    if (next.has(row.productId)) next.delete(row.productId);
    else next.set(row.productId, row);
    return next;
  });

  const add = () => {
    onAdd([...checked.values()]);
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[min(44rem,92dvh)] w-[min(44rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border bg-background shadow-2xl focus:outline-none"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            document.getElementById("transfer-browse-search")?.focus();
          }}
        >
          <div className="space-y-3 border-b p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Dialog.Title className="text-base font-semibold">Products in {fromLabel}</Dialog.Title>
                <Dialog.Description className="text-sm text-muted-foreground">
                  {loading && !items.length ? "Loading stock…" : `${total} product${total === 1 ? "" : "s"}${query ? " match" : " in stock"}. Tick the ones to transfer.`}
                </Dialog.Description>
              </div>
              <Dialog.Close className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close">
                <Icons.X className="h-4 w-4" />
              </Dialog.Close>
            </div>
            <div className="relative">
              <Icons.Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input id="transfer-browse-search" aria-label="Filter products" className="pl-9" placeholder="Filter by name, SKU, code or barcode"
                value={text} onChange={(event) => setText(event.target.value)} />
            </div>
          </div>
          <div
            className="min-h-[12rem] flex-1 overflow-y-auto"
            onScroll={(event) => {
              const el = event.currentTarget;
              if (el.scrollHeight - el.scrollTop - el.clientHeight < 160) void loadMore();
            }}
          >
            {error ? <p role="alert" className="p-4 text-sm text-destructive">{error}</p>
              : loading && !items.length ? (
                <div className="space-y-2 p-4">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-12 animate-pulse rounded-md bg-muted/60" />)}</div>
              ) : !items.length ? (
                <p className="px-4 py-12 text-center text-sm text-muted-foreground">{query ? `No product matches “${query}”.` : `${fromLabel} has no stock to transfer.`}</p>
              ) : (
                <ul className="divide-y">
                  {items.map((row) => {
                    const added = pickedIds.has(row.productId);
                    const isChecked = added || checked.has(row.productId);
                    const id = `browse-${row.productId}`;
                    return (
                      <li key={row.productId}>
                        <label htmlFor={id} className={cn("flex cursor-pointer items-center gap-3 px-4 py-2.5 sm:px-5", added ? "cursor-default opacity-60" : "hover:bg-muted/40", isChecked && !added && "bg-primary/[0.05]")}>
                          <Checkbox id={id} checked={isChecked} disabled={added} onCheckedChange={() => toggle(row)} aria-label={`Select ${row.name}`} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{row.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">{productCodes(row)}{added ? " · already in this transfer" : ""}</span>
                          </span>
                          <StockFigures row={row} fromShort={fromShort} toShort={toShort} />
                        </label>
                      </li>
                    );
                  })}
                  {hasMore ? (
                    <li className="p-3 text-center">
                      <Button type="button" variant="ghost" size="sm" onClick={() => void loadMore()}>Show more</Button>
                    </li>
                  ) : null}
                </ul>
              )}
          </div>
          <div className="flex items-center gap-2 border-t bg-muted/30 px-4 py-3 sm:px-5">
            <p className="mr-auto text-sm text-muted-foreground">{checked.size ? `${checked.size} selected` : "Nothing selected yet"}</p>
            <Dialog.Close asChild><Button variant="ghost">Cancel</Button></Dialog.Close>
            <Button onClick={add} disabled={!checked.size}>
              {checked.size ? `Add ${checked.size} product${checked.size === 1 ? "" : "s"}` : "Add products"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type UpdateLine = (productId: string, stockUnit: string, patch: Partial<TransferLineDraft>) => void;

const TransferRow = React.memo(function TransferRow({ row, line: draft, units, hasDestination, busy, onUpdate, onLoadUnits, onRemove }: {
  row: TransferStockRow;
  line: TransferLineDraft | undefined;
  units: ProductPackaging[] | undefined;
  hasDestination: boolean;
  busy: boolean;
  onUpdate: UpdateLine;
  onLoadUnits: (productId: string) => void;
  onRemove: (productId: string) => void;
}) {
  const line = draft ?? { productId: row.productId, qty: "", unit: row.uom };
  const { base, alternates, unit, factor, baseQty, over } = describeLine(line, row, units);
  const hint = `transfer-stock-${encodeURIComponent(row.productId)}`;
  const picked = Number(line.qty) > 0 && Boolean(factor);
  const toNow = row.destination?.quantity ?? 0;
  const empty = row.available <= 0;
  return (
    <tr className={cn("border-t align-top", over ? "bg-destructive/[0.06]" : picked ? "bg-primary/[0.04]" : "")}>
      <th scope="row" className={cn("border-l-2 px-4 py-3 text-left font-medium", over ? "border-l-destructive" : picked ? "border-l-primary" : "border-l-transparent")}>
        {row.name}
        <span className="block text-xs font-normal text-muted-foreground">{productCodes(row)}</span>
      </th>
      <td id={hint} className="px-3 py-3 text-right tabular-nums">
        <p className={cn("font-semibold", over ? "text-destructive" : empty ? "text-muted-foreground" : "")}>{formatQty(row.available)} {base}</p>
        {row.reserved > 0 && <p className="text-xs text-muted-foreground">{formatQty(row.quantity)} on hand · {formatQty(row.reserved)} reserved</p>}
        {over && <p className="text-xs text-destructive">Reduce by {formatQty(baseQty - row.available)} {base}.</p>}
        {!over && picked && <p className="text-xs text-muted-foreground">{formatQty(row.available - baseQty)} left{unit !== base ? ` · ${formatQty(baseQty)} ${base} moving` : ""}</p>}
      </td>
      <td className="px-3 py-3 text-right tabular-nums">
        {!hasDestination ? <span className="text-muted-foreground">—</span> : (
          <>
            <p className={cn("font-semibold", toNow > 0 ? "" : "text-muted-foreground")}>{formatQty(toNow)} {base}</p>
            {picked && !over && <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">→ {formatQty(toNow + baseQty)} after</p>}
          </>
        )}
      </td>
      <td className="w-[21rem] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Input
            data-transfer-qty={row.productId}
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            placeholder="0"
            value={line.qty}
            className={cn("w-24 text-right tabular-nums", over && "border-destructive focus-visible:ring-destructive")}
            aria-label={`Quantity for ${row.name} ${row.sku ?? ""}`.trim()}
            aria-invalid={over || Number(line.qty) < 0}
            aria-describedby={hint}
            disabled={busy || empty}
            onChange={(event) => onUpdate(row.productId, row.uom, { qty: event.target.value })}
            onWheel={(event) => event.currentTarget.blur()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                focusAfterQuantity(event.currentTarget);
              }
            }}
          />
          <div className="w-28">
            <Select value={unit} onValueChange={(next) => onUpdate(row.productId, row.uom, { unit: next })} onOpenChange={(open) => { if (open) onLoadUnits(row.productId); }} disabled={busy || empty}>
              <SelectTrigger aria-label={`Unit for ${row.name}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={base}>{base}</SelectItem>
                {alternates.map((alternate) => <SelectItem key={alternate.uom} value={alternate.uom}>{alternate.uom} · {formatQty(alternate.unitsPer)} {base}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground"
            disabled={busy || empty}
            aria-label={`Transfer all ${row.name}`}
            onClick={() => onUpdate(row.productId, row.uom, { qty: String(row.available), unit: base })}
          >
            All
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            disabled={busy}
            aria-label={`Remove ${row.name}`}
            title="Remove from this transfer"
            onClick={() => onRemove(row.productId)}
          >
            <Icons.X className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
});

function StorePanel(props: {
  tone: "from" | "to";
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-2 p-4 sm:p-5">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <span aria-hidden className={cn("h-2 w-2 rounded-full", props.tone === "from" ? "bg-amber-500" : "bg-emerald-500")} />
        {props.tone === "from" ? "Take stock from" : "Send stock to"}
      </p>
      {props.children}
      <div className="min-h-5 text-xs text-muted-foreground">{props.footer}</div>
    </div>
  );
}

export default function NewTransferPage() {
  const router = useRouter();
  const canWrite = useCanWriteInventory();
  const orgId = useAuthStore((s) => s.org?.orgId) ?? "org";
  const lastFromKey = `transfer:last-from:${orgId}`;
  const recentToKey = `transfer:recent-to:${orgId}`;

  const [warehouseError, setWarehouseError] = React.useState("");
  const [saving, setSaving] = React.useState<"post" | "draft" | null>(null);
  const [done, setDone] = React.useState<DoneTransfer | null>(null);
  const [openedFromOrder, setOpenedFromOrder] = React.useState(false);
  const [recentTo, setRecentTo] = React.useState<string[]>([]);
  const [browseOpen, setBrowseOpen] = React.useState(false);

  const [warehouses, setWarehouses] = React.useState<LookupOption[]>([]);
  const [packaging, setPackaging] = React.useState<Record<string, ProductPackaging[]>>({});
  /** Products in this transfer, in the order they were added. */
  const [pickedIds, setPickedIds] = React.useState<string[]>([]);
  /** Latest stock for the products in this transfer, from the current source and receiving store. */
  const [stockRows, setStockRows] = React.useState<Record<string, TransferStockRow>>({});
  const [sourceTotal, setSourceTotal] = React.useState<number | null>(null);
  const [stockError, setStockError] = React.useState("");
  const [stockRefresh, setStockRefresh] = React.useState(0);
  const [stockLoading, setStockLoading] = React.useState(false);

  const [date, setDate] = React.useState(todayInNairobi);
  const [fromWarehouseId, setFromWarehouseId] = React.useState("");
  const [toWarehouseId, setToWarehouseId] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [lines, setLines] = React.useState<Record<string, TransferLineDraft>>({});
  const [transferCostKes, setTransferCostKes] = React.useState("");
  const [costNotes, setCostNotes] = React.useState("");
  const [sourceGrnId, setSourceGrnId] = React.useState("");
  const prefilledFrom = React.useRef(false);
  const pickedRef = React.useRef<string[]>([]);

  const fromStore = warehouses.find((wh) => wh.id === fromWarehouseId);
  const toStore = warehouses.find((wh) => wh.id === toWarehouseId);
  const fromShort = shortStore(fromStore?.label) || "source";
  const toShort = shortStore(toStore?.label);
  const busy = saving !== null;

  const pickedSet = React.useMemo(() => new Set(pickedIds), [pickedIds]);
  const pickedRows = pickedIds.flatMap((id) => (stockRows[id] ? [stockRows[id]] : []));
  const selectedLines = pickedIds.flatMap((id) => {
    const line = lines[id];
    return line && line.qty.trim() !== "" && Number(line.qty) !== 0 ? [line] : [];
  });

  React.useEffect(() => {
    pickedRef.current = pickedIds;
  }, [pickedIds]);

  React.useEffect(() => {
    setOpenedFromOrder(new URLSearchParams(window.location.search).get("return") === "order");
    setRecentTo(readStored(recentToKey));
    const prefill = parseTransferPrefill(window.location.search);
    if (!prefill) return;
    if (prefill.fromWarehouseId) {
      prefilledFrom.current = true;
      setFromWarehouseId(prefill.fromWarehouseId);
    }
    if (prefill.toWarehouseId) setToWarehouseId(prefill.toWarehouseId);
    const ids = prefill.lines.map((line) => line.productId);
    pickedRef.current = ids;
    setPickedIds(ids);
    setLines(Object.fromEntries(prefill.lines.map((line) => [line.productId, { productId: line.productId, qty: String(line.quantity), unit: "" }])));
    if (prefill.reference) setReference(prefill.reference);
  }, [recentToKey]);

  React.useEffect(() => {
    if (!canWrite) return;
    void fetchWarehouseOptions({ includeTransferEligibility: true }).then(setWarehouses).catch((error: Error) => setWarehouseError(error.message));
  }, [canWrite]);

  /** Start from the store used last time, unless the link chose one. */
  React.useEffect(() => {
    if (!warehouses.length || prefilledFrom.current) return;
    prefilledFrom.current = true;
    const [last] = readStored(lastFromKey);
    const store = warehouses.find((wh) => wh.id === last && !wh.transferSourceBlock);
    if (store) setFromWarehouseId((current) => current || (store.id === toWarehouseId ? "" : store.id));
  }, [warehouses, lastFromKey, toWarehouseId]);

  /** Re-read stock for the products already in the transfer whenever either store changes. */
  React.useEffect(() => {
    if (!fromWarehouseId) {
      setStockRows({});
      setSourceTotal(null);
      setStockLoading(false);
      return;
    }
    let cancelled = false;
    const ids = pickedRef.current;
    const to = toWarehouseId || undefined;
    setStockLoading(true);
    setStockError("");
    void Promise.all([
      fetchTransferStock({ warehouseId: fromWarehouseId, limit: 1 }),
      ids.length ? fetchTransferStock({ warehouseId: fromWarehouseId, toWarehouseId: to, productIds: ids, limit: 100 }) : Promise.resolve(null),
    ])
      .then(([summary, picked]) => {
        if (cancelled) return;
        setSourceTotal(summary.total);
        const fetched = new Map((picked?.items ?? []).map((row) => [row.productId, row]));
        const requested = new Set(ids);
        setStockRows((current) => Object.fromEntries(pickedRef.current.flatMap((id) => {
          const row = fetched.get(id) ?? (requested.has(id) ? undefined : current[id]);
          return row ? [[id, row]] : [];
        })));
      })
      .catch((error: Error) => {
        if (cancelled) return;
        setStockRows({});
        setSourceTotal(null);
        setStockError(error.message || "Warehouse stock could not load.");
      })
      .finally(() => {
        if (!cancelled) setStockLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fromWarehouseId, toWarehouseId, stockRefresh]);

  function chooseFrom(value: string) {
    const block = warehouses.find((wh) => wh.id === value)?.transferSourceBlock;
    if (block) {
      toast.error(block);
      return;
    }
    if (value === fromWarehouseId) return;
    setFromWarehouseId(value);
    setStockLoading(Boolean(value));
    if (toWarehouseId === value) setToWarehouseId("");
  }

  function swapStores() {
    if (!toWarehouseId) return;
    const block = toStore?.transferSourceBlock;
    if (block) {
      toast.error(`${toStore?.label} cannot send stock. ${block}`);
      return;
    }
    const nextTo = fromWarehouseId;
    setFromWarehouseId(toWarehouseId);
    setToWarehouseId(nextTo);
    setStockLoading(true);
  }

  const addProducts = React.useCallback((rows: TransferStockRow[], focus: boolean) => {
    if (!rows.length) return;
    setStockRows((current) => ({ ...current, ...Object.fromEntries(rows.map((row) => [row.productId, row])) }));
    setPickedIds((current) => {
      const next = [...current, ...rows.map((row) => row.productId).filter((id) => !current.includes(id))];
      pickedRef.current = next;
      return next;
    });
    const target = rows.find((row) => row.available > 0) ?? rows[0];
    if (focus && target) window.requestAnimationFrame(() => quantityInput(target.productId)?.focus());
  }, []);

  const pickFromSearch = React.useCallback((row: TransferStockRow) => addProducts([row], true), [addProducts]);
  const addFromBrowse = React.useCallback((rows: TransferStockRow[]) => addProducts(rows, true), [addProducts]);

  const removeProduct = React.useCallback((productId: string) => {
    setPickedIds((current) => {
      const next = current.filter((id) => id !== productId);
      pickedRef.current = next;
      return next;
    });
    setLines((current) => {
      const next = { ...current };
      delete next[productId];
      return next;
    });
  }, []);

  const updateLine = React.useCallback<UpdateLine>((productId, stockUnit, patch) => {
    setLines((current) => ({
      ...current,
      [productId]: { ...(current[productId] ?? { productId, qty: "", unit: stockUnit }), ...patch },
    }));
  }, []);

  const requestedUnits = React.useRef(new Set<string>());
  const loadUnits = React.useCallback((productId: string) => {
    if (requestedUnits.current.has(productId)) return;
    requestedUnits.current.add(productId);
    void fetchProductPackagingApi(productId)
      .then((units) => setPackaging((current) => ({ ...current, [productId]: units })))
      .catch(() => {
        requestedUnits.current.delete(productId);
        toast.error("Alternate units could not be loaded. You can use the stock unit.");
      });
  }, []);

  const lineDetails = (line: TransferLineDraft) => describeLine(line, stockRows[line.productId], packaging[line.productId]);

  const missingIds = stockLoading || stockError || !fromWarehouseId ? [] : pickedIds.filter((id) => !stockRows[id]);
  const hasValidLines = selectedLines.length > 0 && selectedLines.every((line) => {
    const { stock, factor, baseQty, over } = lineDetails(line);
    return Boolean(stock && factor && Number.isFinite(baseQty) && baseQty > 0 && !over);
  });
  const ready = !busy && !stockLoading && !stockError && Boolean(date && fromWarehouseId && toWarehouseId) && hasValidLines;
  const blocker = !fromWarehouseId ? "Choose where the stock comes from."
    : !toWarehouseId ? "Choose where the stock goes."
      : !pickedIds.length ? "Search for a product, or browse the store, to add it."
        : !selectedLines.length ? "Enter a quantity for at least one product."
          : !hasValidLines ? "Fix the quantities marked in red."
            : "";

  function remember() {
    writeStored(lastFromKey, [fromWarehouseId]);
    const nextRecent = [toWarehouseId, ...recentTo.filter((id) => id !== toWarehouseId)].slice(0, RECENT_LIMIT);
    writeStored(recentToKey, nextRecent);
    setRecentTo(nextRecent);
  }

  const submit = async (post: boolean) => {
    if (!date || !fromWarehouseId || !toWarehouseId) {
      toast.error("Date, from, and to warehouse are required.");
      return;
    }
    if (fromWarehouseId === toWarehouseId) {
      toast.error("From and To warehouse must be different.");
      return;
    }
    if (selectedLines.length === 0) {
      toast.error("Add at least one product.");
      return;
    }
    const payloadLines: { productId: string; sku: string; productName?: string; quantity: number; unit?: string }[] = [];
    const moved: DoneTransfer["lines"] = [];
    for (const line of selectedLines) {
      const { stock, qty, factor, over, unit, base, baseQty } = lineDetails(line);
      if (!line.productId || !stock) {
        toast.error("Each line needs a product that has stock in the source warehouse.");
        return;
      }
      if (!factor || !Number.isFinite(qty) || qty <= 0) {
        toast.error(`Enter a quantity for ${stock.sku || stock.name}.`);
        return;
      }
      if (over) {
        toast.error(`${stock.sku || stock.name} only has ${formatQty(stock.available)} ${base} available.`);
        return;
      }
      payloadLines.push({ productId: line.productId, sku: stock.sku ?? stock.productId, productName: stock.name, quantity: qty, unit });
      moved.push({ productId: line.productId, name: stock.name, sku: stock.sku, qty, unit, toAfter: (stock.destination?.quantity ?? 0) + baseQty });
    }
    setSaving(post ? "post" : "draft");
    try {
      const costKes = transferCostKes.trim() ? Number(transferCostKes.trim()) : undefined;
      const res = await createTransfer({
        date,
        fromWarehouseId,
        toWarehouseId,
        reference: reference.trim() || undefined,
        lines: payloadLines,
        transferCostKes: Number.isFinite(costKes) && costKes! > 0 ? costKes : undefined,
        costNotes: costNotes.trim() || undefined,
        sourceGrnId: sourceGrnId.trim() || undefined,
        ...(post ? { post: true } : {}),
      });
      remember();
      if (!post || res.status !== "RECEIVED") {
        toast.success(post ? "Saved as a draft. Approve, dispatch and receive it to move the stock." : "Draft saved. Approve it to move the stock.");
        router.replace(`/warehouse/transfers/${res.id}`);
        return;
      }
      const number = res.number ?? "Transfer";
      toast.success(`${number} done. The stock is now in ${toStore?.label ?? "the receiving store"}.`);
      setDone({ id: res.id, number, fromLabel: fromStore?.label ?? fromWarehouseId, toLabel: toStore?.label ?? toWarehouseId, lines: moved });
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to create transfer.");
    } finally {
      setSaving(null);
    }
  };

  /** The order opened this page in its own tab. Closing it returns to the unsaved order. */
  function backToOrder() {
    window.close();
    window.setTimeout(() => router.back(), 300);
  }

  function startAgain(keepTo: boolean) {
    setDone(null);
    setLines({});
    setPickedIds([]);
    pickedRef.current = [];
    setStockRows({});
    setReference("");
    setTransferCostKes("");
    setCostNotes("");
    setSourceGrnId("");
    if (!keepTo) setToWarehouseId("");
    setStockRefresh((value) => value + 1);
  }

  const breadcrumbs = [
    { label: "Warehouse", href: "/warehouse/overview" },
    { label: "Transfers", href: "/warehouse/transfers" },
    { label: "Transfer stock" },
  ];

  if (done) {
    return (
      <PageShell>
        <PageHeader title="Transfer stock" breadcrumbs={breadcrumbs} />
        <section role="status" className="mx-auto mt-2 w-full max-w-2xl overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="flex items-start gap-4 border-b bg-emerald-500/[0.06] p-5 sm:p-6">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-500 text-white shadow-sm">
              <Icons.Check className="h-6 w-6" aria-hidden />
            </span>
            <div className="min-w-0 space-y-1">
              <h2 className="text-lg font-semibold tracking-tight">Stock transferred</h2>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{done.number}</span> moved {done.lines.length} product{done.lines.length === 1 ? "" : "s"} from{" "}
                <span className="font-medium text-foreground">{done.fromLabel}</span> to <span className="font-medium text-foreground">{done.toLabel}</span>.
                Orders on that store can pick it now.
              </p>
            </div>
          </div>
          <ul className="divide-y text-sm">
            {done.lines.map((line) => (
              <li key={line.productId} className="flex items-center justify-between gap-4 px-5 py-3 sm:px-6">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{line.name}</span>
                  {line.sku ? <span className="block text-xs text-muted-foreground">{line.sku}</span> : null}
                </span>
                <span className="shrink-0 text-right tabular-nums">
                  <span className="block font-semibold text-emerald-700 dark:text-emerald-400">+{formatQty(line.qty)} {line.unit}</span>
                  <span className="block text-xs text-muted-foreground">{formatQty(line.toAfter)} now at {shortStore(done.toLabel)}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-2 border-t bg-muted/30 p-4 sm:px-6">
            {openedFromOrder ? (
              <Button onClick={backToOrder}>
                <Icons.ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
                Back to the order
              </Button>
            ) : null}
            <Button variant={openedFromOrder ? "outline" : "default"} onClick={() => startAgain(false)}>
              <Icons.Plus className="mr-2 h-4 w-4" aria-hidden />
              Transfer to another store
            </Button>
            <Button variant="outline" onClick={() => startAgain(true)}>Another to {shortStore(done.toLabel)}</Button>
            <Button variant="ghost" asChild className="ml-auto">
              <Link href={`/warehouse/transfers/${done.id}`}>View {done.number}</Link>
            </Button>
          </div>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Transfer stock"
        description="Move stock between stores in one step. It is available in the receiving store straight away."
        breadcrumbs={breadcrumbs}
      />
      {canWrite ? (
        <div className="space-y-4">
          <section aria-label="Stores" className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              <StorePanel
                tone="from"
                footer={!fromWarehouseId ? "The store holding the stock, for example the production store."
                  : stockLoading && sourceTotal === null ? "Loading stock…"
                    : stockError ? null
                      : sourceTotal !== null ? `${sourceTotal} product${sourceTotal === 1 ? "" : "s"} in stock` : null}
              >
                <Label htmlFor="transfer-from-warehouse" className="sr-only">From warehouse</Label>
                <AsyncSearchableSelect
                  id="transfer-from-warehouse"
                  value={fromWarehouseId}
                  selectedOption={fromStore ?? null}
                  onValueChange={chooseFrom}
                  loadOptions={async (query) => storeOptions(warehouses, query, true)}
                  reloadToken={warehouses.length}
                  searchDebounceMs={0}
                  placeholder="Choose a store"
                  searchPlaceholder="Find a store"
                  emptyMessage="No store matches."
                  wrapLabels
                  minDropdownWidth={300}
                />
              </StorePanel>
              <div className="relative flex items-center justify-center border-y py-1 md:border-x md:border-y-0 md:px-3 md:py-0">
                <button
                  type="button"
                  onClick={swapStores}
                  disabled={!toWarehouseId || busy}
                  aria-label="Swap stores"
                  title="Swap stores"
                  className="grid h-10 w-10 place-items-center rounded-full border bg-background text-muted-foreground shadow-sm transition hover:-translate-y-px hover:text-foreground hover:shadow disabled:pointer-events-none disabled:opacity-40"
                >
                  <Icons.ArrowLeftRight className="hidden h-4 w-4 md:block" aria-hidden />
                  <Icons.ArrowUpDown className="h-4 w-4 md:hidden" aria-hidden />
                </button>
              </div>
              <StorePanel
                tone="to"
                footer={!toWarehouseId ? "The route or store that will pick the orders." : null}
              >
                <Label htmlFor="transfer-to-warehouse" className="sr-only">To warehouse</Label>
                <AsyncSearchableSelect
                  id="transfer-to-warehouse"
                  value={toWarehouseId}
                  selectedOption={toStore ?? null}
                  onValueChange={setToWarehouseId}
                  loadOptions={async (query) => storeOptions(warehouses.filter((wh) => wh.id !== fromWarehouseId), query, false)}
                  reloadToken={`${warehouses.length}:${fromWarehouseId}`}
                  searchDebounceMs={0}
                  placeholder="Choose a store"
                  searchPlaceholder="Find a route or store"
                  emptyMessage="No store matches."
                  wrapLabels
                  minDropdownWidth={300}
                />
              </StorePanel>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t bg-muted/30 px-4 py-2.5 sm:px-5">
              <div className="flex items-center gap-2">
                <Label htmlFor="transferDate" className="text-xs text-muted-foreground">Date</Label>
                <Input id="transferDate" type="date" className="h-8 w-40" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              {recentTo.some((id) => id !== fromWarehouseId && warehouses.some((wh) => wh.id === id)) ? (
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Recent:</span>
                  {recentTo
                    .filter((id) => id !== fromWarehouseId)
                    .flatMap((id) => {
                      const store = warehouses.find((wh) => wh.id === id);
                      return store ? [store] : [];
                    })
                    .map((store) => (
                      <button
                        key={store.id}
                        type="button"
                        onClick={() => setToWarehouseId(store.id)}
                        aria-pressed={store.id === toWarehouseId}
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-xs font-medium transition",
                          store.id === toWarehouseId ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
                        )}
                      >
                        {shortStore(store.label)}
                      </button>
                    ))}
                </div>
              ) : null}
            </div>
            {warehouseError && <p role="alert" className="border-t px-4 py-2 text-sm text-destructive">{warehouseError}</p>}
          </section>

          {missingIds.length > 0 && (
            <p role="alert" className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-300">
              {missingIds.length === 1 ? "1 product has" : `${missingIds.length} products have`} no available stock in {fromStore?.label ?? "this store"}. Choose another store, or remove {missingIds.length === 1 ? "it" : "them"}. Finished goods held for QC cannot move until QC accepts them.{" "}
              <button type="button" className="font-medium underline" onClick={() => missingIds.forEach(removeProduct)}>Remove {missingIds.length === 1 ? "it" : "them"}</button>
            </p>
          )}

          <section className="rounded-xl border bg-card shadow-sm" aria-labelledby="transfer-products">
            <div className="space-y-3 border-b p-3 sm:p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="transfer-products" className="font-semibold">Products to transfer</h2>
                {pickedIds.length ? (
                  <span className="text-xs text-muted-foreground">{pickedIds.length} added · {selectedLines.length} with a quantity</span>
                ) : null}
              </div>
              <ProductSearch
                fromWarehouseId={fromWarehouseId}
                toWarehouseId={toWarehouseId}
                fromShort={fromShort}
                toShort={toShort}
                pickedIds={pickedSet}
                disabled={busy}
                onPick={pickFromSearch}
                onBrowse={() => setBrowseOpen(true)}
              />
            </div>
            {stockError ? (
              <p role="alert" className="p-4 text-sm text-destructive">{stockError}{" "}
                <button type="button" className="underline" onClick={() => setStockRefresh((value) => value + 1)}>Retry</button></p>
            ) : !pickedIds.length ? (
              <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-muted"><Icons.PackageSearch className="h-5 w-5 text-muted-foreground" aria-hidden /></span>
                <p className="text-sm font-medium">No products added yet</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  {fromWarehouseId ? `Search above, scan a barcode, or browse what ${fromShort} holds. Only the products you add show here.` : "Choose the store the stock comes from, then search for the products to move."}
                </p>
              </div>
            ) : stockLoading && !pickedRows.length ? (
              <div role="status" className="space-y-2 p-4">
                <span className="sr-only">Loading warehouse stock…</span>
                {pickedIds.slice(0, 4).map((id) => <div key={id} className="h-11 animate-pulse rounded-md bg-muted/60" />)}
              </div>
            ) : pickedRows.length ? (
              <div aria-busy={stockLoading} className={cn("max-h-[62dvh] overflow-auto rounded-b-xl transition-opacity", stockLoading && "opacity-60")}>
                <table className="w-full min-w-[48rem] text-sm">
                  <thead className="sticky top-0 z-10 bg-card text-left text-xs uppercase tracking-wide text-muted-foreground shadow-[0_1px_0_hsl(var(--border))]">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Product</th>
                      <th className="whitespace-nowrap px-3 py-2.5 text-right font-medium">
                        <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-500" />At {fromShort}</span>
                      </th>
                      <th className="whitespace-nowrap px-3 py-2.5 text-right font-medium">
                        <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{toShort ? `At ${toShort}` : "Receiving store"}</span>
                      </th>
                      <th className="px-3 py-2.5 font-medium">Transfer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pickedRows.map((row) => (
                      <TransferRow
                        key={row.productId}
                        row={row}
                        line={lines[row.productId]}
                        units={packaging[row.productId]}
                        hasDestination={Boolean(toWarehouseId)}
                        busy={busy}
                        onUpdate={updateLine}
                        onLoadUnits={loadUnits}
                        onRemove={removeProduct}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : !fromWarehouseId ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                {pickedIds.length} product{pickedIds.length === 1 ? " is" : "s are"} ready. Choose the store the stock comes from to see what it holds.
              </p>
            ) : null}
          </section>

          <BrowseStockDialog
            open={browseOpen}
            onOpenChange={setBrowseOpen}
            fromWarehouseId={fromWarehouseId}
            toWarehouseId={toWarehouseId}
            fromLabel={fromStore?.label ?? fromShort}
            fromShort={fromShort}
            toShort={toShort}
            pickedIds={pickedSet}
            onAdd={addFromBrowse}
          />

          <details className="group rounded-xl border bg-card px-4 py-3 shadow-sm">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
              <Icons.ChevronRight className="h-4 w-4 transition group-open:rotate-90" aria-hidden />
              More details
              <span className="font-normal text-muted-foreground">Reference, transport cost</span>
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="reference">Reference (optional)</Label>
                <Input id="reference" placeholder="Internal reference" value={reference} onChange={(e) => setReference(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="transferCostKes">Transport cost (KES)</Label>
                <Input id="transferCostKes" type="number" min={0} step="1" placeholder="0" value={transferCostKes} onChange={(e) => setTransferCostKes(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="costNotes">Cost description</Label>
                <Input id="costNotes" placeholder="e.g. truck hire Kisumu → Nairobi" value={costNotes} onChange={(e) => setCostNotes(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sourceGrnId">Source GRN ID (optional)</Label>
                <Input id="sourceGrnId" placeholder="Link to batch GRN" value={sourceGrnId} onChange={(e) => setSourceGrnId(e.target.value)} />
              </div>
            </div>
          </details>

          <div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center gap-3 border-t bg-background px-4 py-3 sm:-mx-6 sm:px-6">
            <div className="mr-auto min-w-0 text-sm" aria-live="polite">
              <p className="font-medium">
                {selectedLines.length} product{selectedLines.length === 1 ? "" : "s"} to move
                {fromWarehouseId && toWarehouseId ? <span className="font-normal text-muted-foreground"> · {fromShort} → {toShort}</span> : null}
              </p>
              {blocker ? <p className="text-xs text-muted-foreground">{blocker}</p> : null}
            </div>
            <Button variant="ghost" asChild><Link href="/warehouse/transfers">Cancel</Link></Button>
            <Button variant="outline" onClick={() => void submit(false)} disabled={!ready} title="Saves for approval. Stock moves after approve, dispatch and receive.">
              {saving === "draft" ? "Saving…" : "Save draft"}
            </Button>
            <Button onClick={() => void submit(true)} disabled={!ready} className="min-w-36">
              {saving === "post" ? <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Icons.ArrowRightLeft className="mr-2 h-4 w-4" aria-hidden />}
              {saving === "post" ? "Transferring…" : "Transfer now"}
            </Button>
          </div>
        </div>
      ) : <p className="text-sm text-muted-foreground">You need inventory write access to create transfers.</p>}
    </PageShell>
  );
}
