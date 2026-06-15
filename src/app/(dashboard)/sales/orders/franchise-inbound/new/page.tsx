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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
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

type LineDraft = {
  product: StockRequestCatalogItem;
  quantity: number;
};

export default function CreateManualFranchiseOrderPage() {
  const router = useRouter();
  const [outlets, setOutlets] = React.useState<FranchiseNetworkOutletRow[]>([]);
  const [outletsLoading, setOutletsLoading] = React.useState(true);
  const [outletSearch, setOutletSearch] = React.useState("");
  const [selectedOutletId, setSelectedOutletId] = React.useState("");

  const [productSearch, setProductSearch] = React.useState("");
  const [debouncedProductSearch, setDebouncedProductSearch] = React.useState("");
  const [catalog, setCatalog] = React.useState<StockRequestCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = React.useState(false);
  const [catalogCursor, setCatalogCursor] = React.useState<string | null>(null);
  const [catalogHasMore, setCatalogHasMore] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);

  const [lines, setLines] = React.useState<Record<string, LineDraft>>({});
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setOutletsLoading(true);
      try {
        const page = await fetchFranchiseNetworkOutletsPage({ limit: 200, search: outletSearch.trim() || undefined });
        if (!cancelled) setOutlets(page.items.filter((o) => o.isActive));
      } catch (e) {
        if (!cancelled) toast.error((e as Error).message ?? "Failed to load outlets.");
      } finally {
        if (!cancelled) setOutletsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [outletSearch]);

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedProductSearch(productSearch), 350);
    return () => window.clearTimeout(id);
  }, [productSearch]);

  const loadCatalog = React.useCallback(
    async (reset: boolean) => {
      if (!selectedOutletId) return;
      if (reset) {
        setCatalogLoading(true);
        setCatalog([]);
        setCatalogCursor(null);
        setCatalogHasMore(false);
      } else {
        setLoadingMore(true);
      }
      try {
        const page = await fetchOutletStockRequestCatalogPage(selectedOutletId, {
          search: debouncedProductSearch.trim() || undefined,
          limit: 50,
          cursor: reset ? "0" : catalogCursor ?? undefined,
        });
        setCatalog((prev) => (reset ? page.items : [...prev, ...page.items]));
        setCatalogCursor(page.nextCursor);
        setCatalogHasMore(page.hasMore);
      } catch (e) {
        toast.error((e as Error).message ?? "Failed to load products.");
      } finally {
        setCatalogLoading(false);
        setLoadingMore(false);
      }
    },
    [selectedOutletId, debouncedProductSearch, catalogCursor]
  );

  React.useEffect(() => {
    if (!selectedOutletId) {
      setCatalog([]);
      setLines({});
      return;
    }
    void loadCatalog(true);
  }, [selectedOutletId, debouncedProductSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedOutlet = outlets.find((o) => o.id === selectedOutletId);
  const lineList = Object.values(lines).filter((l) => l.quantity > 0);
  const currency = lineList[0]?.product.pricingCurrency ?? "KES";
  const orderTotal = lineList.reduce((sum, l) => sum + l.quantity * l.product.unitPrice, 0);

  const setQty = (product: StockRequestCatalogItem, raw: string) => {
    const qty = Number(raw);
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
      toast.success(`Sales order ${result.soNumber} created for ${result.outletName}.`);
      router.push(`/docs/sales-order/${result.soId}`);
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
        description="Place a stock order on behalf of a franchise outlet. It is approved immediately on HQ."
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
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6 max-w-5xl">
        <section className="space-y-3">
          <Label htmlFor="outlet-search">Franchise outlet</Label>
          <Input
            id="outlet-search"
            placeholder="Search outlets…"
            value={outletSearch}
            onChange={(e) => setOutletSearch(e.target.value)}
            className="max-w-md"
          />
          <select
            className="flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={selectedOutletId}
            onChange={(e) => setSelectedOutletId(e.target.value)}
            disabled={outletsLoading}
            aria-label="Select franchise outlet"
          >
            <option value="">{outletsLoading ? "Loading outlets…" : "Select outlet…"}</option>
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
                {o.code ? ` (${o.code})` : ""}
              </option>
            ))}
          </select>
          {selectedOutlet ? (
            <p className="text-sm text-muted-foreground">
              Ordering for <span className="font-medium text-foreground">{selectedOutlet.name}</span>
              {selectedOutlet.territory ? ` · ${selectedOutlet.territory}` : ""}
            </p>
          ) : null}
        </section>

        {selectedOutletId ? (
          <>
            <section className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-2 flex-1">
                  <Label htmlFor="product-search">Products</Label>
                  <Input
                    id="product-search"
                    placeholder="Search by name or SKU…"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="max-w-md"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={catalogLoading}
                  onClick={() => void loadCatalog(true)}
                  className="shrink-0"
                >
                  <Icons.RefreshCw className={cn("h-4 w-4 mr-2", catalogLoading && "animate-spin")} />
                  Refresh
                </Button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="w-28">Unit price</TableHead>
                      <TableHead className="w-32">Qty</TableHead>
                      <TableHead className="w-28 text-right">Line total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {catalogLoading && catalog.length === 0 ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={4}>
                            <Skeleton className="h-8 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : catalog.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No products match your search.
                        </TableCell>
                      </TableRow>
                    ) : (
                      catalog.map((product) => {
                        const draft = lines[product.id];
                        const qty = draft?.quantity ?? 0;
                        const lineTotal = qty * product.unitPrice;
                        return (
                          <TableRow key={product.id}>
                            <TableCell>
                              <div className="font-medium">{product.name}</div>
                              {product.sku ? (
                                <div className="text-xs text-muted-foreground">{product.sku}</div>
                              ) : null}
                            </TableCell>
                            <TableCell className="tabular-nums">
                              {formatMoney(product.unitPrice, product.pricingCurrency ?? currency, {
                                decimals: product.unitPrice % 1 === 0 ? 0 : 2,
                              })}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                step="any"
                                inputMode="decimal"
                                className="h-8 w-24"
                                value={qty > 0 ? String(qty) : ""}
                                placeholder="0"
                                onChange={(e) => setQty(product, e.target.value)}
                                aria-label={`Quantity for ${product.name}`}
                              />
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {qty > 0
                                ? formatMoney(lineTotal, product.pricingCurrency ?? currency, {
                                    decimals: lineTotal % 1 === 0 ? 0 : 2,
                                  })
                                : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              {catalogHasMore ? (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loadingMore}
                    onClick={() => void loadCatalog(false)}
                  >
                    {loadingMore ? (
                      <Icons.Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Load more products
                  </Button>
                </div>
              ) : null}
            </section>

            <section className="space-y-2">
              <Label htmlFor="order-notes">Notes (optional)</Label>
              <Textarea
                id="order-notes"
                placeholder="Reason or context for this manual order…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="max-w-2xl"
              />
            </section>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t pt-4">
              <p className="text-sm text-muted-foreground">
                {lineList.length === 0 ? (
                  "Select quantities above to build the order."
                ) : (
                  <>
                    <span className="font-medium text-foreground">{lineList.length}</span> line
                    {lineList.length === 1 ? "" : "s"} ·{" "}
                    <span className="font-semibold text-foreground tabular-nums">
                      {formatMoney(orderTotal, currency, { decimals: orderTotal % 1 === 0 ? 0 : 2 })}
                    </span>
                  </>
                )}
              </p>
              <Button disabled={submitting || lineList.length === 0} onClick={() => void handleSubmit()}>
                {submitting ? (
                  <Icons.Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Icons.CheckCircle className="h-4 w-4 mr-2" />
                )}
                Create & approve order
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Select an outlet to load the same product catalog the franchise app uses for stock requests.
          </p>
        )}
      </div>
    </PageShell>
  );
}
