"use client";

import * as React from "react";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { fetchOdaflowQueue, type OdaflowQueueItem } from "@/lib/api/odaflow-integration";
import { OdaflowQueueOrderSheet } from "@/components/integrations/OdaflowQueueOrderSheet";
import { formatNairobiRelativeTime } from "@/lib/format/nairobi-datetime";
import {
  formatOrderAmount,
  orderTypeLabel,
  resolveCustomerLabel,
  resolveSalesRepLabel,
  resolveSalesRepPhone,
} from "@/lib/odaflow/queue-display";

const QUEUE_STATUS_OPTIONS = [
  { value: "pending", label: "Needs review" },
  { value: "failed", label: "Failed" },
  { value: "resolved", label: "Sent to sales orders" },
  { value: "ignored", label: "Removed" },
];

const ALL_CHANNELS = "__all__";

const EVENT_TYPE_OPTIONS = [
  { value: ALL_CHANNELS, label: "All channels" },
  { value: "order.modern_trade", label: "Modern Trade" },
  { value: "order.distributor", label: "Distributor" },
  { value: "order.direct", label: "Direct Customer" },
  { value: "order.van_sales", label: "Van Sales" },
];

function issueSummary(item: OdaflowQueueItem): string {
  const mappings = item.unresolvedMappings ?? [];
  const rawLines = (item.rawPayload as { lines?: Array<{ erpProductId?: string }> } | undefined)?.lines ?? [];
  const matched = rawLines.filter((line) => line.erpProductId).length;
  const total = rawLines.length;

  const parts: string[] = [];
  if (total > 0 && matched > 0 && matched < total) {
    parts.push(`${matched}/${total} products matched`);
  }

  for (const mapping of mappings) {
    if (mapping.reason) {
      parts.push(mapping.reason);
      continue;
    }
    if (mapping.type === "customer") {
      parts.push(`Customer not matched: ${mapping.displayName ?? mapping.odaflowId}`);
    } else if (mapping.type === "product") {
      parts.push(`Product not matched: ${mapping.displayName ?? mapping.odaflowId}`);
    } else if (mapping.type === "price") {
      parts.push(`Price missing: ${mapping.displayName ?? mapping.odaflowId}`);
    } else {
      parts.push(`${mapping.type}: ${mapping.displayName ?? mapping.odaflowId}`);
    }
  }

  return parts.join(" · ") || item.blockReason || "Needs review";
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

type OdaflowSyncQueuePanelProps = {
  refreshKey?: number;
  onQueueChanged?: () => void;
  initialOpenQueueId?: string | null;
  initialCustomerId?: string | null;
  initialCustomerName?: string | null;
  showPricingReminder?: boolean;
  onDeepLinkConsumed?: () => void;
};

export function OdaflowSyncQueuePanel({
  refreshKey = 0,
  onQueueChanged,
  initialOpenQueueId = null,
  initialCustomerId = null,
  initialCustomerName = null,
  showPricingReminder = false,
  onDeepLinkConsumed,
}: OdaflowSyncQueuePanelProps) {
  const [queueItems, setQueueItems] = React.useState<OdaflowQueueItem[]>([]);
  const [queueTotal, setQueueTotal] = React.useState(0);
  const [queueLoading, setQueueLoading] = React.useState(true);
  const [queueStatus, setQueueStatus] = React.useState("pending");
  const [queueEventType, setQueueEventType] = React.useState(ALL_CHANNELS);
  const [queuePage, setQueuePage] = React.useState(1);
  const [customerSearch, setCustomerSearch] = React.useState("");
  const [salesRepSearch, setSalesRepSearch] = React.useState("");
  const debouncedCustomer = useDebouncedValue(customerSearch, 300);
  const debouncedSalesRep = useDebouncedValue(salesRepSearch, 300);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [latchedReturnContext, setLatchedReturnContext] = React.useState<{
    customerId: string;
    customerName: string | null;
    showPricingReminder: boolean;
  } | null>(null);

  const loadQueue = React.useCallback(async () => {
    setQueueLoading(true);
    try {
      const res = await fetchOdaflowQueue({
        status: queueStatus,
        eventType: queueEventType === ALL_CHANNELS ? undefined : queueEventType,
        page: queuePage,
        limit: 20,
        customer: debouncedCustomer || undefined,
        salesRep: debouncedSalesRep || undefined,
      });
      setQueueItems(res.items.filter((i) => i.eventType.startsWith("order.")));
      setQueueTotal(res.total);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setQueueLoading(false);
    }
  }, [queueStatus, queueEventType, queuePage, debouncedCustomer, debouncedSalesRep]);

  React.useEffect(() => {
    void loadQueue();
  }, [loadQueue, refreshKey]);

  React.useEffect(() => {
    setQueuePage(1);
  }, [debouncedCustomer, debouncedSalesRep]);

  React.useEffect(() => {
    if (!initialOpenQueueId) return;
    setSelectedId(initialOpenQueueId);
    setSheetOpen(true);
    if (initialCustomerId) {
      setLatchedReturnContext({
        customerId: initialCustomerId,
        customerName: initialCustomerName,
        showPricingReminder,
      });
    }
  }, [initialOpenQueueId, initialCustomerId, initialCustomerName, showPricingReminder]);

  function openOrder(id: string) {
    setLatchedReturnContext(null);
    setSelectedId(id);
    setSheetOpen(true);
  }

  function handleSheetChanged() {
    void loadQueue();
    onQueueChanged?.();
  }

  const hasSearch = Boolean(debouncedCustomer || debouncedSalesRep);

  return (
    <>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Click an order to review its lines, match customers and products, and send it to Sales Orders.
        </p>

        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Status</label>
            <Select
              value={queueStatus}
              onValueChange={(v) => {
                setQueueStatus(v);
                setQueuePage(1);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUEUE_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Channel</label>
            <Select
              value={queueEventType}
              onValueChange={(v) => {
                setQueueEventType(v);
                setQueuePage(1);
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[180px] flex-1">
            <label className="text-xs text-muted-foreground block mb-1">Search customer</label>
            <div className="relative">
              <Icons.Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Customer name or SFA ID"
                className="pl-8"
              />
            </div>
          </div>
          <div className="min-w-[180px] flex-1">
            <label className="text-xs text-muted-foreground block mb-1">Search sales rep</label>
            <div className="relative">
              <Icons.UserRound className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={salesRepSearch}
                onChange={(e) => setSalesRepSearch(e.target.value)}
                placeholder="Rep name or phone"
                className="pl-8"
              />
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void loadQueue()} disabled={queueLoading}>
            <Icons.RefreshCw className={`h-3.5 w-3.5 mr-1 ${queueLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {queueLoading ? (
          <div className="text-muted-foreground text-sm py-4">Loading orders…</div>
        ) : queueItems.length === 0 ? (
          <div className="text-muted-foreground text-sm py-6 text-center">
            {hasSearch ? "No orders match your search." : "No orders in this view."}
          </div>
        ) : (
          <div className="space-y-3">
            {queueItems.map((item) => {
              const summary = item.orderSummary;
              const customer = resolveCustomerLabel(item, summary);
              const salesRep = resolveSalesRepLabel(item, summary);
              const salesRepPhone = resolveSalesRepPhone(item, summary);
              const orderType = orderTypeLabel(item, summary);
              const amount = formatOrderAmount(summary);
              const when = formatNairobiRelativeTime(item.createdAt);

              return (
                <Card
                  key={item._id}
                  className="cursor-pointer transition-colors hover:border-primary/40 hover:bg-muted/20"
                  onClick={() => openOrder(item._id)}
                >
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="min-w-0">
                            <p className="text-base font-semibold truncate">{customer}</p>
                            <p className="text-sm text-muted-foreground truncate">{orderType}</p>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                            {when}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                          {salesRep ? (
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <Icons.UserRound className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{salesRep}</span>
                              {salesRepPhone ? (
                                <span className="text-xs opacity-80">· {salesRepPhone}</span>
                              ) : null}
                            </span>
                          ) : null}
                          {amount ? (
                            <span className="text-muted-foreground">{amount}</span>
                          ) : null}
                          <span className="text-xs font-mono text-muted-foreground/80">
                            {item.displayRef ?? item.odaflowId}
                          </span>
                        </div>

                        <p className="text-sm text-amber-800 dark:text-amber-200">{issueSummary(item)}</p>
                        <p className="text-xs text-muted-foreground">Tap to review products and create sales order</p>
                      </div>
                      <Icons.ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground mt-1" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {queueTotal > 20 && (
          <div className="flex justify-between items-center pt-2">
            <span className="text-sm text-muted-foreground">{queueTotal} total</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={queuePage <= 1} onClick={() => setQueuePage((p) => p - 1)}>
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={queuePage * 20 >= queueTotal}
                onClick={() => setQueuePage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <OdaflowQueueOrderSheet
        queueId={selectedId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onChanged={handleSheetChanged}
        initialCustomerId={latchedReturnContext?.customerId ?? null}
        initialCustomerName={latchedReturnContext?.customerName ?? null}
        showPricingReminder={latchedReturnContext?.showPricingReminder ?? false}
        onDeepLinkConsumed={onDeepLinkConsumed}
      />
    </>
  );
}
