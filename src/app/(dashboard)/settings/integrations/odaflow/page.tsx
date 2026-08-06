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
  getErpApiBaseFromFrontend,
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

function UrlRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <code className="block text-xs break-all rounded bg-muted px-2 py-1">{value}</code>
    </div>
  );
}

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
  const { enrolled: sfaEnrolled } = useErpSfaEnrollment();

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

  const fallbackBase = getErpApiBaseFromFrontend();

  return (
    <PageShell>
      <PageHeader
        title="Odaflow SFA connector"
        description="Generate credentials, monitor sync health, and resolve unmatched orders between Odaflow and the ERP."
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
                View-only. Saving requires <code className="rounded bg-muted px-1">admin.settings</code>.
              </p>
            )}

            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-50">
              <strong className="font-medium">Two-step setup:</strong> (1) Generate credentials here on ERP.
              (2) In Odaflow, open <strong>Workspace → ERP connection</strong> and paste the API key, HMAC secret, and org ID below.
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your ERP org</CardTitle>
                <CardDescription>Give this org ID to the Odaflow admin when they connect.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded bg-muted px-2 py-1 text-sm break-all">{settings?.orgId}</code>
                      {settings?.orgId && <CopyButton value={settings.orgId} label="Org ID" />}
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <Badge variant={settings?.apiKeyConfigured ? "default" : "secondary"}>
                        API key {settings?.apiKeyConfigured ? "configured" : "not set"}
                      </Badge>
                      <Badge variant={settings?.isActive ? "default" : "secondary"}>
                        {settings?.isActive ? "Active" : "Inactive"}
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
                <CardTitle className="text-base">Inbound API URLs</CardTitle>
                <CardDescription>
                  Odaflow calls these with header <code className="text-xs">X-Odaflow-API-Key</code>. Set{" "}
                  <code className="text-xs">PUBLIC_API_BASE_URL</code> on the API host for production URLs.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {!settings?.ordersUrl && (
                  <p className="text-sm text-muted-foreground">
                    Browser API origin: <code className="text-xs break-all">{fallbackBase || "(not configured)"}</code>
                  </p>
                )}
                <UrlRow label="POST orders" value={settings?.ordersUrl ?? null} />
                <UrlRow label="POST customers" value={settings?.customersUrl ?? null} />
                <UrlRow label="POST product map" value={settings?.productsUrl ?? null} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Credentials</CardTitle>
                <CardDescription>
                  Link this ERP org to one Odaflow manufacturer ID. The API key is shown once after generate/rotate.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mfg-id">Odaflow manufacturer ID</Label>
                  <Input
                    id="mfg-id"
                    value={allowedManufacturerId}
                    onChange={(e) => setAllowedManufacturerId(e.target.value)}
                    placeholder="69720d9400e503bbe94442c8"
                    disabled={!canSave}
                  />
                  <p className="text-xs text-muted-foreground">
                    From Odaflow admin or MongoDB <code>manufacturers._id</code> for this tenant.
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
                    Integration active (accept inbound Odaflow events)
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
                <CardContent className="pt-6">
                  <p className="text-muted-foreground text-sm">
                    Odaflow connector not configured. Open the <strong>Setup</strong> tab to generate credentials, or run{" "}
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">npm run bootstrap:topfood-odaflow-connector</code>{" "}
                    from the backend repo.
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
          sfaEnrolled ? (
            <OdaflowProductsSyncPanel
              canSave={canSave}
              productMappingsCount={productMappings.length}
            />
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Product sync to Odaflow SFA is available for enrolled FMCG organisations with an active ERP-managed connector.
                Complete setup on the <strong>Setup</strong> tab and ensure SFA is in <code className="text-xs bg-muted px-1 rounded">erp_managed</code> mode.
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
          )
        )}

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
      </div>
    </PageShell>
  );
}
