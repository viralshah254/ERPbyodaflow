"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AsyncSearchableSelect, type AsyncSearchableSelectOption } from "@/components/ui/async-searchable-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  confirmArStatement, getArStatementDetail, listArStatementInvoices, listArStatementLines, STATEMENT_PAGE_SIZE,
  uploadArStatement, type StatementCandidate, type StatementChannel, type StatementDetail, type StatementInvoice,
  type StatementLine, type StatementPreview,
} from "@/lib/api/ar-statement-review";
import { advanceBankAllocationProposalApi } from "@/lib/api/bank-recon";
import { searchArCustomerOptionsApi } from "@/lib/api/payments";
import { groupReceiptMoney, parseReceiptMoney } from "@/lib/ar/receipt-money";
import { formatActivityExact, formatNairobiDate } from "@/lib/format/nairobi-datetime";
import { formatMoney } from "@/lib/money";
import { useHasPermission } from "@/lib/rbac/use-write-guard";
import type { BankAccountRow } from "@/lib/types/treasury";
import { useAuthStore } from "@/stores/auth-store";

const selectClass = "h-9 w-full rounded-md border bg-background px-2 text-sm";
const count = (n: number) => n.toLocaleString("en-KE");
const moneyMinor = (n: number) => Math.round(n * 100);
const isMpesa = (a: BankAccountRow) => /\bm[\s-]?pesa\b|\btill\b/i.test(`${a.name} ${a.bank}`);
const label = (line: StatementLine) => line.reference || line.description || "Statement line";
const err = (e: unknown) => e instanceof Error ? e.message : "Something went wrong. Please try again.";

export function ArStatementReviewSheet({ accounts, onClose, onSaved, initialReference }: {
  accounts: BankAccountRow[]; onClose: () => void; onSaved: () => void; initialReference?: string;
}) {
  const canUpload = useHasPermission("finance.write", "finance.reconciliation.write");
  const canPost = useHasPermission("finance.write", "finance.receipts.write") && canUpload;
  const canPropose = useHasPermission("finance.write");
  const canApprove = useHasPermission("finance.approve");
  const userId = useAuthStore(s => s.user?.userId);
  const [container, setContainer] = React.useState<HTMLDivElement | null>(null);
  const [channel, setChannel] = React.useState<StatementChannel>(initialReference ? "MPESA" : "BANK");
  const [accountId, setAccountId] = React.useState("");
  const visibleAccounts = accounts.filter(a => (channel === "MPESA") === isMpesa(a));
  const account = visibleAccounts.find(a => a.id === accountId) ?? visibleAccounts.find(a => a.active);
  const accountKey = account?.id ?? "";
  const [file, setFile] = React.useState<File>();
  const [showUpload, setShowUpload] = React.useState(false);
  const [preview, setPreview] = React.useState<StatementPreview>();
  const [batch, setBatch] = React.useState("");
  const [status, setStatus] = React.useState("PENDING");
  const [reference, setReference] = React.useState(initialReference ?? "");
  const [referenceQuery, setReferenceQuery] = React.useState(initialReference ?? "");
  const [offset, setOffset] = React.useState(0);
  const [reload, setReload] = React.useState(0);
  const [lines, setLines] = React.useState<{ items: StatementLine[]; hasMore: boolean }>();
  const [listError, setListError] = React.useState("");
  const [lineId, setLineId] = React.useState("");
  const [detail, setDetail] = React.useState<StatementDetail>();
  const [customer, setCustomer] = React.useState<AsyncSearchableSelectOption | null>(null);
  const [receipt, setReceipt] = React.useState<StatementCandidate>();
  const [reviewNote, setReviewNote] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [invoiceOffset, setInvoiceOffset] = React.useState(0);
  const [invoices, setInvoices] = React.useState<{ items: StatementInvoice[]; hasMore: boolean }>();
  const [invoiceError, setInvoiceError] = React.useState("");
  const [split, setSplit] = React.useState<Record<string, { invoice: StatementInvoice; value: string }>>({});
  const [keepOnAccount, setKeepOnAccount] = React.useState(false);
  const [reviewing, setReviewing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const money = (n: number) => formatMoney(n, account?.currency || "KES");
  const resetSplit = () => { setSplit({}); setReceipt(undefined); setKeepOnAccount(false); setReviewing(false); };
  const resetLine = () => {
    setLineId(""); setDetail(undefined); setCustomer(null); setReviewNote(""); setSearch(""); setInvoiceOffset(0);
    resetSplit(); setError("");
  };

  React.useEffect(() => {
    const timer = window.setTimeout(() => { setReferenceQuery(reference.trim()); setOffset(0); }, 250);
    return () => window.clearTimeout(timer);
  }, [reference]);

  React.useEffect(() => {
    setLines(undefined);
    setListError("");
    if (!accountKey) return;
    let active = true;
    listArStatementLines({ accountId: accountKey, status, offset: String(offset), ...(batch ? { batchId: batch } : {}),
      ...(referenceQuery ? { reference: referenceQuery } : {}) })
      .then(next => { if (active) setLines(next); }).catch(e => { if (active) setListError(err(e)); });
    return () => { active = false; };
  }, [accountKey, status, offset, batch, reload, referenceQuery]);

  React.useEffect(() => {
    if (!lineId) return;
    let active = true;
    getArStatementDetail(lineId).then(next => {
      if (!active) return;
      setDetail(next);
      if (next.route) setCustomer({ id: next.route.partyId, label: next.route.partyName });
    }).catch(e => { if (active) setError(err(e)); });
    return () => { active = false; };
  }, [lineId, reload]);

  React.useEffect(() => {
    setInvoices(undefined); setInvoiceError("");
    if (!customer?.id || !lineId || !detail || detail.line.status !== "PENDING" || !detail.eligible) return;
    let active = true;
    const timer = window.setTimeout(() => {
      listArStatementInvoices(lineId, { partyId: customer.id, search: search.trim(), offset: String(invoiceOffset) })
        .then(next => { if (active) setInvoices(next); }).catch(e => { if (active) setInvoiceError(err(e)); });
    }, 200);
    return () => { active = false; window.clearTimeout(timer); };
  }, [lineId, detail, customer?.id, search, invoiceOffset]);

  async function upload(verifyOnly: boolean) {
    if (!file || !account?.active || busy) return;
    setError(""); setBusy(true);
    try {
      const result = await uploadArStatement(file, account.id, channel, verifyOnly);
      if (verifyOnly) {
        if (!result.preview) throw new Error("No preview was returned.");
        setPreview(result.preview);
      } else {
        resetLine(); setOffset(0); setReference(""); setReferenceQuery(""); setStatus("PENDING");
        setBatch(result.imported ? result.batchId || "" : ""); setReload(r => r + 1);
        setFile(undefined); setPreview(undefined); setShowUpload(false);
        toast.success(`${count(result.imported ?? 0)} rows imported · ${count(result.duplicates ?? 0)} duplicates skipped`);
      }
    } catch (e) { setError(err(e)); }
    finally { setBusy(false); }
  }

  const draft = Object.values(split).filter(row => row.value.trim() && parseReceiptMoney(row.value) !== 0);
  const allocations = draft.map(row => ({ documentId: row.invoice.sourceId, amount: parseReceiptMoney(row.value) }));
  const applied = allocations.reduce((sum, row) => sum + moneyMinor(row.amount), 0);
  const remaining = moneyMinor(detail?.line.amount ?? 0) - applied;
  const invalid = draft.some(row => !Number.isFinite(parseReceiptMoney(row.value)) ||
    moneyMinor(parseReceiptMoney(row.value)) > moneyMinor(row.invoice.openAmount));
  const ready = canPost && (receipt || (customer && !invalid && remaining >= 0 &&
    (remaining === 0 || keepOnAccount) && (allocations.length < 2 || canPropose))) &&
    (!detail?.mpesa || reviewNote.trim()) && !detail?.route?.conflict;

  async function confirm() {
    if (!detail || !ready || busy) return;
    setBusy(true); setError("");
    try {
      const result = await confirmArStatement(detail.line._id, {
        ...(receipt ? { paymentId: receipt.candidateId } : { partyId: customer?.id, allocations, keepOnAccount }), reviewNote,
      });
      resetSplit(); setReload(r => r + 1);
      if (result.proposalId) toast.success("Split sent for independent approval.");
      else { onSaved(); toast.success("Statement matched."); }
    } catch (e) { setError(err(e)); }
    finally { setBusy(false); }
  }

  async function advance(id: string, action: "approve" | "post") {
    setBusy(true); setError("");
    try {
      await advanceBankAllocationProposalApi(id, action);
      if (action === "post") onSaved();
      setReload(r => r + 1);
      toast.success(action === "post" ? "Receipt posted and matched." : "Split approved. A separate user can post it.");
    } catch (e) { setError(err(e)); }
    finally { setBusy(false); }
  }

  const errors = error && <p className="rounded-md border border-destructive/50 p-3 text-sm text-destructive" role="alert">{error}</p>;
  return (
    <Sheet open onOpenChange={open => { if (!open && !busy) onClose(); }}>
      <SheetContent side="right" ref={setContainer} className="flex w-full flex-col gap-0 p-0 sm:w-[min(100%,76rem)]">
        <SheetHeader className="border-b px-5 py-4 pr-10 text-left">
          <SheetTitle>Statements & matching</SheetTitle>
          <SheetDescription>Import bank or M-Pesa transactions, then link them to a recorded receipt or apply them to open invoices.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          <div className="grid gap-3 border-b p-4 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-end">
            <label className="space-y-1 text-sm"><span>Statement type</span>
              <select className={selectClass} value={channel} disabled={busy} onChange={e => {
                setChannel(e.target.value as StatementChannel); setAccountId(""); setFile(undefined); setPreview(undefined);
                setBatch(""); setOffset(0); resetLine();
              }}><option value="BANK">Bank</option><option value="MPESA">M-Pesa</option></select>
            </label>
            <label className="space-y-1 text-sm"><span>Receiving account</span>
              <select className={selectClass} value={accountKey} disabled={busy} onChange={e => {
                setAccountId(e.target.value); setFile(undefined); setPreview(undefined); setBatch(""); setOffset(0); resetLine();
              }}>
                {!accountKey && <option value="">Select an account</option>}
                {visibleAccounts.map(a => <option key={a.id} value={a.id}>{a.name} · {a.currency}{a.active ? "" : " (inactive)"}</option>)}
              </select>
            </label>
            {canUpload && <Button variant="outline" disabled={!account?.active || busy} onClick={() => { setShowUpload(v => !v); setError(""); }}>
              {showUpload ? "Hide upload" : "Upload statement"}
            </Button>}
            {!visibleAccounts.length && <p className="text-sm text-muted-foreground sm:col-span-3">No {channel === "MPESA" ? "M-Pesa" : "bank"} account is configured.</p>}
          </div>
          {showUpload && <section className="space-y-3 border-b bg-muted/30 p-4" aria-label="Upload statement">
            <p className="text-sm text-muted-foreground">Use a CSV export from your bank or M-Pesa merchant account. The preview checks the file; import adds rows to the review queue.</p>
            <Input aria-label="Statement CSV file" type="file" accept=".csv,.txt,text/csv,text/plain" disabled={busy} onChange={e => {
              setFile(e.target.files?.[0]); setPreview(undefined); setError("");
            }} />
            {preview && <p className="text-sm" role="status">
              {count(preview.rows)} rows · {count(preview.customerLines)} customer credits · {count(preview.otherLines)} other movements · {formatNairobiDate(preview.firstDate)} to {formatNairobiDate(preview.lastDate)}
            </p>}
            {errors}
            <div className="flex gap-2">
              <Button variant="outline" disabled={busy || !file} onClick={() => void upload(true)}>{busy ? "Working…" : "Preview file"}</Button>
              <Button disabled={busy || !preview} onClick={() => void upload(false)}>Import for review</Button>
            </div>
          </section>}
          <div className="grid min-h-[32rem] lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)]">
            <section className="min-w-0 space-y-3 border-b p-4 lg:border-b-0 lg:border-r" aria-label="Statement transactions">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">Transactions</h3>
                {batch && <Button size="sm" variant="ghost" disabled={busy} onClick={() => { setBatch(""); setOffset(0); resetLine(); }}>Show all uploads</Button>}
              </div>
              {batch && <p className="text-xs text-muted-foreground">Showing the file you just imported</p>}
              <div className="flex gap-2" aria-label="Transaction status">
                {[["PENDING", "Unmatched"], ["MATCHED", "Matched"]].map(([key, name]) =>
                  <Button size="sm" key={key} variant={key === status ? "default" : "outline"} aria-pressed={key === status}
                    disabled={busy} onClick={() => { setStatus(key); setOffset(0); resetLine(); }}>{name}</Button>)}
              </div>
              <Input aria-label="Search statement reference" value={reference} placeholder="Search transaction reference…" disabled={busy} onChange={e => setReference(e.target.value)} />
              {listError && <p className="text-sm text-destructive" role="alert">{listError}</p>}
              {accountKey && !listError && !lines && <p className="text-sm text-muted-foreground" role="status">Loading transactions…</p>}
              {lines && !lines.items.length && <p className="text-sm text-muted-foreground">No transactions here.</p>}
              <div className="max-h-[55vh] divide-y overflow-y-auto rounded-md border">
                {lines?.items.map(line => <button key={line._id} type="button" disabled={busy} aria-pressed={lineId === line._id}
                  className={`block w-full px-3 py-2.5 text-left text-sm hover:bg-muted ${lineId === line._id ? "bg-muted ring-1 ring-inset ring-ring" : ""}`}
                  onClick={() => { resetLine(); setLineId(line._id); }}>
                  <span className="flex justify-between gap-3"><span className="truncate font-medium">{label(line)}</span><span className="shrink-0 tabular-nums">{money(line.amount)}</span></span>
                  <span className="block truncate text-xs text-muted-foreground">{formatNairobiDate(line.statementDate)}{line.tillNumber ? ` · Till ${line.tillNumber}` : ""}{!line.eligible ? " · Other movement" : ""}</span>
                </button>)}
              </div>
              {lines && (offset > 0 || lines.hasMore) && <div className="flex justify-between">
                <Button size="sm" variant="outline" disabled={busy || offset === 0} onClick={() => setOffset(o => o - STATEMENT_PAGE_SIZE)}>Previous</Button>
                <Button size="sm" variant="outline" disabled={busy || !lines.hasMore} onClick={() => setOffset(o => o + STATEMENT_PAGE_SIZE)}>Next</Button>
              </div>}
            </section>
            <section className="min-w-0 space-y-4 p-4 sm:p-5" aria-label="Match review">
              {!showUpload && errors}
              {!lineId && <p className="text-sm text-muted-foreground">Select a transaction to review its match.</p>}
              {lineId && !detail && !error && <p className="text-sm text-muted-foreground" role="status">Looking for matches…</p>}
              {detail && <>
                <div className="rounded-md border p-3">
                  <div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{label(detail.line)}</h3><span className="font-semibold tabular-nums">{money(detail.line.amount)}</span></div>
                  <p className="text-sm text-muted-foreground">{formatActivityExact(detail.line.statementDate)}{detail.tillNumber ? ` · Till ${detail.tillNumber}` : ""}</p>
                  {detail.line.description && detail.line.description !== label(detail.line) && <p className="mt-1 break-words text-sm">{detail.line.description}</p>}
                </div>
                {detail.route && <div className="rounded-md border bg-muted/30 p-3 text-sm">
                  <p className="font-medium">Route collection · {detail.route.partyName}</p>
                  <p className="text-muted-foreground">{detail.route.invoiceHint ? `Invoice noted by the route team: ${detail.route.invoiceHint}` : "No invoice was noted. Select any open invoice for this customer."}</p>
                  {detail.route.conflict && <p className="pt-1 text-destructive" role="alert">{detail.route.conflict}</p>}
                </div>}
                {detail.line.status === "MATCHED" ? <p className="text-sm" role="status">Matched{detail.receiptNumber ? ` to receipt ${detail.receiptNumber}` : ""}.</p>
                  : !detail.eligible ? <p className="text-sm text-muted-foreground">Review this movement in <Link className="underline" href="/finance/bank-recon">Bank Reconciliation</Link>.</p>
                  : detail.proposals.length ? detail.proposals.map(p => {
                    const pending = p.status === "SUGGESTED";
                    const canAdvance = userId && userId !== p.suggestedBy && userId !== p.approvedBy && (pending ? canApprove : canPropose);
                    return <div key={p._id} className="space-y-2 rounded-md border p-3 text-sm">
                      <p className="font-semibold">{pending ? "Awaiting independent approval" : "Approved · awaiting posting"}</p>
                      {p.allocations.map(a => <p key={a.documentId} className="flex justify-between gap-2"><span>{a.number || a.documentId}</span><span>{money(a.amount)}</span></p>)}
                      <p className="flex justify-between gap-2"><span>Keep on account</span><span>{money(detail.line.amount - p.allocations.reduce((sum, a) => sum + a.amount, 0))}</span></p>
                      {p.rationale && <p className="text-muted-foreground">{p.rationale}</p>}
                      {canAdvance && <Button disabled={busy} onClick={() => void advance(p._id, pending ? "approve" : "post")}>{pending ? "Approve split" : "Post approved receipt"}</Button>}
                    </div>;
                  }) : reviewing ? <div className="space-y-3 rounded-md border p-4">
                    <h3 className="font-semibold">{receipt ? "Review existing receipt match" : "Review new receipt"}</h3>
                    {receipt ? <p className="text-sm">{receipt.candidateNumber || "Receipt"} · {receipt.partyName || "Customer"} · {money(receipt.openAmount)}</p>
                      : <div className="space-y-1 text-sm">
                        <p className="font-medium">{customer?.label}</p>
                        {draft.map(row => <p key={row.invoice.sourceId} className="flex justify-between gap-2"><span>{row.invoice.sourceNumber || row.invoice.sourceId}</span><span>{money(parseReceiptMoney(row.value))}</span></p>)}
                        <p className="flex justify-between gap-2 border-t pt-2"><span>Keep on account</span><span>{money(remaining / 100)}</span></p>
                      </div>}
                    {reviewNote && <p className="text-sm text-muted-foreground">{reviewNote}</p>}
                    <p className="text-sm text-muted-foreground">{allocations.length > 1 ? "An independent reviewer must approve this split before another user posts it." :
                      receipt ? "This links the statement line to the receipt already in the ERP." : "This records a new customer receipt and matches the statement line."}</p>
                    <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={() => setReviewing(false)}>Back to edit</Button>
                      <Button disabled={busy || !ready} onClick={() => void confirm()}>{busy ? "Confirming…" : allocations.length > 1 ? "Send for approval" : "Confirm match"}</Button></div>
                  </div> : <>
                    {detail.suggestions.length > 0 && <div className="space-y-2">
                      <h3 className="font-semibold">Suggested matches</h3>
                      {detail.suggestions.slice(0, 8).map(s => <button type="button" key={s.candidateId} disabled={busy || !canPost || (s.candidateType === "invoice" && !s.partyId)}
                        aria-pressed={receipt?.candidateId === s.candidateId}
                        className={`flex w-full items-center justify-between gap-2 rounded-md border p-2.5 text-left text-sm hover:bg-muted disabled:opacity-70 ${receipt?.candidateId === s.candidateId ? "bg-muted ring-1 ring-ring" : ""}`}
                        onClick={() => {
                          resetSplit();
                          if (s.candidateType === "payment") setReceipt(s);
                          else if (s.partyId) {
                            setCustomer({ id: s.partyId, label: s.partyName || s.partyId });
                            setSearch(s.candidateNumber || ""); setInvoiceOffset(0);
                            const amount = Math.min(s.openAmount, detail.line.amount);
                            setSplit({ [s.candidateId]: {
                              invoice: { sourceId: s.candidateId, sourceNumber: s.candidateNumber,
                                sourceDate: "", openAmount: s.openAmount },
                              value: groupReceiptMoney(String(amount)),
                            } });
                          }
                        }}>
                        <span><span className="block font-medium">{s.candidateType === "payment" ? "Recorded receipt" : "Open invoice"} · {s.candidateNumber || s.candidateId}</span>
                          <span className="text-xs text-muted-foreground">{s.partyName}{s.signals.length ? ` · ${s.signals.map(signal => signal.label).join(", ")}` : ""}</span></span>
                        <span className="shrink-0 tabular-nums">{money(s.openAmount)}</span>
                      </button>)}
                    </div>}
                    {receipt ? <Button variant="outline" size="sm" disabled={busy} onClick={() => setReceipt(undefined)}>Use a new receipt instead</Button> : <>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Customer for new receipt</p>
                        <AsyncSearchableSelect value={customer?.id || ""} selectedOption={customer} onValueChange={() => {}}
                          onOptionSelect={option => { setCustomer(option); setSearch(""); setInvoiceOffset(0); resetSplit(); }}
                          loadOptions={searchArCustomerOptionsApi} disabled={busy || !canPost || Boolean(detail.route)}
                          placeholder="Select customer" searchPlaceholder="Search by name or code" portalContainer={container} />
                      </div>
                      {customer && <>
                        <div className="flex flex-wrap items-end justify-between gap-2">
                          <div><h3 className="font-semibold">Open invoices</h3><p className="text-xs text-muted-foreground">All dates, oldest first</p></div>
                          {detail.route?.invoiceHint && <Button size="sm" variant="outline" onClick={() => { setSearch(detail.route!.invoiceHint!); setInvoiceOffset(0); }}>Find noted invoice</Button>}
                        </div>
                        <Input aria-label="Search invoice number" placeholder="Search invoice number…" value={search} onChange={e => { setSearch(e.target.value); setInvoiceOffset(0); }} />
                        {invoiceError && <p className="text-sm text-destructive" role="alert">{invoiceError}</p>}
                        {!invoices && !invoiceError && <p className="text-sm text-muted-foreground" role="status">Loading open invoices…</p>}
                        {invoices && !invoices.items.length && <p className="text-sm text-muted-foreground">No open invoices found for this search.</p>}
                        <div className="max-h-60 divide-y overflow-y-auto">
                          {invoices?.items.map(invoice => {
                            const value = split[invoice.sourceId]?.value || "";
                            const setValue = (next: string) => { setKeepOnAccount(false); setSplit(prior => ({ ...prior, [invoice.sourceId]: { invoice, value: next } })); };
                            const fillable = Math.min(moneyMinor(invoice.openAmount), remaining + (moneyMinor(parseReceiptMoney(value)) || 0));
                            return <div key={invoice.sourceId} className="grid grid-cols-[minmax(0,1fr)_minmax(5rem,8rem)_auto] items-center gap-2 py-2">
                              <div className="min-w-0 text-sm"><p className="truncate font-medium">{invoice.sourceNumber || invoice.sourceId}</p>
                                <p className="text-xs text-muted-foreground">{formatNairobiDate(invoice.sourceDate)} · {money(invoice.openAmount)} open</p></div>
                              <Input aria-label={`Apply to ${invoice.sourceNumber || invoice.sourceId}`} className="text-right tabular-nums" inputMode="decimal" placeholder="0.00"
                                disabled={busy || !canPost} value={value} onChange={e => setValue(e.target.value)} onBlur={() => { if (groupReceiptMoney(value) !== value) setSplit(prior => ({ ...prior, [invoice.sourceId]: { invoice, value: groupReceiptMoney(value) } })); }} />
                              <Button size="sm" variant="outline" disabled={busy || !canPost || !Number.isFinite(fillable) || fillable <= 0} onClick={() => setValue(groupReceiptMoney(String(fillable / 100)))}>Fill</Button>
                            </div>;
                          })}
                        </div>
                        {invoices && (invoiceOffset > 0 || invoices.hasMore) && <div className="flex justify-between">
                          <Button size="sm" variant="outline" disabled={invoiceOffset === 0} onClick={() => setInvoiceOffset(o => o - STATEMENT_PAGE_SIZE)}>Previous</Button>
                          <Button size="sm" variant="outline" disabled={!invoices.hasMore} onClick={() => setInvoiceOffset(o => o + STATEMENT_PAGE_SIZE)}>Next</Button>
                        </div>}
                        {draft.length > 0 && <ul className="space-y-1 text-sm" aria-label="Selected invoices">{draft.map(row => <li key={row.invoice.sourceId} className="flex items-center justify-between gap-2">
                          <span className="truncate">{row.invoice.sourceNumber || row.invoice.sourceId}</span><div className="flex items-center gap-2">
                            <span>{Number.isFinite(parseReceiptMoney(row.value)) ? money(parseReceiptMoney(row.value)) : "Invalid amount"}</span>
                            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => { setKeepOnAccount(false); setSplit(prior => { const next = { ...prior }; delete next[row.invoice.sourceId]; return next; }); }}>Remove</Button>
                          </div></li>)}</ul>}
                        <p className="flex flex-wrap gap-x-4 text-sm tabular-nums" role="status">
                          <span>Applied: {Number.isFinite(applied) ? money(applied / 100) : "—"}</span>
                          <span>{remaining < 0 ? "Over by" : "Unapplied"}: {Number.isFinite(remaining) ? money(Math.abs(remaining) / 100) : "—"}</span>
                        </p>
                        {invalid && <p className="text-sm text-destructive">Enter valid amounts within each invoice’s open balance.</p>}
                        {remaining > 0 && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={keepOnAccount} disabled={!canPost || busy} onChange={e => setKeepOnAccount(e.target.checked)} />Keep {money(remaining / 100)} on this customer’s account</label>}
                        {allocations.length > 1 && !canPropose && <p className="text-sm text-muted-foreground">Finance write access is needed to submit a split across invoices.</p>}
                      </>}
                    </>}
                    {detail.mpesa && <label className="block space-y-1 text-sm"><span>What did you verify on the M-Pesa statement?</span>
                      <Input value={reviewNote} maxLength={500} disabled={busy || !canPost} placeholder="For example: verified code, amount, and customer." onChange={e => setReviewNote(e.target.value)} />
                    </label>}
                    {canPost ? <Button disabled={busy || !ready} onClick={() => setReviewing(true)}>Review match</Button>
                      : <p className="text-sm text-muted-foreground">You can view the statement. Confirming matches requires reconciliation and receipt permissions.</p>}
                  </>}
                </>}
            </section>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
