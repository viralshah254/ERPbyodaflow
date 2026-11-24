"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
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

function formatQty(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

/** Store labels read "CODE - Name". Column headers only need the code. */
function shortStore(label: string | undefined): string {
  if (!label) return "";
  const at = label.indexOf(" - ");
  return at > 0 ? label.slice(0, at) : label;
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

  const [search, setSearch] = React.useState("");
  const [selectedOnly, setSelectedOnly] = React.useState(false);
  const [warehouseError, setWarehouseError] = React.useState("");
  const [saving, setSaving] = React.useState<"post" | "draft" | null>(null);
  const [done, setDone] = React.useState<DoneTransfer | null>(null);
  const [openedFromOrder, setOpenedFromOrder] = React.useState(false);
  const [recentTo, setRecentTo] = React.useState<string[]>([]);

  const [warehouses, setWarehouses] = React.useState<LookupOption[]>([]);
  const [packaging, setPackaging] = React.useState<Record<string, ProductPackaging[]>>({});
  const [sourceStock, setSourceStock] = React.useState<TransferStockRow[]>([]);
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

  const fromStore = warehouses.find((wh) => wh.id === fromWarehouseId);
  const toStore = warehouses.find((wh) => wh.id === toWarehouseId);
  const fromShort = shortStore(fromStore?.label) || "source";
  const toShort = shortStore(toStore?.label);
  const busy = saving !== null;

  const stockByProduct = React.useMemo(() => new Map(sourceStock.map((row) => [row.productId, row])), [sourceStock]);
  const selectedLines = Object.values(lines).filter((line) => line.qty.trim() !== "" && Number(line.qty) !== 0);
  const visibleStock = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return sourceStock
      .filter((row) => [row.name, row.sku, row.code, row.barcode].some((value) => value?.toLowerCase().includes(query)))
      .sort((a, b) => (a.sku || a.name).localeCompare(b.sku || b.name, undefined, { numeric: true }));
  }, [sourceStock, search]);
  const rows = selectedOnly ? visibleStock.filter((row) => Number(lines[row.productId]?.qty ?? 0) !== 0) : visibleStock;
  const alreadyThere = sourceStock.filter((row) => (row.destination?.quantity ?? 0) > 0).length;

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
    setLines(Object.fromEntries(prefill.lines.map((line) => [line.productId, { productId: line.productId, qty: String(line.quantity), unit: "" }])));
    if (prefill.lines.length) setSelectedOnly(true);
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

  React.useEffect(() => {
    if (!fromWarehouseId) {
      setSourceStock([]);
      setStockLoading(false);
      return;
    }
    let cancelled = false;
    setStockLoading(true);
    setStockError("");
    const request = toWarehouseId ? fetchTransferStock(fromWarehouseId, toWarehouseId) : fetchTransferStock(fromWarehouseId);
    void request
      .then((next) => {
        if (!cancelled) setSourceStock(next);
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setSourceStock([]);
          setStockError(error.message || "Warehouse stock could not load.");
        }
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
    setSourceStock([]);
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
    setSourceStock([]);
    setStockLoading(true);
  }

  function updateLine(row: TransferStockRow, patch: Partial<TransferLineDraft>) {
    setLines((current) => ({
      ...current,
      [row.productId]: { ...(current[row.productId] ?? { productId: row.productId, qty: "", unit: row.uom }), ...patch },
    }));
  }

  function loadUnits(row: TransferStockRow) {
    if (Object.hasOwn(packaging, row.productId)) return;
    setPackaging((current) => ({ ...current, [row.productId]: [] }));
    void fetchProductPackagingApi(row.productId)
      .then((units) => setPackaging((current) => ({ ...current, [row.productId]: units })))
      .catch(() => toast.error("Alternate units could not be loaded. You can use the stock unit."));
  }

  function focusNextQuantity(current: HTMLInputElement) {
    const inputs = [...document.querySelectorAll<HTMLInputElement>("input[data-transfer-qty]:not(:disabled)")];
    inputs[inputs.indexOf(current) + 1]?.focus();
  }

  const lineDetails = (line: TransferLineDraft) => {
    const stock = stockByProduct.get(line.productId);
    const base = stock?.uom || line.unit || "EA";
    const alternates = activeDocumentAlternates(packaging[line.productId]).filter((row) => row.uom !== base);
    const unit = line.unit || base;
    const factor = unit === base ? 1 : alternates.find((row) => row.uom === unit)?.unitsPer;
    const qty = Number(line.qty);
    const baseQty = qty * (factor ?? 0);
    return { stock, base, alternates, unit, factor, qty, baseQty, over: Boolean(stock && baseQty > stock.available + 1e-9) };
  };

  const missingLines = stockLoading || stockError ? [] : selectedLines.filter((line) => !stockByProduct.has(line.productId));
  const hasValidLines = selectedLines.length > 0 && selectedLines.every((line) => {
    const { stock, factor, baseQty, over } = lineDetails(line);
    return Boolean(stock && factor && Number.isFinite(baseQty) && baseQty > 0 && !over);
  });
  const ready = !busy && !stockLoading && !stockError && Boolean(date && fromWarehouseId && toWarehouseId) && hasValidLines;
  const blocker = !fromWarehouseId ? "Choose where the stock comes from."
    : !toWarehouseId ? "Choose where the stock goes."
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
    setSearch("");
    setSelectedOnly(false);
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
                  : stockLoading ? "Loading stock…"
                    : stockError ? null
                      : `${sourceStock.length} product${sourceStock.length === 1 ? "" : "s"} in stock`}
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
                footer={!toWarehouseId ? "The route or store that will pick the orders."
                  : fromWarehouseId && !stockLoading && !stockError && sourceStock.length
                    ? `${alreadyThere} of these product${alreadyThere === 1 ? " is" : "s are"} already here`
                    : null}
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

          {missingLines.length > 0 && (
            <p role="alert" className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-300">
              {missingLines.length === 1 ? "1 product has" : `${missingLines.length} products have`} no available stock in {fromStore?.label ?? "this store"}. Choose another store, or remove {missingLines.length === 1 ? "it" : "them"}. Finished goods held for QC cannot move until QC accepts them.{" "}
              <button type="button" className="font-medium underline" onClick={() => setLines((current) => {
                const next = { ...current };
                for (const line of missingLines) delete next[line.productId];
                return next;
              })}>Remove {missingLines.length === 1 ? "it" : "them"}</button>
            </p>
          )}

          <section className="overflow-hidden rounded-xl border bg-card shadow-sm" aria-labelledby="source-stock">
            <div className="flex flex-wrap items-center gap-3 border-b p-3 sm:px-4">
              <h2 id="source-stock" className="mr-auto font-semibold">Products</h2>
              <div className="relative w-full sm:w-72">
                <Icons.Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input className="pl-8" aria-label="Search source stock" placeholder="Name, SKU, code or barcode"
                  value={search} onChange={(event) => setSearch(event.target.value)} disabled={!sourceStock.length} />
              </div>
              <div role="group" aria-label="Show" className="inline-flex rounded-lg border bg-muted/40 p-0.5 text-sm">
                {([false, true] as const).map((only) => (
                  <button
                    key={String(only)}
                    type="button"
                    aria-pressed={selectedOnly === only}
                    disabled={!sourceStock.length}
                    onClick={() => setSelectedOnly(only)}
                    className={cn(
                      "rounded-md px-3 py-1 font-medium transition disabled:opacity-50",
                      selectedOnly === only ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {only ? `In this transfer · ${selectedLines.length}` : "All"}
                  </button>
                ))}
              </div>
            </div>
            {!fromWarehouseId ? (
              <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-muted"><Icons.Warehouse className="h-5 w-5 text-muted-foreground" aria-hidden /></span>
                <p className="text-sm text-muted-foreground">Choose the store the stock comes from to see what it holds.</p>
              </div>
            ) : stockLoading && !sourceStock.length ? (
              <div role="status" className="space-y-2 p-4">
                <span className="sr-only">Loading warehouse stock…</span>
                {[0, 1, 2, 3].map((i) => <div key={i} className="h-11 animate-pulse rounded-md bg-muted/60" />)}
              </div>
            ) : stockError ? (
              <p role="alert" className="p-4 text-sm text-destructive">{stockError}{" "}
                <button type="button" className="underline" onClick={() => setStockRefresh((value) => value + 1)}>Retry</button></p>
            ) : !rows.length ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">{sourceStock.length ? "No products match your filters." : "This store has no stock to transfer."}</p>
            ) : (
              <div className="max-h-[62dvh] overflow-auto">
                <table className="w-full min-w-[46rem] text-sm">
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
                    {rows.map((row) => {
                      const line = lines[row.productId] ?? { productId: row.productId, qty: "", unit: row.uom };
                      const { base, alternates, unit, factor, baseQty, over } = lineDetails(line);
                      const hint = `transfer-stock-${encodeURIComponent(row.productId)}`;
                      const picked = Number(line.qty) > 0 && Boolean(factor);
                      const toNow = row.destination?.quantity ?? 0;
                      const empty = row.available <= 0;
                      return (
                        <tr key={row.productId} className={cn("border-t align-top transition-colors", over ? "bg-destructive/[0.06]" : picked ? "bg-primary/[0.04]" : "hover:bg-muted/30")}>
                          <th scope="row" className={cn("border-l-2 px-4 py-3 text-left font-medium", over ? "border-l-destructive" : picked ? "border-l-primary" : "border-l-transparent")}>
                            {row.name}
                            <span className="block text-xs font-normal text-muted-foreground">{[...new Set([row.sku, row.code, row.barcode].filter(Boolean))].join(" · ")}</span>
                          </th>
                          <td id={hint} className="px-3 py-3 text-right tabular-nums">
                            <p className={cn("font-semibold", over ? "text-destructive" : empty ? "text-muted-foreground" : "")}>{formatQty(row.available)} {base}</p>
                            {row.reserved > 0 && <p className="text-xs text-muted-foreground">{formatQty(row.quantity)} on hand · {formatQty(row.reserved)} reserved</p>}
                            {over && <p className="text-xs text-destructive">Reduce by {formatQty(baseQty - row.available)} {base}.</p>}
                            {!over && picked && <p className="text-xs text-muted-foreground">{formatQty(row.available - baseQty)} left{unit !== base ? ` · ${formatQty(baseQty)} ${base} moving` : ""}</p>}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums">
                            {!toWarehouseId ? <span className="text-muted-foreground">—</span> : (
                              <>
                                <p className={cn("font-semibold", toNow > 0 ? "" : "text-muted-foreground")}>{formatQty(toNow)} {base}</p>
                                {picked && !over && <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">→ {formatQty(toNow + baseQty)} after</p>}
                              </>
                            )}
                          </td>
                          <td className="w-[19rem] px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <Input
                                data-transfer-qty
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
                                onChange={(event) => updateLine(row, { qty: event.target.value })}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    focusNextQuantity(event.currentTarget);
                                  }
                                }}
                              />
                              <div className="w-28">
                                <Select value={unit} onValueChange={(next) => updateLine(row, { unit: next })} onOpenChange={(open) => { if (open) loadUnits(row); }} disabled={busy || empty}>
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
                                onClick={() => updateLine(row, { qty: String(row.available), unit: base })}
                              >
                                All
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

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

          <div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
            <div className="mr-auto min-w-0 text-sm" aria-live="polite">
              <p className="font-medium">
                {selectedLines.length} product{selectedLines.length === 1 ? "" : "s"} selected
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
