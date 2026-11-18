"use client";
import * as React from "react";
import Link from "next/link";
import { RefreshCw, ArrowUpRight, CircleHelp } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth-store";
import { fetchFiscalRecovery, fetchFiscalAttempt, proposeFiscalOutcome, approveFiscalOutcome, checkFiscalResult, type FiscalRecoveryAttempt, type FiscalRecoveryProposal } from "@/lib/api/fiscal-recovery";
import { fetchDocumentDetailApi } from "@/lib/api/documents";
import type { DocTypeKey } from "@/config/documents/types";
import { toast } from "sonner";

const statusLabel: Record<string, string> = {
  QUEUED: "Waiting in queue",
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

function kraResultMissing(error?: string) {
  return /fetch failed|KRA result was not collected|could not be reached|did not answer in time/i.test(error ?? "");
}

function waitingInQueue(row: { state: string; queue?: string }) {
  return row.state === "QUEUED" && row.queue !== "ready";
}

function attemptStatus(row: { state: string; queue?: string; error?: string; receipt?: { cuInvoiceNumber?: string; receiptNumber?: string } | null }) {
  if (row.state === "QUEUED" && row.queue === "ready") return "Ready to sign";
  if (waitingInQueue(row)) return "Waiting in queue";
  if (row.state === "UNCERTAIN" && !row.receipt && kraResultMissing(row.error)) return "No KRA result yet";
  return statusLabel[row.state] ?? row.state;
}

function plainError(error?: string) {
  if (!error) return "";
  if (kraResultMissing(error)) return "Incotex could not be reached, so no KRA result was collected.";
  return error;
}

function nextStep(row: FiscalRecoveryAttempt | null, name: string, canApprove: boolean, waiting: boolean) {
  if (!row) return "Choose an invoice. The next step shows here.";
  if (waitingInQueue(row)) return `${name} is waiting in the queue. ${row.waitingForDocumentNumber || "The invoice ahead"} has to finish before this invoice can be signed.`;
  if (row.state === "QUEUED") return `${name} is next in the queue. Open it and use Sign and post.`;
  if (!row.receipt && kraResultMissing(row.error)) return `${name} has no KRA result yet. Incotex could not be reached. Press Check KRA again.`;
  if (waiting && ["PREPARED", "DISPATCHING", "UNCERTAIN"].includes(row.state)) return `KRA may still be answering ${name}. Wait two minutes, then refresh.`;
  if (row.state === "SIGNED") return `${name} was accepted by KRA. Open it and recover the posting. Do not sign it again.`;
  if (row.state === "RELEASED") return `${name} is cleared. Open it and sign it again.`;
  if (row.receipt) return `${name} already has CU ${row.receipt.cuInvoiceNumber ?? row.receipt.receiptNumber}. Confirm it so the invoice can post.`;
  if (row.review?.outcome === "ACCEPTED") return `${name} is marked accepted, but there is no CU number. Change the decision if the invoice is not on the KRA receipt.`;
  if (canApprove) return `KRA did not accept ${name}. Press Clear this attempt, then sign the invoice again.`;
  return `KRA did not accept ${name}. A finance approver clears it, then sign the invoice again.`;
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
  const [guideOpen, setGuideOpen] = React.useState(false);
  const [names, setNames] = React.useState<Record<string, string>>({});
  const [missingDocument, setMissingDocument] = React.useState(false);
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
  React.useEffect(() => {
    if (documentFilter && rows.length > 0) setMissingDocument(false);
    if (loading || error || !documentFilter || rows.length > 0) return;
    setMissingDocument(true);
    setDocumentFilter("");
  }, [loading, error, documentFilter, rows.length]);
  React.useEffect(() => {
    if (rows.length !== 1 || selected?._id === rows[0]._id) return;
    void open(rows[0]);
  }, [rows, selected]);

  function resetChoice(row: FiscalRecoveryAttempt) {
    setChanging(false);
    setNote("");
    setReceiptNumber("");
    setCounter("");
    setAccepted(row.state !== "PREPARED" && Boolean(row.receipt));
  }

  async function open(row: FiscalRecoveryAttempt) {
    const current = ++selection.current;
    setSelected(null); setDetailError(""); setGuideOpen(false); resetChoice(row);
    try { const next = await fetchFiscalAttempt(row._id); if (current === selection.current) { setSelected(next); resetChoice(next); } }
    catch (e) { if (current === selection.current) setDetailError((e as Error).message); }
  }

  async function checkKra() {
    if (!selected) return;
    setBusy(true);
    try {
      const result = await checkFiscalResult(selected._id);
      const next = await fetchFiscalAttempt(selected._id);
      setSelected(next);
      setChanging(false);
      await load();
      toast.success(result.outcome === "accepted" ? `KRA accepted it. CU ${result.cuInvoiceNumber}.` : result.message);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
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

  const filtered = rows.filter((row) => `${documentLabel(row, names)} ${row.documentId} ${providerName(row.provider)} ${attemptStatus(row)}`.toLowerCase().includes(query.trim().toLowerCase()));
  const reviewable = selected && ["PREPARED", "DISPATCHING", "UNCERTAIN"].includes(selected.state);
  const waiting = selected && Date.now() - new Date(selected.dispatchedAt ?? selected.updatedAt).getTime() < 120000;
  const noResult = Boolean(selected && !selected.receipt && kraResultMissing(selected.error));
  const showForm = Boolean(reviewable && canWrite && (!selected?.review || changing) && (!noResult || changing));
  const signer = selected ? providerName(selected.provider) : "KRA";

  const ownRelease = Boolean(selected?.review && selected.review.outcome === "NOT_ACCEPTED" && !selected.receipt);
  const hint = nextStep(selected, selected ? documentLabel(selected, names) : "", canApprove, Boolean(waiting));
  return <PageLayout title="Fiscal recovery" description="Finish an invoice that did not get a KRA result." actions={<Button variant="outline" disabled={loading || busy} onClick={() => void load()}><RefreshCw className="mr-2 size-4"/>Refresh</Button>}>
    <div className="space-y-5 pb-6">
      <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-card via-card to-primary/[0.08] px-5 py-4 shadow-[0_24px_60px_-36px_rgba(0,0,0,0.9)]">
        <span aria-hidden className="absolute inset-y-3 left-0 w-px bg-gradient-to-b from-transparent via-primary/80 to-transparent"/>
        <p className="text-[15px] leading-7 tracking-[-0.011em] text-foreground/95">{hint}{" "}<button type="button" className={`inline-flex size-6 translate-y-[3px] items-center justify-center rounded-full align-middle transition ${guideOpen ? "bg-primary/15 text-primary" : "text-muted-foreground/80 hover:bg-white/10 hover:text-foreground"}`} aria-label="Help" aria-expanded={guideOpen} aria-controls="fiscal-recovery-help" onClick={() => setGuideOpen((open) => !open)}><CircleHelp className="size-4" strokeWidth={1.75}/></button></p>
        {guideOpen && <div id="fiscal-recovery-help" className="mt-3 space-y-2 border-t border-white/10 pt-3 text-sm leading-6 text-muted-foreground">
          <p>If Incotex could not be reached, there is no KRA result yet. Check again. Do not clear the invoice until KRA answers.</p>
          <p>If KRA did not accept the invoice, clear the attempt and sign it again. You can do that yourself.</p>
          <p>If the invoice is on the KRA receipt, enter the CU invoice number from that receipt. It is not the ERP invoice number. Another finance approver confirms that number.</p>
        </div>}
      </section>
      {!allowed ? <p role="alert" className="rounded-xl border p-5">Finance and tax read permissions are required to view this queue.</p> : error ? <div role="alert" className="rounded-xl border border-destructive/40 p-5"><p className="font-semibold">The recovery queue could not load</p><p className="mt-1 text-sm">{error}</p></div> : <div className="grid items-start gap-5 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
        <section className="min-w-0 rounded-2xl border border-border/80 bg-card p-4 shadow-[0_18px_50px_-28px_rgba(0,0,0,0.85)]">
          {missingDocument && <div className="mb-4 rounded-xl bg-primary/5 p-3 text-sm leading-6">This invoice was not sent to KRA. The invoice that is still open is listed here.</div>}
          {documentFilter && <div className="mb-4 rounded-xl bg-primary/5 p-3 text-sm"><p>Showing one invoice.</p><Button className="mt-2" variant="outline" size="sm" onClick={() => setDocumentFilter("")}>Show all attempts</Button></div>}
          <label htmlFor="fiscal-search" className="mb-2 block text-sm font-medium">Find an invoice</label>
          <Input id="fiscal-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Invoice number"/>
          {loading ? <p role="status" className="py-8 text-center text-sm text-muted-foreground">Loading recovery queue…</p> : !filtered.length ? <div className="py-10 text-center"><p className="font-medium">{query ? "No matching invoices" : "No outstanding attempts in your scope"}</p></div> : <div className="mt-4 space-y-2">{filtered.map((row) => <button key={row._id} disabled={busy} onClick={() => void open(row)} aria-pressed={selected?._id === row._id} className={`w-full rounded-xl border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${waitingInQueue(row) ? "border-amber-400/80 bg-amber-400/[0.10] hover:border-amber-300" : selected?._id === row._id ? "border-primary/70 bg-primary/[0.07] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] hover:border-primary/40" : "border-border/70 bg-background/40 hover:border-primary/40"}`}><span className="flex items-center justify-between gap-2"><span className="text-base font-semibold tracking-tight">{documentLabel(row, names)}</span><ArrowUpRight className="size-4 shrink-0 text-muted-foreground"/></span><span className={`mt-2 block text-xs font-medium ${waitingInQueue(row) ? "text-amber-300" : "text-primary"}`}>{attemptStatus(row)}</span><span className="mt-1 block text-xs text-muted-foreground">{waitingInQueue(row) && row.waitingForDocumentNumber ? `After ${row.waitingForDocumentNumber} · ` : ""}{providerName(row.provider)} · {new Date(row.updatedAt).toLocaleString()}</span></button>)}</div>}
          {hasMore && <p role="status" className="mt-4 text-xs text-amber-700 dark:text-amber-400">Showing the oldest 100 attempts. Finish these before the rest of the queue.</p>}
        </section>
        <section className="min-w-0 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_18px_50px_-28px_rgba(0,0,0,0.85)]">{detailError ? <p role="alert" className="p-6">{detailError}</p> : !selected ? <p className="px-6 py-16 text-center text-sm text-muted-foreground">Select an invoice.</p> : <div>
          <div className="flex items-start justify-between gap-4 border-b border-border/70 px-6 py-5">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Invoice</p>
              <h3 className="mt-1 text-2xl font-semibold tracking-tight">{documentLabel(selected, names)}</h3>
              <p className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${waitingInQueue(selected) ? "bg-amber-400/15 text-amber-200" : "bg-primary/10 text-primary"}`}>{attemptStatus(selected)}</p>
            </div>
            <Button asChild variant="outline" size="sm"><Link href={`/docs/${selected.typeKey}/${selected.documentId}`}>Open invoice<ArrowUpRight className="ml-2 size-4"/></Link></Button>
          </div>
          <div className="space-y-4 px-6 py-5">
          {selected.state === "QUEUED" ? <div className={`rounded-xl border px-4 py-3 text-sm leading-6 ${waitingInQueue(selected) ? "border-amber-400/50 bg-amber-400/[0.08] text-amber-50" : "border-border/70 bg-primary/5"}`}><p>{waitingInQueue(selected) ? `${documentLabel(selected, names)} stays in the queue until ${selected.waitingForDocumentNumber || "the invoice ahead"} is finished. It was not sent to KRA.` : `${documentLabel(selected, names)} is next. Open it and use Sign and post.`}</p></div> : selected.error && <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3 text-sm leading-6"><p>{plainError(selected.error)}</p>{noResult && canWrite && <Button className="mt-3" disabled={busy} onClick={() => void checkKra()}>Check KRA again</Button>}</div>}
          {selected.receipt && <p className="rounded-xl bg-primary/5 px-4 py-3 text-sm"><span className="font-medium">CU invoice number</span><span className="mt-1 block tracking-tight">{selected.receipt.cuInvoiceNumber ?? selected.receipt.receiptNumber}</span></p>}
          {selected.review && <div className="rounded-xl border border-border/70 bg-background/40 px-4 py-4 text-sm">
            <p className="font-semibold">{noResult ? "No KRA result yet" : reviewable && !ownRelease ? "Waiting for a second person" : reviewable ? "Ready to clear" : "Reviewed decision"}</p>
            <p className="mt-2">{noResult ? "A KRA result was not collected." : selected.review.outcome === "ACCEPTED" ? "Saved choice: KRA accepted this invoice." : "Saved choice: KRA did not accept this invoice."}</p>
            {selected.review.outcome === "ACCEPTED" && !selected.receipt && <p className="mt-1">No CU invoice number was saved with that choice. If you cannot see {documentLabel(selected, names)} on the {signer} screen, change the decision to “KRA did not accept it” and clear it yourself.</p>}
            {selected.review.reason && <p className="mt-1 text-muted-foreground">Note: {selected.review.reason}</p>}
            <p className="mt-2 text-xs text-muted-foreground">{selected.review.proposedBy === userId ? "Saved by you" : `Saved by ${selected.review.proposedBy}`}</p>
            {reviewable && !ownRelease && selected.review.proposedBy === userId && <p className="mt-3">A typed CU invoice number needs another finance approver. You can still change this decision.</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              {reviewable && canApprove && !noResult && (selected.review.proposedBy !== userId || ownRelease) && <Button disabled={busy} onClick={() => void act(true)}>{ownRelease ? "Clear this attempt" : "Confirm this decision"}</Button>}
              {reviewable && canWrite && !changing && <Button variant="outline" disabled={busy} onClick={() => setChanging(true)}>Change this decision</Button>}
            </div>
          </div>}
          {showForm && <form className="space-y-4 border-t pt-5" onSubmit={(e) => { e.preventDefault(); void act(false); }}>
            <h4 className="font-semibold">What did KRA do?</h4>
            {waiting && <p role="status" className="text-sm text-amber-700 dark:text-amber-400">KRA may still be answering. Wait two minutes, refresh, then choose.</p>}
            <fieldset className="space-y-2">
              <legend className="sr-only">What did KRA do?</legend>
              <label className={`block rounded-xl border p-3 ${!accepted ? "border-primary bg-primary/5" : ""}`}>
                <span className="flex items-start gap-2"><input type="radio" name="kra-outcome" checked={!accepted} disabled={Boolean(selected.receipt)} onChange={() => setAccepted(false)}/><span><span className="font-medium">KRA did not accept it</span><span className="mt-1 block text-sm text-muted-foreground">Use this when KRA could not be reached, or the invoice is not on the KRA receipt. Then sign and post again.</span></span></span>
              </label>
              <label className={`block rounded-xl border p-3 ${accepted ? "border-primary bg-primary/5" : ""}`}>
                <span className="flex items-start gap-2"><input type="radio" name="kra-outcome" checked={accepted} disabled={selected.state === "PREPARED"} onChange={() => setAccepted(true)}/><span><span className="font-medium">KRA already accepted it</span><span className="mt-1 block text-sm text-muted-foreground">Use this only when this invoice is on the KRA receipt. Copy that CU invoice number below.</span></span></span>
              </label>
            </fieldset>
            {accepted && !selected.receipt && <label className="block text-sm font-medium">CU invoice number from {signer}<Input className="mt-2" required maxLength={200} value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} placeholder="The number on the KRA receipt, not the ERP invoice number"/></label>}
            {selected.provider === "etims_oscu" && <label className="block text-sm font-medium">Last invoice number on the eTIMS device<Input className="mt-2" required type="number" min={0} step={1} value={counter} onChange={(e) => setCounter(e.target.value)} placeholder="The current counter shown on eTIMS"/></label>}
            <label className="block text-sm font-medium">What you checked<Input className="mt-2" maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Example: Looked on the KRA receipt. This invoice is not there."/></label>
            <Button type="submit" disabled={busy || Boolean(waiting)}>{!accepted && canApprove && !selected.receipt ? "Clear this attempt" : accepted ? "Save for a second person" : "Save this decision"}</Button>
          </form>}
          {selected.state === "SIGNED" && <p className="rounded-xl bg-primary/5 p-4 text-sm">Open the invoice and choose <strong>Recover posting</strong>. The saved KRA receipt is reused. Do not sign it again.</p>}
          {selected.state === "RELEASED" && <p className="rounded-xl bg-primary/5 p-4 text-sm">This attempt is cleared. Open the invoice and use Sign and post when you are ready to send it again.</p>}
          </div>
        </div>}</section>
      </div>}
    </div>
  </PageLayout>;
}
