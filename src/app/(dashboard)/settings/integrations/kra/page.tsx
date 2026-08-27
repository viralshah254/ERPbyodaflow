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
import { hasRuntimePermission } from "@/lib/settings/hub-permissions";
import { KraTaxPinField } from "@/components/parties/KraTaxPinField";
import {
  fetchKraIntegrationApi,
  initializeKraEtimsDeviceApi,
  testKraEtimsConnectionApi,
  updateKraIntegrationApi,
  type KraIntegrationApiResponse,
} from "@/lib/api/kra-integration";

function CheckRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? (
        <Icons.CheckCircle2 className="h-4 w-4 text-emerald-600" />
      ) : (
        <Icons.Circle className="h-4 w-4 text-muted-foreground" />
      )}
      <span className={ok ? "" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

export default function KraIntegrationSettingsPage() {
  const permissions = useAuthStore((s) => s.permissions ?? []);
  const canSave = hasRuntimePermission(permissions, "admin.settings");

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [initializing, setInitializing] = React.useState(false);
  const [data, setData] = React.useState<KraIntegrationApiResponse | null>(null);

  const [orgTaxId, setOrgTaxId] = React.useState("");
  const [enabled, setEnabled] = React.useState(false);
  const [environment, setEnvironment] = React.useState<"sandbox" | "production">("sandbox");
  const [deviceSerial, setDeviceSerial] = React.useState("");
  const [bhfId, setBhfId] = React.useState("00");
  const [cmcKey, setCmcKey] = React.useState("");

  const apply = React.useCallback((next: KraIntegrationApiResponse) => {
    setData(next);
    setOrgTaxId(next.orgTaxId ?? "");
    setEnabled(!!next.etims.enabled);
    setEnvironment(next.etims.environment === "production" ? "production" : "sandbox");
    setDeviceSerial(next.etims.deviceSerial ?? "");
    setBhfId(next.etims.bhfId || "00");
    setCmcKey("");
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      apply(await fetchKraIntegrationApi());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load KRA settings.");
    } finally {
      setLoading(false);
    }
  }, [apply]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const incotexLocked = data?.connection === "incotex";

  const handleSave = async () => {
    if (!canSave || incotexLocked) return;
    setSaving(true);
    try {
      const next = await updateKraIntegrationApi({
        enabled,
        environment,
        deviceSerial,
        bhfId,
        orgTaxId,
        ...(cmcKey.trim() ? { cmcKey: cmcKey.trim() } : {}),
      });
      apply(next);
      toast.success("KRA eTIMS settings saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save KRA settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!canSave || incotexLocked) return;
    setTesting(true);
    try {
      const result = await testKraEtimsConnectionApi();
      toast.success(result.taxpayerName ? `${result.message} (${result.taxpayerName})` : result.message);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Connection test failed.");
    } finally {
      setTesting(false);
    }
  };

  const handleInitialize = async () => {
    if (!canSave || incotexLocked) return;
    setInitializing(true);
    try {
      const result = await initializeKraEtimsDeviceApi();
      toast.success(result.message);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Device initialization failed.");
    } finally {
      setInitializing(false);
    }
  };

  const pinSet = Boolean((data?.orgTaxId ?? orgTaxId).trim());
  const credsSaved = Boolean(data?.etims.deviceSerial);
  const handshakeOk = Boolean(data?.etims.lastHandshakeAt);
  const etimsOn = Boolean(data?.etims.enabled);

  return (
    <PageShell>
      <PageHeader
        title="KRA eTIMS"
        description="Connect this organisation to KRA so posted tax invoices can be signed."
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "KRA eTIMS" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/finance/kra-signing">
                <Icons.ListChecks className="mr-2 h-4 w-4" />
                Signing monitor
              </Link>
            </Button>
            {!incotexLocked && (
              <Button size="sm" onClick={() => void handleSave()} disabled={saving || !canSave || loading}>
                Save
              </Button>
            )}
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

        {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}

        {incotexLocked ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Icons.ShieldCheck className="h-4 w-4" />
                Connected via Incotex
              </CardTitle>
              <CardDescription>
                This organisation already signs tax invoices through the Incotex bridge. That path is unchanged —
                do not enter eTIMS device credentials here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge>Incotex</Badge>
                <Badge variant="secondary">PIN {data?.orgTaxId || "not set"}</Badge>
                {data?.incotex.bridgeBaseUrl ? (
                  <Badge variant="secondary">{data.incotex.bridgeBaseUrl}</Badge>
                ) : null}
              </div>
              {data?.lastSigned?.documentNumber ? (
                <p className="text-muted-foreground">
                  Last signed: {data.lastSigned.documentNumber}
                  {data.lastSigned.signedAt
                    ? ` · ${new Date(data.lastSigned.signedAt).toLocaleString()}`
                    : ""}
                </p>
              ) : null}
              <Button variant="outline" size="sm" asChild>
                <Link href="/finance/kra-signing">Open Incotex signing monitor</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Connection checklist</CardTitle>
                <CardDescription>
                  Posted invoices stay unsigned until eTIMS is enabled. A KRA outage does not block posting.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <CheckRow ok={pinSet} label="Organisation KRA PIN set" />
                <CheckRow ok={credsSaved} label="Device serial saved" />
                <CheckRow ok={handshakeOk} label="Connection test or device init succeeded" />
                <CheckRow ok={etimsOn} label="eTIMS signing enabled" />
                <CheckRow
                  ok={Boolean(data?.lastSigned?.documentNumber)}
                  label={
                    data?.lastSigned?.documentNumber
                      ? `Last signed: ${data.lastSigned.documentNumber}`
                      : "No signed invoice yet"
                  }
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Organisation PIN</CardTitle>
                <CardDescription>
                  Seller KRA PIN used on every tax invoice. Stored on the organisation profile.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <KraTaxPinField
                  value={orgTaxId}
                  onChange={setOrgTaxId}
                  optional={false}
                  label="Organisation KRA PIN"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">eTIMS OSCU device</CardTitle>
                <CardDescription>
                  After KRA certifies OdaFlow and you onboard on the eTIMS portal, paste the device details here.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="etims-enabled"
                    checked={enabled}
                    onCheckedChange={(c) => setEnabled(c === true)}
                    disabled={!canSave}
                  />
                  <Label htmlFor="etims-enabled">Enable eTIMS signing on posted invoices</Label>
                </div>
                <div className="space-y-2">
                  <Label>Environment</Label>
                  <Select
                    value={environment}
                    onValueChange={(v) => setEnvironment(v as "sandbox" | "production")}
                    disabled={!canSave}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="device-serial">Device serial</Label>
                  <Input
                    id="device-serial"
                    value={deviceSerial}
                    onChange={(e) => setDeviceSerial(e.target.value)}
                    placeholder="From the eTIMS portal"
                    disabled={!canSave}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bhf-id">Branch office ID (BHF)</Label>
                  <Input
                    id="bhf-id"
                    value={bhfId}
                    onChange={(e) => setBhfId(e.target.value)}
                    placeholder="00"
                    disabled={!canSave}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cmc-key">Communication key (CMC)</Label>
                  <Input
                    id="cmc-key"
                    type="password"
                    value={cmcKey}
                    onChange={(e) => setCmcKey(e.target.value)}
                    placeholder={
                      data?.etims.cmcKeyConfigured
                        ? "●●●●●●●●  (saved — leave blank to keep)"
                        : "Returned after device initialization"
                    }
                    disabled={!canSave}
                    autoComplete="off"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleTest()}
                    disabled={!canSave || testing}
                  >
                    {testing ? "Testing…" : "Test connection"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleInitialize()}
                    disabled={!canSave || initializing}
                  >
                    {initializing ? "Initializing…" : "Initialize device"}
                  </Button>
                </div>
                {data?.etims.lastHandshakeMessage ? (
                  <p className="text-xs text-muted-foreground">{data.etims.lastHandshakeMessage}</p>
                ) : null}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageShell>
  );
}
