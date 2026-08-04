"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LIST_PAGE_SHELL_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableLinearProgress } from "@/components/ui/table-linear-progress";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import {
  createManualFranchiseOrder,
  fetchFranchiseNetworkOutletsPage,
  fetchOutletStockRequestCatalogPage,
  type FranchiseNetworkOutletRow,
  type StockRequestCatalogItem,
} from "@/lib/api/cool-catch";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 400;

type LineDraft = {
  product: StockRequestCatalogItem;
  quantity: number;
};

function StepPill({
  step,
  label,
  active,
  done,
}: {
  step: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active && "border-primary/40 bg-primary/10 text-primary",
        done && !active && "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        !active && !done && "border-border text-muted-foreground"
      )}
    >
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
          active && "bg-primary text-primary-foreground",
          done && !active && "bg-emerald-600 text-white",
          !active && !done && "bg-muted text-muted-foreground"
        )}
      >
        {done && !active ? <Icons.Check className="h-3 w-3" /> : step}
      </span>
      {label}
    </div>
  );
}

function QtyStepper({
  value,
  onChange,
  productName,
}: {
  value: number;
  onChange: (next: number) => void;
  productName: string;
}) {
  return (
    <div className="inline-flex items-center rounded-lg border bg-background shadow-sm">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 rounded-r-none"
        disabled={value <= 0}
        onClick={() => onChange(Math.max(0, value - 1))}
        aria-label={`Decrease quantity for ${productName}`}
      >
        <Icons.Minus className="h-3.5 w-3.5" />
      </Button>
      <Input
        type="number"
        min={0}
        step="any"
        inputMode="decimal"
        className="h-8 w-14 border-0 bg-transparent px-1 text-center tabular-nums shadow-none focus-visible:ring-0"
        value={value > 0 ? String(value) : ""}
        placeholder="0"
        onChange={(e) => {
          const raw = e.target.value.trim();
          if (!raw) {
            onChange(0);
            return;
          }
          const n = Number(raw);
          onChange(Number.isFinite(n) && n >= 0 ? n : 0);
        }}
        aria-label={`Quantity for ${productName}`}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 rounded-l-none"
        onClick={() => onChange(value + 1)}
        aria-label={`Increase quantity for ${productName}`}
      >
        <Icons.Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export default function CreateManualFranchiseOrderPage() {
  const router = useRouter();

  const [outlets, setOutlets] = React.useState<FranchiseNetworkOutletRow[]>([]);
  const [outletSearch, setOutletSearch] = React.useState("");
  const [debouncedOutletSearch, setDebouncedOutletSearch] = React.useState("");
  const [outletsInitialLoading, setOutletsInitialLoading] = React.useState(true);
  const [outletsFetching, setOutletsFetching] = React.useState(false);
  const outletsLoadedOnce = React.useRef(false);

  const [selectedOutletId, setSelectedOutletId] = React.useState("");

  const [productSearch, setProductSearch] = React.useState("");
  const [debouncedProductSearch, setDebouncedProductSearch] = React.useState("");
  const [catalog, setCatalog] = React.useState<StockRequestCatalogItem[]>([]);
  const [catalogInitialLoading, setCatalogInitialLoading] = React.useState(false);
  const [catalogFetching, setCatalogFetching] = React.useState(false);
  const [catalogHasMore, setCatalogHasMore] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const catalogLoadedOnce = React.useRef(false);
  const catalogCursorRef = React.useRef<string | null>(null);
  const catalogOutletRef = React.useRef("");

  const [lines, setLines] = React.useState<Record<string, LineDraft>>({});
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedOutletSearch(outletSearch), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [outletSearch]);

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedProductSearch(productSearch), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [productSearch]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const isFirstLoad = !outletsLoadedOnce.current;
      if (isFirstLoad) setOutletsInitialLoading(true);
      else setOutletsFetching(true);
      try {
        const page = await fetchFranchiseNetworkOutletsPage({
          limit: 200,
          search: debouncedOutletSearch.trim() || undefined,
        });
        if (!cancelled) {
          setOutlets(page.items.filter((o) => o.isActive));
          outletsLoadedOnce.current = true;
        }
      } catch (e) {
        if (!cancelled) toast.error((e as Error).message ?? "Failed to load outlets.");
      } finally {
        if (!cancelled) {
          setOutletsInitialLoading(false);
          setOutletsFetching(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedOutletSearch]);

  const loadCatalog = React.useCallback(
    async (reset: boolean) => {
      if (!selectedOutletId) return;
      const isFirstLoad = !catalogLoadedOnce.current;
      if (reset) {
        if (isFirstLoad) setCatalogInitialLoading(true);
        else setCatalogFetching(true);
      } else {
        setLoadingMore(true);
      }
      try {
        const page = await fetchOutletStockRequestCatalogPage(selectedOutletId, {
          search: debouncedProductSearch.trim() || undefined,
          limit: 50,
          cursor: reset ? "0" : catalogCursorRef.current ?? undefined,
        });
        if (reset) {
          setCatalog(page.items);
        } else {
          setCatalog((prev) => {
            const seen = new Set(prev.map((p) => p.id));
            const merged = [...prev];
            for (const item of page.items) {
              if (!seen.has(item.id)) merged.push(item);
            }
            return merged;
          });
        }
        catalogCursorRef.current = page.nextCursor;
        setCatalogHasMore(page.hasMore);
        catalogLoadedOnce.current = true;
      } catch (e) {
        toast.error((e as Error).message ?? "Failed to load products.");
      } finally {
        setCatalogInitialLoading(false);
        setCatalogFetching(false);
        setLoadingMore(false);
      }
    },
    [selectedOutletId, debouncedProductSearch]
  );

  React.useEffect(() => {
    if (!selectedOutletId) {
      setCatalog([]);
      setLines({});
      catalogLoadedOnce.current = false;
      catalogCursorRef.current = null;
      catalogOutletRef.current = "";
      setCatalogHasMore(false);
      return;
    }

    const outletChanged = catalogOutletRef.current !== selectedOutletId;
    if (outletChanged) {
      catalogOutletRef.current = selectedOutletId;
      catalogLoadedOnce.current = false;
      catalogCursorRef.current = null;
      setCatalog([]);
      setLines({});
    }

    void loadCatalog(true);
  }, [selectedOutletId, debouncedProductSearch, loadCatalog]);

  const outletSearchPending = outletSearch.trim() !== debouncedOutletSearch.trim();
  const outletsBusy = outletsFetching || outletSearchPending;

  const productSearchPending = productSearch.trim() !== debouncedProductSearch.trim();
  const catalogBusy = catalogFetching || productSearchPending || loadingMore;

  const selectedOutlet = outlets.find((o) => o.id === selectedOutletId);
  const lineList = Object.values(lines).filter((l) => l.quantity > 0);
  const currency = lineList[0]?.product.pricingCurrency ?? "KES";
  const orderTotal = lineList.reduce((sum, l) => sum + l.quantity * l.product.unitPrice, 0);

  const step1Done = Boolean(selectedOutletId);
  const step2Done = lineList.length > 0;

  const setQty = (product: StockRequestCatalogItem, qty: number) => {
    if (!Number.isFinite(qty) || qty <= 0) {
      setLines((prev) => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
      return;
    }
    setLines((prev) => ({ ...prev, [product.id]: { product, quantity: qty } }));
  };

  const handleSubmit = async () => {
    if (!selectedOutletId) {
      toast.error("Select a franchise outlet.");
      return;
    }
    if (!lineList.length) {
      toast.error("Add at least one product with quantity.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await createManualFranchiseOrder(selectedOutletId, {
        lines: lineList.map((l) => ({
          productId: l.product.id,
          quantity: l.quantity,
          unitPrice: l.product.unitPrice,
        })),
        currency,
        notes: notes.trim() || undefined,
      });
      toast.success(`Order ${result.prNumber} created for ${result.outletName} — sales order ${result.soNumber} approved.`);
      router.push(
        `/sales/orders/franchise-inbound/${encodeURIComponent(selectedOutletId)}/${encodeURIComponent(result.prId)}`
      );
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to create order.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Create franchise order"
        description="Place a stock order on behalf of an outlet. HQ approves it immediately — same catalog and pricing as the franchise app."
        breadcrumbs={[
          { label: "Sales", href: "/sales/overview" },
          { label: "Sales Orders", href: "/sales/orders" },
          { label: "Create franchise order" },
        ]}
        sticky
        actions={
          <Button variant="outline" asChild>
            <Link href="/sales/orders">
              <Icons.ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <StepPill step={1} label="Choose outlet" active={!step1Done} done={step1Done} />
          <Icons.ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          <StepPill step={2} label="Add products" active={step1Done && !step2Done} done={step2Done} />
          <Icons.ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          <StepPill step={3} label="Review & submit" active={step2Done} done={false} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-w-0 flex-col gap-5">
            {/* Outlet picker */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Franchise outlet</CardTitle>
                <CardDescription>Who is this order for? Search by name or code.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Icons.Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search outlets…"
                    value={outletSearch}
                    onChange={(e) => setOutletSearch(e.target.value)}
                    className="pl-9"
                    aria-label="Search franchise outlets"
                  />
                  {outletSearchPending ? (
                    <Icons.Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                  ) : null}
                </div>

                <div className="relative min-h-[120px] rounded-lg border bg-muted/20">
                  <TableLinearProgress active={outletsBusy} className="rounded-t-lg" />
                  <div
                    className={cn(
                      "max-h-56 overflow-y-auto p-2 transition-opacity duration-200",
                      outletsBusy && outletsLoadedOnce.current && "opacity-70"
                    )}
                    aria-busy={outletsBusy}
                  >
                    {!outletsLoadedOnce.current && outletsInitialLoading ? (
                      <div className="space-y-2 p-1">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <Skeleton key={i} className="h-12 w-full rounded-md" />
                        ))}
                      </div>
                    ) : outlets.length === 0 ? (
                      <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                        No active outlets match your search.
                      </p>
                    ) : (
                      <ul className="space-y-1">
                        {outlets.map((outlet) => {
                          const selected = outlet.id === selectedOutletId;
                          return (
                            <li key={outlet.id}>
                              <button
                                type="button"
                                onClick={() => setSelectedOutletId(outlet.id)}
                                className={cn(
                                  "flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left transition-colors",
                                  selected
                                    ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                                    : "border-transparent hover:border-border hover:bg-background"
                                )}
                              >
                                <span
                                  className={cn(
                                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                                    selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                                  )}
                                >
                                  {selected ? <Icons.Check className="h-2.5 w-2.5" /> : null}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate font-medium">{outlet.name}</span>
                                  <span className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                                    {outlet.code ? <span>{outlet.code}</span> : null}
                                    {outlet.territory ? <span>{outlet.territory}</span> : null}
                                  </span>
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Product catalog */}
            {selectedOutletId ? (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">Products</CardTitle>
                      <CardDescription>
                        Stock-request catalog for{" "}
                        <span className="font-medium text-foreground">{selectedOutlet?.name}</span>
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={catalogBusy && !catalogLoadedOnce.current}
                      onClick={() => void loadCatalog(true)}
                      className="shrink-0"
                    >
                      <Icons.RefreshCw
                        className={cn("h-4 w-4 mr-1.5", catalogFetching && "animate-spin")}
                      />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="relative">
                    <Icons.Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or SKU…"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-9"
                      aria-label="Search products"
                    />
                    {productSearchPending ? (
                      <Icons.Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                    ) : null}
                  </div>

                  <div className="relative overflow-hidden rounded-lg border bg-background">
                    <TableLinearProgress active={catalogBusy} />
                    <div
                      className={cn(
                        "transition-opacity duration-200",
                        catalogBusy && catalogLoadedOnce.current && "pointer-events-none opacity-60"
                      )}
                      aria-busy={catalogBusy}
                    >
                      {!catalogLoadedOnce.current && catalogInitialLoading ? (
                        <div className="divide-y">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-4 px-4 py-3">
                              <Skeleton className="h-10 flex-1" />
                              <Skeleton className="h-8 w-24" />
                            </div>
                          ))}
                        </div>
                      ) : catalog.length === 0 ? (
                        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                          {debouncedProductSearch.trim()
                            ? "No products match your search."
                            : "No products available for this outlet."}
                        </p>
                      ) : (
                        <ul className="divide-y">
                          {catalog.map((product) => {
                            const qty = lines[product.id]?.quantity ?? 0;
                            const lineTotal = qty * product.unitPrice;
                            const inCart = qty > 0;
                            return (
                              <li
                                key={product.id}
                                className={cn(
                                  "flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
                                  inCart && "bg-primary/[0.03]"
                                )}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-medium leading-snug">{product.name}</p>
                                    {inCart ? (
                                      <Badge variant="secondary" className="text-[10px]">
                                        In order
                                      </Badge>
                                    ) : null}
                                  </div>
                                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                                    {product.sku ? <span>{product.sku}</span> : null}
                                    {product.unit ? <span>· {product.unit}</span> : null}
                                    <span className="tabular-nums">
                                      ·{" "}
                                      {formatMoney(product.unitPrice, product.pricingCurrency ?? currency, {
                                        decimals: product.unitPrice % 1 === 0 ? 0 : 2,
                                      })}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 sm:shrink-0">
                                  {qty > 0 ? (
                                    <span className="hidden text-sm tabular-nums text-muted-foreground sm:inline">
                                      {formatMoney(lineTotal, product.pricingCurrency ?? currency, {
                                        decimals: lineTotal % 1 === 0 ? 0 : 2,
                                      })}
                                    </span>
                                  ) : null}
                                  <QtyStepper
                                    value={qty}
                                    onChange={(next) => setQty(product, next)}
                                    productName={product.name}
                                  />
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>

                  {catalogHasMore ? (
                    <div className="flex justify-center pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={loadingMore || catalogBusy}
                        onClick={() => void loadCatalog(false)}
                      >
                        {loadingMore ? (
                          <Icons.Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Icons.ChevronDown className="h-4 w-4 mr-2" />
                        )}
                        Load more
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <Icons.Store className="h-8 w-8 text-muted-foreground/60" />
                  <p className="text-sm font-medium">Select an outlet to browse products</p>
                  <p className="max-w-sm text-xs text-muted-foreground">
                    Uses the same stock-request catalog the franchise mobile app shows when ordering from HQ.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order summary — sticky on large screens */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Order summary</CardTitle>
                <CardDescription>
                  {selectedOutlet
                    ? `For ${selectedOutlet.name}`
                    : "Choose an outlet and add line quantities."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {lineList.length === 0 ? (
                  <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center">
                    <Icons.ShoppingBag className="mx-auto mb-2 h-7 w-7 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No lines yet</p>
                  </div>
                ) : (
                  <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    {lineList.map((line) => (
                      <li
                        key={line.product.id}
                        className="flex items-start justify-between gap-2 rounded-md bg-muted/30 px-3 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{line.product.name}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {line.quantity} ×{" "}
                            {formatMoney(line.product.unitPrice, line.product.pricingCurrency ?? currency, {
                              decimals: line.product.unitPrice % 1 === 0 ? 0 : 2,
                            })}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setQty(line.product, 0)}
                          aria-label={`Remove ${line.product.name}`}
                        >
                          <Icons.X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="space-y-1 border-t pt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Lines</span>
                    <span className="font-medium tabular-nums">{lineList.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="text-lg font-semibold tabular-nums">
                      {formatMoney(orderTotal, currency, { decimals: orderTotal % 1 === 0 ? 0 : 2 })}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="order-notes" className="text-xs text-muted-foreground">
                    Notes (optional)
                  </Label>
                  <Textarea
                    id="order-notes"
                    placeholder="Why are you placing this order manually?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="resize-none text-sm"
                  />
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  disabled={submitting || !selectedOutletId || lineList.length === 0}
                  onClick={() => void handleSubmit()}
                >
                  {submitting ? (
                    <Icons.Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Icons.CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Create & approve order
                </Button>

                <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                  Creates an outlet purchase request and HQ sales order in one step — immediately approved.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
