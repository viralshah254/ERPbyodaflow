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
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { hasRuntimePermission } from "@/lib/settings/hub-permissions";
import { fetchUsersApi } from "@/lib/api/users-roles";
import type { UserRow } from "@/lib/types/users-roles";
import {
  fetchCoolcatchBotIntegrationApi,
  updateCoolcatchBotIntegrationApi,
  getCoolcatchApiBaseFromFrontend,
  type CoolcatchBotIntegrationApiResponse,
} from "@/lib/api/coolcatch-bot-integration";

export default function CoolcatchBotIntegrationPage() {
  const permissions = useAuthStore((s) => s.permissions ?? []);
  const orgRole = useOrgContextStore((s) => s.orgRole);
  const canSave = hasRuntimePermission(permissions, "admin.settings");

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [users, setUsers] = React.useState<UserRow[]>([]);

  const [enabled, setEnabled] = React.useState(false);
  const [shopsJson, setShopsJson] = React.useState("[]");
  const [autoApprove, setAutoApprove] = React.useState(false);
  const [integrationUserId, setIntegrationUserId] = React.useState("");
  const [integrationUserName, setIntegrationUserName] = React.useState("");
  const [apiKey, setApiKey] = React.useState("");
  const [hmacSecret, setHmacSecret] = React.useState("");
  const [apiKeyConfigured, setApiKeyConfigured] = React.useState(false);
  const [hmacConfigured, setHmacConfigured] = React.useState(false);
  const [publicSourceOrgId, setPublicSourceOrgId] = React.useState<string | null>(null);
  const [thisOrgDrivesPublic, setThisOrgDrivesPublic] = React.useState(false);
  const [ordersUrl, setOrdersUrl] = React.useState<string | null>(null);
  const [productsUrl, setProductsUrl] = React.useState<string | null>(null);
  const [pricesPattern, setPricesPattern] = React.useState<string | null>(null);

  const applyResponse = React.useCallback((data: CoolcatchBotIntegrationApiResponse) => {
    setEnabled(!!data.enabled);
    setShopsJson(JSON.stringify(data.shops ?? [], null, 2));
    setAutoApprove(!!data.autoApproveSalesOrders);
    setIntegrationUserId(data.integrationUserId ?? "");
    setIntegrationUserName(data.integrationUserName ?? "");
    setApiKey("");
    setHmacSecret("");
    setApiKeyConfigured(!!data.apiKeyConfigured);
    setHmacConfigured(!!data.hmacSecretConfigured);
    setPublicSourceOrgId(data.publicConfigSourceOrgId ?? null);
    setThisOrgDrivesPublic(!!data.thisOrgDrivesPublicApi);
    setOrdersUrl(data.ordersWebhookUrl ?? null);
    setProductsUrl(data.productsUrl ?? null);
    setPricesPattern(data.pricesUrlPattern ?? null);
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [data, userList] = await Promise.all([
        fetchCoolcatchBotIntegrationApi(),
        fetchUsersApi().catch(() => [] as UserRow[]),
      ]);
      applyResponse(data);
      setUsers(userList);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load Coolcatch bot settings.");
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
    let shops: unknown;
    try {
      shops = JSON.parse(shopsJson.trim() || "[]");
    } catch {
      toast.error("Shop registry must be valid JSON.");
      return;
    }
    setSaving(true);
    try {
      const data = await updateCoolcatchBotIntegrationApi({
        enabled,
        shops: shops as CoolcatchBotIntegrationApiResponse["shops"],
        autoApproveSalesOrders: autoApprove,
        integrationUserId: integrationUserId || undefined,
        integrationUserName: integrationUserName.trim() || undefined,
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
        ...(hmacSecret.trim() ? { hmacSecret: hmacSecret.trim() } : {}),
      });
      applyResponse(data);
      toast.success("Coolcatch bot settings saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const fallbackBase = getCoolcatchApiBaseFromFrontend();

  return (
    <PageShell>
      <PageHeader
        title="Coolcatch bot (external)"
        description="API key, shop registry, and webhooks for the Coolcatch-hosted WhatsApp ordering bot — not Meta Cloud API."
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Coolcatch bot" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/integrations/whatsapp">
                <Icons.MessageCircle className="mr-2 h-4 w-4" />
                WhatsApp (Meta) instead
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
            View with organization settings access. Saving requires{" "}
            <code className="rounded bg-muted px-1">admin.settings</code>.
          </p>
        )}

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-50">
          <strong className="font-medium">One integration per number:</strong> do not use the same WhatsApp Business
          number for both this external bot and{" "}
          <Link href="/settings/integrations/whatsapp" className="underline font-medium">
            Meta webhook orders
          </Link>{" "}
          unless traffic is explicitly split. Backend doc:{" "}
          <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900/80">docs/COOLCATCH_BOT_ERP_CONNECTION.md</code>
          .
        </div>

        {orgRole === "FRANCHISOR" && (
          <p className="text-sm text-muted-foreground">
            Configure while signed in as the <strong>HQ</strong> organisation. Enable below and save a full shop
            registry; the first shop row is used to resolve the shared product catalogue. For production you can pin the
            source org with server env <code className="rounded bg-muted px-1">COOLCATCH_BOT_SETTINGS_ORG_ID</code>.
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Public API URLs</CardTitle>
            <CardDescription>
              Coolcatch calls these with header <code className="text-xs">X-API-Key</code>. Set{" "}
              <code className="text-xs">PUBLIC_API_BASE_URL</code> on the API host so URLs are correct.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {loading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : (
              <>
                {!ordersUrl && (
                  <p className="text-muted-foreground">
                    No public base URL on server. Browser API origin:{" "}
                    <code className="text-xs break-all">{fallbackBase || "(not configured)"}</code>
                  </p>
                )}
                <UrlRow label="POST orders" value={ordersUrl} />
                <UrlRow label="GET products" value={productsUrl} />
                <UrlRow label="GET prices" value={pricesPattern} />
                <p className="text-xs text-muted-foreground pt-2">
                  Public config source org:{" "}
                  <code className="break-all">{publicSourceOrgId ?? "(env-only or not resolved)"}</code>
                  {thisOrgDrivesPublic ? (
                    <BadgeOk text="This org drives the bot" />
                  ) : (
                    <span className="block mt-1">
                      This session org is <strong>not</strong> the resolved source — enable below and save here, or set{" "}
                      <code className="text-xs">COOLCATCH_BOT_SETTINGS_ORG_ID</code> to this org&apos;s id.
                    </span>
                  )}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Enable &amp; credentials</CardTitle>
            <CardDescription>
              When enabled, these values override server env (<code className="text-xs">COOLCATCH_BOT_*</code>) for the
              resolved source organisation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="cc-enabled"
                checked={enabled}
                onCheckedChange={(v) => setEnabled(v === true)}
                disabled={!canSave}
              />
              <Label htmlFor="cc-enabled" className="font-normal cursor-pointer">
                Use saved settings for the Coolcatch bot API (merge over env)
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="cc-auto"
                checked={autoApprove}
                onCheckedChange={(v) => setAutoApprove(v === true)}
                disabled={!canSave}
              />
              <Label htmlFor="cc-auto" className="font-normal cursor-pointer">
                Auto-approve sales orders from the bot
              </Label>
            </div>
            <div>
              <Label className="text-muted-foreground">API key (optional if set in env)</Label>
              <Input
                type="password"
                autoComplete="new-password"
                placeholder={apiKeyConfigured ? "•••••••• (leave blank to keep)" : "Paste new API key"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={!canSave}
                className="mt-1 font-mono text-sm"
              />
            </div>
            <div>
              <Label className="text-muted-foreground">HMAC secret (optional)</Label>
              <Input
                type="password"
                autoComplete="new-password"
                placeholder={hmacConfigured ? "•••••••• (leave blank to keep)" : "HMAC-SHA256 secret"}
                value={hmacSecret}
                onChange={(e) => setHmacSecret(e.target.value)}
                disabled={!canSave}
                className="mt-1 font-mono text-sm"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shop registry</CardTitle>
            <CardDescription>
              JSON array: <code className="text-xs">erp_shop_id</code>, <code className="text-xs">location</code>,{" "}
              <code className="text-xs">wa_phone_e164</code>, <code className="text-xs">outlet_org_id</code>, optional{" "}
              <code className="text-xs">branch_id</code>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={shopsJson}
              onChange={(e) => setShopsJson(e.target.value)}
              disabled={!canSave}
              rows={14}
              className="font-mono text-xs"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Integration actor</CardTitle>
            <CardDescription>Optional user attributed on created sales orders.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-muted-foreground">Integration user</Label>
              <Select
                value={integrationUserId || "__none__"}
                onValueChange={(v) => setIntegrationUserId(v === "__none__" ? "" : v)}
                disabled={!canSave}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Default (integration id in env)</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {[u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || u.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-muted-foreground">Display name override</Label>
              <Input
                value={integrationUserName}
                onChange={(e) => setIntegrationUserName(e.target.value)}
                placeholder="Coolcatch Bot Integration"
                disabled={!canSave}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function UrlRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <code className="text-xs break-all">{value}</code>
    </div>
  );
}

function BadgeOk({ text }: { text: string }) {
  return (
    <span className="ml-2 inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100">
      {text}
    </span>
  );
}
