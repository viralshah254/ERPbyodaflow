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
import { SETUP_STAGES, setupTaskMeta, type SetupStage } from "@/lib/setup/operational-journey";
import { ArrowRight, CheckCircle2, Circle, RefreshCw, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
export default function FmcgSetupPage() {
  const [setup, setSetup] = React.useState<FmcgSetup | null>(null);
  const [stage, setStage] = React.useState<SetupStage | "all">("all");
  const [pendingOnly, setPendingOnly] = React.useState(false);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [profile, setProfile] = React.useState<FmcgSetup["taxProfile"] | null>(null);
  const canEdit = useHasPermission("admin.settings");
  const load = React.useCallback(async () => {
    setBusy(true); setError("");
    try { const result = await fetchFmcgSetup(); if (result.version !== "fmcg-setup-v2") throw new Error("Update the connected server before using this setup workspace."); setSetup(result); setProfile(result.taxProfile); }
    catch (e) { setSetup(null); setError(e instanceof Error ? e.message : "Setup could not load."); }
    finally { setBusy(false); }
  }, []);
  React.useEffect(() => { void load(); }, [load]);
  const money = (value: number | null) => value == null ? "Needs reconciliation" : formatMoney(value, "KES");
  const required = setup?.gates.filter((gate) => gate.required) ?? [];
  const checked = required.filter((gate) => gate.status === "PASS").length;
  const nextTask = required.find((gate) => gate.status !== "PASS");
  const progress = required.length ? Math.round(checked / required.length * 100) : 0;
  return <PageShell><PageHeader title="FMCG operational setup" description="One workspace to prepare your team, stores, opening balances and fiscal connections." actions={<Button variant="outline" disabled={busy} onClick={() => void load()}><RefreshCw className={`mr-2 h-4 w-4 ${busy ? "animate-spin" : ""}`} aria-hidden="true" />{busy ? "Checking…" : "Refresh checks"}</Button>} />
    <div className="space-y-6 p-6">{error && <div role="alert" className="mx-auto max-w-2xl rounded-2xl border bg-card p-8"><AlertCircle className="mb-4 h-8 w-8 text-amber-500" /><h2 className="text-xl font-semibold">Setup checks are unavailable</h2><p className="mt-3 text-sm text-muted-foreground">{error}</p><Button className="mt-5" variant="outline" disabled={busy} onClick={() => void load()}>Try again</Button></div>}
      {!setup && !error && <p>Loading operational setup…</p>}
      {setup && <>
        <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-6 md:p-8" aria-label="Operational preparation">
          <div className="flex flex-wrap items-start justify-between gap-6"><div className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-widest text-primary">Operational preparation</p><h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Build a confident first posting day</h2><p className="mt-3 text-sm text-muted-foreground">Work through each stage with the responsible team. Passing automated checks prepares you for client acceptance; it does not authorize live posting.</p></div><div className="rounded-xl border bg-background/80 px-5 py-4"><p className="text-3xl font-semibold tabular-nums">{checked}<span className="text-base font-normal text-muted-foreground"> / {required.length}</span></p><p className="mt-1 text-xs text-muted-foreground">required checks passed</p></div></div>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Required setup checks passed" aria-valuemin={0} aria-valuemax={required.length} aria-valuenow={checked}><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm"><p className="text-muted-foreground">Checked {new Date(setup.capturedAt).toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })} EAT</p>{nextTask && <Button variant="outline" size="sm" onClick={() => { setStage(setupTaskMeta(nextTask.id).stage); setPendingOnly(true); }}>Next: {nextTask.title}<ArrowRight className="ml-2 h-4 w-4" /></Button>}</div>
        </section>
        {setup.readOnlyPreview && <p className="rounded-lg border bg-muted p-4">Local setup preview. The connected server needs the matching release before these setup changes can be managed here.</p>}
        <div className="grid gap-4 md:grid-cols-3"><Card><CardHeader><CardTitle className="text-base">Official opening</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{setup.openingDate ?? "Not configured"}</p><p className="text-sm text-muted-foreground">Africa/Nairobi · Year-end month {setup.fiscalYearEndMonth ?? "pending"}</p></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Costing policy</CardTitle></CardHeader><CardContent><p className="font-semibold">{setup.valuationMethod === "COMPANY_AVERAGE" ? "Company-wide average per SKU" : "Warehouse average"}</p><p className="text-sm text-muted-foreground">Warehouse quantities remain separate.</p></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Preparation status</CardTitle></CardHeader><CardContent><Badge variant="outline">{setup.status}</Badge><p className="mt-2 text-sm text-muted-foreground">{setup.readyForAcceptance ? "Automated checks complete. Client acceptance and release evidence are still required." : `${setup.gates.filter((gate) => gate.required && gate.status !== "PASS").length} required checks remain.`}</p></CardContent></Card></div>
        <Card><CardHeader><CardTitle>Current reconciliation snapshot</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-4">{[["Physical inventory", setup.totals.physicalValue], ["Retained WIP", setup.totals.wipValue], ["Inventory / WIP GL", setup.totals.glValue], ["Difference", setup.totals.difference]].map(([label, value]) => <div key={String(label)}><p className="text-sm text-muted-foreground">{label}</p><p className="font-semibold">{money(value as number | null)}</p></div>)}<p className="text-sm text-muted-foreground sm:col-span-4">{setup.totals.missingCostRows} positive stock rows need reviewed company costs. This is a current snapshot; final openings must reconcile to the close of the day before official opening.</p></CardContent></Card>
        <div className="grid items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
          <nav aria-label="Setup stages" className="flex min-w-0 gap-2 overflow-x-auto pb-2 lg:sticky lg:top-24 lg:block lg:space-y-2 lg:overflow-visible">
            <button className={`w-56 shrink-0 rounded-xl border px-4 py-3 text-left text-sm font-medium lg:w-full ${stage === "all" ? "border-primary bg-primary/5 text-primary" : "bg-card hover:bg-muted/50"}`} onClick={() => setStage("all")} aria-pressed={stage === "all"}>All preparation tasks</button>
            {SETUP_STAGES.map((item, index) => { const tasks = setup.gates.filter((gate) => setupTaskMeta(gate.id).stage === item.id); const remaining = tasks.filter((gate) => gate.status !== "PASS").length; return <button key={item.id} aria-pressed={stage === item.id} onClick={() => setStage(item.id)} className={`flex w-56 shrink-0 items-start gap-3 rounded-xl lg:w-full border p-4 text-left ${stage === item.id ? "border-primary bg-primary/5" : "bg-card hover:bg-muted/50"}`}><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold">{index + 1}</span><span><span className="block text-sm font-semibold">{item.title}</span><span className="mt-1 block text-xs text-muted-foreground">{tasks.length === 0 ? "No checks returned" : remaining ? `${remaining} to review` : "Checks passed"}</span></span></button>; })}
          </nav>
          <div className="min-w-0 space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{stage === "all" ? "Your preparation checklist" : SETUP_STAGES.find((item) => item.id === stage)?.title}</h2><label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={pendingOnly} onChange={(event) => setPendingOnly(event.target.checked)} className="accent-primary" />Needs attention only</label></div>
            {setup.gates.filter((gate) => (stage === "all" || setupTaskMeta(gate.id).stage === stage) && (!pendingOnly || gate.status !== "PASS")).map((gate) => { const meta = setupTaskMeta(gate.id); const dependencies = meta.dependsOn?.map((id) => setup.gates.find((item) => item.id === id)).filter((item) => item && item.status !== "PASS"); return <Card key={gate.id} className="overflow-hidden rounded-xl"><CardContent className="p-5"><div className="flex items-start gap-3">{gate.status === "PASS" ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" /> : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{gate.title}</h3><Badge variant="outline">{gate.status === "PASS" ? "Checked" : gate.required ? "Required" : "Review"}</Badge></div><p className="mt-2 break-words text-sm leading-relaxed text-muted-foreground">{gate.detail}</p>{Boolean(dependencies?.length) && <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs">Complete first: {dependencies?.map((item) => item?.title).join(" · ")}</p>}<div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-muted-foreground">Responsible: {meta.owner}</span><Button variant="outline" size="sm" asChild><Link href={gate.id === "tax_profile" ? "#tax-profile" : gate.href}>{meta.action}<ArrowRight className="ml-2 h-3.5 w-3.5" /></Link></Button></div></div></div></CardContent></Card>; })}
            {setup.gates.filter((gate) => (stage === "all" || setupTaskMeta(gate.id).stage === stage) && (!pendingOnly || gate.status !== "PASS")).length === 0 && <div className="rounded-xl border border-dashed p-10 text-center"><ShieldCheck className="mx-auto mb-3 h-8 w-8 text-emerald-600" /><p className="font-medium">No tasks need attention in this view</p><p className="mt-2 text-sm text-muted-foreground">Show all checks to review the evidence and continue operator acceptance.</p></div>}
          </div>
        </div>
        {profile && <Card id="tax-profile" className="scroll-mt-24"><CardHeader><CardTitle>Kenya tax profile</CardTitle></CardHeader><CardContent><form className="grid max-w-3xl gap-4 md:grid-cols-2" onSubmit={async (event) => { event.preventDefault(); setBusy(true); try { await apiRequest("/api/settings/fmcg-setup/tax-profile", { method: "PATCH", body: profile }); toast.success("Tax profile saved with its review reference."); await load(); } catch (e) { toast.error(e instanceof Error ? e.message : "Tax profile could not save."); } finally { setBusy(false); } }}>
          {([{ key: "vatRegistration", label: "VAT registration", options: ["UNCONFIRMED", "REGISTERED", "NOT_REGISTERED"] }, { key: "withholdingVatAgent", label: "Appointed withholding VAT agent", options: ["UNCONFIRMED", "YES", "NO"] }, { key: "inputTaxRecoverability", label: "Input VAT recoverability", options: ["UNCONFIRMED", "FULL", "PARTIAL", "NONE"] }] as const).map((field) => <div className="space-y-2" key={field.key}><Label htmlFor={field.key}>{field.label}</Label><select id={field.key} className="h-10 w-full rounded-md border bg-background px-3" value={profile[field.key]} disabled={!canEdit || setup.readOnlyPreview} onChange={(e) => setProfile({ ...profile, [field.key]: e.target.value })}>{field.options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select></div>)}
          <div className="space-y-2"><Label htmlFor="tax-evidence">Certificate or finance-review reference</Label><Input id="tax-evidence" value={profile.evidenceReference} disabled={!canEdit || setup.readOnlyPreview} onChange={(e) => setProfile({ ...profile, evidenceReference: e.target.value })} /></div>
          <p className="text-sm text-muted-foreground md:col-span-2">Use the actual registration and appointment evidence. Enter the company PIN in Organization Profile and device credentials in KRA Integration; keep passwords and keys private.</p>
          {canEdit && <Button type="submit" disabled={busy || setup.readOnlyPreview}>Save confirmed tax profile</Button>}
        </form></CardContent></Card>}
      </>}
    </div></PageShell>;
}
