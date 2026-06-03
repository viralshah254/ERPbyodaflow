"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Activity,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Eye,
  EyeOff,
  Key,
  Loader2,
  MessageCircle,
  Play,
  Shield,
  XCircle,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { hasRuntimePermission } from "@/lib/settings/hub-permissions";
import { fetchUsersApi } from "@/lib/api/users-roles";
import type { UserRow } from "@/lib/types/users-roles";
import {
  fetchCoolcatchBotIntegrationApi,
  updateCoolcatchBotIntegrationApi,
  generateCoolcatchBotApiKeyApi,
  testCoolcatchBotConnectionApi,
  type CoolcatchBotIntegrationApiResponse,
  type CoolcatchShopRowDto,
  type CoolcatchTestResult,
} from "@/lib/api/coolcatch-bot-integration";
import { CoolcatchShopRegistryEditor } from "@/components/settings/coolcatch-shop-registry-editor";
import { validateShopRows } from "@/lib/coolcatch/shop-registry";

export default function CoolcatchBotIntegrationPage() {
  const permissions = useAuthStore((s) => s.permissions ?? []);
  const orgRole = useOrgContextStore((s) => s.orgRole);
  const canSave = hasRuntimePermission(permissions, "admin.settings");

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [users, setUsers] = React.useState<UserRow[]>([]);

  const [enabled, setEnabled] = React.useState(false);
  const [shops, setShops] = React.useState<CoolcatchShopRowDto[]>([]);
  const [autoApprove, setAutoApprove] = React.useState(false);
  const [integrationUserId, setIntegrationUserId] = React.useState("");
  const [integrationUserName, setIntegrationUserName] = React.useState("");
  const [hmacSecret, setHmacSecret] = React.useState("");
  const [apiKeyConfigured, setApiKeyConfigured] = React.useState(false);
  const [hmacConfigured, setHmacConfigured] = React.useState(false);
  const [ordersUrl, setOrdersUrl] = React.useState<string | null>(null);
  const [productsUrl, setProductsUrl] = React.useState<string | null>(null);
  const [pricesPattern, setPricesPattern] = React.useState<string | null>(null);
  const [apiKeyGeneratedAt, setApiKeyGeneratedAt] = React.useState<string | null>(null);
  const [apiKeyLastUsedAt, setApiKeyLastUsedAt] = React.useState<string | null>(null);
  const [apiKeyCallCount, setApiKeyCallCount] = React.useState(0);

  const [generatedKey, setGeneratedKey] = React.useState<string | null>(null);
  const [showKey, setShowKey] = React.useState(false);
  const [generatingKey, setGeneratingKey] = React.useState(false);

  const [testResult, setTestResult] = React.useState<CoolcatchTestResult | null>(null);
  const [testing, setTesting] = React.useState(false);

  const applyResponse = React.useCallback((data: CoolcatchBotIntegrationApiResponse) => {
    setEnabled(!!data.enabled);
    setShops(data.shops ?? []);
    setAutoApprove(!!data.autoApproveSalesOrders);
    setIntegrationUserId(data.integrationUserId ?? "");
    setIntegrationUserName(data.integrationUserName ?? "");
    setHmacSecret("");
    setApiKeyConfigured(!!data.apiKeyConfigured);
    setHmacConfigured(!!data.hmacSecretConfigured);
    setOrdersUrl(data.ordersWebhookUrl ?? null);
    setProductsUrl(data.productsUrl ?? null);
    setPricesPattern(data.pricesUrlPattern ?? null);
    setApiKeyGeneratedAt(data.apiKeyGeneratedAt ?? null);
    setApiKeyLastUsedAt(data.apiKeyLastUsedAt ?? null);
    setApiKeyCallCount(data.apiKeyCallCount ?? 0);
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
      toast.error(e instanceof Error ? e.message : "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }, [applyResponse]);

  React.useEffect(() => { void load(); }, [load]);

  const handleSave = async () => {
    if (!canSave) return;
    const shopErr = validateShopRows(shops);
    if (shopErr) { toast.error(shopErr); return; }
    setSaving(true);
    try {
      const data = await updateCoolcatchBotIntegrationApi({
        enabled: true,
        shops,
        autoApproveSalesOrders: autoApprove,
        integrationUserId: integrationUserId || undefined,
        integrationUserName: integrationUserName.trim() || undefined,
        ...(hmacSecret.trim() ? { hmacSecret: hmacSecret.trim() } : {}),
      });
      applyResponse(data);
      toast.success("Settings saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateKey = async () => {
    if (!canSave) return;
    if (apiKeyConfigured) {
      const ok = window.confirm(
        "This will replace the existing API key. The bot will stop working until the new key is shared with Coolcatch. Continue?"
      );
      if (!ok) return;
    }
    setGeneratingKey(true);
    try {
      const { apiKey, generatedAt } = await generateCoolcatchBotApiKeyApi();
      setGeneratedKey(apiKey);
      setShowKey(true);
      setApiKeyConfigured(true);
      setApiKeyGeneratedAt(generatedAt);
      setApiKeyCallCount(0);
      setApiKeyLastUsedAt(null);
      setEnabled(true);
      toast.success("API key generated. Copy it and share it with Coolcatch.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate key.");
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testCoolcatchBotConnectionApi();
      setTestResult(result);
      if (result.ok) toast.success("All checks passed — bot is ready.");
      else toast.error("Some checks failed. See details below.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test failed.");
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast.message("Copied to clipboard."); }
    catch { toast.error("Could not copy."); }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return null;
    try { return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
    catch { return iso; }
  };

  return (
    <PageShell>
      <PageHeader
        title="Coolcatch WhatsApp bot"
        description="Connect your WhatsApp ordering bot to your product catalogue and franchise outlets."
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Integrations", href: "/settings" },
          { label: "Coolcatch bot" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/integrations/whatsapp">
                <MessageCircle className="mr-2 h-4 w-4" />
                Meta WhatsApp
              </Link>
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !canSave}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6 max-w-4xl">
        {!canSave && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-50">
            You have view-only access. Ask an admin to make changes.
          </div>
        )}

        {/* ── Step 1: API Key ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Key className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">API key</CardTitle>
                <CardDescription>
                  The bot authenticates with this key. Generate one and share it with Coolcatch.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {generatedKey ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                  <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200 mb-2">
                    Copy this key now — it won&apos;t be shown again
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-md bg-white dark:bg-black/20 px-3 py-2 text-sm font-mono break-all border">
                      {showKey ? generatedKey : "•".repeat(40)}
                    </code>
                    <Button variant="outline" size="icon" className="shrink-0" onClick={() => setShowKey((v) => !v)}>
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="icon" className="shrink-0" onClick={() => void copyToClipboard(generatedKey)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tell Coolcatch to send this as the <code className="text-[11px] bg-muted px-1 rounded">X-API-Key</code> header on every request.
                </p>
              </div>
            ) : apiKeyConfigured ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">API key is active</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-0.5">
                      {apiKeyGeneratedAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Created {formatDate(apiKeyGeneratedAt)}
                        </span>
                      )}
                      {apiKeyCallCount > 0 && (
                        <span className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          {apiKeyCallCount.toLocaleString()} call{apiKeyCallCount !== 1 ? "s" : ""}
                        </span>
                      )}
                      {apiKeyLastUsedAt && (
                        <span className="flex items-center gap-1">
                          <ChevronRight className="h-3 w-3" />
                          Last used {formatDate(apiKeyLastUsedAt)}
                        </span>
                      )}
                      {!apiKeyLastUsedAt && apiKeyConfigured && (
                        <span className="text-amber-600 dark:text-amber-400">Never used</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/30 p-6 text-center">
                <Key className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground mb-1">No API key yet</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Generate a key so the Coolcatch bot can connect to your products and prices.
                </p>
              </div>
            )}

            <Button
              variant={apiKeyConfigured ? "outline" : "default"}
              size="sm"
              disabled={!canSave || generatingKey}
              onClick={() => void handleGenerateKey()}
            >
              {generatingKey ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Key className="mr-2 h-4 w-4" />}
              {apiKeyConfigured ? "Regenerate key" : "Generate API key"}
            </Button>
          </CardContent>
        </Card>

        {/* ── Step 2: Outlets ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="text-sm font-semibold">2</span>
              </div>
              <div>
                <CardTitle className="text-base">Franchise outlets</CardTitle>
                <CardDescription>
                  Connect your outlets so the bot knows which shops, WhatsApp numbers, and prices to use.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CoolcatchShopRegistryEditor
              shops={shops}
              onChange={setShops}
              disabled={!canSave}
              loading={loading}
            />
          </CardContent>
        </Card>

        {/* ── Step 3: Test connection ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Play className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Test connection</CardTitle>
                <CardDescription>
                  Verify that the bot can reach your products and prices before going live.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              size="sm"
              disabled={testing}
              onClick={() => void handleTest()}
            >
              {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Run connection test
            </Button>

            {testResult && (
              <div className="space-y-2">
                {testResult.checks.map((check) => (
                  <div
                    key={check.name}
                    className={
                      "flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm" +
                      (check.ok
                        ? " border-emerald-200 bg-emerald-50/50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-100"
                        : " border-red-200 bg-red-50/50 text-red-900 dark:border-red-900 dark:bg-red-950/20 dark:text-red-100")
                    }
                  >
                    {check.ok ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                    )}
                    <span>{check.detail || check.name}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── API endpoints (collapsed) ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">API endpoints</CardTitle>
            <CardDescription>
              Share these URLs with Coolcatch. They use the API key as an <code className="text-[11px] bg-muted px-1 rounded">X-API-Key</code> header.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Products", url: productsUrl, method: "GET" },
              { label: "Prices", url: pricesPattern, method: "GET" },
              { label: "Orders", url: ordersUrl, method: "POST" },
            ].map(({ label, url, method }) => (
              <div key={label} className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono font-medium">{method}</span>
                  <span className="text-sm text-muted-foreground truncate">{label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <code className="text-xs font-mono text-muted-foreground truncate max-w-[300px] hidden sm:block">
                    {url ?? "—"}
                  </code>
                  {url && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => void copyToClipboard(url)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ── Advanced settings ── */}
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 py-2">
            <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
            Advanced settings
          </summary>
          <div className="space-y-4 pt-3">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="cc-auto"
                    checked={autoApprove}
                    onCheckedChange={(v) => setAutoApprove(v === true)}
                    disabled={!canSave}
                  />
                  <Label htmlFor="cc-auto" className="font-normal cursor-pointer text-sm">
                    Auto-approve sales orders from the bot
                  </Label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      <Shield className="inline h-3 w-3 mr-1" />
                      HMAC secret (optional extra security)
                    </Label>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      placeholder={hmacConfigured ? "••••••••" : "Leave blank if not using HMAC"}
                      value={hmacSecret}
                      onChange={(e) => setHmacSecret(e.target.value)}
                      disabled={!canSave}
                      className="mt-1 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Display name on sales orders</Label>
                    <Input
                      value={integrationUserName}
                      onChange={(e) => setIntegrationUserName(e.target.value)}
                      placeholder="Coolcatch Bot"
                      disabled={!canSave}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Attribute orders to user</Label>
                  <Select
                    value={integrationUserId || "__none__"}
                    onValueChange={(v) => setIntegrationUserId(v === "__none__" ? "" : v)}
                    disabled={!canSave}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Automatic" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Automatic</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {[u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || u.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </details>
      </div>
    </PageShell>
  );
}
