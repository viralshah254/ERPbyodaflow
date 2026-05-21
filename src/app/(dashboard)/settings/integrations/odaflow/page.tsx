"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import {
  fetchOdaflowSyncStatus,
  fetchOdaflowQueue,
  retryQueueItem,
  ignoreQueueItem,
  fetchOdaflowProductMappings,
  fetchOdaflowCustomerMappings,
  type OdaflowSyncStatus,
  type OdaflowQueueItem,
  type OdaflowMapping,
} from "@/lib/api/odaflow-integration";

type Tab = "overview" | "queue" | "products" | "customers";

const QUEUE_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "resolved", label: "Resolved" },
  { value: "ignored", label: "Ignored" },
];

const EVENT_TYPE_OPTIONS = [
  { value: "", label: "All channels" },
  { value: "order.modern_trade", label: "Modern Trade" },
  { value: "order.distributor", label: "Distributor" },
  { value: "order.direct", label: "Direct Customer" },
  { value: "order.van_sales", label: "Van Sales" },
  { value: "customer.upsert", label: "Customers" },
  { value: "product.map", label: "Products" },
];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    processing: "bg-blue-100 text-blue-800",
    resolved: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    ignored: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

function channelLabel(eventType: string) {
  const map: Record<string, string> = {
    "order.modern_trade": "Modern Trade",
    "order.distributor": "Distributor",
    "order.direct": "Direct",
    "order.van_sales": "Van Sales",
    "customer.upsert": "Customer",
    "product.map": "Product",
  };
  return map[eventType] ?? eventType;
}

export default function OdaflowIntegrationPage() {
  const [tab, setTab] = React.useState<Tab>("overview");
  const [status, setStatus] = React.useState<OdaflowSyncStatus | null>(null);
  const [statusLoading, setStatusLoading] = React.useState(true);

  const [queueItems, setQueueItems] = React.useState<OdaflowQueueItem[]>([]);
  const [queueTotal, setQueueTotal] = React.useState(0);
  const [queueLoading, setQueueLoading] = React.useState(false);
  const [queueStatus, setQueueStatus] = React.useState("pending");
  const [queueEventType, setQueueEventType] = React.useState("");
  const [queuePage, setQueuePage] = React.useState(1);

  const [productMappings, setProductMappings] = React.useState<OdaflowMapping[]>([]);
  const [customerMappings, setCustomerMappings] = React.useState<OdaflowMapping[]>([]);
  const [mappingsLoading, setMappingsLoading] = React.useState(false);

  React.useEffect(() => {
    setStatusLoading(true);
    fetchOdaflowSyncStatus()
      .then(setStatus)
      .catch(() => {})
      .finally(() => setStatusLoading(false));
  }, []);

  React.useEffect(() => {
    if (tab !== "queue") return;
    setQueueLoading(true);
    fetchOdaflowQueue({ status: queueStatus, eventType: queueEventType || undefined, page: queuePage, limit: 20 })
      .then((res) => {
        setQueueItems(res.items);
        setQueueTotal(res.total);
      })
      .catch(() => toast.error("Failed to load queue"))
      .finally(() => setQueueLoading(false));
  }, [tab, queueStatus, queueEventType, queuePage]);

  React.useEffect(() => {
    if (tab !== "products" && tab !== "customers") return;
    setMappingsLoading(true);
    Promise.all([fetchOdaflowProductMappings(), fetchOdaflowCustomerMappings()])
      .then(([prods, custs]) => {
        setProductMappings(prods.items);
        setCustomerMappings(custs.items);
      })
      .catch(() => toast.error("Failed to load mappings"))
      .finally(() => setMappingsLoading(false));
  }, [tab]);

  async function handleRetry(id: string) {
    try {
      await retryQueueItem(id);
      toast.success("Item requeued");
      setQueueItems((prev) => prev.map((i) => (i._id === id ? { ...i, status: "pending" } : i)));
    } catch {
      toast.error("Failed to retry");
    }
  }

  async function handleIgnore(id: string) {
    try {
      await ignoreQueueItem(id);
      toast.success("Item ignored");
      setQueueItems((prev) => prev.filter((i) => i._id !== id));
    } catch {
      toast.error("Failed to ignore");
    }
  }

  return (
    <PageShell>
      <PageHeader
        title="Odaflow → ERP Connector"
        description="Manage the sync between Odaflow (field sales) and the ERP. Resolve unmatched orders, map products and customers, and monitor delivery health."
      />

      {/* Tab bar */}
      <div className="flex gap-2 border-b mb-6">
        {(["overview", "queue", "products", "customers"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "overview" ? "Overview" : t === "queue" ? "Sync Queue" : t === "products" ? "Product Mappings" : "Customer Mappings"}
            {t === "queue" && status && status.queueSummary.pending > 0 && (
              <span className="ml-2 rounded-full bg-yellow-100 text-yellow-800 text-xs px-1.5 py-0.5">
                {status.queueSummary.pending}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {tab === "overview" && (
        <div className="space-y-6">
          {statusLoading ? (
            <div className="text-muted-foreground text-sm">Loading status…</div>
          ) : !status ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-sm">
                  Odaflow connector not configured. Run{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">npm run bootstrap:topfood-odaflow-connector</code>{" "}
                  to create the integration credentials.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {status.isActive ? (
                        <span className="text-green-600 flex items-center gap-1">
                          <Icons.Wifi className="h-5 w-5" /> Active
                        </span>
                      ) : (
                        <span className="text-red-500 flex items-center gap-1">
                          <Icons.WifiOff className="h-5 w-5" /> Inactive
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Events Processed</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{status.totalEventsProcessed.toLocaleString()}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Pending in Queue</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${status.queueSummary.pending > 0 ? "text-yellow-600" : ""}`}>
                      {status.queueSummary.pending}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Recent Failures</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${status.recentFailureCount > 0 ? "text-red-500" : ""}`}>
                      {status.recentFailureCount}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Queue Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    {Object.entries(status.queueSummary).map(([k, v]) => (
                      <div key={k} className="text-sm">
                        <span className="text-muted-foreground capitalize mr-1">{k}:</span>
                        <span className="font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                  {status.lastSyncAt && (
                    <p className="text-xs text-muted-foreground mt-3">
                      Last sync: {new Date(status.lastSyncAt).toLocaleString()}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Enabled Event Types</CardTitle>
                  <CardDescription>Which Odaflow event types this ERP tenant accepts.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {status.enabledEvents.map((e) => (
                      <Badge key={e} variant="secondary">{channelLabel(e)}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">How This Works</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>
                    1. <strong>Odaflow</strong> captures orders from modern-trade (email/OCR), distributors, direct customers, and van sales.
                  </p>
                  <p>
                    2. When an order is approved in Odaflow, it pushes a signed JSON payload to{" "}
                    <code className="text-xs bg-muted px-1 rounded">/api/integrations/odaflow/orders/upsert</code>.
                  </p>
                  <p>
                    3. The ERP matches Odaflow IDs to ERP parties and products via <strong>External Record Mappings</strong>.
                  </p>
                  <p>
                    4. Matched orders become ERP <strong>Sales Orders</strong> (Draft → ready to approve and dispatch).
                  </p>
                  <p>
                    5. Orders with unmatched customers or products go to the <strong>Sync Queue</strong> tab — resolve mappings there.
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* SYNC QUEUE TAB */}
      {tab === "queue" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Status</label>
              <Select value={queueStatus} onValueChange={(v) => { setQueueStatus(v); setQueuePage(1); }}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUEUE_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Channel</label>
              <Select value={queueEventType} onValueChange={(v) => { setQueueEventType(v); setQueuePage(1); }}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {queueLoading ? (
            <div className="text-muted-foreground text-sm py-4">Loading queue…</div>
          ) : queueItems.length === 0 ? (
            <div className="text-muted-foreground text-sm py-6 text-center">No items in this view.</div>
          ) : (
            <div className="space-y-3">
              {queueItems.map((item) => (
                <Card key={item._id}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {statusBadge(item.status)}
                          <span className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                            {channelLabel(item.eventType)}
                          </span>
                          <span className="text-sm font-medium truncate">
                            {item.displayRef ?? item.odaflowId}
                          </span>
                        </div>
                        {item.blockReason && (
                          <p className="text-xs text-red-600 mt-1">{item.blockReason}</p>
                        )}
                        {item.unresolvedMappings && item.unresolvedMappings.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {item.unresolvedMappings.map((m, i) => (
                              <span key={i} className="text-xs bg-red-50 text-red-700 rounded px-1.5 py-0.5">
                                {m.type}: {m.displayName ?? m.odaflowId}
                              </span>
                            ))}
                          </div>
                        )}
                        {item.erpDocumentId && (
                          <p className="text-xs text-green-600 mt-1">ERP Doc: {item.erpDocumentId}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.attemptCount} attempt{item.attemptCount !== 1 ? "s" : ""}
                          {item.lastAttemptAt ? ` · last ${new Date(item.lastAttemptAt).toLocaleString()}` : ""}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {(item.status === "pending" || item.status === "failed") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRetry(item._id)}
                          >
                            <Icons.RefreshCw className="h-3.5 w-3.5 mr-1" />
                            Retry
                          </Button>
                        )}
                        {item.status !== "resolved" && item.status !== "ignored" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleIgnore(item._id)}
                          >
                            Ignore
                          </Button>
                        )}
                      </div>
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
                <Button size="sm" variant="outline" disabled={queuePage * 20 >= queueTotal} onClick={() => setQueuePage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PRODUCT MAPPINGS TAB */}
      {tab === "products" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            These mappings link Odaflow product IDs to ERP SKUs. Missing mappings will cause orders to queue.
            Add mappings via{" "}
            <code className="text-xs bg-muted px-1 rounded">POST /api/integrations/odaflow/products/map</code>.
          </p>
          {mappingsLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : productMappings.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">No product mappings yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Odaflow ID</th>
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Pack Size</th>
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">ERP Product ID</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Last Synced</th>
                  </tr>
                </thead>
                <tbody>
                  {productMappings.map((m) => {
                    const [, packSize] = (m.externalKey ?? "").split(":");
                    return (
                      <tr key={m._id} className="border-b hover:bg-muted/30">
                        <td className="py-2 pr-4 font-mono text-xs">{m.externalId}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{packSize ?? "—"}</td>
                        <td className="py-2 pr-4 font-mono text-xs">{m.entityId}</td>
                        <td className="py-2 text-xs text-muted-foreground">
                          {m.lastSyncedAt ? new Date(m.lastSyncedAt).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CUSTOMER MAPPINGS TAB */}
      {tab === "customers" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            These mappings link Odaflow customer IDs to ERP Party records. Push customers via{" "}
            <code className="text-xs bg-muted px-1 rounded">POST /api/integrations/odaflow/customers/upsert</code>.
          </p>
          {mappingsLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : customerMappings.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">No customer mappings yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Odaflow Customer ID</th>
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Customer Code</th>
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">ERP Party ID</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Last Synced</th>
                  </tr>
                </thead>
                <tbody>
                  {customerMappings.map((m) => (
                    <tr key={m._id} className="border-b hover:bg-muted/30">
                      <td className="py-2 pr-4 font-mono text-xs">{m.externalId}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{m.externalKey ?? "—"}</td>
                      <td className="py-2 pr-4 font-mono text-xs">{m.entityId}</td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {m.lastSyncedAt ? new Date(m.lastSyncedAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
