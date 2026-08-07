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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { hasRuntimePermission } from "@/lib/settings/hub-permissions";
import {
  fetchOdaflowIntegrationApi,
  fetchOdaflowSyncStatus,
  fetchOdaflowProductMappings,
  fetchOdaflowCustomerMappings,
  generateOdaflowCredentialsApi,
  updateOdaflowIntegrationApi,
  type OdaflowCredentialsApiResponse,
  type OdaflowIntegrationApiResponse,
  type OdaflowSyncStatus,
  type OdaflowMapping,
} from "@/lib/api/odaflow-integration";
import { OdaflowSyncQueuePanel } from "@/components/integrations/OdaflowSyncQueuePanel";
import { OdaflowProductsSyncPanel } from "@/components/integrations/OdaflowProductsSyncPanel";
import { subscribeRealtimeInbox } from "@/lib/realtime-client";
import { useErpSfaEnrollment } from "@/lib/integrations/use-erp-sfa-enrollment";

type Tab = "setup" | "overview" | "queue" | "products" | "customers";

const TAB_LABELS: Record<Tab, string> = {
  setup: "Setup",
  overview: "Overview",
  queue: "Sync Queue",
  products: "Products & sync",
  customers: "Customer Mappings",
};

function CopyButton({ value, label }: { value: string; label: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        void navigator.clipboard.writeText(value);
        toast.success(`${label} copied`);
      }}
    >
      <Icons.Copy className="mr-2 h-4 w-4" />
      Copy
    </Button>
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
  const permissions = useAuthStore((s) => s.permissions ?? []);
  const canSave = hasRuntimePermission(permissions, "admin.settings");
  const { enrolled: sfaEnrolled, loading: sfaEnrollmentLoading } = useErpSfaEnrollment();

  const [tab, setTab] = React.useState<Tab>("overview");

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [settings, setSettings] = React.useState<OdaflowIntegrationApiResponse | null>(null);
  const [generated, setGenerated] = React.useState<OdaflowCredentialsApiResponse | null>(null);
  const [allowedManufacturerId, setAllowedManufacturerId] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);

  const [status, setStatus] = React.useState<OdaflowSyncStatus | null>(null);
  const [statusLoading, setStatusLoading] = React.useState(true);
  const [queueRefreshKey, setQueueRefreshKey] = React.useState(0);

  const [productMappings, setProductMappings] = React.useState<OdaflowMapping[]>([]);
  const [customerMappings, setCustomerMappings] = React.useState<OdaflowMapping[]>([]);
  const [mappingsLoading, setMappingsLoading] = React.useState(false);

  const refreshStatus = React.useCallback(async () => {
    setStatusLoading(true);
    try {
      const data = await fetchOdaflowSyncStatus();
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const loadSettings = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOdaflowIntegrationApi();
      setSettings(data);
      setAllowedManufacturerId(data.allowedManufacturerId ?? "");
      setIsActive(data.isActive);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load Odaflow integration.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadSettings();
    void refreshStatus();
  }, [loadSettings, refreshStatus]);

  React.useEffect(() => {
    return subscribeRealtimeInbox((event) => {
      if (event === "odaflow.sync-queue.changed") {
        void refreshStatus();
        setQueueRefreshKey((k) => k + 1);
      }
    });
  }, [refreshStatus]);

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

  const handleGenerate = async (rotate: boolean) => {
    if (!canSave) {
      toast.error("You need admin settings permission.");
      return;
    }
    if (!allowedManufacturerId.trim()) {
      toast.error("Enter the Odaflow manufacturer ID first.");
      return;
    }
    setGenerating(true);
    try {
      const data = await generateOdaflowCredentialsApi({
        allowedManufacturerId: allowedManufacturerId.trim(),
        rotate,
      });
      setGenerated(data);
      setSettings(data.settings);
      await refreshStatus();
      toast.success(rotate ? "Credentials rotated." : "Credentials generated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate credentials.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!canSave) {
      toast.error("You need admin settings permission.");
      return;
    }
    setSaving(true);
    try {
      const data = await updateOdaflowIntegrationApi({
        isActive,
        allowedManufacturerId: allowedManufacturerId.trim(),
      });
      setSettings(data);
      await refreshStatus();
      toast.success("Integration settings saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Odaflow SFA connector"
        description="Connect Odaflow to this ERP account, sync products for your sales teams, and resolve unmatched orders."
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Odaflow connector" },
        ]}
        sticky
        showCommandHint
        actions={
          tab === "setup" ? (
            <Button size="sm" onClick={handleSave} disabled={saving || !canSave || !settings?.apiKeyConfigured}>
              Save
            </Button>
          ) : undefined
        }
      />

      <div className="p-6 space-y-6">
        <div className="flex gap-2 border-b">
          {(["setup", "overview", "queue", "products", "customers"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {TAB_LABELS[t]}
              {t === "queue" && status && status.queueSummary.pending > 0 && (
                <span className="ml-2 rounded-full bg-yellow-100 text-yellow-800 text-xs px-1.5 py-0.5">
                  {status.queueSummary.pending}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === "setup" && (
          <div className="space-y-6 max-w-3xl">
            {!canSave && (
              <p className="text-sm text-muted-foreground">
                You can view this page, but only an organisation admin can generate or change connection settings.
              </p>
            )}

            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-50">
              <p className="font-medium">Connect ERP to Odaflow in two steps</p>
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm">
                <li>Generate your connection credentials on this page.</li>
                <li>
                  In Odaflow, open <strong>Workspace → ERP connection</strong> and paste the organisation ID, API key,
                  and secret.
                </li>
              </ol>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your organisation ID</CardTitle>
                <CardDescription>
                  Share this ID when linking Odaflow to this ERP account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded bg-muted px-2 py-1 text-sm break-all">{settings?.orgId}</code>
                      {settings?.orgId && <CopyButton value={settings.orgId} label="Organisation ID" />}
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <Badge variant={settings?.apiKeyConfigured ? "default" : "secondary"}>
                        {settings?.apiKeyConfigured ? "Credentials ready" : "Credentials not created yet"}
                      </Badge>
                      <Badge variant={settings?.isActive ? "default" : "secondary"}>
                        {settings?.isActive ? "Connection on" : "Connection off"}
                      </Badge>
                      {settings?.lastSyncAt && (
                        <span className="text-muted-foreground">
                          Last sync: {new Date(settings.lastSyncAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Connection credentials</CardTitle>
                <CardDescription>
                  Link this ERP account to your Odaflow manufacturer. The API key is shown only once when you
                  generate or rotate it — copy it somewhere safe.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mfg-id">Odaflow manufacturer ID</Label>
                  <Input
                    id="mfg-id"
                    value={allowedManufacturerId}
                    onChange={(e) => setAllowedManufacturerId(e.target.value)}
                    placeholder="Paste the manufacturer ID from Odaflow"
                    disabled={!canSave}
                  />
                  <p className="text-xs text-muted-foreground">
                    Ask your Odaflow admin for this ID, or find it under your manufacturer workspace settings.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="odaflow-active"
                    checked={isActive}
                    onCheckedChange={(v) => setIsActive(v === true)}
                    disabled={!canSave}
                  />
                  <Label htmlFor="odaflow-active" className="font-normal cursor-pointer">
                    Keep connection active (receive orders and updates from Odaflow)
                  </Label>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => void handleGenerate(false)}
                    disabled={generating || !canSave || settings?.apiKeyConfigured}
                  >
                    {generating ? "Generating…" : "Generate credentials"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleGenerate(true)}
                    disabled={generating || !canSave || !settings?.apiKeyConfigured}
                  >
                    Rotate API key
                  </Button>
                </div>

                {generated && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-3 dark:border-amber-800 dark:bg-amber-950/30">
                    <p className="text-sm font-medium text-amber-950 dark:text-amber-50">{generated.copyNotice}</p>
                    <div className="space-y-2">
                      <Label>API key</Label>
                      <div className="flex gap-2">
                        <code className="flex-1 rounded bg-background px-2 py-1 text-xs break-all">{generated.apiKey}</code>
                        <CopyButton value={generated.apiKey} label="API key" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>HMAC secret</Label>
                      <div className="flex gap-2">
                        <code className="flex-1 rounded bg-background px-2 py-1 text-xs break-all">{generated.hmacSecret}</code>
                        <CopyButton value={generated.hmacSecret} label="HMAC secret" />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "overview" && (
          <div className="space-y-6">
            {statusLoading ? (
              <div className="text-muted-foreground text-sm">Loading status…</div>
            ) : !status ? (
              <Card>
                <CardContent className="flex flex-col items-start gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-base font-medium">Finish connecting Odaflow</p>
                    <p className="text-sm text-muted-foreground max-w-xl">
                      Your organisation is not linked to Odaflow yet. Generate credentials on Setup, then paste them
                      into Odaflow under Workspace → ERP connection.
                    </p>
                  </div>
                  <Button type="button" onClick={() => setTab("setup")}>
                    Go to Setup
                    <Icons.ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
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

                  <Card
                    className={status.queueSummary.pending > 0 ? "cursor-pointer hover:border-primary/50 transition-colors" : undefined}
                    onClick={
                      status.queueSummary.pending > 0
                        ? () => setTab("queue")
                        : undefined
                    }
                  >
                    <CardHeader className="pb-2">
                      <CardDescription>Orders to review</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${status.queueSummary.pending > 0 ? "text-yellow-600" : ""}`}>
                        {status.queueSummary.pending}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Unmatched customers or products
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Resolved</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {status.queueSummary.resolved}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Cleared from the sync queue
                      </p>
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
                        <Badge key={e} variant="secondary">
                          {channelLabel(e)}
                        </Badge>
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

        {tab === "queue" && (
          <OdaflowSyncQueuePanel
            refreshKey={queueRefreshKey}
            onQueueChanged={() => {
              void refreshStatus();
              setQueueRefreshKey((k) => k + 1);
            }}
          />
        )}

        {tab === "products" && (
          sfaEnrollmentLoading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              Checking your Odaflow connection…
            </div>
          ) : sfaEnrolled ? (
            <OdaflowProductsSyncPanel
              canSave={canSave}
              productMappingsCount={productMappings.length}
            />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-start gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-base font-medium">Product sync is not ready yet</p>
                  <p className="text-sm text-muted-foreground max-w-xl">
                    Finish connecting this ERP account to Odaflow first. Once Setup is complete, you can sync
                    products into your sales reps&apos; catalogs from here.
                  </p>
                </div>
                <Button type="button" onClick={() => setTab("setup")}>
                  Go to Setup
                  <Icons.ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )
        )}

        {tab === "customers" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Customers matched between Odaflow and this ERP account appear here. New matches are created when
              orders sync or when you resolve them in the Sync Queue.
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
      </div>
    </PageShell>
  );
}
