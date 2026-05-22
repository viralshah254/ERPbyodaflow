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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { hasRuntimePermission } from "@/lib/settings/hub-permissions";
import {
  fetchOdaflowIntegrationApi,
  generateOdaflowCredentialsApi,
  getErpApiBaseFromFrontend,
  updateOdaflowIntegrationApi,
  type OdaflowCredentialsApiResponse,
  type OdaflowIntegrationApiResponse,
} from "@/lib/api/odaflow-integration";

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

export default function OdaflowIntegrationPage() {
  const permissions = useAuthStore((s) => s.permissions ?? []);
  const canSave = hasRuntimePermission(permissions, "admin.settings");

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [settings, setSettings] = React.useState<OdaflowIntegrationApiResponse | null>(null);
  const [generated, setGenerated] = React.useState<OdaflowCredentialsApiResponse | null>(null);
  const [allowedManufacturerId, setAllowedManufacturerId] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);

  const load = React.useCallback(async () => {
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
    void load();
  }, [load]);

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
        description="Generate API credentials for your Odaflow manufacturer, then paste them into Odaflow Workspace → ERP connection."
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Odaflow connector" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button size="sm" onClick={handleSave} disabled={saving || !canSave || !settings?.apiKeyConfigured}>
            Save
          </Button>
        }
      />

      <div className="p-6 space-y-6 max-w-3xl">
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
                    <span className="text-muted-foreground">Last sync: {new Date(settings.lastSyncAt).toLocaleString()}</span>
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

        {settings && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sync queue</CardTitle>
              <CardDescription>Orders blocked on missing mappings appear here until resolved.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
              {(["pending", "processing", "resolved", "failed", "ignored"] as const).map((key) => (
                <div key={key} className="rounded-md border p-3">
                  <p className="text-muted-foreground capitalize">{key}</p>
                  <p className="text-2xl font-semibold">{settings.queueSummary[key]}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <p className="text-sm text-muted-foreground">
          After saving credentials in Odaflow, devs can run product sync scripts. See{" "}
          <code className="rounded bg-muted px-1">erp-intergration.md</code> in the backend repo.
        </p>
      </div>
    </PageShell>
  );
}
