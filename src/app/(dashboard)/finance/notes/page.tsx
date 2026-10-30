"use client";
import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchDocumentListPageApi } from "@/lib/api/documents";
import type { DocListRow } from "@/lib/types/documents";
import { formatMoney } from "@/lib/money";
import { useHasPermission } from "@/lib/rbac/use-write-guard";

const TYPES = [
  { key: "credit-note", label: "Customer credits", effect: "Reduce customer debt. Physical returns go through quarantine." },
  { key: "debit-note", label: "Customer debits", effect: "Increase customer debt for an additional charge." },
  { key: "purchase-credit-note", label: "Supplier credits", effect: "Reduce supplier debt, with a separate stock effect for goods returned." },
  { key: "purchase-debit-note", label: "Supplier debits", effect: "Increase supplier debt for an additional supplier charge." },
] as const;

export default function NotesWorkspace() {
  const [type, setType] = React.useState<typeof TYPES[number]["key"]>("credit-note");
  const [search, setSearch] = React.useState("");
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<Array<string | null>>([]);
  const [next, setNext] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<DocListRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const canWriteSales = useHasPermission("sales.write", "finance.write");
  const canWritePurchase = useHasPermission("purchase.write");
  const sales = type === "credit-note" || type === "debit-note";
  React.useEffect(() => {
    let cancelled = false;
    setLoading(true); setError("");
    const timer = setTimeout(() => { void fetchDocumentListPageApi(type, { search, cursor: cursor ?? undefined, limit: 25 })
      .then((page) => { if (!cancelled) { setRows(page.items); setNext(page.nextCursor ?? null); } })
      .catch((e) => { if (!cancelled) { setRows([]); setError(e instanceof Error ? e.message : "Could not load notes."); } })
      .finally(() => { if (!cancelled) setLoading(false); }); }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [type, search, cursor]);
  return <PageShell><PageHeader title="Credit and debit notes" description="Review financial corrections and their linked stock effects." actions={(sales ? canWriteSales : canWritePurchase) ? <Button asChild><Link href={`/docs/${type}/new`}>Create note</Link></Button> : undefined} />
    <div className="space-y-4 p-6"><div role="tablist" aria-label="Note types" className="flex flex-wrap gap-2">{TYPES.map((entry) => <Button key={entry.key} role="tab" aria-selected={type === entry.key} variant={type === entry.key ? "default" : "outline"} onClick={() => { setType(entry.key); setCursor(null); setHistory([]); }}>{entry.label}</Button>)}</div>
      <p className="text-sm text-muted-foreground">{TYPES.find((entry) => entry.key === type)?.effect} Open the original invoice or bill to create a linked correction with its remaining quantities and tax references.</p>
      <Input aria-label="Search notes" placeholder="Search note number or party" value={search} onChange={(e) => { setSearch(e.target.value); setCursor(null); setHistory([]); }} />
      {error && <p role="alert" className="text-destructive">{error}</p>}
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">Number</th><th>Date</th><th>Party</th><th>Amount</th><th>Status</th><th>Tax reference</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b"><td className="p-3"><Link href={`/docs/${type}/${encodeURIComponent(row.id)}`} className="underline">{row.number}</Link></td><td>{row.date}</td><td>{row.party}</td><td>{formatMoney(row.total ?? 0, row.currency ?? "KES")}</td><td>{row.status}</td><td>{row.cuInvoiceNumber || row.supplierCuInvoiceNumber || "Pending"}</td></tr>)}</tbody></table></div>
      <p role="status" className="text-sm text-muted-foreground">{loading ? "Loading notes…" : !error && rows.length === 0 ? "No notes match this view." : ""}</p>
      <div className="flex gap-2"><Button variant="outline" disabled={loading || history.length === 0} onClick={() => { setCursor(history[history.length - 1] ?? null); setHistory((items) => items.slice(0, -1)); }}>Previous</Button><Button variant="outline" disabled={loading || !next} onClick={() => { setHistory((items) => [...items, cursor]); setCursor(next); }}>Next</Button></div>
    </div></PageShell>;
}
