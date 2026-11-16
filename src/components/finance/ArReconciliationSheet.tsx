"use client";

import * as React from "react";
import { ArrowLeft, FileCheck2, Search } from "lucide-react";
import { toast } from "sonner";
import { DocumentHubPreview } from "@/components/documents/DocumentHubPreview";
import { DocumentHubUploadButton } from "@/components/documents/DocumentHubUploadButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { confirmArReconciliation, fetchArReconciliation, type ArReconciliation } from "@/lib/api/ar-reconciliation";
import { fetchDocumentHub } from "@/lib/api/document-hub";
import type { ScannedDocument } from "@/lib/types/document-hub";
import { formatMoney } from "@/lib/money";

type DraftCredit = { invoiceId: string; amount: string };
const minor = (amount: number) => Math.round(amount * 100);
const validAmount = (amount: string) => amount === "" || /^\d+(\.\d{0,2})?$/.test(amount);
const selectClass = "h-9 w-full rounded-md border bg-background px-2 text-sm";

export function ArReconciliationSheet({ paymentId, initialAdviceId, onClose, onSaved }: {
  paymentId: string;
  initialAdviceId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [data, setData] = React.useState<ArReconciliation>();
  const [adviceId, setAdviceId] = React.useState(initialAdviceId ?? "");
  const [revision, reload] = React.useReducer((value: number) => value + 1, 0);
  const [search, setSearch] = React.useState("");
  const [cash, setCash] = React.useState<Record<string, string>>({});
  const [credit, setCredit] = React.useState<Record<string, DraftCredit>>({});
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState("");
  const [confirmError, setConfirmError] = React.useState("");
  const [reviewKey, setReviewKey] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [acknowledgeIssues, setAcknowledgeIssues] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    setConfirmError("");
    setReviewKey("");
    setAcknowledgeIssues(false);
    fetchArReconciliation(paymentId, adviceId || undefined).then((next) => {
      if (!active) return;
      setData(next);
      setCash(Object.fromEntries(next.suggested.allocations.map((row) => [row.documentId, String(row.amount)])));
      setCredit(Object.fromEntries(next.suggested.creditNoteApplications.map((row) => [
        row.creditNoteId, { invoiceId: row.invoiceId, amount: String(row.amount) },
      ])));
    }).catch((error: Error) => {
      if (active) setLoadError(error.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [paymentId, adviceId, revision]);

  const money = (amount: number) => formatMoney(amount, data?.receipt.currency ?? "KES");
  const allocations = (data?.invoices ?? []).flatMap((row) => Number(cash[row.id]) > 0
    ? [{ documentId: row.id, amount: Number(cash[row.id]) }] : []);
  const creditNoteApplications = (data?.credits ?? []).flatMap((row) => {
    const draft = credit[row.id];
    return draft?.invoiceId && Number(draft.amount) > 0
      ? [{ creditNoteId: row.id, invoiceId: draft.invoiceId, amount: Number(draft.amount) }] : [];
  });
  const credited = new Map<string, number>();
  for (const row of creditNoteApplications) credited.set(row.invoiceId, (credited.get(row.invoiceId) ?? 0) + minor(row.amount));
  const cashApplied = allocations.reduce((sum, row) => sum + minor(row.amount), 0);
  const creditApplied = creditNoteApplications.reduce((sum, row) => sum + minor(row.amount), 0);
  const remaining = minor(data?.receipt.unapplied ?? 0) - cashApplied;
  const amountProblem = Object.values(cash).some((value) => !validAmount(value)) ||
    Object.values(credit).some((value) => !validAmount(value.amount));
  const creditProblem = data?.credits.some((row) => {
    const draft = credit[row.id];
    return draft && Number(draft.amount) > 0 && (!draft.invoiceId || minor(Number(draft.amount)) > minor(row.outstanding));
  });
  const invoiceProblem = data?.invoices.some((row) =>
    minor(Number(cash[row.id] || 0)) + (credited.get(row.id) ?? 0) > minor(row.outstanding));
  const problem = amountProblem ? "Enter positive amounts with up to two decimal places."
    : creditProblem ? "Choose an invoice for each credit amount and stay within the available credit."
    : invoiceProblem ? "The combined payment and credit exceed an invoice balance."
    : remaining < 0 ? "The allocation exceeds the unapplied receipt balance." : "";
  const issues = data?.suggested.issues ?? [];
  const canReview = Boolean(data && (allocations.length || creditNoteApplications.length || data.advice) && !problem);
  const invoices = (data?.invoices ?? []).filter((row) => row.number.toLowerCase().includes(search.trim().toLowerCase()));
  const creditTargets = (data?.invoices ?? []).filter((invoice) => invoice.type === "invoice");
  const creditTargetIds = new Set(creditTargets.map((invoice) => invoice.id));
  const invoiceName = (id: string) => data?.invoices.find((row) => row.id === id)?.number ?? id;

  async function confirm() {
    if (!data || !reviewKey || !canReview || saving || (issues.length > 0 && !acknowledgeIssues)) return;
    setSaving(true);
    setConfirmError("");
    try {
      await confirmArReconciliation(paymentId, {
        adviceId: data.advice?.id, snapshot: data.snapshot, requestKey: reviewKey, acknowledgeIssues,
        allocations, creditNoteApplications,
      });
      toast.success("Reconciliation saved.");
      onSaved();
    } catch (error) {
      setConfirmError((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:w-[min(100%,72rem)]" side="right">
        <SheetHeader className="border-b px-5 py-4 pr-12 text-left">
          <SheetTitle>Reconcile customer payment</SheetTitle>
          <SheetDescription>
            {data ? `${data.receipt.customerName} · ${data.receipt.number} · ${data.receipt.currency}` : "Apply a recorded receipt and credit notes to open invoices."}
          </SheetDescription>
        </SheetHeader>

        {loading ? <p className="p-5 text-sm text-muted-foreground" role="status">Loading customer balances…</p>
          : loadError ? (
            <div className="space-y-3 p-5">
              <p className="text-sm text-destructive" role="alert">{loadError}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={reload}>Retry</Button>
                {adviceId && <Button variant="outline" onClick={() => setAdviceId("")}>Continue without advice</Button>}
              </div>
            </div>
          ) : data && (
            <>
              <div className="min-h-0 flex-1 overflow-auto">
                {reviewKey ? (
                  <section className="mx-auto max-w-3xl space-y-4 p-5" aria-labelledby="allocation-review">
                    <Button variant="ghost" size="sm" disabled={saving} onClick={() => { setReviewKey(""); setConfirmError(""); }}><ArrowLeft className="mr-2 size-4" /> Edit split</Button>
                    <h2 id="allocation-review" className="text-lg font-semibold">Review allocation</h2>
                    {data.advice && <p className="text-sm text-muted-foreground">Remittance evidence · {data.advice.fileName}</p>}
                    <Table>
                      <TableHeader><TableRow><TableHead>Source</TableHead><TableHead>Invoice</TableHead><TableHead className="text-right">Apply</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {allocations.map((row) => <TableRow key={row.documentId}><TableCell>{data.receipt.number}</TableCell><TableCell>{invoiceName(row.documentId)}</TableCell><TableCell className="text-right tabular-nums">{money(row.amount)}</TableCell></TableRow>)}
                        {creditNoteApplications.map((row) => <TableRow key={row.creditNoteId}><TableCell>{data.credits.find((item) => item.id === row.creditNoteId)?.number}</TableCell><TableCell>{invoiceName(row.invoiceId)}</TableCell><TableCell className="text-right tabular-nums">{money(row.amount)}</TableCell></TableRow>)}
                      </TableBody>
                    </Table>
                    {!allocations.length && !creditNoteApplications.length && <p className="text-sm">Link the advice to the receipt. The current balances will be carried forward.</p>}
                    {issues.length > 0 && (
                      <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
                        <h3 className="font-medium">Remittance issues</h3>
                        <ul className="list-disc space-y-1 pl-5">{issues.map((issue, index) => <li key={index}>{issue}</li>)}</ul>
                        <label className="flex items-start gap-2 pt-1">
                          <input type="checkbox" className="mt-1" checked={acknowledgeIssues} disabled={saving} onChange={(event) => setAcknowledgeIssues(event.target.checked)} />
                          I reviewed these issues against the original advice.
                        </label>
                      </div>
                    )}
                  </section>
                ) : (
                  <div className="grid min-h-full lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
                    <section className="min-w-0 space-y-3 px-5 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="font-semibold">Customer open invoices</h2>
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" aria-hidden="true" />
                          <Input aria-label="Search invoices" placeholder="Search invoices" value={search} onChange={(event) => setSearch(event.target.value)} className="h-9 pl-9" />
                        </div>
                      </div>
                      {data.suggested.allocations.length > 0 && <p className="text-sm text-muted-foreground">Suggested split · {data.suggestionReason}</p>}
                      <Table>
                        <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead className="text-right">Open</TableHead><TableHead className="text-right">Credits</TableHead><TableHead className="text-right">Apply receipt</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {invoices.map((row) => (
                            <TableRow key={row.id}>
                              <TableCell className="font-medium">{row.number}<span className="block text-xs font-normal text-muted-foreground">{(row.dueDate || row.date).slice(0, 10)}</span></TableCell>
                              <TableCell className="text-right tabular-nums">{money(row.outstanding)}</TableCell>
                              <TableCell className="text-right tabular-nums">{credited.has(row.id) ? money((credited.get(row.id) ?? 0) / 100) : "—"}</TableCell>
                              <TableCell><Input aria-label={`Receipt amount for ${row.number}`} inputMode="decimal" className="ml-auto h-8 w-28 text-right tabular-nums" placeholder="0.00" value={cash[row.id] ?? ""} onChange={(event) => setCash({ ...cash, [row.id]: event.target.value })} /></TableCell>
                            </TableRow>
                          ))}
                          {!invoices.length && <TableRow><TableCell colSpan={4} className="text-muted-foreground">{search ? "No matching invoices." : "No open items in this receipt’s currency."}</TableCell></TableRow>}
                        </TableBody>
                      </Table>
                    </section>

                    <aside className="min-w-0 space-y-5 border-t bg-muted/20 px-5 py-4 lg:border-l lg:border-t-0">
                      <section aria-label="Receipt">
                        <h2 className="font-semibold">Receipt and credits</h2>
                        <div className="mt-2 flex flex-wrap items-start justify-between gap-2 rounded-md border bg-background p-3 text-sm">
                          <div><p className="font-medium">{data.receipt.chequeNumber ? `Cheque ${data.receipt.chequeNumber}` : data.receipt.number}</p><p className="text-muted-foreground">{data.receipt.date.slice(0, 10)}{data.receipt.reference ? ` · ${data.receipt.reference}` : ""}</p></div>
                          <div className="text-right tabular-nums"><p className="font-medium">{money(data.receipt.amount)}</p><p className="text-muted-foreground">{money(data.receipt.unapplied)} available</p></div>
                        </div>
                      </section>
                      <section className="space-y-2" aria-label="Open credit notes">
                        <h3 className="text-sm font-semibold">Open credit notes</h3>
                        {!data.credits.length && <p className="text-sm text-muted-foreground">No open credits in this currency.</p>}
                        {data.credits.map((row) => {
                          const sourceInvoiceId = row.sourceInvoiceId && creditTargetIds.has(row.sourceInvoiceId) ? row.sourceInvoiceId : "";
                          const draft = credit[row.id] ?? { invoiceId: sourceInvoiceId, amount: "" };
                          return (
                            <div key={row.id} className="space-y-2 rounded-md border bg-background p-2 text-sm">
                              <div className="flex flex-wrap justify-between gap-1"><span className="font-medium">{row.number}</span><span className="tabular-nums">{money(row.outstanding)} available</span></div>
                              <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-2">
                                <select className={selectClass} aria-label={`Invoice for ${row.number}`} value={draft.invoiceId} onChange={(event) => setCredit({ ...credit, [row.id]: { ...draft, invoiceId: event.target.value } })}>
                                  <option value="">Choose invoice</option>
                                  {creditTargets.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.number}</option>)}
                                </select>
                                <Input inputMode="decimal" className="h-9 text-right tabular-nums" aria-label={`Credit amount for ${row.number}`} placeholder="0.00" value={draft.amount} onChange={(event) => setCredit({ ...credit, [row.id]: { ...draft, amount: event.target.value } })} />
                              </div>
                            </div>
                          );
                        })}
                      </section>
                      <section className="space-y-2" aria-label="Remittance advice">
                        <h3 className="flex items-center gap-2 text-sm font-semibold"><FileCheck2 className="size-4" aria-hidden="true" /> Remittance advice</h3>
                        {data.linkedAdvice.map((file) => <AdvicePreview key={file._id} file={file} label={`Linked · ${file.fileName}`} />)}
                        {data.advice ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2"><span className="break-all text-sm font-medium">{data.advice.fileName}</span><Button variant="ghost" size="sm" onClick={() => setAdviceId("")}>Remove</Button></div>
                            <p className="text-sm text-muted-foreground">
                              {[data.advice.partyName, data.advice.paymentReference,
                                data.advice.total != null ? `Advice total ${money(data.advice.total)}` : null].filter(Boolean).join(" · ")}
                            </p>
                            <AdvicePreview file={data.advice} label="View original advice" />
                            {data.advice.remittanceLines.length > 0 && (
                              <details open className="rounded-md border bg-background p-2 text-sm">
                                <summary>Extracted lines</summary>
                                <ul className="mt-2 divide-y">
                                  {data.advice.remittanceLines.map((row, index) => <li key={index} className="flex justify-between gap-2 py-1"><span>{row.invoiceNumber} <span className="text-xs text-muted-foreground">{row.kind.replaceAll("_", " ")}</span></span><span className="tabular-nums">{money(row.paymentAmount)}</span></li>)}
                                </ul>
                              </details>
                            )}
                            {issues.length > 0 && <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{issues.map((issue, index) => <li key={index}>{issue}</li>)}</ul>}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <DocumentHubUploadButton label="Upload advice" purpose="remittance_advice" onUploaded={({ uploads }) => {
                              const advice = uploads.flatMap((upload) => upload.items)
                                .filter((item) => item.documentType === "remittance_advice");
                              if (advice.length === 1) setAdviceId(advice[0]._id);
                              else if (advice.length === 0) toast.info("Check the document type in Document Hub, then select the advice here.");
                            }} />
                            <AdvicePicker customerId={data.receipt.customerId} onSelect={setAdviceId} />
                          </div>
                        )}
                      </section>
                    </aside>
                  </div>
                )}
              </div>
              <div className="space-y-2 border-t bg-background px-5 py-3">
                {problem && <p className="text-sm text-destructive" role="alert">{problem}</p>}
                {confirmError && <p className="text-sm text-destructive" role="alert">{confirmError}</p>}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm tabular-nums" aria-live="polite">
                    <div><dt className="text-muted-foreground">Receipt applied</dt><dd className="font-semibold">{money(cashApplied / 100)}</dd></div>
                    <div><dt className="text-muted-foreground">Credits applied</dt><dd className="font-semibold">{money(creditApplied / 100)}</dd></div>
                    <div><dt className="text-muted-foreground">Receipt unapplied</dt><dd className="font-semibold">{money(remaining / 100)}</dd></div>
                  </dl>
                  <div className="flex flex-wrap gap-2">
                    {confirmError && <Button variant="outline" onClick={reload}>Reload balances</Button>}
                    {reviewKey
                      ? <Button disabled={saving || (issues.length > 0 && !acknowledgeIssues)} onClick={() => void confirm()}>{saving ? "Confirming…" : "Confirm reconciliation"}</Button>
                      : <Button disabled={!canReview} onClick={() => setReviewKey(crypto.randomUUID())}>Review allocation</Button>}
                  </div>
                </div>
              </div>
            </>
          )}
      </SheetContent>
    </Sheet>
  );
}

export function AdvicePreview({ file, label }: {
  file: { fileId: string; fileName: string; contentType?: string };
  label: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <details className="rounded-md border bg-background p-2 text-sm" onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>{label}</summary>
      {open && <div className="mt-2"><DocumentHubPreview {...file} /></div>}
    </details>
  );
}

export function AdvicePicker({ customerId, onSelect }: { customerId?: string; onSelect: (id: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<ScannedDocument[]>([]);
  const [status, setStatus] = React.useState("");
  React.useEffect(() => {
    if (!open) return;
    let active = true;
    setStatus("Searching Document Hub…");
    setResults([]);
    const timer = window.setTimeout(() => {
      fetchDocumentHub({ documentType: "remittance_advice", q: query.trim() || undefined }).then(({ items }) => {
        if (!active) return;
        const available = items.filter((item) => !item.postedRecord?.id && !item.reconciledReceipt?.id &&
          (!customerId || !item.fields.partyId || item.fields.partyId === customerId));
        setResults(available);
        setStatus(available.length ? "" : "No available advice found. Upload the advice in Document Hub.");
      }).catch((error: Error) => { if (active) setStatus(error.message); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [customerId, open, query]);

  if (!open) return <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Choose remittance advice</Button>;
  return (
    <div className="space-y-2">
      <Input aria-label="Search remittance advice" placeholder="Search Document Hub" value={query} onChange={(event) => setQuery(event.target.value)} />
      {status && <p className="text-sm text-muted-foreground" role="status">{status}</p>}
      {results.length > 0 && (
        <ul className="max-h-48 divide-y overflow-auto rounded-md border bg-background">
          {results.map((item) => <li className="p-1" key={item._id}><Button className="h-auto w-full justify-start whitespace-normal text-left" variant="ghost" size="sm" onClick={() => onSelect(item._id)}>{item.fileName}{item.fields.partyName ? ` · ${item.fields.partyName}` : ""}</Button></li>)}
        </ul>
      )}
    </div>
  );
}
