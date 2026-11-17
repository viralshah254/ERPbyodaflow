"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AdvicePicker, AdvicePreview } from "@/components/finance/ArReconciliationSheet";
import { DocumentHubUploadButton } from "@/components/documents/DocumentHubUploadButton";
import { AsyncSearchableSelect, type AsyncSearchableSelectOption } from "@/components/ui/async-searchable-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { confirmArChequeBatch, fetchArCheques, previewArChequeBatch } from "@/lib/api/ar-cheque-reconciliation";
import type { BatchCheque, ChequeAllocation, ChequeBatchInput, ChequeBatchPreview } from "@/lib/api/ar-cheque-reconciliation";
import type { CreditAllocation } from "@/lib/api/ar-reconciliation";
import { fetchHubDocument } from "@/lib/api/document-hub";
import { searchArCustomerOptionsApi } from "@/lib/api/payments";
import { groupReceiptMoney, parseReceiptMoney } from "@/lib/ar/receipt-money";
import { todayNairobiYmd } from "@/lib/format/nairobi-datetime";
import { formatMoney } from "@/lib/money";
import { useBaseCurrency } from "@/lib/org/useBaseCurrency";
import type { PaymentRow } from "@/lib/types/ar";
import type { ScannedDocument } from "@/lib/types/document-hub";
import type { BankAccountRow } from "@/lib/types/treasury";

type NewCheque = { key: string; chequeNumber: string; chequeDate: string; amount: string; bankAccountId: string };
type ExistingCheque = { key: string; paymentId: string; label: string; description?: string };
type DraftCheque = NewCheque | ExistingCheque;
type CreditDraft = { key: string; creditNoteId: string; invoiceId: string; amount: string };
const selectClass = "h-9 w-full rounded-md border bg-background px-2 text-sm";
const minor = (amount: number) => Math.round(amount * 100);
const cashKey = (chequeKey: string, invoiceId: string) => JSON.stringify([chequeKey, invoiceId]);

function MoneyField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <Input aria-label={label} inputMode="decimal" placeholder="0.00" value={value}
      className="h-9 text-right tabular-nums"
      onChange={(event) => onChange(event.target.value)}
      onBlur={() => onChange(groupReceiptMoney(value))} />
  );
}

export function ArChequeBatchSheet({ initialPayment, initialAdviceId, bankAccounts, onClose, onSaved }: {
  initialPayment?: PaymentRow;
  initialAdviceId?: string;
  bankAccounts: BankAccountRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const baseCurrency = useBaseCurrency();
  const [customer, setCustomer] = React.useState<AsyncSearchableSelectOption | null>(
    initialPayment ? { id: initialPayment.customerId, label: initialPayment.customerName } : null
  );
  const [currency, setCurrency] = React.useState(initialPayment?.currency || baseCurrency);
  const [postingDate, setPostingDate] = React.useState(todayNairobiYmd);
  const [cheques, setCheques] = React.useState<DraftCheque[]>(initialPayment ? [
    { key: initialPayment.id, paymentId: initialPayment.id, label: [initialPayment.chequeNumber, initialPayment.number].filter(Boolean).join(" · ") },
  ] : []);
  const [advice, setAdvice] = React.useState<ScannedDocument | null>(null);
  const [loadingAdvice, setLoadingAdvice] = React.useState(Boolean(initialAdviceId));
  const [container, setContainer] = React.useState<HTMLDivElement | null>(null);
  const [prepared, setPrepared] = React.useState<{ input: ChequeBatchInput; preview: ChequeBatchPreview }>();
  const [cash, setCash] = React.useState<Record<string, string>>({});
  const [credits, setCredits] = React.useState<CreditDraft[]>([]);
  const [search, setSearch] = React.useState("");
  const [visibleCount, setVisibleCount] = React.useState(50);
  const [requestKey, setRequestKey] = React.useState("");
  const [acknowledged, setAcknowledged] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [saved, setSaved] = React.useState<Array<{ id: string; number: string }>>();
  const adviceRequest = React.useRef(0);
  const lastPreparedInput = React.useRef<ChequeBatchInput | undefined>(undefined);
  const money = (value: number) => formatMoney(value, currency);
  const accounts = bankAccounts.filter((account) => account.active && account.currency === currency);
  const currencies = [...new Set([currency, baseCurrency, ...bankAccounts.map((account) => account.currency)])].sort();

  const selectAdvice = React.useCallback(async (id: string) => {
    const request = ++adviceRequest.current;
    setLoadingAdvice(true);
    setError("");
    try {
      const result = await fetchHubDocument(id);
      if (request !== adviceRequest.current) return;
      if (result.documentType !== "remittance_advice" || result.postedRecord?.id || result.reconciledReceipt?.id) {
        throw new Error("Choose an unused remittance advice.");
      }
      setAdvice(result);
      if (!cheques.length) {
        if (!customer && result.fields.partyId) setCustomer({ id: result.fields.partyId, label: result.fields.partyName || result.fields.partyId });
        if (result.fields.currency) setCurrency(result.fields.currency.toUpperCase());
      }
    } catch (error) {
      if (request === adviceRequest.current) setError((error as Error).message);
    } finally {
      if (request === adviceRequest.current) setLoadingAdvice(false);
    }
  }, [cheques.length, customer]);

  const initialAdviceSelected = React.useRef(false);
  React.useEffect(() => {
    if (initialAdviceId && !initialAdviceSelected.current) {
      initialAdviceSelected.current = true;
      void selectAdvice(initialAdviceId);
    }
  }, [initialAdviceId, selectAdvice]);

  const loadCheques = React.useCallback(async (query: string) => {
    if (!customer) return [];
    const { receipts } = await fetchArCheques(customer.id, currency, query);
    return receipts.filter((row) => !cheques.some((cheque) => "paymentId" in cheque && cheque.paymentId === row.id))
      .map((row) => ({
        id: row.id,
        label: row.chequeNumber ? `Cheque ${row.chequeNumber} · ${row.number}` : row.number,
        description: `${formatMoney(row.available, currency)} available · ${formatMoney(row.amount, currency)} received`,
      }));
  }, [cheques, currency, customer]);

  function updateCheque(key: string, patch: Partial<NewCheque>) {
    setCheques((current) => current.map((row) => row.key === key && !("paymentId" in row) ? { ...row, ...patch } : row));
  }

  async function prepare(keepSplit = false) {
    setError("");
    if (!customer || !advice || !cheques.length || !postingDate) {
      setError("Choose a customer, an advice, and at least one cheque. Enter the receipt date.");
      return;
    }
    const rows: BatchCheque[] = [];
    for (const row of cheques) {
      if ("paymentId" in row) {
        rows.push({ key: row.key, paymentId: row.paymentId });
      } else {
        const amount = parseReceiptMoney(row.amount);
        if (!row.chequeNumber.trim() || !row.bankAccountId || !row.chequeDate || !(amount > 0)) {
          setError("Enter the number, date, bank account, and valid amount for each new cheque.");
          return;
        }
        rows.push({ ...row, amount });
      }
    }
    setBusy(true);
    const input = { partyId: customer.id, currency, adviceId: advice._id, cheques: rows, postingDate };
    try {
      const preview = await previewArChequeBatch(input);
      const previous = lastPreparedInput.current;
      const sameAdvice = previous?.adviceId === input.adviceId && previous.partyId === input.partyId && previous.currency === input.currency;
      if (keepSplit || sameAdvice) {
        const openInvoices = new Set(preview.invoices.map((row) => row.id));
        const openCredits = new Set(preview.credits.map((row) => row.id));
        const currentCheques = new Set(preview.chequeRows.map((row) => row.key));
        const revisedCash = Object.entries(cash).filter(([key]) => {
          const [cheque, invoice] = JSON.parse(key) as [string, string];
          return currentCheques.has(cheque) && openInvoices.has(invoice);
        });
        const revisedCredits = credits.filter((row) => openInvoices.has(row.invoiceId) && openCredits.has(row.creditNoteId));
        if (revisedCash.length !== Object.keys(cash).length || revisedCredits.length !== credits.length) {
          setError("Allocations to items that are no longer open were removed. Review the updated split.");
        }
        setCash(Object.fromEntries(revisedCash));
        setCredits(revisedCredits);
      } else {
        setCash(Object.fromEntries(preview.suggested.allocations.map((row) => [cashKey(row.chequeKey, row.documentId), groupReceiptMoney(String(row.amount))])));
        setCredits(preview.suggested.creditNoteApplications.map((row) => ({
          key: crypto.randomUUID(), creditNoteId: row.creditNoteId, invoiceId: row.invoiceId, amount: groupReceiptMoney(String(row.amount)),
        })));
      }
      setSearch("");
      setVisibleCount(50);
      setRequestKey("");
      setAcknowledged(false);
      lastPreparedInput.current = input;
      setPrepared({ input, preview });
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const preview = prepared?.preview;
  const invoiceById = new Map(preview?.invoices.map((row) => [row.id, row]));
  const chequeByKey = new Map(preview?.chequeRows.map((row) => [row.key, row]));
  const creditById = new Map(preview?.credits.map((row) => [row.id, row]));
  const invoiceApplied = new Map<string, number>();
  const chequeApplied = new Map<string, number>();
  const creditApplied = new Map<string, number>();
  const cashByInvoice = new Map<string, number>();
  const allocations: ChequeAllocation[] = [];
  const creditNoteApplications: CreditAllocation[] = [];
  const creditTargets = new Set<string>();
  let problem = "";
  for (const [key, value] of Object.entries(cash)) {
    const amount = parseReceiptMoney(value);
    if (!Number.isFinite(amount)) {
      problem ||= "Enter valid receipt allocations with up to two decimal places.";
      continue;
    }
    if (amount <= 0) continue;
    const [chequeKey, documentId] = JSON.parse(key) as [string, string];
    const cents = minor(amount);
    chequeApplied.set(chequeKey, (chequeApplied.get(chequeKey) ?? 0) + cents);
    invoiceApplied.set(documentId, (invoiceApplied.get(documentId) ?? 0) + cents);
    cashByInvoice.set(documentId, (cashByInvoice.get(documentId) ?? 0) + cents);
    allocations.push({ chequeKey, documentId, amount });
  }
  for (const row of credits) {
    const amount = parseReceiptMoney(row.amount);
    if (!row.creditNoteId || !row.invoiceId || !(amount > 0)) {
      problem ||= "Complete or remove each credit note allocation.";
      continue;
    }
    const pair = JSON.stringify([row.creditNoteId, row.invoiceId]);
    if (creditTargets.has(pair)) problem ||= "Combine repeated allocations of a credit note to the same invoice.";
    creditTargets.add(pair);
    const cents = minor(amount);
    creditApplied.set(row.creditNoteId, (creditApplied.get(row.creditNoteId) ?? 0) + cents);
    invoiceApplied.set(row.invoiceId, (invoiceApplied.get(row.invoiceId) ?? 0) + cents);
    creditNoteApplications.push({ creditNoteId: row.creditNoteId, invoiceId: row.invoiceId, amount });
  }
  if (preview?.chequeRows.some((row) => (chequeApplied.get(row.key) ?? 0) > minor(row.available))) problem ||= "An allocation exceeds a cheque’s available balance.";
  if (preview?.invoices.some((row) => (invoiceApplied.get(row.id) ?? 0) > minor(row.outstanding))) problem ||= "The combined allocations exceed an invoice balance.";
  if (preview?.credits.some((row) => (creditApplied.get(row.id) ?? 0) > minor(row.outstanding))) problem ||= "An allocation exceeds the available credit note balance.";
  const totalCash = [...chequeApplied.values()].reduce((sum, amount) => sum + amount, 0);
  const totalCredit = [...creditApplied.values()].reduce((sum, amount) => sum + amount, 0);
  const totalAvailable = preview?.chequeRows.reduce((sum, row) => sum + minor(row.available), 0) ?? 0;
  const targets = new Map(preview?.suggested.targets.map((row) => [row.documentId, row.amount]));
  const creditSuggestions = preview?.suggested.creditNoteApplications ?? [];
  const differs = (targets.size > 0 && (targets.size !== cashByInvoice.size || [...targets].some(([id, amount]) => cashByInvoice.get(id) !== minor(amount)) ||
    preview?.suggested.allocations.some((row) => !allocations.some((actual) =>
      actual.chequeKey === row.chequeKey && actual.documentId === row.documentId && actual.amount === row.amount)))) ||
    (creditSuggestions.length > 0 && (creditSuggestions.length !== creditNoteApplications.length ||
      creditSuggestions.some((row) => !creditNoteApplications.some((actual) =>
        actual.creditNoteId === row.creditNoteId && actual.invoiceId === row.invoiceId && actual.amount === row.amount))));
  const issues = [...(preview?.suggested.issues ?? []), ...(differs ? ["The reviewed allocations differ from the advice suggestions."] : [])];
  const filtered = (preview?.invoices ?? []).filter((row) => row.number.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => Number(targets.has(b.id)) - Number(targets.has(a.id)));
  const chequeLabel = (key: string) => chequeByKey.get(key)?.chequeNumber
    ? `Cheque ${chequeByKey.get(key)!.chequeNumber}` : chequeByKey.get(key)?.receiptNumber || "Cheque";

  async function confirm() {
    if (!prepared || !requestKey || busy || problem || (issues.length > 0 && !acknowledged)) return;
    setBusy(true);
    setError("");
    try {
      const result = await confirmArChequeBatch({
        ...prepared.input, snapshot: prepared.preview.snapshot, requestKey, acknowledgeIssues: acknowledged,
        allocations, creditNoteApplications,
      });
      setSaved(result.receipts);
      onSaved();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <SheetContent ref={setContainer} side="right" className="flex w-full flex-col gap-0 p-0 sm:w-[min(100%,80rem)]">
        <SheetHeader className="border-b px-5 py-4 pr-12 text-left">
          <SheetTitle>Record &amp; reconcile cheques</SheetTitle>
          <SheetDescription>{customer ? `${customer.label} · ${currency}` : "Review new and existing cheques against one remittance advice."}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-auto">
          {saved ? (
            <section className="mx-auto max-w-3xl space-y-4 p-5" aria-label="Confirmation">
              <h2 className="text-lg font-semibold">Reconciliation confirmed</h2>
              <ul className="divide-y rounded-md border">
                {saved.map((receipt, index) => {
                  const row = preview?.chequeRows[index];
                  return <li key={receipt.id} className="flex flex-wrap justify-between gap-2 p-3 text-sm"><span>{row ? chequeLabel(row.key) : "Cheque"} · {receipt.number}</span>{row && <span>{money((minor(row.available) - (chequeApplied.get(row.key) ?? 0)) / 100)} on account</span>}</li>;
                })}
              </ul>
            </section>
          ) : !preview ? (
            <div className="grid min-h-full lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <section className="min-w-0 space-y-5 p-5">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_6rem_10rem]">
                  <div className="space-y-1"><label className="text-sm font-medium">Customer</label>
                    <AsyncSearchableSelect value={customer?.id ?? ""} selectedOption={customer} onValueChange={() => {}}
                      onOptionSelect={setCustomer} loadOptions={searchArCustomerOptionsApi} disabled={busy || cheques.length > 0}
                      placeholder="Select customer" searchPlaceholder="Search customer by name or code" portalContainer={container} />
                  </div>
                  <label className="space-y-1 text-sm font-medium"><span>Currency</span><select className={selectClass} value={currency} disabled={busy || cheques.length > 0}
                    onChange={(event) => setCurrency(event.target.value)}>{currencies.map((code) => <option key={code}>{code}</option>)}</select></label>
                  <label className="space-y-1 text-sm font-medium"><span>Receipt date</span><Input type="date" value={postingDate} disabled={busy} onChange={(event) => setPostingDate(event.target.value)} /></label>
                </div>
                <section className="space-y-3" aria-label="Cheques in this batch">
                  <h2 className="font-semibold">Cheques</h2>
                  <div className="flex flex-wrap items-start gap-2">
                    <Button variant="outline" disabled={!customer || busy} onClick={() => setCheques((current) => [...current, {
                      key: crypto.randomUUID(), chequeNumber: "", chequeDate: postingDate, amount: "", bankAccountId: accounts.length === 1 ? accounts[0].id : "",
                    }])}><Plus className="mr-2 size-4" /> Add new cheque</Button>
                    <div className="min-w-48 grow">
                      <AsyncSearchableSelect value="" onValueChange={() => {}}
                        onOptionSelect={(option) => { if (option) setCheques((current) => [...current, { ...option, key: option.id, paymentId: option.id }]); }}
                        loadOptions={loadCheques} disabled={!customer || busy} placeholder="Add existing cheque"
                        searchPlaceholder="Search by cheque or receipt number" portalContainer={container} />
                    </div>
                  </div>
                  {cheques.map((row, index) => (
                    <fieldset key={row.key} disabled={busy} className="space-y-2 rounded-md border p-3">
                      <legend className="px-1 text-sm font-medium">{("paymentId" in row) ? "Existing receipt" : "New cheque"} {index + 1}</legend>
                      <div className="flex items-center justify-between gap-2">
                        {"paymentId" in row
                          ? <div className="text-sm"><p className="font-medium">{row.label}</p>{row.description && <p className="text-muted-foreground">{row.description}</p>}</div>
                          : <label className="min-w-0 flex-1 space-y-1 text-sm"><span>Cheque number</span><Input value={row.chequeNumber} onChange={(event) => updateCheque(row.key, { chequeNumber: event.target.value })} /></label>}
                        <Button variant="ghost" size="sm" aria-label={`Remove cheque ${index + 1}`} onClick={() => setCheques((current) => current.filter((cheque) => cheque.key !== row.key))}>Remove</Button>
                      </div>
                      {!("paymentId" in row) && <div className="grid gap-2 sm:grid-cols-3">
                        <label className="space-y-1 text-sm"><span>Cheque date</span><Input type="date" value={row.chequeDate} onChange={(event) => updateCheque(row.key, { chequeDate: event.target.value })} /></label>
                        <label className="space-y-1 text-sm"><span>Amount</span><MoneyField label={`Amount for new cheque ${index + 1}`} value={row.amount} onChange={(amount) => updateCheque(row.key, { amount })} /></label>
                        <label className="space-y-1 text-sm"><span>Bank account</span><select className={selectClass} value={row.bankAccountId} onChange={(event) => updateCheque(row.key, { bankAccountId: event.target.value })}><option value="">Choose account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
                      </div>}
                    </fieldset>
                  ))}
                </section>
              </section>
              <aside className="space-y-3 border-t bg-muted/20 p-5 lg:border-l lg:border-t-0" aria-label="Remittance advice">
                <h2 className="font-semibold">Remittance advice</h2>
                {loadingAdvice ? <p className="text-sm text-muted-foreground">Loading advice…</p> : advice ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2"><p className="break-all text-sm font-medium">{advice.fileName}</p><Button variant="ghost" size="sm" disabled={busy} onClick={() => setAdvice(null)}>Remove</Button></div>
                    <AdvicePreview file={advice} label="View original advice" />
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <DocumentHubUploadButton label="Upload advice" purpose="remittance_advice" onUploaded={async ({ uploads }) => {
                      const scanned = uploads.flatMap((upload) => upload.items).filter((item) => item.documentType === "remittance_advice");
                      if (scanned.length === 1) await selectAdvice(scanned[0]._id);
                      else if (!scanned.length) setError("Check the document type in Document Hub, then select the advice here.");
                    }} />
                    <AdvicePicker customerId={customer?.id} onSelect={(id) => void selectAdvice(id)} />
                  </div>
                )}
              </aside>
            </div>
          ) : (
            <div className="grid min-h-full lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
              <section className="min-w-0 space-y-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold">{requestKey ? "Review split" : "Invoice split"}</h2>
                  {!requestKey && <Input className="w-48" aria-label="Search invoices" placeholder="Search invoice number" value={search}
                    onChange={(event) => { setSearch(event.target.value); setVisibleCount(50); }} />}
                </div>
                {requestKey ? (
                  <Table><TableHeader><TableRow><TableHead>Source</TableHead><TableHead>Invoice</TableHead><TableHead className="text-right">Applying</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {allocations.map((row) => <TableRow key={cashKey(row.chequeKey, row.documentId)}><TableCell>{chequeLabel(row.chequeKey)}</TableCell><TableCell>{invoiceById.get(row.documentId)?.number}</TableCell><TableCell className="text-right tabular-nums">{money(row.amount)}</TableCell></TableRow>)}
                      {creditNoteApplications.map((row) => <TableRow key={JSON.stringify([row.creditNoteId, row.invoiceId])}><TableCell>{creditById.get(row.creditNoteId)?.number}</TableCell><TableCell>{invoiceById.get(row.invoiceId)?.number}</TableCell><TableCell className="text-right tabular-nums">{money(row.amount)}</TableCell></TableRow>)}
                      {!allocations.length && !creditNoteApplications.length && <TableRow><TableCell colSpan={3}>Leave the cheque balances on account.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                ) : (
                  <>
                    <Table>
                      <TableHeader><TableRow><TableHead>Invoice / open</TableHead><TableHead className="text-right">Advice cash</TableHead>
                        {preview.chequeRows.map((row) => <TableHead key={row.key} className="min-w-28 text-right">{chequeLabel(row.key)}</TableHead>)}
                        <TableHead className="text-right">Open after</TableHead></TableRow></TableHeader>
                      <TableBody>{filtered.slice(0, visibleCount).map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.number}<span className="block whitespace-nowrap text-xs font-normal text-muted-foreground">{money(invoice.outstanding)}</span></TableCell>
                          <TableCell className="whitespace-nowrap text-right tabular-nums">{targets.has(invoice.id) ? money(targets.get(invoice.id)!) : "—"}</TableCell>
                          {preview.chequeRows.map((row) => {
                            const key = cashKey(row.key, invoice.id);
                            return <TableCell key={row.key}><MoneyField label={`${chequeLabel(row.key)} on ${invoice.number}`} value={cash[key] ?? ""}
                              onChange={(value) => setCash((current) => value === (current[key] ?? "") ? current : { ...current, [key]: value })} /></TableCell>;
                          })}
                          <TableCell className="whitespace-nowrap text-right tabular-nums">{money((minor(invoice.outstanding) - (invoiceApplied.get(invoice.id) ?? 0)) / 100)}</TableCell>
                        </TableRow>
                      ))}
                      {!filtered.length && <TableRow><TableCell colSpan={preview.chequeRows.length + 3}>{search ? "No matching invoices." : "No open invoices in this currency."}</TableCell></TableRow>}</TableBody>
                    </Table>
                    {filtered.length > visibleCount && <Button variant="outline" size="sm" onClick={() => setVisibleCount((count) => count + 50)}>Show more invoices</Button>}
                    <section className="space-y-2" aria-label="Credit note allocations">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-medium">Credit note allocations</h3>
                        <Button variant="outline" size="sm" disabled={!preview.credits.length || !preview.invoices.length}
                          onClick={() => setCredits((current) => [...current, { key: crypto.randomUUID(), creditNoteId: "", invoiceId: "", amount: "" }])}>Add credit allocation</Button>
                      </div>
                      {credits.map((row, index) => {
                        const change = (patch: Partial<CreditDraft>) => setCredits((current) => current.map((item) => item.key === row.key ? { ...item, ...patch } : item));
                        return <div key={row.key} className="grid gap-2 rounded-md border p-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem_auto]">
                          <select className={selectClass} aria-label={`Credit note ${index + 1}`} value={row.creditNoteId} onChange={(event) => {
                            const selected = creditById.get(event.target.value);
                            const linked = selected?.sourceInvoiceId;
                            change({ creditNoteId: event.target.value, invoiceId: linked && invoiceById.has(linked) ? linked : row.invoiceId });
                          }}><option value="">Choose credit note</option>{preview.credits.map((credit) => <option key={credit.id} value={credit.id}>{credit.number} · {money(credit.outstanding)}</option>)}</select>
                          <select className={selectClass} aria-label={`Invoice for credit note ${index + 1}`} value={row.invoiceId}
                            onChange={(event) => change({ invoiceId: event.target.value })}><option value="">Choose invoice</option>{preview.invoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.number}</option>)}</select>
                          <MoneyField label={`Amount for credit allocation ${index + 1}`} value={row.amount} onChange={(amount) => change({ amount })} />
                          <Button variant="ghost" size="sm" aria-label={`Remove credit allocation ${index + 1}`} onClick={() => setCredits((current) => current.filter((item) => item.key !== row.key))}>Remove</Button>
                        </div>;
                      })}
                    </section>
                  </>
                )}
              </section>
              <aside className="min-w-0 space-y-4 border-t bg-muted/20 p-5 lg:border-l lg:border-t-0" aria-label="Cheque balances and advice">
                <h2 className="font-semibold">Cheque balances</h2>
                <ul className="space-y-2">
                  {preview.chequeRows.map((row) => {
                    const applying = chequeApplied.get(row.key) ?? 0;
                    return <li key={row.key} className="space-y-2 rounded-md border bg-background p-3 text-sm">
                      <p className="font-medium">{chequeLabel(row.key)} <span className="font-normal text-muted-foreground">· {row.receiptNumber ?? "New receipt"}</span></p>
                      <dl className="grid grid-cols-[1fr_auto] gap-1 tabular-nums">
                        <dt>Face value</dt><dd className="text-right">{money(row.amount)}</dd>
                        <dt>Previously applied</dt><dd className="text-right">{money((minor(row.amount) - minor(row.available)) / 100)}</dd>
                        <dt>Applying now</dt><dd className="text-right">{money(applying / 100)}</dd>
                        <dt className="font-semibold">Unapplied after</dt><dd className="text-right font-semibold">{money((minor(row.available) - applying) / 100)}</dd>
                      </dl>
                    </li>;
                  })}
                </ul>
                <AdvicePreview file={preview.advice} label={`Original advice · ${preview.advice.fileName}`} />
                {preview.advice.remittanceLines.length > 0 && <details className="rounded-md border bg-background p-2 text-sm">
                  <summary>Extracted advice lines</summary>
                  <ul className="divide-y">{preview.advice.remittanceLines.map((row, index) => <li key={index} className="flex justify-between gap-2 py-1">
                    <span>{row.invoiceNumber}{row.chequeNumber && <small className="block text-muted-foreground">Cheque {row.chequeNumber}</small>}</span><span className="tabular-nums">{money(row.paymentAmount)}</span>
                  </li>)}</ul>
                </details>}
                {issues.length > 0 && <div className="space-y-2 rounded-md border bg-background p-3 text-sm">
                  <h3 className="font-medium">Advice review</h3>
                  <ul className="list-disc space-y-1 pl-4">{issues.map((issue, index) => <li key={index}>{issue}</li>)}</ul>
                  {requestKey && <label className="flex items-start gap-2"><input className="mt-1" type="checkbox" checked={acknowledged} disabled={busy}
                    onChange={(event) => setAcknowledged(event.target.checked)} /> I reviewed these differences against the advice.</label>}
                </div>}
              </aside>
            </div>
          )}
        </div>
        <footer className="space-y-2 border-t bg-background px-5 py-3">
          {(error || problem) && !saved && <p className="text-sm text-destructive" role="alert">{error || problem}</p>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm tabular-nums" aria-live="polite">
              {preview && <><span>Payments applied <strong>{money(totalCash / 100)}</strong></span><span>Credits applied <strong>{money(totalCredit / 100)}</strong></span>
                <span>Unapplied <strong>{money((totalAvailable - totalCash) / 100)}</strong></span></>}
            </div>
            <div className="ml-auto flex gap-2">
              {saved ? <Button onClick={onClose}>Done</Button> : requestKey ? <>
                <Button variant="outline" disabled={busy} onClick={() => { setRequestKey(""); setAcknowledged(false); setError(""); }}>Edit split</Button>
                {error && <Button variant="outline" disabled={busy} onClick={() => void prepare(true)}>Reload balances</Button>}
                <Button disabled={busy || Boolean(problem) || (issues.length > 0 && !acknowledged)} onClick={() => void confirm()}>{busy ? "Confirming…" : "Confirm batch"}</Button>
              </> : preview ? <>
                <Button variant="outline" onClick={() => { setPrepared(undefined); setError(""); }}>Edit cheques</Button>
                <Button disabled={Boolean(problem)} onClick={() => { setError(""); setRequestKey(crypto.randomUUID()); }}>Review batch</Button>
              </> : <Button disabled={busy || loadingAdvice} onClick={() => void prepare()}>{busy ? "Preparing…" : "Prepare split"}</Button>}
            </div>
          </div>
        </footer>
      </SheetContent>
    </Sheet>
  );
}
