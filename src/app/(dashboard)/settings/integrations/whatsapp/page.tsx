"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { hasRuntimePermission } from "@/lib/settings/hub-permissions";
import { fetchBranchesApi, type BranchRow } from "@/lib/api/branches";
import { fetchUsersApi } from "@/lib/api/users-roles";
import type { UserRow } from "@/lib/types/users-roles";
import {
  fetchWhatsAppIntegrationApi,
  getWhatsAppWebhookUrlFromFrontend,
  updateWhatsAppIntegrationApi,
  syncWhatsAppCatalogApi,
} from "@/lib/api/whatsapp-integration";
import type { WhatsAppIntegrationApiResponse } from "@/lib/api/whatsapp-integration";

function parsePhoneIdsBlock(text: string): string[] {
  return [...new Set(text.split(/[\s,;\n]+/).map((x) => x.trim()).filter(Boolean))];
}

export default function WhatsAppIntegrationSettingsPage() {
  const permissions = useAuthStore((s) => s.permissions ?? []);
  const canSave = hasRuntimePermission(permissions, "admin.settings");

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [platform, setPlatform] = React.useState<WhatsAppIntegrationApiResponse["platformHints"] | null>(
    null
  );
  const [callbackUrl, setCallbackUrl] = React.useState<string>("");

  const [enabled, setEnabled] = React.useState(false);
  const [phoneIdsText, setPhoneIdsText] = React.useState("");
  const [defaultBranchId, setDefaultBranchId] = React.useState<string>("");
  const [defaultCountryDial, setDefaultCountryDial] = React.useState("");
  const [orderCurrency, setOrderCurrency] = React.useState("");
  const [autoApprove, setAutoApprove] = React.useState(false);
  const [integrationUserId, setIntegrationUserId] = React.useState<string>("");
  // Meta Graph API (catalog sync)
  const [metaAccessToken, setMetaAccessToken] = React.useState("");
  const [metaCatalogId, setMetaCatalogId] = React.useState("");
  const [metaBusinessAccountId, setMetaBusinessAccountId] = React.useState("");
  const [metaTokenConfigured, setMetaTokenConfigured] = React.useState(false);
  const [catalogLastSyncedAt, setCatalogLastSyncedAt] = React.useState<string | undefined>(undefined);
  const [catalogLastSyncError, setCatalogLastSyncError] = React.useState<string | undefined>(undefined);
  const [syncing, setSyncing] = React.useState(false);

  const applyResponse = React.useCallback((data: WhatsAppIntegrationApiResponse) => {
    setEnabled(!!data.enabled);
    setPhoneIdsText((data.phoneNumberIds ?? []).join("\n"));
    setDefaultBranchId(data.defaultBranchId ?? "");
    setDefaultCountryDial(data.defaultCountryDial ?? "");
    setOrderCurrency(data.orderCurrency ?? "");
    setAutoApprove(!!data.autoApproveSalesOrders);
    setIntegrationUserId(data.integrationUserId ?? "");
    setPlatform(data.platformHints);
    setCallbackUrl(data.webhookCallbackUrl ?? getWhatsAppWebhookUrlFromFrontend());
    setMetaTokenConfigured(!!data.metaAccessTokenConfigured);
    setMetaCatalogId(data.metaCatalogId ?? "");
    setMetaBusinessAccountId(data.metaBusinessAccountId ?? "");
    setCatalogLastSyncedAt(data.catalogLastSyncedAt);
    setCatalogLastSyncError(data.catalogLastSyncError);
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [data, branchList, userList] = await Promise.all([
        fetchWhatsAppIntegrationApi(),
        fetchBranchesApi().catch(() => [] as BranchRow[]),
        fetchUsersApi().catch(() => [] as UserRow[]),
      ]);
      applyResponse(data);
      setBranches(branchList);
      setUsers(userList);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load WhatsApp integration settings.");
    } finally {
      setLoading(false);
    }
  }, [applyResponse]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    if (!canSave) {
      toast.error("You need admin settings permission to save.");
      return;
    }
    setSaving(true);
    try {
      const data = await updateWhatsAppIntegrationApi({
        enabled,
        phoneNumberIds: parsePhoneIdsBlock(phoneIdsText),
        defaultBranchId: defaultBranchId || undefined,
        defaultCountryDial: defaultCountryDial.replace(/\D/g, "") || undefined,
        orderCurrency: orderCurrency.trim().toUpperCase() || undefined,
        autoApproveSalesOrders: autoApprove,
        integrationUserId: integrationUserId || undefined,
        ...(metaAccessToken.trim() ? { metaAccessToken: metaAccessToken.trim() } : {}),
        metaCatalogId: metaCatalogId.trim() || undefined,
        metaBusinessAccountId: metaBusinessAccountId.trim() || undefined,
      });
      applyResponse(data);
      toast.success("WhatsApp integration settings saved.");
    } catch (e) {
      const err = e as Error & { status?: number };
      toast.error(err.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="WhatsApp orders"
        description="Route Meta WhatsApp Business messages into sales orders for this organization."
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "WhatsApp orders" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/automation/integrations">
                <Icons.Plug className="mr-2 h-4 w-4" />
                Automation integrations
              </Link>
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !canSave}>
              Save
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6 max-w-3xl">
        {!canSave && (
          <p className="text-sm text-muted-foreground">
            You can view this page with organization settings access. Saving changes requires{" "}
            <code className="rounded bg-muted px-1">admin.settings</code>.
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Meta webhook</CardTitle>
            <CardDescription>
              One callback URL is used for all organizations. Your tenant is identified by the WhatsApp{" "}
              <strong>phone number id</strong> from Meta (see below). The verify token and app secret are
              configured on the server for the whole product, not per organization.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <>
                <div>
                  <Label className="text-muted-foreground">Callback URL</Label>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <code className="text-sm break-all rounded-md bg-muted px-2 py-1">{callbackUrl}</code>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void navigator.clipboard.writeText(callbackUrl);
                        toast.success("Copied callback URL.");
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
                {platform && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Badge variant={platform.verifyTokenConfigured ? "default" : "secondary"}>
                      Verify token {platform.verifyTokenConfigured ? "configured" : "missing (server)"}
                    </Badge>
                    <Badge variant={platform.metaAppSecretConfigured ? "default" : "secondary"}>
                      App secret {platform.metaAppSecretConfigured ? "configured" : "optional / missing"}
                    </Badge>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organization routing</CardTitle>
            <CardDescription>
              Paste the <strong>Phone number ID</strong> from Meta Developer / WhatsApp → API Setup. Product
              codes in catalog or free-text orders must match SKU or code in your product master.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox id="wa-enabled" checked={enabled} onCheckedChange={(c) => setEnabled(c === true)} />
              <Label htmlFor="wa-enabled">Enable WhatsApp order ingestion for this organization</Label>
            </div>
            <div>
              <Label htmlFor="wa-phones">Phone number IDs (one per line or comma-separated)</Label>
              <Textarea
                id="wa-phones"
                className="mt-1 font-mono text-sm min-h-[88px]"
                value={phoneIdsText}
                onChange={(e) => setPhoneIdsText(e.target.value)}
                placeholder="e.g. 1069…"
                disabled={!canSave}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Default branch (optional)</Label>
                <Select
                  value={defaultBranchId || "__none__"}
                  onValueChange={(v) => setDefaultBranchId(v === "__none__" ? "" : v)}
                  disabled={!canSave}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="wa-dial">Default country dial (digits)</Label>
                <Input
                  id="wa-dial"
                  className="mt-1"
                  value={defaultCountryDial}
                  onChange={(e) => setDefaultCountryDial(e.target.value)}
                  placeholder="254"
                  disabled={!canSave}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="wa-currency">Default order currency</Label>
                <Input
                  id="wa-currency"
                  className="mt-1 uppercase"
                  value={orderCurrency}
                  onChange={(e) => setOrderCurrency(e.target.value)}
                  placeholder="KES"
                  maxLength={3}
                  disabled={!canSave}
                />
              </div>
              <div className="flex items-end pb-1">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="wa-auto"
                    checked={autoApprove}
                    onCheckedChange={(c) => setAutoApprove(c === true)}
                    disabled={!canSave}
                  />
                  <Label htmlFor="wa-auto">Auto-submit and approve sales orders</Label>
                </div>
              </div>
            </div>
            <div>
              <Label>Document actor user (optional)</Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-1">
                If set, audit trail uses this user instead of the generic integration user.
              </p>
              <Select
                value={integrationUserId || "__none__"}
                onValueChange={(v) => setIntegrationUserId(v === "__none__" ? "" : v)}
                disabled={!canSave}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Integration user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Default (integration:whatsapp)</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.firstName || u.lastName
                        ? `${u.firstName} ${u.lastName}`.trim()
                        : u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Meta Catalog Sync */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Icons.RefreshCw className="h-4 w-4 text-muted-foreground" />
              Meta Commerce catalog sync
            </CardTitle>
            <CardDescription>
              Push your ERP product catalog to Meta Commerce so retail customers see your products in WhatsApp
              shopping. Product SKU / code must match the <code className="text-xs bg-muted px-1 rounded">retailer_id</code>{" "}
              in your Meta catalog for order parsing to work.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="meta-token">Meta System User access token</Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-1">
                Long-lived token from Meta Business Manager → System Users → Generate token (scoped to{" "}
                <code className="text-xs bg-muted px-0.5 rounded">catalog_management</code>,{" "}
                <code className="text-xs bg-muted px-0.5 rounded">business_management</code>). Written once and stored
                securely — never returned.
              </p>
              <Input
                id="meta-token"
                type="password"
                className="mt-1 font-mono text-sm"
                value={metaAccessToken}
                onChange={(e) => setMetaAccessToken(e.target.value)}
                placeholder={metaTokenConfigured ? "●●●●●●●●  (already configured — leave blank to keep)" : "Paste token here"}
                disabled={!canSave}
              />
              {metaTokenConfigured && !metaAccessToken && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                  <Icons.CheckCircle className="h-3 w-3" /> Token configured
                </p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="meta-catalog">Catalog ID</Label>
                <Input
                  id="meta-catalog"
                  className="mt-1 font-mono text-sm"
                  value={metaCatalogId}
                  onChange={(e) => setMetaCatalogId(e.target.value)}
                  placeholder="e.g. 1234567890123456"
                  disabled={!canSave}
                />
              </div>
              <div>
                <Label htmlFor="meta-biz">Business Account ID</Label>
                <Input
                  id="meta-biz"
                  className="mt-1 font-mono text-sm"
                  value={metaBusinessAccountId}
                  onChange={(e) => setMetaBusinessAccountId(e.target.value)}
                  placeholder="e.g. 9876543210"
                  disabled={!canSave}
                />
              </div>
            </div>
            {(catalogLastSyncedAt || catalogLastSyncError) && (
              <div className="text-xs space-y-1">
                {catalogLastSyncedAt && (
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Icons.Clock className="h-3 w-3" />
                    Last synced: {new Date(catalogLastSyncedAt).toLocaleString()}
                  </p>
                )}
                {catalogLastSyncError && (
                  <p className="text-destructive flex items-center gap-1">
                    <Icons.AlertCircle className="h-3 w-3" />
                    Last error: {catalogLastSyncError}
                  </p>
                )}
              </div>
            )}
            {canSave && (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={syncing || !metaTokenConfigured || !metaCatalogId}
                  onClick={async () => {
                    setSyncing(true);
                    try {
                      const r = await syncWhatsAppCatalogApi();
                      toast.success(`Catalog synced — ${r.synced} product(s) pushed to Meta.`);
                      void load();
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Sync failed.");
                    } finally {
                      setSyncing(false);
                    }
                  }}
                >
                  {syncing ? (
                    <><Icons.RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" /> Syncing…</>
                  ) : (
                    <><Icons.RefreshCw className="mr-2 h-3.5 w-3.5" /> Sync catalog now</>
                  )}
                </Button>
                {(!metaTokenConfigured || !metaCatalogId) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Save a Meta access token and Catalog ID first to enable sync.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Onboarding Checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Icons.ListChecks className="h-4 w-4 text-muted-foreground" />
              Setup checklist
            </CardTitle>
            <CardDescription>Complete all steps for seamless WhatsApp retail commerce.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              {
                done: enabled && parsePhoneIdsBlock(phoneIdsText).length > 0,
                label: "WhatsApp ingestion enabled with at least one phone number ID",
                href: undefined,
              },
              {
                done: platform?.verifyTokenConfigured ?? false,
                label: "WEBHOOK_VERIFY_TOKEN configured on the server",
                href: undefined,
              },
              {
                done: !!callbackUrl,
                label: (
                  <span>
                    Webhook registered in Meta Developer Console:{" "}
                    {callbackUrl ? (
                      <code className="text-xs bg-muted px-1 rounded break-all">{callbackUrl}</code>
                    ) : (
                      <span className="text-muted-foreground">not yet resolved</span>
                    )}
                  </span>
                ),
              },
              {
                done: metaTokenConfigured,
                label: "Meta System User access token stored (for catalog sync)",
              },
              {
                done: !!metaCatalogId,
                label: "Meta Catalog ID configured",
              },
              {
                done: !!catalogLastSyncedAt && !catalogLastSyncError,
                label: "ERP catalog synced to Meta Commerce at least once",
              },
              {
                done: branches.some((b) => b.latitude != null && b.longitude != null),
                label: (
                  <span>
                    At least one branch has GPS coordinates (for nearest-outlet routing).{" "}
                    <Link href="/settings/branches" className="underline text-primary">
                      Manage branches
                    </Link>
                  </span>
                ),
              },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                {item.done ? (
                  <Icons.CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" />
                ) : (
                  <Icons.Circle className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                )}
                <span className={item.done ? "text-foreground" : "text-muted-foreground"}>
                  {item.label}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
