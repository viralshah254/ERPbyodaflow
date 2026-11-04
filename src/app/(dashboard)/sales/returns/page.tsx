"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { SourceReturnWizard } from "@/components/inventory/SourceReturnWizard";
import { fetchDocumentListApi } from "@/lib/api/documents";
import type { DocListRow } from "@/lib/types/documents";
import { useCanWriteSales } from "@/lib/rbac/use-write-guard";
import { useAuthStore } from "@/stores/auth-store";
export default function SalesReturnsPage() {
 const router = useRouter(), write = useCanWriteSales(), orgId = useAuthStore((s) => s.org?.orgId);
 const [search,setSearch] = React.useState(""), [rows,setRows] = React.useState<DocListRow[]>([]), [error,setError] = React.useState(""), [loading,setLoading] = React.useState(true);
 const generation = React.useRef(0);
 const invalidate = React.useCallback(() => { generation.current++; },[]);
 const load = React.useCallback(async () => { if (!orgId) return; const current = ++generation.current; setLoading(true); try { const data = await fetchDocumentListApi("credit-note",{ search,limit: 50 }); if(current === generation.current) setRows(data); } catch(e) { if(current === generation.current) setError((e as Error).message); } finally { if(current === generation.current) setLoading(false); } },[search,orgId]);
 React.useEffect(() => { setRows([]); const timer = setTimeout(() => void load(),250); return () => { clearTimeout(timer); invalidate(); }; },[load,invalidate]);
 return <PageLayout title="Customer returns" description="Trace goods back to the original sale, receive into quarantine and retain the correct cost."><div className="space-y-5"><section className="rounded-2xl border bg-gradient-to-br from-primary/10 to-card p-6"><h2 className="font-semibold">A controlled path from customer to stock</h2><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Link the original invoice, choose quantities in the original units, then review and approve the credit note. Posting receives goods into quarantine at the original issue cost and updates the ledger together. QC controls their release for resale.</p><div className="mt-4 flex flex-wrap items-center gap-4">{write && <SourceReturnWizard onCreated={() => void load()}/>}<Link href="/finance/notes" className="text-sm text-primary underline">All credit and debit notes</Link></div></section><Input aria-label="Search customer returns" placeholder="Search credit note number…" value={search} onChange={(e) => setSearch(e.target.value)}/>{error && <p role="alert" className="text-sm text-red-600 dark:text-red-300">{error}</p>}<div className="rounded-2xl border bg-card"><DataTable<DocListRow> data={rows} columns={[{id:"number",header:"Credit note",accessor:"number"},{id:"date",header:"Date",accessor:"date"},{id:"party",header:"Customer",accessor:"party"},{id:"warehouse",header:"Warehouse",accessor:"warehouse"},{id:"total",header:"Value",accessor:(r) => `${r.currency ?? ""} ${r.total?.toLocaleString() ?? "—"}`},{id:"status",header:"Status",accessor:"status"}]} onRowClick={(row) => router.push(`/docs/credit-note/${encodeURIComponent(row.id)}`)} emptyMessage={loading ? "Loading returns…" : "No matching returns. Create one from a posted invoice."} searchable={false}/></div>{rows.length === 50 && <p className="text-xs text-muted-foreground">Showing up to 50 returns. Narrow the search to find another note.</p>}</div></PageLayout>;
}
