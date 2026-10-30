"use client";
import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { fetchFmcgSetup, type FmcgSetup } from "@/lib/api/fmcg-setup";
import { apiRequest } from "@/lib/api/client";
import { useHasPermission } from "@/lib/rbac/use-write-guard";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
export default function FmcgSetupPage() {
  const [setup, setSetup] = React.useState<FmcgSetup | null>(null);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [profile, setProfile] = React.useState<FmcgSetup["taxProfile"] | null>(null);
  const canEdit = useHasPermission("admin.settings");
  const load = React.useCallback(async () => {
    setBusy(true); setError("");
    try { const result = await fetchFmcgSetup(); if (result.version !== "fmcg-setup-v1") throw new Error("Update the connected server before using this setup workspace."); setSetup(result); setProfile(result.taxProfile); }
    catch (e) { setError(e instanceof Error ? e.message : "Setup could not load."); }
    finally { setBusy(false); }
  }, []);
  React.useEffect(() => { void load(); }, [load]);
  const money = (value: number | null) => value == null ? "Needs reconciliation" : formatMoney(value, "KES");
  return <PageShell><PageHeader title="FMCG operational setup" description="Prepare opening balances, company-wide costing, Kenya tax and a controlled first posting day." actions={<Button variant="outline" disabled={busy} onClick={() => void load()}>Refresh checks</Button>} />
    <div className="space-y-6 p-6">{error && <p role="alert" className="rounded-lg border border-destructive p-4 text-destructive">{error}</p>}
      {!setup && !error && <p>Loading operational setup…</p>}
      {setup && <>
        {setup.readOnlyPreview && <p className="rounded-lg border bg-muted p-4">Local setup preview. The connected server needs the matching release before these setup changes can be managed here.</p>}
        <div className="grid gap-4 md:grid-cols-3"><Card><CardHeader><CardTitle className="text-base">Official opening</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{setup.openingDate ?? "Not configured"}</p><p className="text-sm text-muted-foreground">Africa/Nairobi · January–December financial year</p></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Costing policy</CardTitle></CardHeader><CardContent><p className="font-semibold">{setup.valuationMethod === "COMPANY_AVERAGE" ? "Company-wide average per SKU" : "Warehouse average"}</p><p className="text-sm text-muted-foreground">Warehouse quantities remain separate.</p></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Preparation status</CardTitle></CardHeader><CardContent><Badge variant="outline">{setup.status}</Badge><p className="mt-2 text-sm text-muted-foreground">{setup.readyForAcceptance ? "Automated checks complete. Client acceptance and release evidence are still required." : `${setup.gates.filter((gate) => gate.required && gate.status !== "PASS").length} required checks remain.`}</p></CardContent></Card></div>
        <Card><CardHeader><CardTitle>Current reconciliation snapshot</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-4">{[["Physical inventory", setup.totals.physicalValue], ["Retained WIP", setup.totals.wipValue], ["Inventory / WIP GL", setup.totals.glValue], ["Difference", setup.totals.difference]].map(([label, value]) => <div key={String(label)}><p className="text-sm text-muted-foreground">{label}</p><p className="font-semibold">{money(value as number | null)}</p></div>)}<p className="text-sm text-muted-foreground sm:col-span-4">{setup.totals.missingCostRows} positive stock rows need reviewed company costs. This is a current snapshot; final openings must reconcile to the close of the day before official opening.</p></CardContent></Card>
        <div className="space-y-3">{setup.gates.map((gate) => <Card key={gate.id}><CardContent className="flex flex-wrap items-start justify-between gap-3 p-4"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><Badge variant={gate.status === "PASS" ? "secondary" : "outline"}>{gate.status === "PASS" ? "Checked" : gate.required ? "Required" : "Review"}</Badge><h2 className="font-semibold">{gate.title}</h2></div><p className="mt-2 break-words text-sm text-muted-foreground">{gate.detail}</p></div><Button variant="outline" size="sm" asChild><Link href={gate.href}>Open setup</Link></Button></CardContent></Card>)}</div>
        {profile && <Card><CardHeader><CardTitle>Kenya tax profile</CardTitle></CardHeader><CardContent><form className="grid max-w-3xl gap-4 md:grid-cols-2" onSubmit={async (event) => { event.preventDefault(); setBusy(true); try { await apiRequest("/api/settings/fmcg-setup/tax-profile", { method: "PATCH", body: profile }); toast.success("Tax profile saved with its review reference."); await load(); } catch (e) { toast.error(e instanceof Error ? e.message : "Tax profile could not save."); } finally { setBusy(false); } }}>
          {([{ key: "vatRegistration", label: "VAT registration", options: ["UNCONFIRMED", "REGISTERED", "NOT_REGISTERED"] }, { key: "withholdingVatAgent", label: "Appointed withholding VAT agent", options: ["UNCONFIRMED", "YES", "NO"] }, { key: "inputTaxRecoverability", label: "Input VAT recoverability", options: ["UNCONFIRMED", "FULL", "PARTIAL", "NONE"] }] as const).map((field) => <div className="space-y-2" key={field.key}><Label htmlFor={field.key}>{field.label}</Label><select id={field.key} className="h-10 w-full rounded-md border bg-background px-3" value={profile[field.key]} disabled={!canEdit || setup.readOnlyPreview} onChange={(e) => setProfile({ ...profile, [field.key]: e.target.value })}>{field.options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select></div>)}
          <div className="space-y-2"><Label htmlFor="tax-evidence">Certificate or finance-review reference</Label><Input id="tax-evidence" value={profile.evidenceReference} disabled={!canEdit || setup.readOnlyPreview} onChange={(e) => setProfile({ ...profile, evidenceReference: e.target.value })} /></div>
          <p className="text-sm text-muted-foreground md:col-span-2">Use the actual registration and appointment evidence. Enter the company PIN in Organization Profile and device credentials in KRA Integration; keep passwords and keys private.</p>
          {canEdit && <Button type="submit" disabled={busy || setup.readOnlyPreview}>Save confirmed tax profile</Button>}
        </form></CardContent></Card>}
      </>}
    </div></PageShell>;
}
