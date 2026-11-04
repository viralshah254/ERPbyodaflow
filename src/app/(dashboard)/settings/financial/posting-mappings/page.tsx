"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AsyncSearchableSelect, type AsyncSearchableSelectOption } from "@/components/ui/async-searchable-select";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import {
  fetchPostingMappingsApi,
  savePostingMappingsApi,
  type PostingMappingKey,
} from "@/lib/api/finance";
import { useHasPermission } from "@/lib/rbac/use-write-guard";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function PostingMappingsPage() {
  const canEdit = useHasPermission("admin.settings");
  const [search, setSearch] = React.useState("");
  const [attentionOnly, setAttentionOnly] = React.useState(false);
  const [saved, setSaved] = React.useState<Partial<Record<PostingMappingKey, string | null>>>({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [rows, setRows] = React.useState<Awaited<ReturnType<typeof fetchPostingMappingsApi>>["items"]>([]);
  const [accounts, setAccounts] = React.useState<Awaited<ReturnType<typeof fetchPostingMappingsApi>>["accounts"]>([]);
  const [draft, setDraft] = React.useState<Partial<Record<PostingMappingKey, string | null>>>({});

  const refresh = React.useCallback(async () => {
    const payload = await fetchPostingMappingsApi();
    setRows(payload.items);
    setAccounts(payload.accounts);
    setSaved(Object.fromEntries(payload.items.map((item) => [item.key, item.accountId])));
    setDraft(
      Object.fromEntries(payload.items.map((item) => [item.key, item.accountId])) as Partial<
        Record<PostingMappingKey, string | null>
      >
    );
  }, []);

  React.useEffect(() => {
    setLoading(true);
    refresh()
      .catch((error) => toast.error((error as Error).message || "Failed to load posting mappings."))
      .finally(() => setLoading(false));
  }, [refresh]);

  const accountOption = React.useCallback((id: string | null | undefined): AsyncSearchableSelectOption | null => {
    if (!id) return null;
    const account = accounts.find((row) => row.id === id);
    if (!account) return { id, label: "Selected account" };
    const type = account.type ? account.type.charAt(0) + account.type.slice(1).toLowerCase() : "";
    return { id: account.id, label: `${account.code} · ${account.name}`, description: type || undefined };
  }, [accounts]);

  const handleSave = async () => {
    if (!canEdit) return;
    try {
      setSaving(true);
      await savePostingMappingsApi(draft);
      await refresh();
      toast.success("Posting mappings saved.");
    } catch (error) {
      toast.error((error as Error).message || "Failed to save posting mappings.");
    } finally {
      setSaving(false);
    }
  };

  const resolution = (row: typeof rows[number]) => {
    const id = draft[row.key];
    const selected = id ? accounts.find((account) => account.id === id) : accounts.find((account) => account.code === row.fallback.code);
    const valid = Boolean(selected && selected.type === row.fallback.type && selected.posts !== false);
    return { selected, valid, explicit: Boolean(id) };
  };
  const unresolved = rows.filter((row) => !resolution(row).valid).length;
  const invalidSelections = rows.some((row) => draft[row.key] && !resolution(row).valid);
  const dirty = rows.some((row) => (draft[row.key] || null) !== (saved[row.key] || null));
  const visible = rows.filter((row) => (!attentionOnly || !resolution(row).valid) && (!search.trim() || `${row.label} ${row.fallback.name} ${row.fallback.code}`.toLowerCase().includes(search.trim().toLowerCase())));
  return <PageShell><PageHeader title="Posting accounts" description="Connect operational events to the right accounts in your chart." breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Financial", href: "/settings/financial" }, { label: "Posting accounts" }]} actions={<div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" asChild><Link href="/settings/fmcg-setup">Operational setup</Link></Button><Button variant="outline" size="sm" asChild><Link href="/settings/financial/chart-of-accounts">Chart of accounts</Link></Button>{canEdit && <Button size="sm" disabled={saving || loading || !dirty || invalidSelections} onClick={() => void handleSave()}><Icons.Save className="mr-2 h-4 w-4" />{saving ? "Saving…" : "Save changes"}</Button>}</div>} />
    <div className="space-y-5 p-4 md:p-6"><div className="grid gap-3 sm:grid-cols-3">{[{ title: "Posting roles", value: rows.length }, { title: "Valid account selections", value: rows.length - unresolved }, { title: "Need attention", value: unresolved }].map((item) => <Card key={item.title} className="rounded-xl"><CardContent className="p-5"><p className="text-xs text-muted-foreground">{item.title}</p><p className="mt-2 text-3xl font-semibold tabular-nums">{loading ? "—" : item.value}</p></CardContent></Card>)}</div>
      <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">Select accounts by their purpose and classification. Matching a numeric code alone is insufficient. Saving changes affects future postings; it does not repair historical journals. {dirty && <span className="font-medium text-foreground">You have unsaved changes.</span>}</div>
      <div className="flex flex-wrap items-center justify-between gap-3"><Input aria-label="Search posting roles" placeholder="Search posting roles or account codes…" value={search} onChange={(event) => setSearch(event.target.value)} className="max-w-md" /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={attentionOnly} onChange={(event) => setAttentionOnly(event.target.checked)} />Needs attention only</label></div>
      {loading && <p role="status" className="p-8 text-center text-muted-foreground">Loading account mappings…</p>}
      <div className="grid gap-4 xl:grid-cols-2">{visible.map((row) => { const state = resolution(row); return <Card key={row.key} className="rounded-xl"><CardHeader className="pb-3"><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle className="text-base">{row.label}</CardTitle><Badge variant={state.valid ? "secondary" : "outline"}>{state.valid ? state.explicit ? "Mapped" : "Valid fallback" : "Needs account"}</Badge></div><CardDescription>Requires a posting {row.fallback.type.toLowerCase()} account.</CardDescription></CardHeader><CardContent className="space-y-3"><AsyncSearchableSelect value={draft[row.key] ?? ""} disabled={!canEdit || saving} onValueChange={(value) => setDraft((current) => ({ ...current, [row.key]: value || null }))} loadOptions={async (query) => { const q = query.trim().toLowerCase(); return accounts.filter((account) => account.type === row.fallback.type && account.posts !== false && (!q || `${account.code} ${account.name}`.toLowerCase().includes(q))).slice(0,40).map((account) => accountOption(account.id)!); }} selectedOption={accountOption(draft[row.key])} allowClear searchDebounceMs={0} showSelectedDescription placeholder="Choose an account or review fallback" searchPlaceholder="Code or account name" emptyMessage="No posting account of the required type. Review the chart of accounts." />
        <p className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${state.valid ? "bg-muted text-muted-foreground" : "bg-amber-500/10 text-amber-800 dark:text-amber-300"}`}>{state.valid ? `Effective: ${state.selected?.code} · ${state.selected?.name}` : state.selected ? `${state.selected.code} · ${state.selected.name} is ${state.selected.type.toLowerCase()}${state.selected.posts === false ? " and does not allow postings" : ""}. Choose the required account.` : `Fallback ${row.fallback.code} · ${row.fallback.name} is absent. Select an approved account before using this posting role.`}</p></CardContent></Card>; })}</div>
      {!loading && visible.length === 0 && <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">No posting roles match this view.</div>}
      <ExplainThis prompt="Explain operational account mappings, classification, and why fallback codes may differ from an imported chart." label="Explain posting accounts" />
    </div></PageShell>;
}
