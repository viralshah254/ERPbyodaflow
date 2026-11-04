"use client";
import * as React from "react";
import Link from "next/link";
import { ShieldCheck, RefreshCw, ArrowUpRight, Clock3, FileCheck2 } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth-store";
import { fetchFiscalRecovery, fetchFiscalAttempt, proposeFiscalOutcome, approveFiscalOutcome, type FiscalRecoveryAttempt, type FiscalRecoveryProposal } from "@/lib/api/fiscal-recovery";
import { toast } from "sonner";
const labels: Record<string, string> = { PREPARED: "Prepared · not sent", DISPATCHING: "Awaiting provider", UNCERTAIN: "Outcome uncertain", SIGNED: "Ready to recover posting", POSTED: "Posted", RELEASED: "Released after review" };
export default function FiscalRecoveryPage() {
  const permissions = useAuthStore((s) => s.permissions);
  const orgId = useAuthStore((s) => s.org?.orgId);
  const userId = useAuthStore((s) => s.user?.userId);
  const allowed = permissions.includes("finance.read") && permissions.includes("finance.tax.read");
  const [rows, setRows] = React.useState<FiscalRecoveryAttempt[]>([]);
  const [selected, setSelected] = React.useState<FiscalRecoveryAttempt | null>(null);
  const [documentFilter, setDocumentFilter] = React.useState("");
  React.useEffect(() => { setDocumentFilter(new URLSearchParams(window.location.search).get("documentId") ?? ""); }, []);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [detailError, setDetailError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(false);
  const [outcome, setOutcome] = React.useState<"ACCEPTED" | "NOT_ACCEPTED">("ACCEPTED");
  const [reason, setReason] = React.useState("");
  const [evidence, setEvidence] = React.useState("");
  const [receiptNumber, setReceiptNumber] = React.useState("");
  const [counter, setCounter] = React.useState("");
  const selection = React.useRef(0);
  const request = React.useRef(0);
  const invalidate = React.useCallback(() => { request.current++; selection.current++; }, []);
  const load = React.useCallback(async () => {
    const generation = ++request.current;
    if (!allowed || !orgId) { setLoading(false); return; }
    setLoading(true); setError("");
    try { const result = await fetchFiscalRecovery(documentFilter || undefined); if (generation !== request.current) return; setRows(result.rows); setHasMore(result.hasMore); }
    catch (e) { if (generation === request.current) setError((e as Error).message); }
    finally { if (generation === request.current) setLoading(false); }
  }, [allowed, orgId, documentFilter]);
  React.useEffect(() => { setSelected(null); setRows([]); void load(); return invalidate; }, [load, invalidate]);
  async function open(row: FiscalRecoveryAttempt) {
    const request = ++selection.current;
    setSelected(null); setDetailError(""); setReason(""); setEvidence(""); setReceiptNumber(""); setCounter(""); setOutcome(row.state === "PREPARED" ? "NOT_ACCEPTED" : "ACCEPTED");
    try { const next = await fetchFiscalAttempt(row._id); if (request === selection.current) setSelected(next); }
    catch (e) { if (request === selection.current) setDetailError((e as Error).message); }
  }
  async function act(approve: boolean) {
    if (!selected) return;
    setBusy(true);
    try {
      if (approve) await approveFiscalOutcome(selected._id, selected.review!.digest);
      else {
        const proposal: FiscalRecoveryProposal = { outcome, reason, evidenceReference: evidence,
          ...(selected.provider === "etims_oscu" && counter.trim() ? { providerLastInvoiceNumber: Number(counter) } : {}),
          ...(outcome === "ACCEPTED" && !selected.receipt ? { receipt: { status: "signed", provider: selected.provider, cuInvoiceNumber: receiptNumber.trim(), ...(selected.provider === "etims_oscu" ? { receiptNumber: receiptNumber.trim() } : {}) } } : {}) };
        await proposeFiscalOutcome(selected._id, proposal);
      }
      toast.success(approve ? "Provider outcome approved. Review the document's next action." : "Evidence saved. A different finance approver must review it.");
      const next = await fetchFiscalAttempt(selected._id); setSelected(next); await load();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }
  const filtered = rows.filter((row) => `${row.documentId} ${row.provider} ${labels[row.state]}`.toLowerCase().includes(query.toLowerCase()));
  const awaiting = rows.filter((r) => r.state !== "SIGNED").length;
  const reviewable = selected && ["PREPARED", "DISPATCHING", "UNCERTAIN"].includes(selected.state);
  const waiting = selected && Date.now() - new Date(selected.dispatchedAt ?? selected.updatedAt).getTime() < 120000;
  return <PageLayout title="Fiscal recovery" description="Reconcile once. Protect every invoice and credit." actions={<Button variant="outline" disabled={loading || busy} onClick={() => void load()}><RefreshCw className="mr-2 size-4"/>Refresh</Button>}>
    <div className="space-y-5 pb-6">
      <section className="rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-7">
        <div className="flex items-start gap-3"><div className="rounded-xl bg-primary/10 p-3 text-primary"><ShieldCheck className="size-6"/></div><div><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Finance control room</p><h2 className="mt-1 text-xl font-semibold sm:text-2xl">A clear path from uncertainty to resolution</h2><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Review the original request, verify the provider outcome, then ask an independent approver to confirm. A timeout keeps the request and credit value reserved until that review is complete.</p></div></div>
        {allowed && !error && !loading && <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl border bg-background/70 p-4"><Clock3 className="mb-2 size-4 text-amber-600"/><strong className="text-2xl">{awaiting}</strong><p className="text-xs text-muted-foreground">Need an outcome review · loaded queue</p></div><div className="rounded-xl border bg-background/70 p-4"><FileCheck2 className="mb-2 size-4 text-primary"/><strong className="text-2xl">{rows.length - awaiting}</strong><p className="text-xs text-muted-foreground">Signed · recover ledger posting</p></div></div>}
      </section>
      {!allowed ? <p role="alert" className="rounded-xl border p-5">Finance and tax read permissions are required to view this queue.</p> : error ? <div role="alert" className="rounded-xl border border-destructive/40 p-5"><p className="font-semibold">The recovery queue could not load</p><p className="mt-1 text-sm">{error}</p></div> : <div className="grid items-start gap-5 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
        <section className="min-w-0 rounded-2xl border bg-card p-4">{documentFilter && <div className="mb-4 rounded-xl bg-primary/5 p-3 text-sm"><p className="break-all">Showing document {documentFilter}</p><Button className="mt-2" variant="outline" size="sm" onClick={() => setDocumentFilter("")}>Show all attempts</Button></div>}<label htmlFor="fiscal-search" className="mb-2 block text-sm font-medium">Find a document or provider</label><Input id="fiscal-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the loaded queue…"/>
          {loading ? <p role="status" className="py-8 text-center text-sm text-muted-foreground">Loading recovery queue…</p> : !filtered.length ? <div className="py-10 text-center"><ShieldCheck className="mx-auto mb-3 size-7 text-primary"/><p className="font-medium">{query ? "No matching documents" : "No outstanding attempts in your scope"}</p><p className="mt-2 text-sm text-muted-foreground">{query ? "Try another document ID or provider." : "New unresolved attempts will appear here."}</p></div> : <div className="mt-4 space-y-2">{filtered.map((row) => <button key={row._id} disabled={busy} onClick={() => void open(row)} aria-pressed={selected?._id === row._id} className={`w-full rounded-xl border p-4 text-left transition hover:border-primary/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${selected?._id === row._id ? "border-primary bg-primary/5" : "bg-background/50"}`}><span className="flex items-center justify-between gap-2"><span className="break-all font-medium">{row.documentId}</span><ArrowUpRight className="size-4 shrink-0 text-muted-foreground"/></span><span className="mt-2 block text-xs font-medium text-primary">{labels[row.state]}</span><span className="mt-1 block text-xs text-muted-foreground">{row.provider === "incotex" ? "Incotex" : "eTIMS OSCU"} · Attempt {row.generation} · {new Date(row.updatedAt).toLocaleString()}</span></button>)}</div>}
          {hasMore && <p role="status" className="mt-4 text-xs text-amber-700 dark:text-amber-400">Showing the oldest 100 attempts. Resolve these in order, or open a specific document from its fiscal panel.</p>}
        </section>
        <section className="min-w-0 rounded-2xl border bg-card p-5">{detailError ? <p role="alert">{detailError}</p> : !selected ? <div className="py-14 text-center text-muted-foreground"><FileCheck2 className="mx-auto mb-3 size-8"/><p>Select an attempt to review its evidence and next step.</p></div> : <div className="space-y-5">
          <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Original evidence · attempt {selected.generation}</p><h3 className="mt-1 break-all text-lg font-semibold">{selected.documentId}</h3><p className="mt-1 text-sm font-medium text-primary">{labels[selected.state]}</p><Button asChild variant="outline" className="mt-3"><Link href={`/docs/${selected.typeKey}/${selected.documentId}`}>Open source document<ArrowUpRight className="ml-2 size-4"/></Link></Button></div>
          {selected.error && <p className="break-words rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm">{selected.error}</p>}
          <details className="rounded-xl border p-3"><summary className="cursor-pointer text-sm font-medium">View frozen request and integrity reference</summary><p className="mt-3 break-all font-mono text-xs text-muted-foreground">{selected.payloadHash ?? selected.documentHash}</p><pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-muted p-3 text-xs">{selected.payload ? JSON.stringify(selected.payload, null, 2) : "Prepared only · no request dispatched."}</pre></details>
          {selected.receipt && <p className="rounded-xl bg-primary/5 p-4 text-sm"><strong>Recorded provider receipt</strong><span className="mt-1 block break-all">{selected.receipt.cuInvoiceNumber ?? selected.receipt.receiptNumber}</span>This receipt must be retained. Recover its posting after outcome approval.</p>}
          {selected.review && <div className="rounded-xl border bg-muted/30 p-4 text-sm"><p className="font-semibold">{reviewable ? "Awaiting independent review" : "Reviewed outcome"}</p><p className="mt-2">{selected.review.outcome === "ACCEPTED" ? "Provider accepted" : "Provider did not accept"} · {selected.review.evidenceReference}</p><p className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">{selected.review.reason}</p><p className="mt-2 text-xs text-muted-foreground">Prepared by {selected.review.proposedBy}</p>{reviewable && permissions.includes("finance.approve") && selected.review.proposedBy !== userId && <Button className="mt-3" disabled={busy} onClick={() => void act(true)}>Approve reviewed outcome</Button>}{reviewable && selected.review.proposedBy === userId && <p className="mt-3 text-xs text-muted-foreground">A different finance approver must confirm this outcome.</p>}</div>}
          {reviewable && permissions.includes("finance.write") && <form className="space-y-4 border-t pt-5" onSubmit={(e) => { e.preventDefault(); void act(false); }}><h4 className="font-semibold">1. Verify with the provider</h4><p className="text-sm text-muted-foreground">Check the provider register or support evidence before choosing an outcome. Saving a proposal does not resend or post the document.</p>{waiting && <p role="status" className="text-sm text-amber-700 dark:text-amber-400">Still within the provider response window. Refresh after two minutes before reviewing.</p>}
            <label className="block text-sm font-medium">Verified outcome<select value={outcome} onChange={(e) => setOutcome(e.target.value as typeof outcome)} className="mt-2 w-full rounded-md border bg-background p-2"><option value="ACCEPTED" disabled={selected.state === "PREPARED"}>Accepted by provider</option><option value="NOT_ACCEPTED" disabled={Boolean(selected.receipt)}>Not accepted by provider</option></select></label>
            {outcome === "ACCEPTED" && !selected.receipt && <label className="block text-sm font-medium">Original provider receipt number<Input className="mt-2" required maxLength={200} value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)}/></label>}
            {selected.provider === "etims_oscu" && <label className="block text-sm font-medium">Verified current eTIMS invoice counter<Input className="mt-2" required type="number" min={0} step={1} value={counter} onChange={(e) => setCounter(e.target.value)}/></label>}
            <label className="block text-sm font-medium">Evidence reference<Input className="mt-2" required maxLength={500} value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="Provider case or retained register reference"/></label>
            <label className="block text-sm font-medium">Review reason<textarea required maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} className="mt-2 min-h-24 w-full rounded-md border bg-background p-3" placeholder="What was checked and how the outcome was verified"/></label>
            <Button type="submit" disabled={busy || Boolean(waiting)}>Save for independent approval</Button></form>}
          {selected.state === "SIGNED" && <p className="rounded-xl bg-primary/5 p-4 text-sm">2. Open the source document and choose <strong>Recover posting</strong>. The existing signature will be reused.</p>}
          {selected.state === "RELEASED" && <p className="rounded-xl bg-primary/5 p-4 text-sm">The reviewed attempt is released. Review the source document before preparing a new signing request.</p>}
        </div>}</section>
      </div>}
    </div>
  </PageLayout>;
}
