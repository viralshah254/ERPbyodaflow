"use client";
import * as React from "react";
import Link from "next/link";
import { Plus, Search, RefreshCw, ShieldCheck, Copy } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { useAuthStore } from "@/stores/auth-store";
import { createFinancialTaxApi, updateFinancialTaxApi, fetchFinancialTaxesApi } from "@/lib/api/financial-taxes";
import type { TaxRow } from "@/lib/types/taxes";
import { toast } from "sonner";
const empty = () => ({ code: "", name: "", rate: "0", type: "VAT", effectiveFrom: "", effectiveTo: "" });
export default function TaxPage() {
  const permissions = useAuthStore((s) => s.permissions), orgId = useAuthStore((s) => s.org?.orgId);
  const canRead = permissions.includes("settings.financial.read") || permissions.includes("finance.tax.read");
  const canEdit = permissions.includes("admin.settings");
  const [rows, setRows] = React.useState<TaxRow[]>([]), [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(true), [error, setError] = React.useState("");
  const [open, setOpen] = React.useState(false), [editing, setEditing] = React.useState<TaxRow | null>(null);
  const [form, setForm] = React.useState(empty), [saving, setSaving] = React.useState(false), [saveError, setSaveError] = React.useState("");
  const generation = React.useRef(0), lock = React.useRef(false);
  const invalidate = React.useCallback(() => { generation.current++; }, []);
  const load = React.useCallback(async () => {
    const request = ++generation.current;
    if (!canRead || !orgId) { setLoading(false); return; }
    setLoading(true); setError("");
    try { const data = await fetchFinancialTaxesApi(); if (request === generation.current) setRows(data); }
    catch (e) { if (request === generation.current) setError((e as Error).message); }
    finally { if (request === generation.current) setLoading(false); }
  }, [canRead, orgId]);
  React.useEffect(() => { setRows([]); setOpen(false); void load(); return invalidate; }, [load, invalidate]);
  function edit(row?: TaxRow, copy = false) {
    setEditing(row && !copy ? row : null); setSaveError("");
    setForm(row ? { code: copy ? "" : row.code, name: row.name, rate: String(row.rate), type: row.type ?? "VAT", effectiveFrom: copy ? "" : row.effectiveFrom, effectiveTo: copy ? "" : row.effectiveTo ?? "" } : empty()); setOpen(true);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!canEdit || lock.current) return;
    lock.current = true; setSaving(true); setSaveError("");
    try {
      const payload = { code: form.code.trim(), name: form.name.trim(), rate: Number(form.rate), type: form.type, effectiveFrom: form.effectiveFrom || null, effectiveTo: form.effectiveTo || null };
      if (editing) await updateFinancialTaxApi(editing.id, payload); else await createFinancialTaxApi(payload);
      setOpen(false); toast.success(editing ? "Tax code saved." : "Tax code created. Link it to the appropriate tax tags before use."); await load();
    } catch (e) { setSaveError((e as Error).message); }
    finally { lock.current = false; setSaving(false); }
  }
  const filtered = rows.filter((row) => `${row.code} ${row.name} ${row.type}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <PageShell><PageHeader title="Tax / VAT" description="Tax definitions, effective dates and financial evidence" breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Tax / VAT" }]} actions={canEdit ? <Button size="sm" onClick={() => edit()}><Plus className="mr-2 size-4"/>Add tax code</Button> : undefined}/>
    <div className="space-y-6 p-6">
      {!canRead ? <p role="alert">Tax or financial-settings read access is required.</p> : <>
        <section className="rounded-2xl border bg-card p-5"><div className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-5 text-primary"/>Keep tax history traceable</div><p className="mt-2 max-w-4xl text-sm text-muted-foreground">Rates and identities on used codes are protected. Create a revised code for a changed rate, and set its effective dates. Inclusive pricing belongs to tax tags; it does not change the statutory rate.</p><div className="mt-4 flex flex-wrap gap-3 text-sm"><Link className="text-primary underline" href="/reports/vat-summary">VAT report</Link><Link className="text-primary underline" href="/finance/input-vat">Review input VAT</Link><Link className="text-primary underline" href="/settings/fmcg-setup">Registration and recoverability setup</Link><Link className="text-primary underline" href="/pricing/workspace/tax-tags">Pricing tax tags</Link></div></section>
        <section className="overflow-hidden rounded-2xl border bg-card"><div className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><div className="relative w-full max-w-md"><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/><Input aria-label="Search tax codes" className="pl-9" placeholder="Search code, name or type…" value={query} onChange={(e) => setQuery(e.target.value)}/></div><Button variant="outline" size="sm" disabled={loading || saving} onClick={() => void load()}><RefreshCw className="mr-2 size-4"/>Refresh</Button></div>
          {error ? <div role="alert" className="p-6 text-sm text-destructive">{error}</div> : loading ? <p role="status" className="p-8 text-sm text-muted-foreground">Loading tax definitions…</p> : filtered.length === 0 ? <p className="p-8 text-sm text-muted-foreground">{query ? "No codes match your search." : "No tax codes configured. An administrator can add the approved definitions."}</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-muted/50"><tr>{["Code", "Name", "Type", "Rate", "Effective period", "Actions"].map((label) => <th key={label} className="p-4 font-medium">{label}</th>)}</tr></thead><tbody>{filtered.map((row) => <tr className="border-t" key={row.id}><td className="p-4 font-mono font-medium">{row.code}</td><td className="p-4">{row.name}</td><td className="p-4">{row.type ?? "VAT"}</td><td className="p-4 tabular-nums">{row.rate}%</td><td className="p-4 text-muted-foreground">{row.effectiveFrom || "Legacy / no start date"} → {row.effectiveTo || "Open-ended"}</td><td className="p-4">{canEdit ? <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => edit(row)}>Edit</Button><Button size="sm" variant="ghost" onClick={() => edit(row, true)}><Copy className="mr-2 size-3"/>Revise</Button></div> : <span className="text-muted-foreground">Read only</span>}</td></tr>)}</tbody></table></div>}
          {!error && !loading && <p className="border-t px-4 py-3 text-xs text-muted-foreground">{filtered.length} of {rows.length} tax definitions</p>}
        </section>
      </>}
    </div>
    <Sheet open={open} onOpenChange={(next) => { if (!saving) setOpen(next); }}><SheetContent className="w-full"><SheetHeader><SheetTitle>{editing ? "Edit tax definition" : "Create tax definition"}</SheetTitle><SheetDescription>Use finance-approved rates and dates. Used rate definitions cannot be overwritten.</SheetDescription></SheetHeader><form className="mt-6 space-y-4" onSubmit={(e) => void save(e)}>
      {editing?.used && <p className="rounded-lg border bg-muted/30 p-3 text-sm">This code is used. Its code, type, rate and start date are protected. Use Revise to create a new definition.</p>}
      <div><Label htmlFor="tax-code">Code</Label><Input id="tax-code" disabled={saving || Boolean(editing?.used)} required maxLength={40} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}/></div>
      <div><Label htmlFor="tax-name">Name</Label><Input id="tax-name" required maxLength={150} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/></div>
      <div><Label htmlFor="tax-type">Type</Label><select id="tax-type" disabled={saving || Boolean(editing?.used)} className="mt-1 h-10 w-full rounded-md border bg-background px-3" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option>VAT</option><option>WHT</option></select></div>
      <div><Label htmlFor="tax-rate">Rate (%)</Label><Input id="tax-rate" disabled={saving || Boolean(editing?.used)} required type="number" min={0} max={100} step="0.01" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })}/></div>
      <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="tax-from">Effective from</Label><Input id="tax-from" disabled={saving || Boolean(editing?.used)} type="date" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}/></div><div><Label htmlFor="tax-to">Effective to</Label><Input id="tax-to" type="date" value={form.effectiveTo} onChange={(e) => setForm({ ...form, effectiveTo: e.target.value })}/></div></div>
      {saveError && <p role="alert" className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">{saveError}</p>}
      <SheetFooter><Button type="button" variant="outline" disabled={saving} onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create code"}</Button></SheetFooter>
    </form></SheetContent></Sheet>
  </PageShell>;
}
