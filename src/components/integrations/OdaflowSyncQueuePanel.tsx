"use client";

import * as React from "react";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

function channelLabel(eventType: string) {
  const map: Record<string, string> = {
    "order.modern_trade": "Modern Trade",
    "order.distributor": "Distributor",
    "order.direct": "Direct",
    "order.van_sales": "Van Sales",
  };
  return map[eventType] ?? eventType;
}

function issueSummary(item: OdaflowQueueItem): string {
  const mappings = item.unresolvedMappings ?? [];
  if (mappings.length === 0) return item.blockReason ?? "Needs review";
  return mappings
    .map((m) => {
      if (m.type === "customer") return `Customer not matched: ${m.displayName ?? m.odaflowId}`;
      if (m.type === "product") return `Product not matched: ${m.displayName ?? m.odaflowId}`;
      return `${m.type}: ${m.displayName ?? m.odaflowId}`;
    })
    .join(" · ");
}

type OdaflowSyncQueuePanelProps = {
  refreshKey?: number;
  onQueueChanged?: () => void;
};

export function OdaflowSyncQueuePanel({ refreshKey = 0, onQueueChanged }: OdaflowSyncQueuePanelProps) {
  const [queueItems, setQueueItems] = React.useState<OdaflowQueueItem[]>([]);
  const [queueTotal, setQueueTotal] = React.useState(0);
  const [queueLoading, setQueueLoading] = React.useState(true);
  const [queueStatus, setQueueStatus] = React.useState("pending");
  const [queueEventType, setQueueEventType] = React.useState(ALL_CHANNELS);
  const [queuePage, setQueuePage] = React.useState(1);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const loadQueue = React.useCallback(async () => {
    setQueueLoading(true);
    try {
      const res = await fetchOdaflowQueue({
        status: queueStatus,
        eventType: queueEventType === ALL_CHANNELS ? undefined : queueEventType,
        page: queuePage,
        limit: 20,
      });
      setQueueItems(res.items.filter((i) => i.eventType.startsWith("order.")));
      setQueueTotal(res.total);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setQueueLoading(false);
    }
  }, [queueStatus, queueEventType, queuePage]);

  React.useEffect(() => {
    void loadQueue();
  }, [loadQueue, refreshKey]);

  function openOrder(id: string) {
    setSelectedId(id);
    setSheetOpen(true);
  }

  function handleSheetChanged() {
    void loadQueue();
    onQueueChanged?.();
  }

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
          <Button type="button" variant="outline" size="sm" onClick={() => void loadQueue()} disabled={queueLoading}>
            <Icons.RefreshCw className={`h-3.5 w-3.5 mr-1 ${queueLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {queueLoading ? (
          <div className="text-muted-foreground text-sm py-4">Loading orders…</div>
        ) : queueItems.length === 0 ? (
          <div className="text-muted-foreground text-sm py-6 text-center">No orders in this view.</div>
        ) : (
          <div className="space-y-3">
            {queueItems.map((item) => (
              <Card
                key={item._id}
                className="cursor-pointer transition-colors hover:border-primary/40 hover:bg-muted/20"
                onClick={() => openOrder(item._id)}
              >
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                          {channelLabel(item.eventType)}
                        </span>
                        <span className="text-sm font-semibold truncate">{item.displayRef ?? item.odaflowId}</span>
                      </div>
                      <p className="text-sm text-amber-800 dark:text-amber-200">{issueSummary(item)}</p>
                      <p className="text-xs text-muted-foreground mt-2">Tap to review products and create sales order</p>
                    </div>
                    <Icons.ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground mt-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
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
      />
    </>
  );
}
