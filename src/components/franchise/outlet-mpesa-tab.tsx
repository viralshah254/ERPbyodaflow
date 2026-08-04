"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Trash2,
} from "lucide-react";
import {
  clearOutletMpesaSettings,
  fetchOutletMpesaSettings,
  mpesaSettingsConfigured,
  mpesaSettingsReady,
  resolveOutletMpesaCallbackUrls,
  updateOutletMpesaSettings,
  type MpesaDarajaEnv,
  type MpesaTransactionType,
  type OutletMpesaSettings,
} from "@/lib/api/franchise-mpesa";
import { useCanWriteFranchise } from "@/lib/rbac/use-write-guard";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type FormState = {
  enabled: boolean;
  label: string;
  shortCode: string;
  transactionType: MpesaTransactionType;
  darajaEnv: MpesaDarajaEnv;
  consumerKey: string;
  consumerSecret: string;
  passkey: string;
};

function effectiveShortCode(form: FormState, settings: OutletMpesaSettings | null): string {
  return form.shortCode.trim() || settings?.shortCode?.trim() || "";
}

function validateSave(form: FormState, settings: OutletMpesaSettings): { ok: boolean; message?: string; field?: string } {
  const shortCode = effectiveShortCode(form, settings);

  if (form.enabled && !shortCode) {
    return {
      ok: false,
      field: "shortCode",
      message: "Enter the Paybill or Till number — the grey placeholder is not a saved value.",
    };
  }

  if (form.enabled && !settings.credentialsOnFile) {
    if (!form.consumerKey.trim() && !settings.consumerKeyConfigured) {
      return { ok: false, field: "consumerKey", message: "Consumer key is required for first-time setup." };
    }
    if (!form.consumerSecret.trim() && !settings.consumerSecretConfigured) {
      return { ok: false, field: "consumerSecret", message: "Consumer secret is required for first-time setup." };
    }
    if (!form.passkey.trim() && !settings.passkeyConfigured) {
      return { ok: false, field: "passkey", message: "STK passkey is required for first-time setup." };
    }
  }

  return { ok: true };
}

function settingsToForm(data: OutletMpesaSettings): FormState {
  return {
    enabled: data.enabled,
    label: data.label ?? "",
    shortCode: data.shortCode ?? "",
    transactionType: data.transactionType ?? "PAYBILL",
    darajaEnv: data.darajaEnv ?? "sandbox",
    consumerKey: "",
    consumerSecret: "",
    passkey: "",
  };
}

function formHasUnsavedChanges(form: FormState, settings: OutletMpesaSettings): boolean {
  if (form.enabled !== settings.enabled) return true;
  if (form.label.trim() !== (settings.label ?? "").trim()) return true;
  if (form.shortCode.trim() !== (settings.shortCode ?? "").trim()) return true;
  if (form.transactionType !== settings.transactionType) return true;
  if (form.darajaEnv !== settings.darajaEnv) return true;
  if (form.consumerKey.trim() || form.consumerSecret.trim() || form.passkey.trim()) return true;
  return false;
}

function trimFormStrings(form: FormState): FormState {
  return {
    ...form,
    label: form.label.trim(),
    shortCode: form.shortCode.trim(),
    consumerKey: form.consumerKey.trim(),
    consumerSecret: form.consumerSecret.trim(),
    passkey: form.passkey.trim(),
  };
}

function MpesaSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full max-w-md mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full max-w-xs" />
          <Skeleton className="h-10 w-full max-w-sm" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export function OutletMpesaTab({
  outletOrgId,
  outletName,
}: {
  outletOrgId: string;
  outletName?: string;
}) {
  const canWrite = useCanWriteFranchise();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [settings, setSettings] = React.useState<OutletMpesaSettings | null>(null);
  const [form, setForm] = React.useState<FormState | null>(null);
  const [showSecrets, setShowSecrets] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [discardConfirmOpen, setDiscardConfirmOpen] = React.useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);

  const applySettings = React.useCallback((data: OutletMpesaSettings) => {
    setSettings(data);
    setForm(settingsToForm(data));
    setShowSecrets(false);
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchOutletMpesaSettings(outletOrgId);
      applySettings(data);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not load M-Pesa settings.";
      setLoadError(message);
      setSettings(null);
      setForm(null);
    } finally {
      setLoading(false);
    }
  }, [applySettings, outletOrgId]);

  const reloadFromServer = React.useCallback(async () => {
    setFieldErrors({});
    try {
      const data = await fetchOutletMpesaSettings(outletOrgId);
      applySettings(data);
      toast.message("Unsaved changes discarded.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reload M-Pesa settings.");
    }
  }, [applySettings, outletOrgId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const ready = settings ? mpesaSettingsReady(settings) : false;
  const hasUnsavedChanges = form && settings ? formHasUnsavedChanges(form, settings) : false;

  const handleDiscardClick = () => {
    if (!form || !settings) return;
    if (!hasUnsavedChanges) {
      toast.message("No unsaved changes.");
      return;
    }
    setDiscardConfirmOpen(true);
  };

  const handleRemoveConfiguration = async () => {
    if (!canWrite) return;
    setRemoving(true);
    try {
      const cleared = await clearOutletMpesaSettings(outletOrgId);
      applySettings(cleared);
      setFieldErrors({});
      toast.success("M-Pesa configuration removed. Set up Daraja credentials again to accept payments.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove M-Pesa configuration.");
    } finally {
      setRemoving(false);
    }
  };

  const hasSavedConfiguration = settings ? mpesaSettingsConfigured(settings) : false;
  const callbackUrls = settings ? resolveOutletMpesaCallbackUrls(settings) : null;

  const patchField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const trimField = (key: "label" | "shortCode" | "consumerKey" | "consumerSecret" | "passkey") => {
    setForm((prev) => {
      if (!prev) return prev;
      const trimmed = prev[key].trim();
      return trimmed === prev[key] ? prev : { ...prev, [key]: trimmed };
    });
  };

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.message(`${label} copied.`);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const handleSave = async () => {
    if (!form || !settings || !canWrite) return;
    const trimmedForm = trimFormStrings(form);
    setForm(trimmedForm);
    const result = validateSave(trimmedForm, settings);
    if (!result.ok) {
      if (result.field) {
        setFieldErrors((prev) => ({ ...prev, [result.field!]: result.message ?? "Required" }));
      }
      toast.error(result.message ?? "Fix the highlighted fields before saving.");
      return;
    }
    setFieldErrors({});
    setSaving(true);
    try {
      const shortCode = effectiveShortCode(trimmedForm, settings);
      const patch: Parameters<typeof updateOutletMpesaSettings>[1] = {
        enabled: trimmedForm.enabled,
        shortCode,
        transactionType: trimmedForm.transactionType,
        darajaEnv: trimmedForm.darajaEnv,
        label: trimmedForm.label || null,
      };
      if (trimmedForm.consumerKey) patch.consumerKey = trimmedForm.consumerKey;
      if (trimmedForm.consumerSecret) patch.consumerSecret = trimmedForm.consumerSecret;
      if (trimmedForm.passkey) patch.passkey = trimmedForm.passkey;

      const updated = await updateOutletMpesaSettings(outletOrgId, patch);
      applySettings(updated);
      toast.success(
        mpesaSettingsReady(updated)
          ? "M-Pesa credentials saved. Outlet can send STK pushes and receive C2B payments."
          : "M-Pesa settings saved."
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save M-Pesa settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <MpesaSettingsSkeleton />;

  if (loadError) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle size={18} />
            Could not load M-Pesa settings
          </CardTitle>
          <CardDescription>{loadError}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => void load()} className="gap-2">
            <RefreshCw size={14} />
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!form || !settings) return null;

  const credentialsOnFile = settings.credentialsOnFile;
  const secretsConfigured = credentialsOnFile;
  const shortCodeDisplay = effectiveShortCode(form, settings);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Status banner */}
      <div
        className={`rounded-xl border px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
          ready
            ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/30"
            : "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20"
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`rounded-lg p-2 ${ready ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
          >
            <Smartphone size={20} />
          </div>
          <div>
            <p className="font-semibold text-sm">
              {ready ? "Ready for STK & C2B" : "Setup incomplete"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-lg">
              {ready
                ? `${outletName ?? "This outlet"} can collect M-Pesa at the till via STK push and reconcile Paybill payments.`
                : "Add Daraja credentials below so franchise staff can prompt customers and verify receipts."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={ready ? "default" : "secondary"} className={ready ? "bg-emerald-600" : ""}>
            {form.darajaEnv === "production" ? "Production" : "Sandbox"}
          </Badge>
          {shortCodeDisplay ? (
            <Badge variant="outline" className="font-mono">
              {shortCodeDisplay}
            </Badge>
          ) : null}
        </div>
      </div>

      {/* Main form */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound size={16} />
            Daraja credentials
          </CardTitle>
          <CardDescription>
            From the Safaricom Developer Portal for this outlet&apos;s Paybill or Till. Secrets are encrypted
            in the database and never shown again after saving.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div>
              <Label htmlFor="mpesa-enabled" className="text-sm font-medium">
                Enable M-Pesa for this outlet
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Turn off to pause STK and C2B without deleting stored credentials.
              </p>
            </div>
            <Switch
              id="mpesa-enabled"
              checked={form.enabled}
              onCheckedChange={(v) => patchField("enabled", v)}
              disabled={!canWrite || saving}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="mpesa-label">Display label (optional)</Label>
              <Input
                id="mpesa-label"
                value={form.label}
                onChange={(e) => patchField("label", e.target.value)}
                onBlur={() => trimField("label")}
                placeholder="e.g. Kitengela Paybill"
                disabled={!canWrite || saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mpesa-shortcode">Paybill / Till number</Label>
              <Input
                id="mpesa-shortcode"
                value={form.shortCode}
                onChange={(e) => patchField("shortCode", e.target.value.replace(/\D/g, ""))}
                onBlur={() => trimField("shortCode")}
                placeholder="Enter Paybill or Till number"
                inputMode="numeric"
                className={`font-mono ${fieldErrors.shortCode ? "border-amber-500 ring-amber-200" : ""}`}
                disabled={!canWrite || saving}
              />
              {!form.shortCode.trim() && settings.shortCode ? (
                <p className="text-xs text-muted-foreground">
                  Saved on file: <span className="font-mono font-medium">{settings.shortCode}</span> — shown after
                  reload when API returns saved settings.
                </p>
              ) : null}
              {fieldErrors.shortCode ? (
                <p className="text-xs text-amber-700">{fieldErrors.shortCode}</p>
              ) : form.enabled && !shortCodeDisplay ? (
                <p className="text-xs text-amber-700">Required when M-Pesa is enabled.</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>Collection type</Label>
              <Select
                value={form.transactionType}
                onValueChange={(v) => patchField("transactionType", v as MpesaTransactionType)}
                disabled={!canWrite || saving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAYBILL">Paybill (CustomerPayBillOnline)</SelectItem>
                  <SelectItem value="TILL">Till / Buy Goods (CustomerBuyGoodsOnline)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Environment</Label>
              <Select
                value={form.darajaEnv}
                onValueChange={(v) => patchField("darajaEnv", v as MpesaDarajaEnv)}
                disabled={!canWrite || saving}
              >
                <SelectTrigger className="max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox (testing)</SelectItem>
                  <SelectItem value="production">Production (live money)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Secrets */}
          <div className="rounded-lg border border-dashed p-4 space-y-4">
            {credentialsOnFile && !showSecrets ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                      Daraja credentials on file
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Consumer key, secret, and STK passkey are stored encrypted for this outlet. Values are never
                      shown again — use <span className="font-medium">Update credentials</span> only when rotating
                      keys from Safaricom.
                    </p>
                    {settings.updatedAt ? (
                      <p className="text-xs text-muted-foreground mt-2">
                        Last saved {new Date(settings.updatedAt).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-xs bg-white/80">
                    Key saved
                  </Badge>
                  <Badge variant="secondary" className="text-xs bg-white/80">
                    Secret saved
                  </Badge>
                  <Badge variant="secondary" className="text-xs bg-white/80">
                    Passkey saved
                  </Badge>
                </div>
                {canWrite ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowSecrets(true)}>
                    Update credentials
                  </Button>
                ) : null}
              </div>
            ) : (
              <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-sm font-medium flex items-center gap-2">
                  <ShieldCheck size={15} />
                  {credentialsOnFile ? "Rotate API secrets" : "API secrets"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {credentialsOnFile
                    ? "Enter only the fields you want to change. Leave others blank to keep the current values."
                    : "Required on first setup — from your Daraja app dashboard."}
                </p>
              </div>
            </div>

              <div className="grid gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="mpesa-consumer-key">Consumer key</Label>
                  <Input
                    id="mpesa-consumer-key"
                    value={form.consumerKey}
                    onChange={(e) => patchField("consumerKey", e.target.value)}
                    onBlur={() => trimField("consumerKey")}
                    placeholder={secretsConfigured ? "Leave blank to keep current" : "Paste from Daraja portal"}
                    autoComplete="off"
                    className={fieldErrors.consumerKey ? "border-amber-500" : ""}
                    disabled={!canWrite || saving}
                  />
                  {fieldErrors.consumerKey ? (
                    <p className="text-xs text-amber-700">{fieldErrors.consumerKey}</p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mpesa-consumer-secret">Consumer secret</Label>
                  <Input
                    id="mpesa-consumer-secret"
                    type="password"
                    value={form.consumerSecret}
                    onChange={(e) => patchField("consumerSecret", e.target.value)}
                    onBlur={() => trimField("consumerSecret")}
                    placeholder={secretsConfigured ? "Leave blank to keep current" : "From Daraja portal"}
                    autoComplete="new-password"
                    disabled={!canWrite || saving}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mpesa-passkey">STK passkey</Label>
                  <Input
                    id="mpesa-passkey"
                    type="password"
                    value={form.passkey}
                    onChange={(e) => patchField("passkey", e.target.value)}
                    onBlur={() => trimField("passkey")}
                    placeholder={secretsConfigured ? "Leave blank to keep current" : "Lipa Na M-Pesa passkey"}
                    autoComplete="new-password"
                    disabled={!canWrite || saving}
                  />
                  <p className="text-xs text-muted-foreground">
                    Production passkey is unique to this Paybill — copy from Daraja Go Live email or portal.
                  </p>
                </div>
                {credentialsOnFile ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-fit"
                    onClick={() => {
                      setShowSecrets(false);
                      patchField("consumerKey", "");
                      patchField("consumerSecret", "");
                      patchField("passkey", "");
                    }}
                  >
                    Cancel update
                  </Button>
                ) : null}
              </div>
              </>
            )}
          </div>

          {canWrite ? (
            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={() => void handleSave()} disabled={saving} className="min-w-[120px]">
                {saving ? (
                  <>
                    <RefreshCw size={14} className="mr-2 animate-spin" />
                    Saving…
                  </>
                ) : credentialsOnFile ? (
                  "Save changes"
                ) : (
                  "Save M-Pesa settings"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={loading || saving || !hasUnsavedChanges}
                onClick={handleDiscardClick}
              >
                Discard changes
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">You need franchise write access to edit M-Pesa settings.</p>
          )}

          {settings.updatedAt ? (
            <p className="text-xs text-muted-foreground">
              Last updated {new Date(settings.updatedAt).toLocaleString()}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={discardConfirmOpen}
        onOpenChange={setDiscardConfirmOpen}
        title="Discard unsaved changes?"
        description="This reloads the form from the last saved settings. Stored Paybill and Daraja credentials stay on file — only edits you have not saved yet will be lost."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        onConfirm={() => void reloadFromServer()}
      />

      {/* Callback URLs */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Safaricom callback URLs</CardTitle>
          <CardDescription>
            Register these on the Daraja portal for this Paybill/Till. Same URLs for all outlets — routing uses
            shortcode.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {callbackUrls
            ? [
                { label: "STK Push callback", url: callbackUrls.stkCallbackUrl },
                { label: "C2B confirmation", url: callbackUrls.c2bConfirmationUrl },
              ].map(({ label, url }) => (
                <div key={label} className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{label}</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={url} className="font-mono text-xs bg-muted/40" />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      onClick={() => void copyText(url, label)}
                      aria-label={`Copy ${label}`}
                    >
                      <Copy size={14} />
                    </Button>
                  </div>
                </div>
              ))
            : null}
          <a
            href="https://developer.safaricom.co.ke"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline mt-2"
          >
            Safaricom Developer Portal
            <ExternalLink size={12} />
          </a>
        </CardContent>
      </Card>

      {canWrite && hasSavedConfiguration ? (
        <Card className="border-destructive/20 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-destructive">Remove configuration</CardTitle>
            <CardDescription>
              Permanently delete this outlet&apos;s saved Paybill and Daraja credentials. STK push and C2B
              reconciliation will stop until you set everything up again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="destructive"
              disabled={saving || removing}
              onClick={() => setRemoveConfirmOpen(true)}
              className="gap-2"
            >
              <Trash2 size={14} />
              Remove M-Pesa configuration
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <ConfirmDialog
        open={removeConfirmOpen}
        onOpenChange={(open) => {
          if (!removing) setRemoveConfirmOpen(open);
        }}
        title={`Remove M-Pesa for ${outletName ?? "this outlet"}?`}
        description="This permanently clears the saved Paybill or Till number and all encrypted Daraja credentials. The outlet cannot accept M-Pesa until HQ enters the details again from the Safaricom portal."
        confirmLabel={removing ? "Removing…" : "Remove everything"}
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => void handleRemoveConfiguration()}
      />
    </div>
  );
}
