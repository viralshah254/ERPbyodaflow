"use client";
import * as React from "react";
import Link from "next/link";
import { ShieldCheck, RefreshCw } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { ChangeReview, type ChangeRecord } from "@/components/governance/change-review";
import { AsyncSearchableSelect } from "@/components/ui/async-searchable-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/api/client";
import { fetchDocumentListPageApi } from "@/lib/api/documents";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";
type Evidence = { id: string; number: string; type: string; status: string; supplierInvoiceNumber?: string; supplierCuInvoiceNumber?: string; purchasingDispute?: { state: string; reason: string }; receipts: Array<{ id: string; number: string }> };
export default function PurchasingExceptionsPage() {
  const permissions = useAuthStore((s) => s.permissions), orgId = useAuthStore((s) => s.org?.orgId);
  const [documentId, setDocumentId] = React.useState(""), [source, setSource] = React.useState<Evidence | null>(null), [rows, setRows] = React.useState<ChangeRecord[]>([]);
  const [hasMore, setHasMore] = React.useState(false), [loading, setLoading] = React.useState(true), [busy, setBusy] = React.useState(false), [error, setError] = React.useState("");
  const [kind, setKind] = React.useState("PURCHASE_PRICE"), [receiptId, setReceiptId] = React.useState(""), [reason, setReason] = React.useState(""), [evidence, setEvidence] = React.useState(""), [invoice, setInvoice] = React.useState(""), [cu, setCu] = React.useState("");
  const sequence = React.useRef(0);
  React.useEffect(() => { setDocumentId(new URLSearchParams(window.location.search).get("documentId") ?? ""); }, []);
  const load = React.useCallback(async () => {
    if (!orgId) return; const generation = ++sequence.current; setLoading(true); setError("");
    try {
      const result = await apiRequest<{ contract: string; rows: ChangeRecord[]; hasMore: boolean }>("/api/purchasing/exceptions", { params: documentId ? new URLSearchParams({ documentId }) : undefined });
      if (result.contract !== "purchasing-exceptions-v1") throw new Error("Purchasing exceptions require the updated backend.");
      const doc = documentId ? await apiRequest<Evidence>(`/api/purchasing/exceptions/${encodeURIComponent(documentId)}/evidence`) : null;
      if (generation !== sequence.current) return; setRows(result.rows); setHasMore(result.hasMore); setSource(doc); setReceiptId(doc?.receipts[0]?.id ?? ""); setInvoice(doc?.supplierInvoiceNumber ?? ""); setCu(doc?.supplierCuInvoiceNumber ?? "");
    } catch (e) { if (generation === sequence.current) setError((e as Error).message); }
    finally { if (generation === sequence.current) setLoading(false); }
  }, [orgId, documentId]);
  const invalidate = React.useCallback(() => { sequence.current++; }, []);
  React.useEffect(() => { setRows([]); setSource(null); void load(); return invalidate; }, [load, invalidate]);
  async function prepare(dispute: boolean) {
    setBusy(true); try { await apiRequest(`/api/purchasing/exceptions/${dispute ? "disputes" : "prepare"}`, { method: "POST", body: { documentId, reason, ...(dispute ? {} : { kind, receiptId, evidenceReference: evidence, supplierInvoiceNumber: invoice, supplierCuInvoiceNumber: cu }) } }); toast.success(dispute ? "Dispute opened. Supplier payment is on hold." : "Proposal saved for independent approval."); setReason(""); setEvidence(""); await load(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  return <PageLayout title="Purchasing exceptions" description="Resolve supplier issues with clear evidence and independent review." actions={<Button variant="outline" disabled={loading || busy} onClick={() => void load()}><RefreshCw className="mr-2 size-4"/>Refresh</Button>}><div className="space-y-5 pb-6">
    <section className="rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-6"><ShieldCheck className="mb-3 size-7 text-primary"/><h2 className="text-2xl font-semibold">A controlled path for supplier exceptions</h2><p className="mt-3 max-w-3xl text-sm text-muted-foreground">Review price differences, correct posted invoice references and resolve disputes. Frozen proposals show exactly what will change. Quantity, source identity, tax, QC and receipt availability remain mandatory.</p><Link href="/purchasing/match-policy" className="mt-3 inline-block text-sm font-medium text-primary">Review purchasing policy →</Link></section>
    <div className="rounded-2xl border bg-card p-4"><p className="mb-2 text-sm font-medium">Find a posted supplier bill</p><AsyncSearchableSelect value={documentId} selectedOption={source ? { id: source.id, label: source.number } : null} allowClear placeholder="Choose a bill or open from its supplier-reference card" onValueChange={setDocumentId} loadOptions={async (search, page) => { const result = await fetchDocumentListPageApi("bill", { search, status: "POSTED", limit: 40, cursor: page?.cursor ?? undefined }); return { options: result.items.map((row) => ({ id: row.id, label: row.number, description: row.party })), nextCursor: result.nextCursor }; }}/>{source && <p className="mt-3 text-sm"><Link className="text-primary underline" href={`/docs/${source.type}/${source.id}`}>{source.number}</Link> · {source.status}{source.purchasingDispute?.state === "OPEN" && <span className="ml-2 font-medium text-amber-700 dark:text-amber-400">Payment held · {source.purchasingDispute.reason}</span>}</p>}</div>
    {loading ? <p role="status">Loading review evidence…</p> : error ? <p role="alert" className="rounded-xl border border-destructive/30 p-4">{error}</p> : <>
      {source && source.status === "POSTED" && permissions.includes("finance.write") && <form className="space-y-4 rounded-2xl border bg-card p-5" onSubmit={(e) => { e.preventDefault(); void prepare(false); }}><h3 className="font-semibold">Prepare a request</h3><label className="block text-sm font-medium">Action<select className="mt-2 w-full rounded-md border bg-background p-2" value={kind} onChange={(e) => setKind(e.target.value)}><option value="PURCHASE_PRICE">Approve this invoice price difference</option><option value="SUPPLIER_REFERENCE">Correct posted supplier references</option><option value="DISPUTE_RESOLUTION">Resolve an open supplier dispute</option></select></label>
        {kind === "PURCHASE_PRICE" && <label className="block text-sm">Receipt<select required className="mt-2 w-full rounded-md border bg-background p-2" value={receiptId} onChange={(e) => setReceiptId(e.target.value)}><option value="">Choose linked receipt</option>{source.receipts.map((r) => <option key={r.id} value={r.id}>{r.number}</option>)}</select></label>}
        {kind === "SUPPLIER_REFERENCE" && <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Correct supplier invoice number<Input maxLength={200} className="mt-2" value={invoice} onChange={(e) => setInvoice(e.target.value)}/></label><label className="text-sm">Correct supplier CU number<Input maxLength={200} className="mt-2" value={cu} onChange={(e) => setCu(e.target.value)}/></label></div>}
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Reason<textarea required minLength={5} maxLength={2000} className="mt-2 min-h-24 w-full rounded-md border bg-background p-3" value={reason} onChange={(e) => setReason(e.target.value)}/></label><label className="text-sm">Evidence reference<Input required minLength={5} maxLength={500} className="mt-2" value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="Supplier confirmation or retained document reference"/></label></div><div className="flex flex-wrap gap-3"><Button disabled={busy}>Save for independent review</Button>{source.type === "bill" && source.purchasingDispute?.state !== "OPEN" && <Button type="button" variant="outline" disabled={busy || reason.trim().length < 5} onClick={() => void prepare(true)}>Open dispute and hold payment</Button>}</div></form>}
      <ChangeReview rows={rows} canApprove={permissions.includes("finance.approve")} onReview={async (record, approve, reason) => { await apiRequest(`/api/purchasing/exceptions/${encodeURIComponent(record._id)}/review`, { method: "POST", body: { kind: record.kind, digest: record.digest, approve, reason } }); await load(); }}/>{hasMore && <p className="text-sm text-muted-foreground">Showing the latest 100 requests. Choose a source bill to narrow the review queue.</p>}
    </>}
  </div></PageLayout>;
}
