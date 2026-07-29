"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  createSalesOrderFromQueueItem,
  fetchOdaflowQueueItem,
  ignoreQueueItem,
  type OdaflowQueueItem,
  type OdaflowQueueOrderPreview,
} from "@/lib/api/odaflow-integration";
import { fetchPartiesApi } from "@/lib/api/parties";
import { fetchProductsPageApi } from "@/lib/api/products";
import type { PartyRow, ProductRow } from "@/lib/types/masters";

type Props = {
  queueId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
};

function channelLabel(channel?: string) {
  const map: Record<string, string> = {
    modern_trade: "Modern Trade",
    distributor: "Distributor",
    direct: "Direct",
    van_sales: "Van Sales",
  };
  return channel ? (map[channel] ?? channel) : "—";
}

function EntityPicker<T extends { id: string; label: string; hint?: string }>({
  label,
  placeholder,
  valueId,
  valueLabel,
  onSelect,
  onSearch,
  tone = "default",
}: {
  label: string;
  placeholder: string;
  valueId?: string;
  valueLabel?: string;
  onSelect: (item: T | null) => void;
  onSearch: (query: string) => Promise<T[]>;
  tone?: "default" | "warning";
}) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<T[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (valueLabel) setQuery(valueLabel);
  }, [valueLabel]);

  React.useEffect(() => {
    const q = query.trim();
    if (!q || (valueId && q === valueLabel)) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setLoading(true);
      onSearch(q)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [query, onSearch, valueId, valueLabel]);

  return (
    <div className="space-y-2">
      {label ? (
        <Label className={tone === "warning" ? "text-amber-800 dark:text-amber-200" : undefined}>{label}</Label>
      ) : null}
      {valueId && valueLabel ? (
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <Icons.CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
          <span className="flex-1 truncate font-medium">{valueLabel}</span>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => onSelect(null)}>
            Change
          </Button>
        </div>
      ) : (
        <>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className={tone === "warning" ? "border-amber-300" : undefined}
          />
          {loading && <p className="text-xs text-muted-foreground">Searching…</p>}
          {results.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-md border divide-y">
              {results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted/60"
                  onClick={() => {
                    onSelect(item);
                    setQuery(item.label);
                    setResults([]);
                  }}
                >
                  <span className="font-medium">{item.label}</span>
                  {item.hint && <span className="text-xs text-muted-foreground">{item.hint}</span>}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function OdaflowQueueOrderSheet({ queueId, open, onOpenChange, onChanged }: Props) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [item, setItem] = React.useState<OdaflowQueueItem | null>(null);
  const [order, setOrder] = React.useState<OdaflowQueueOrderPreview | null>(null);
  const [erpPartyId, setErpPartyId] = React.useState<string | undefined>();
  const [erpPartyName, setErpPartyName] = React.useState<string | undefined>();
  const [lineProducts, setLineProducts] = React.useState<Record<number, { id: string; name: string }>>({});
  const [lineQty, setLineQty] = React.useState<Record<number, number>>({});
  const [saveMappings, setSaveMappings] = React.useState(true);

  const load = React.useCallback(async () => {
    if (!queueId) return;
    setLoading(true);
    try {
      const data = await fetchOdaflowQueueItem(queueId);
      setItem(data.item);
      setOrder(data.order);
      if (data.order) {
        setErpPartyId(data.order.erpPartyId);
        setErpPartyName(data.order.erpPartyName ?? data.order.customerName);
        const qty: Record<number, number> = {};
        const products: Record<number, { id: string; name: string }> = {};
        for (const line of data.order.lines) {
          qty[line.index] = line.qty;
          if (line.erpProductId) {
            products[line.index] = {
              id: line.erpProductId,
              name: line.erpProductName ?? line.productName ?? line.erpProductId,
            };
          }
        }
        setLineQty(qty);
        setLineProducts(products);
      }
    } catch {
      toast.error("Could not load order details");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }, [queueId, onOpenChange]);

  React.useEffect(() => {
    if (open && queueId) void load();
    if (!open) {
      setItem(null);
      setOrder(null);
    }
  }, [open, queueId, load]);

  const searchCustomers = React.useCallback(async (query: string) => {
    const rows: PartyRow[] = await fetchPartiesApi({ role: "customer", search: query, status: "ACTIVE", limit: 8 });
    return rows.map((p) => ({
      id: p.id,
      label: p.name,
      hint: p.code ? `Code ${p.code}` : undefined,
    }));
  }, []);

  const searchProducts = React.useCallback(async (query: string) => {
    const page = await fetchProductsPageApi({ search: query, status: "ACTIVE", sellable: true, limit: 8 });
    return page.items.map((p: ProductRow) => ({
      id: p.id,
      label: p.name,
      hint: [p.sku, p.barcode].filter(Boolean).join(" · ") || undefined,
    }));
  }, []);

  const customerReady = Boolean(erpPartyId) || (order != null && !order.customerNeedsMatch);
  const allProductsReady =
    order?.lines.every((line) => !line.needsProductMatch || Boolean(lineProducts[line.index]?.id)) ?? false;
  const canSubmit = customerReady && allProductsReady && !submitting;

  async function handleCreateSalesOrder() {
    if (!queueId || !order) return;
    setSubmitting(true);
    try {
      const result = await createSalesOrderFromQueueItem(queueId, {
        erpPartyId: order.customerNeedsMatch ? erpPartyId : undefined,
        lineProducts: order.lines
          .filter((line) => line.needsProductMatch && lineProducts[line.index]?.id)
          .map((line) => ({ lineIndex: line.index, erpProductId: lineProducts[line.index]!.id })),
        lineQty: order.lines.map((line) => ({ lineIndex: line.index, qty: lineQty[line.index] ?? line.qty })),
        saveMappings,
      });
      toast.success("Sales order created");
      onOpenChange(false);
      onChanged?.();
      router.push(`/docs/sales-order/${result.erpDocumentId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create sales order");
      void load();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDismiss() {
    if (!queueId) return;
    try {
      await ignoreQueueItem(queueId);
      toast.success("Removed from list");
      onOpenChange(false);
      onChanged?.();
    } catch {
      toast.error("Could not remove item");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{order?.purchaseOrderNumber ?? item?.displayRef ?? "Odaflow order"}</SheetTitle>
          <SheetDescription>
            Review this order from Odaflow, match the customer and products to your ERP catalog, then send it to Sales
            Orders.
          </SheetDescription>
        </SheetHeader>

        {loading || !order ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading order…</div>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Channel</p>
                <p className="font-medium">{channelLabel(order.channel)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Order date</p>
                <p className="font-medium">{order.orderDate ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Currency</p>
                <p className="font-medium">{order.currency ?? "KES"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Odaflow total</p>
                <p className="font-medium">
                  {order.totalAmount != null
                    ? `${order.currency ?? "KES"} ${order.totalAmount.toLocaleString()}`
                    : "—"}
                </p>
              </div>
            </div>

            {item?.blockReason && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30">
                {item.blockReason}
              </div>
            )}

            {order.customerNeedsMatch ? (
              <EntityPicker
                label="Match to ERP customer"
                placeholder={`Search customers — Odaflow sent “${order.customerName ?? "Unknown"}”`}
                valueId={erpPartyId}
                valueLabel={erpPartyName}
                tone="warning"
                onSelect={(picked) => {
                  setErpPartyId(picked?.id);
                  setErpPartyName(picked?.label);
                }}
                onSearch={searchCustomers}
              />
            ) : (
              <div className="rounded-md border px-3 py-2 text-sm">
                <p className="text-xs text-muted-foreground">Customer</p>
                <p className="font-medium">{erpPartyName ?? order.customerName ?? "—"}</p>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Order lines</Label>
                <span className="text-xs text-muted-foreground">{order.lines.length} item(s)</span>
              </div>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Product from Odaflow</th>
                      <th className="px-3 py-2 font-medium w-20">Qty</th>
                      <th className="px-3 py-2 font-medium">Your ERP product</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.lines.map((line) => (
                      <tr key={line.index} className="border-t align-top">
                        <td className="px-3 py-3">
                          <p className="font-medium">{line.productName ?? "Unknown product"}</p>
                          {line.odaflowProductId && (
                            <p className="text-xs text-muted-foreground mt-0.5">Odaflow ID {line.odaflowProductId}</p>
                          )}
                          {line.barcode && <p className="text-xs text-muted-foreground">Barcode {line.barcode}</p>}
                        </td>
                        <td className="px-3 py-3">
                          <Input
                            type="number"
                            min={1}
                            className="h-8 w-16"
                            value={lineQty[line.index] ?? line.qty}
                            onChange={(e) =>
                              setLineQty((prev) => ({
                                ...prev,
                                [line.index]: Math.max(1, Number(e.target.value) || 1),
                              }))
                            }
                          />
                        </td>
                        <td className="px-3 py-3 min-w-[12rem]">
                          {line.needsProductMatch ? (
                            <EntityPicker
                              label=""
                              placeholder="Search your products…"
                              valueId={lineProducts[line.index]?.id}
                              valueLabel={lineProducts[line.index]?.name}
                              tone="warning"
                              onSelect={(picked) => {
                                setLineProducts((prev) => {
                                  const next = { ...prev };
                                  if (picked) next[line.index] = { id: picked.id, name: picked.label };
                                  else delete next[line.index];
                                  return next;
                                });
                              }}
                              onSearch={searchProducts}
                            />
                          ) : (
                            <div className="flex items-center gap-1 text-sm">
                              <Icons.CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                              <span>{line.erpProductName ?? line.productName ?? "Matched"}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="save-mappings"
                checked={saveMappings}
                onCheckedChange={(v) => setSaveMappings(v === true)}
              />
              <Label htmlFor="save-mappings" className="font-normal leading-snug cursor-pointer">
                Remember these customer and product matches for future Odaflow orders
              </Label>
            </div>
          </div>
        )}

        <SheetFooter className="mt-8 gap-2 sm:gap-2">
          <Button type="button" variant="ghost" onClick={() => void handleDismiss()} disabled={submitting}>
            Remove from list
          </Button>
          <Button type="button" onClick={() => void handleCreateSalesOrder()} disabled={!canSubmit}>
            {submitting ? "Creating…" : "Create sales order"}
          </Button>
        </SheetFooter>

        {order && !canSubmit && !loading && (
          <p className="text-xs text-muted-foreground text-center pb-2">
            Select the ERP customer and products above to continue.
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}
