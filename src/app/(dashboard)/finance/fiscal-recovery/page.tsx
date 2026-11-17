"use client";
import * as React from "react";
import Link from "next/link";
import { RefreshCw, ArrowUpRight } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth-store";
import { fetchFiscalRecovery, fetchFiscalAttempt, proposeFiscalOutcome, approveFiscalOutcome, type FiscalRecoveryAttempt, type FiscalRecoveryProposal } from "@/lib/api/fiscal-recovery";
import { fetchDocumentDetailApi } from "@/lib/api/documents";
import type { DocTypeKey } from "@/config/documents/types";
import { toast } from "sonner";

const statusLabel: Record<string, string> = {
  PREPARED: "Not sent to KRA",
  DISPATCHING: "Waiting for KRA",
  UNCERTAIN: "KRA result unknown",
  SIGNED: "Accepted, posting not finished",
  POSTED: "Posted",
  RELEASED: "Cleared",
};

function providerName(provider: string) {
  return provider === "etims_oscu" ? "eTIMS" : "Incotex";
}

function documentLabel(row: { documentNumber?: string | null; documentId: string }, names: Record<string, string>) {
  return row.documentNumber?.trim() || names[row.documentId] || row.documentId;
}

function plainError(error?: string) {
  if (!error) return "";
  if (/fetch failed/i.test(error)) return "KRA could not be reached. No receipt was saved, so this invoice was not accepted.";
  return error;
}

export default function FiscalRecoveryPage() {
  const permissions = useAuthStore((s) => s.permissions);
  const orgId = useAuthStore((s) => s.org?.orgId);
  const userId = useAuthStore((s) => s.user?.userId);
  const allowed = permissions.includes("finance.read") && permissions.includes("finance.tax.read");
  const canWrite = permissions.includes("finance.write");
  const canApprove = permissions.includes("finance.approve");
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
  const [accepted, setAccepted] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [receiptNumber, setReceiptNumber] = React.useState("");
  const [counter, setCounter] = React.useState("");
  const [changing, setChanging] = React.useState(false);
  const [names, setNames] = React.useState<Record<string, string>>({});
  const named = React.useRef(new Set<string>());
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
  React.useEffect(() => {
    const missing = rows.filter((row) => !row.documentNumber && !named.current.has(row.documentId));
    if (!missing.length) return;
    for (const row of missing) named.current.add(row.documentId);
    let cancelled = false;
    void Promise.all(missing.map(async (row) => {
      const doc = await fetchDocumentDetailApi(row.typeKey as DocTypeKey, row.documentId).catch(() => null);
      return doc?.number ? [row.documentId, doc.number] as const : null;
    })).then((pairs) => {
      if (cancelled) return;
      setNames((current) => {
        const next = { ...current };
        for (const pair of pairs) if (pair) next[pair[0]] = pair[1];
        return next;
      });
    });
    return () => { cancelled = true; };
  }, [rows]);

  function resetChoice(row: FiscalRecoveryAttempt) {
    setChanging(false);
    setNote("");
    setReceiptNumber("");
    setCounter("");
    setAccepted(row.state !== "PREPARED" && Boolean(row.receipt));
  }

  async function open(row: FiscalRecoveryAttempt) {
    const current = ++selection.current;
    setSelected(null); setDetailError(""); resetChoice(row);
    try { const next = await fetchFiscalAttempt(row._id); if (current === selection.current) { setSelected(next); resetChoice(next); } }
    catch (e) { if (current === selection.current) setDetailError((e as Error).message); }
  }

  async function act(approve: boolean) {
    if (!selected) return;
    setBusy(true);
    try {
      if (approve) await approveFiscalOutcome(selected._id, selected.review!.digest);
      else {
        const signer = providerName(selected.provider);
        const proposal: FiscalRecoveryProposal = accepted
          ? {
              outcome: "ACCEPTED",
              evidenceReference: `${signer} CU ${receiptNumber.trim()}`,
              reason: note.trim() || `Copied the CU invoice number from ${signer}.`,
              receipt: { status: "signed", provider: selected.provider, cuInvoiceNumber: receiptNumber.trim(), ...(selected.provider === "etims_oscu" ? { receiptNumber: receiptNumber.trim() } : {}) },
              ...(selected.provider === "etims_oscu" ? { providerLastInvoiceNumber: Number(counter) } : {}),
            }
          : {
              outcome: "NOT_ACCEPTED",
              evidenceReference: `${signer} check`,
              reason: note.trim() || `Checked ${signer}. This invoice was not accepted.`,
            };
        const proposed = await proposeFiscalOutcome(selected._id, proposal);
        if (!accepted && canApprove && !selected.receipt && proposed.digest) await approveFiscalOutcome(selected._id, proposed.digest);
      }
      const cleared = approve ? selected.review?.outcome === "NOT_ACCEPTED" : !accepted && canApprove && !selected.receipt;
      toast.success(cleared ? "This attempt is cleared. Open the invoice and sign it again." : approve ? "Decision confirmed. Open the invoice for the next step." : accepted ? "Saved. Another finance approver confirms the CU invoice number on this page." : "Saved. A finance approver can clear it on this page.");
      const next = await fetchFiscalAttempt(selected._id); setSelected(next); setChanging(false); await load();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  const filtered = rows.filter((row) => `${documentLabel(row, names)} ${row.documentId} ${providerName(row.provider)} ${statusLabel[row.state] ?? row.state}`.toLowerCase().includes(query.trim().toLowerCase()));
  const reviewable = selected && ["PREPARED", "DISPATCHING", "UNCERTAIN"].includes(selected.state);
  const waiting = selected && Date.now() - new Date(selected.dispatchedAt ?? selected.updatedAt).getTime() < 120000;
  const showForm = Boolean(reviewable && canWrite && (!selected?.review || changing));
  const signer = selected ? providerName(selected.provider) : "KRA";

  const ownRelease = Boolean(selected?.review && selected.review.outcome === "NOT_ACCEPTED" && !selected.receipt);
  return <PageLayout title="Fiscal recovery" description="Record what KRA did. You can clear a failed send yourself." actions={<Button variant="outline" disabled={loading || busy} onClick={() => void load()}><RefreshCw className="mr-2 size-4"/>Refresh</Button>}>
    <div className="space-y-5 pb-6">
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="text-lg font-semibold">What you do on this page</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Open the invoice. The signer is already known.</li>
          <li>If KRA did not accept it, clear the attempt. Then open the invoice and sign it again.</li>
          <li>A second person confirms only when you type a CU invoice number from the signer&apos;s screen.</li>
        </ol>
      </section>
      {!allowed ? <p role="alert" className="rounded-xl border p-5">Finance and tax read permissions are required to view this queue.</p> : error ? <div role="alert" className="rounded-xl border border-destructive/40 p-5"><p className="font-semibold">The recovery queue could not load</p><p className="mt-1 text-sm">{error}</p></div> : <div className="grid items-start gap-5 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
        <section className="min-w-0 rounded-2xl border bg-card p-4">
          {documentFilter && <div className="mb-4 rounded-xl bg-primary/5 p-3 text-sm"><p>Showing one invoice.</p><Button className="mt-2" variant="outline" size="sm" onClick={() => setDocumentFilter("")}>Show all attempts</Button></div>}
          <label htmlFor="fiscal-search" className="mb-2 block text-sm font-medium">Find an invoice</label>
          <Input id="fiscal-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Invoice number"/>
          {loading ? <p role="status" className="py-8 text-center text-sm text-muted-foreground">Loading recovery queue…</p> : !filtered.length ? <div className="py-10 text-center"><p className="font-medium">{query ? "No matching invoices" : "No outstanding attempts in your scope"}</p></div> : <div className="mt-4 space-y-2">{filtered.map((row) => <button key={row._id} disabled={busy} onClick={() => void open(row)} aria-pressed={selected?._id === row._id} className={`w-full rounded-xl border p-4 text-left transition hover:border-primary/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${selected?._id === row._id ? "border-primary bg-primary/5" : "bg-background/50"}`}><span className="flex items-center justify-between gap-2"><span className="font-medium">{documentLabel(row, names)}</span><ArrowUpRight className="size-4 shrink-0 text-muted-foreground"/></span><span className="mt-2 block text-xs font-medium text-primary">{statusLabel[row.state] ?? row.state}</span><span className="mt-1 block text-xs text-muted-foreground">{providerName(row.provider)} · {new Date(row.updatedAt).toLocaleString()}</span></button>)}</div>}
          {hasMore && <p role="status" className="mt-4 text-xs text-amber-700 dark:text-amber-400">Showing the oldest 100 attempts. Finish these before the rest of the queue.</p>}
        </section>
        <section className="min-w-0 rounded-2xl border bg-card p-5">{detailError ? <p role="alert">{detailError}</p> : !selected ? <p className="py-14 text-center text-muted-foreground">Select an invoice to record what KRA did.</p> : <div className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Sent through {signer}</p>
            <h3 className="mt-1 text-lg font-semibold">{documentLabel(selected, names)}</h3>
            <p className="mt-1 text-sm font-medium text-primary">{statusLabel[selected.state] ?? selected.state}</p>
            <p className="mt-2 text-sm text-muted-foreground">This attempt already used {signer}. You can clear it when KRA did not accept the invoice.</p>
            <Button asChild variant="outline" className="mt-3"><Link href={`/docs/${selected.typeKey}/${selected.documentId}`}>Open invoice<ArrowUpRight className="ml-2 size-4"/></Link></Button>
          </div>
          {selected.error && <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm">{plainError(selected.error)}</p>}
          {selected.receipt && <p className="rounded-xl bg-primary/5 p-4 text-sm"><strong>CU invoice number already saved</strong><span className="mt-1 block">{selected.receipt.cuInvoiceNumber ?? selected.receipt.receiptNumber}</span></p>}
          {selected.review && <div className="rounded-xl border bg-muted/30 p-4 text-sm">
            <p className="font-semibold">{reviewable && !ownRelease ? "Waiting for a second person" : reviewable ? "Ready to clear" : "Reviewed decision"}</p>
            <p className="mt-2">{selected.review.outcome === "ACCEPTED" ? "Saved choice: KRA accepted this invoice." : "Saved choice: KRA did not accept this invoice."}</p>
            {selected.review.outcome === "ACCEPTED" && !selected.receipt && <p className="mt-1">No CU invoice number was saved with that choice. If you cannot see {documentLabel(selected, names)} on the {signer} screen, change the decision to “KRA did not accept it” and clear it yourself.</p>}
            {selected.review.reason && <p className="mt-1 text-muted-foreground">Note: {selected.review.reason}</p>}
            <p className="mt-2 text-xs text-muted-foreground">{selected.review.proposedBy === userId ? "Saved by you" : `Saved by ${selected.review.proposedBy}`}</p>
            {reviewable && !ownRelease && selected.review.proposedBy === userId && <p className="mt-3">A typed CU invoice number needs another finance approver. You can still change this decision.</p>}
            {reviewable && canApprove && (selected.review.proposedBy !== userId || ownRelease) && <Button className="mt-3" disabled={busy} onClick={() => void act(true)}>{ownRelease ? "Clear this attempt" : "Confirm this decision"}</Button>}
            {reviewable && canWrite && !changing && <Button className="mt-3 ml-2" variant="outline" disabled={busy} onClick={() => setChanging(true)}>Change this decision</Button>}
          </div>}
          {showForm && <form className="space-y-4 border-t pt-5" onSubmit={(e) => { e.preventDefault(); void act(false); }}>
            <h4 className="font-semibold">What did {signer} do?</h4>
            {waiting && <p role="status" className="text-sm text-amber-700 dark:text-amber-400">KRA may still be answering. Wait two minutes, refresh, then choose.</p>}
            <fieldset className="space-y-2">
              <legend className="sr-only">What did {signer} do?</legend>
              <label className={`block rounded-xl border p-3 ${!accepted ? "border-primary bg-primary/5" : ""}`}>
                <span className="flex items-start gap-2"><input type="radio" name="kra-outcome" checked={!accepted} disabled={Boolean(selected.receipt)} onChange={() => setAccepted(false)}/><span><span className="font-medium">KRA did not accept it</span><span className="mt-1 block text-sm text-muted-foreground">Use this when the signer could not be reached, or the invoice is not on the {signer} screen. After confirmation, sign and post again.</span></span></span>
              </label>
              <label className={`block rounded-xl border p-3 ${accepted ? "border-primary bg-primary/5" : ""}`}>
                <span className="flex items-start gap-2"><input type="radio" name="kra-outcome" checked={accepted} disabled={selected.state === "PREPARED"} onChange={() => setAccepted(true)}/><span><span className="font-medium">KRA already accepted it</span><span className="mt-1 block text-sm text-muted-foreground">Use this only when you can see this invoice on the {signer} screen. Copy that CU invoice number below.</span></span></span>
              </label>
            </fieldset>
            {accepted && !selected.receipt && <label className="block text-sm font-medium">CU invoice number from {signer}<Input className="mt-2" required maxLength={200} value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} placeholder="The number on the KRA receipt, not the ERP invoice number"/></label>}
            {selected.provider === "etims_oscu" && <label className="block text-sm font-medium">Last invoice number on the eTIMS device<Input className="mt-2" required type="number" min={0} step={1} value={counter} onChange={(e) => setCounter(e.target.value)} placeholder="The current counter shown on eTIMS"/></label>}
            <label className="block text-sm font-medium">What you checked<Input className="mt-2" maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} placeholder={`Example: Looked on ${signer}. This invoice is not there.`}/></label>
            <Button type="submit" disabled={busy || Boolean(waiting)}>{!accepted && canApprove && !selected.receipt ? "Clear this attempt" : accepted ? "Save for a second person" : "Save this decision"}</Button>
          </form>}
          {selected.state === "SIGNED" && <p className="rounded-xl bg-primary/5 p-4 text-sm">Open the invoice and choose <strong>Recover posting</strong>. The saved KRA receipt is reused. Do not sign it again.</p>}
          {selected.state === "RELEASED" && <p className="rounded-xl bg-primary/5 p-4 text-sm">This attempt is cleared. Open the invoice and use Sign and post when you are ready to send it again.</p>}
        </div>}</section>
      </div>}
    </div>
  </PageLayout>;
}
