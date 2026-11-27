"use client";

import * as React from "react";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AsyncSearchableSelect } from "@/components/ui/async-searchable-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  fetchApReceiptItemsApi,
  fetchArOpenItemsApi,
  previewApSettlementApi,
  previewArSettlementApi,
  searchApSupplierOptionsApi,
  searchReceiptCustomerOptionsApi,
} from "@/lib/api/payments";
import type { PartyLookupOption } from "@/lib/api/parties";
import { creditUsed, roundMoney, scaleCreditNote, sumAmounts } from "@/lib/ar/settlement-edit";
import { groupReceiptMoney, parseReceiptMoney } from "@/lib/ar/receipt-money";
import {
  PAYMENT_METHODS,
  batchClaims,
  clampCreditApplications,
  documentsNamedIn,
  likelyDuplicate,
  needsBankAccount,
  planSettlement,
  sortByDue,
  tiedProblem,
  withoutClaims,
  type BatchLine,
  type PaymentMethod,
  type SettlementSide,
} from "@/lib/finance/settlement-batch";
import { formatMoney } from "@/lib/money";
import type { ArOpenItem, CreditNoteApplicationLine, SettlementPreview } from "@/lib/types/ar";
import { cn } from "@/lib/utils";

export type EntryDefaults = {
  date: string;
  method: PaymentMethod;
  bankAccountId: string;
  chequeDate: string;
};

export type EntryPrefill = {
  partyId: string;
  partyName: string;
  documentNumber?: string;
  amount?: number;
};

type SideCopy = {
  party: string;
  doc: string;
  docs: string;
  amountLabel: string;
  dateLabel: string;
  newTitle: string;
  newHint: string;
  bankLabel: string;
  leftLabel: string;
  owingLabel: string;
  owesVerb: string;
  browseLabel?: string;
  loadParties: (search?: string) => Promise<PartyLookupOption[]>;
  loadItems: (partyId: string) => Promise<{ invoices: ArOpenItem[]; creditNotes: ArOpenItem[] }>;
  preview: (body: { partyId: string; amount: number }) => Promise<SettlementPreview>;
};

const SIDES: Record<SettlementSide, SideCopy> = {
  AR: {
    party: "customer",
    doc: "invoice",
    docs: "invoices",
    amountLabel: "Amount received",
    dateLabel: "Date received",
    newTitle: "Add a receipt",
    newHint: "One customer per receipt. Add it to the list, then move to the next customer.",
    bankLabel: "Bank account",
    leftLabel: "Left on account",
    owingLabel: "Still owing after",
    owesVerb: "Owes",
    browseLabel: "Owing",
    loadParties: searchReceiptCustomerOptionsApi,
    loadItems: fetchArOpenItemsApi,
    preview: previewArSettlementApi,
  },
  AP: {
    party: "supplier",
    doc: "bill",
    docs: "bills",
    amountLabel: "Amount paid",
    dateLabel: "Date paid",
    newTitle: "Add a payment",
    newHint: "One supplier per payment. Add it to the list, then move to the next supplier.",
    bankLabel: "Pay from bank account",
    leftLabel: "Advance to supplier",
    owingLabel: "Still owed after",
    owesVerb: "We owe",
    loadParties: searchApSupplierOptionsApi,
    loadItems: async (partyId) => {
      const items = await fetchApReceiptItemsApi(partyId);
      return { invoices: sortByDue(items.invoices), creditNotes: items.creditNotes };
    },
    preview: previewApSettlementApi,
  },
};

/** AR money not on an invoice is spread by the server; AP money not on a bill stays as an advance. */
export function spreadsRemainder(side: SettlementSide, suggesting: boolean): boolean {
  return side === "AR" || suggesting;
}

const PARTY_FIELD_ID = "settlement-entry-party";
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function shortDate(value?: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? "");
  const month = match ? SHORT_MONTHS[Number(match[2]) - 1] : undefined;
  return match && month ? `${Number(match[3])} ${month} ${match[1]}` : "";
}

function documentWhen(item: ArOpenItem): string {
  const issued = shortDate(item.date);
  const due = shortDate(item.dueDate);
  if (issued && due && due !== issued) return `${issued} · due ${due}`;
  return issued || (due ? `Due ${due}` : "");
}

const money = (value: number) => formatMoney(value, "KES");
const plural = (count: number, word: string, words: string) => `${count} ${count === 1 ? word : words}`;

export function focusEntryParty() {
  window.setTimeout(() => {
    const field = document.getElementById(PARTY_FIELD_ID);
    ((field?.querySelector("button, input") as HTMLElement | null) ?? field)?.focus();
  }, 0);
}

export function SettlementEntryForm({
  side,
  lines,
  editing,
  defaults,
  prefill,
  bankAccounts,
  today,
  onSave,
  onCancelEdit,
}: {
  side: SettlementSide;
  lines: BatchLine[];
  editing: BatchLine | null;
  defaults: EntryDefaults;
  prefill: EntryPrefill | null;
  bankAccounts: Array<{ id: string; name: string }>;
  today: string;
  onSave: (line: Omit<BatchLine, "key" | "clientRequestId" | "status">) => void;
  onCancelEdit: () => void;
}) {
  const copy = SIDES[side];
  const Party = copy.party[0].toUpperCase() + copy.party.slice(1);
  const Docs = copy.docs[0].toUpperCase() + copy.docs.slice(1);

  const [partyId, setPartyId] = React.useState("");
  const [party, setParty] = React.useState<PartyLookupOption | null>(null);
  const [amount, setAmount] = React.useState("");
  const [date, setDate] = React.useState(defaults.date);
  const [method, setMethod] = React.useState<PaymentMethod>(defaults.method);
  const [bankAccountId, setBankAccountId] = React.useState(defaults.bankAccountId);
  const [reference, setReference] = React.useState("");
  const [chequeNumber, setChequeNumber] = React.useState("");
  const [chequeDate, setChequeDate] = React.useState(defaults.chequeDate);
  const [mpesaTransactionNo, setMpesaTransactionNo] = React.useState("");
  const [openDocs, setOpenDocs] = React.useState<ArOpenItem[]>([]);
  const [openCredits, setOpenCredits] = React.useState<ArOpenItem[]>([]);
  const [loadingItems, setLoadingItems] = React.useState(false);
  const [suggesting, setSuggesting] = React.useState(true);
  const [tiedText, setTiedText] = React.useState<Record<string, string>>({});
  const [credits, setCredits] = React.useState<CreditNoteApplicationLine[]>([]);
  const [creditsEdited, setCreditsEdited] = React.useState(false);
  const [showErrors, setShowErrors] = React.useState(false);
  const pendingTie = React.useRef<{ documentNumber: string; amount?: number } | null>(null);

  const reset = React.useCallback((next: EntryDefaults) => {
    setPartyId("");
    setParty(null);
    setAmount("");
    setDate(next.date);
    setMethod(next.method);
    setBankAccountId(next.bankAccountId);
    setReference("");
    setChequeNumber("");
    setChequeDate(next.chequeDate);
    setMpesaTransactionNo("");
    setSuggesting(true);
    setTiedText({});
    setCredits([]);
    setCreditsEdited(false);
    setShowErrors(false);
  }, []);

  const tieExactly = (next: Record<string, number>) => {
    setSuggesting(false);
    setTiedText(Object.fromEntries(Object.entries(next).map(([id, value]) => [id, String(value)])));
  };

  React.useEffect(() => {
    if (!prefill) return;
    setPartyId(prefill.partyId);
    setParty({ id: prefill.partyId, label: prefill.partyName || prefill.partyId });
    if (prefill.amount && prefill.amount > 0) setAmount(groupReceiptMoney(String(prefill.amount)));
    pendingTie.current = prefill.documentNumber ? { documentNumber: prefill.documentNumber, amount: prefill.amount } : null;
  }, [prefill]);

  React.useEffect(() => {
    if (!editing) return;
    setPartyId(editing.partyId);
    setParty({ id: editing.partyId, label: editing.partyName });
    setAmount(groupReceiptMoney(String(editing.amount)));
    setDate(editing.date);
    setMethod(editing.method);
    setBankAccountId(editing.bankAccountId);
    setReference(editing.reference);
    setChequeNumber(editing.chequeNumber);
    setChequeDate(editing.chequeDate || editing.date);
    setMpesaTransactionNo(editing.mpesaTransactionNo);
    const tiedRows = editing.allocations.filter((row) => row.tied);
    setSuggesting(tiedRows.length === 0);
    setTiedText(Object.fromEntries(tiedRows.map((row) => [row.invoiceId, String(row.amount)])));
    setCredits(editing.creditApplications);
    setCreditsEdited(true);
    setShowErrors(false);
    focusEntryParty();
  }, [editing]);

  React.useEffect(() => {
    if (!partyId) {
      setOpenDocs([]);
      setOpenCredits([]);
      return;
    }
    let cancelled = false;
    setLoadingItems(true);
    copy
      .loadItems(partyId)
      .then((items) => {
        if (cancelled) return;
        setOpenDocs(items.invoices);
        setOpenCredits(items.creditNotes);
      })
      .catch((error) => {
        if (!cancelled) toast.error((error as Error).message || `Could not load this ${copy.party}'s open ${copy.docs}.`);
      })
      .finally(() => {
        if (!cancelled) setLoadingItems(false);
      });
    return () => {
      cancelled = true;
    };
  }, [partyId, copy]);

  React.useEffect(() => {
    if (!partyId || creditsEdited || openCredits.length === 0) return;
    let cancelled = false;
    copy
      .preview({ partyId, amount: 0.01 })
      .then((preview) => {
        if (!cancelled) setCredits(preview.creditNoteApplications);
      })
      .catch(() => {
        if (!cancelled) setCredits([]);
      });
    return () => {
      cancelled = true;
    };
  }, [partyId, creditsEdited, openCredits.length, copy]);

  const claims = React.useMemo(
    () => (partyId ? batchClaims(lines, partyId, editing?.key) : { invoices: {}, creditNotes: {} }),
    [lines, partyId, editing?.key],
  );
  const docs = React.useMemo(() => withoutClaims(openDocs, claims.invoices), [openDocs, claims]);
  const creditNotes = React.useMemo(() => withoutClaims(openCredits, claims.creditNotes), [openCredits, claims]);
  const effectiveCredits = React.useMemo(
    () => clampCreditApplications(credits, docs, creditNotes),
    [credits, docs, creditNotes],
  );
  const inBatchForParty = sumAmounts(Object.values(claims.invoices));

  const parsedAmount = parseReceiptMoney(amount);
  const payment = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0;
  const tied: Record<string, number> = {};
  let badTied: string | null = null;
  for (const [id, text] of Object.entries(tiedText)) {
    if (!text.trim()) continue;
    const value = parseReceiptMoney(text);
    if (!Number.isFinite(value)) badTied = id;
    else if (value > 0) tied[id] = value;
  }
  const activeTied = suggesting ? {} : tied;
  const spreadRemainder = spreadsRemainder(side, suggesting);
  const plan = planSettlement({ amount: payment, invoices: docs, tied: activeTied, credits: effectiveCredits, spreadRemainder });
  const planByDoc = new Map<string, { tied: number; spread: number }>();
  for (const row of plan.allocations) {
    const current = planByDoc.get(row.invoiceId) ?? { tied: 0, spread: 0 };
    if (row.tied) current.tied = roundMoney(current.tied + row.amount);
    else current.spread = roundMoney(current.spread + row.amount);
    planByDoc.set(row.invoiceId, current);
  }
  const creditsApplied = sumAmounts(effectiveCredits.map((line) => line.amount));
  const owing = sumAmounts(docs.map((doc) => doc.outstanding));
  const stillOwing = roundMoney(Math.max(0, owing - creditsApplied - (payment - plan.unapplied)));
  const named = documentsNamedIn(reference, docs).filter((doc) => !(activeTied[doc.id] > 0));
  const spreadTargets = plan.allocations.filter((row) => !row.tied);

  React.useEffect(() => {
    const target = pendingTie.current;
    if (!target || docs.length === 0) return;
    pendingTie.current = null;
    const doc = docs.find((row) => row.number === target.documentNumber);
    if (!doc) return;
    const take = roundMoney(Math.min(doc.outstanding, target.amount && target.amount > 0 ? target.amount : doc.outstanding));
    setSuggesting(false);
    setTiedText({ [doc.id]: String(take) });
    if (!(target.amount && target.amount > 0)) setAmount(groupReceiptMoney(String(take)));
  }, [docs]);

  const duplicate =
    partyId && payment > 0
      ? likelyDuplicate(lines, { partyId, amount: payment, method, reference, chequeNumber, mpesaTransactionNo }, editing?.key)
      : undefined;

  const problem =
    !partyId
      ? `Choose the ${copy.party}.`
      : !Number.isFinite(parsedAmount)
        ? `The ${copy.amountLabel.toLowerCase()} is not a number.`
        : payment <= 0
          ? `Enter the ${copy.amountLabel.toLowerCase()}.`
          : !date
            ? `Enter the ${copy.dateLabel.toLowerCase()}.`
            : method === "CHEQUE" && !chequeNumber.trim()
              ? "Enter the cheque number."
              : method === "CHEQUE" && !chequeDate
                ? "Enter the cheque date."
                : method === "MPESA" && !mpesaTransactionNo.trim()
                  ? "Enter the M-Pesa transaction code."
                  : needsBankAccount(method) && !bankAccountId
                    ? "Choose the bank account."
                    : !suggesting && badTied
                      ? `The amount on ${docs.find((row) => row.id === badTied)?.number ?? `a ${copy.doc}`} is not a number.`
                      : side === "AP" && method === "CHEQUE" && plan.allocations.length === 0
                        ? "A supplier cheque must pay at least one bill. Choose a bill or use the suggestion."
                        : tiedProblem({ amount: payment, invoices: docs, tied: activeTied, credits: effectiveCredits });

  const setDocAmount = (docId: string, value: string) => {
    const next: Record<string, string> = suggesting
      ? Object.fromEntries(plan.allocations.map((row) => [row.invoiceId, String(row.amount)]))
      : { ...tiedText };
    if (!value.trim()) delete next[docId];
    else next[docId] = value;
    setSuggesting(false);
    setTiedText(next);
  };

  const payThis = (doc: ArOpenItem) => {
    const credit = sumAmounts(effectiveCredits.filter((line) => line.invoiceId === doc.id).map((line) => line.amount));
    const room = roundMoney(doc.outstanding - credit);
    if (room <= 0) return;
    const base: Record<string, number> = suggesting ? {} : { ...tied };
    delete base[doc.id];
    if (payment <= 0) {
      setAmount(groupReceiptMoney(String(room)));
      tieExactly({ ...base, [doc.id]: room });
      return;
    }
    const left = roundMoney(payment - sumAmounts(Object.values(base)));
    if (left <= 0) {
      toast.message(`The whole amount is already on other ${copy.docs}. Remove one first.`);
      return;
    }
    tieExactly({ ...base, [doc.id]: roundMoney(Math.min(room, left)) });
  };

  const save = (event?: { preventDefault: () => void }) => {
    event?.preventDefault();
    setShowErrors(true);
    if (problem) {
      toast.error(problem);
      return;
    }
    const bankAccountName = bankAccounts.find((account) => account.id === bankAccountId)?.name ?? "";
    onSave({
      partyId,
      partyName: party?.label ?? partyId,
      amount: payment,
      date,
      method,
      bankAccountId: method === "CASH" ? "" : bankAccountId,
      bankAccountName: method === "CASH" ? "" : bankAccountName,
      reference: reference.trim(),
      chequeNumber: method === "CHEQUE" ? chequeNumber.trim() : "",
      chequeDate: method === "CHEQUE" ? chequeDate : "",
      mpesaTransactionNo: method === "MPESA" ? mpesaTransactionNo.trim().toUpperCase() : "",
      allocations: plan.allocations,
      creditApplications: effectiveCredits,
      unapplied: plan.unapplied,
    });
    reset({ date, method, bankAccountId, chequeDate });
    focusEntryParty();
  };

  const suggestionHint = suggesting
    ? `Suggested: soonest due first until the money runs out. Type an amount or press Pay this to choose a ${copy.doc} yourself.`
    : side === "AR"
      ? "You chose these invoices. Anything not on an invoice pays the soonest due invoices when you post."
      : "Only the bills you choose are paid. Anything left over is recorded as an advance to the supplier.";

  return (
    <form
      onSubmit={save}
      onKeyDown={(event) => {
        if (event.key !== "Enter" || !(event.target instanceof HTMLInputElement)) return;
        event.preventDefault();
        if (event.metaKey || event.ctrlKey) save(event);
      }}
      className={cn("overflow-hidden rounded-xl border bg-card shadow-sm", editing && "ring-2 ring-primary/40")}
      aria-label={editing ? "Edit line" : copy.newTitle}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-sm font-semibold">{editing ? `Edit ${editing.partyName}` : copy.newTitle}</h2>
          <p className="text-xs text-muted-foreground">
            {editing ? "Change anything, then update the line in the list below." : copy.newHint}
          </p>
        </div>
        {editing ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => { reset(defaults); onCancelEdit(); }}>
            Cancel edit
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={PARTY_FIELD_ID}>{Party}</Label>
            <AsyncSearchableSelect
              id={PARTY_FIELD_ID}
              value={partyId}
              onValueChange={(value) => {
                setPartyId(value);
                if (!value) setParty(null);
                setSuggesting(true);
                setTiedText({});
                setCredits([]);
                setCreditsEdited(false);
              }}
              onOptionSelect={(option) => setParty(option)}
              loadOptions={copy.loadParties}
              selectedOption={party}
              placeholder={`Choose ${copy.party}`}
              searchPlaceholder="Name, code, phone, or email"
              emptyMessage={`No ${copy.party}s found.`}
              browseLabel={copy.browseLabel}
            />
            {partyId ? (
              <p className="text-xs text-muted-foreground">
                {loadingItems
                  ? `Loading open ${copy.docs}…`
                  : `${copy.owesVerb} ${money(owing)} on ${plural(docs.length, `open ${copy.doc}`, `open ${copy.docs}`)}`}
                {inBatchForParty > 0 ? ` after ${money(inBatchForParty)} already in this batch` : ""}
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="settlement-entry-amount">{copy.amountLabel}</Label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs font-medium text-muted-foreground">
                  KES
                </span>
                <Input
                  id="settlement-entry-amount"
                  inputMode="decimal"
                  autoComplete="off"
                  className="pl-11 text-right font-medium tabular-nums"
                  placeholder="0.00"
                  value={amount}
                  aria-invalid={showErrors && payment <= 0}
                  onChange={(event) => setAmount(event.target.value)}
                  onBlur={() => setAmount(groupReceiptMoney(amount))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="settlement-entry-date">{copy.dateLabel}</Label>
              <Input id="settlement-entry-date" type="date" value={date} max={today} onChange={(event) => setDate(event.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Payment method</Label>
            <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-2 gap-1 rounded-lg border bg-muted/40 p-1 sm:grid-cols-4">
              {PAYMENT_METHODS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={method === option.value}
                  onClick={() => setMethod(option.value)}
                  className={cn(
                    "rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                    method === option.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {method !== "CASH" ? (
              <div className={cn("space-y-1.5", method !== "CHEQUE" && "sm:col-span-2")}>
                <Label>
                  {copy.bankLabel}
                  {method === "MPESA" ? <span className="font-normal text-muted-foreground"> (optional)</span> : null}
                </Label>
                <SearchableSelect
                  value={bankAccountId}
                  onValueChange={setBankAccountId}
                  options={bankAccounts.map((account) => ({ id: account.id, label: account.name }))}
                  placeholder="Choose bank account"
                  searchPlaceholder="Find bank account"
                />
              </div>
            ) : null}
            {method === "CHEQUE" ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="settlement-entry-cheque">Cheque number</Label>
                  <Input id="settlement-entry-cheque" autoComplete="off" value={chequeNumber} onChange={(event) => setChequeNumber(event.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="settlement-entry-cheque-date">Cheque date</Label>
                  <Input id="settlement-entry-cheque-date" type="date" value={chequeDate} onChange={(event) => setChequeDate(event.target.value)} />
                </div>
              </>
            ) : null}
            {method === "MPESA" ? (
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="settlement-entry-mpesa">M-Pesa transaction code</Label>
                <Input
                  id="settlement-entry-mpesa"
                  autoComplete="off"
                  placeholder="e.g. SF94KX22Q"
                  className="uppercase"
                  value={mpesaTransactionNo}
                  onChange={(event) => setMpesaTransactionNo(event.target.value)}
                />
              </div>
            ) : null}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="settlement-entry-reference">
                Reference <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="settlement-entry-reference"
                autoComplete="off"
                placeholder={method === "BANK_TRANSFER" ? `Bank narration or ${copy.doc} numbers` : `Note or ${copy.doc} numbers`}
                value={reference}
                onChange={(event) => setReference(event.target.value)}
              />
              {named.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                  <span className="text-muted-foreground">Mentions</span>
                  {named.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => payThis(doc)}
                      className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-medium text-primary hover:bg-primary/20"
                    >
                      <Icons.Link2 className="h-3 w-3" aria-hidden />
                      Put it on {doc.number}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="min-w-0 flex-1">
              <Label>{Docs} this pays</Label>
              <p className="text-xs text-muted-foreground">{suggestionHint}</p>
            </div>
            {suggesting ? (
              <Button type="button" variant="outline" size="sm" disabled={docs.length === 0} onClick={() => { setSuggesting(false); setTiedText({}); }}>
                <Icons.Eraser className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Clear suggestion
              </Button>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => { setSuggesting(true); setTiedText({}); }}>
                <Icons.Wand2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Use suggestion
              </Button>
            )}
          </div>

          <div className="overflow-hidden rounded-lg border">
            <div className="grid grid-cols-[minmax(0,1fr)_7.5rem_9rem_5.5rem] items-center gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
              <span>{Docs.slice(0, -1)}</span>
              <span className="text-right">Open</span>
              <span className="text-right">Pay</span>
              <span />
            </div>
            <div className="max-h-80 divide-y overflow-auto" data-arrow-nav="">
              {!partyId ? (
                <p className="p-4 text-sm text-muted-foreground">Choose a {copy.party} to see their open {copy.docs}.</p>
              ) : loadingItems ? (
                <p className="p-4 text-sm text-muted-foreground">Loading open {copy.docs}…</p>
              ) : docs.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  No open {copy.docs}
                  {inBatchForParty > 0 ? " left after this batch" : ""}.{" "}
                  {side === "AR" ? "The money stays on the customer for the next sale." : "The money is recorded as an advance to the supplier."}
                </p>
              ) : (
                docs.map((doc) => {
                  const row = planByDoc.get(doc.id) ?? { tied: 0, spread: 0 };
                  const credit = sumAmounts(effectiveCredits.filter((line) => line.invoiceId === doc.id).map((line) => line.amount));
                  const paying = roundMoney(row.tied + row.spread);
                  const clears = paying > 0 && roundMoney(paying + credit) >= doc.outstanding - 0.009;
                  const overdue = Boolean(doc.dueDate && doc.dueDate < today);
                  const inputValue = suggesting ? (row.spread > 0 ? String(row.spread) : "") : tiedText[doc.id] ?? "";
                  return (
                    <div
                      key={doc.id}
                      className={cn(
                        "grid grid-cols-[minmax(0,1fr)_7.5rem_9rem_5.5rem] items-center gap-2 px-3 py-2 text-sm",
                        row.tied > 0 && "bg-primary/5",
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-medium">{doc.number}</span>
                          {overdue ? (
                            <span className="rounded bg-destructive/10 px-1.5 text-[10px] font-semibold uppercase text-destructive">Overdue</span>
                          ) : null}
                          {clears ? (
                            <span className="rounded bg-emerald-500/10 px-1.5 text-[10px] font-semibold uppercase text-emerald-600 dark:text-emerald-400">Cleared</span>
                          ) : null}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {documentWhen(doc)}
                          {credit > 0 ? ` · credit note ${money(credit)}` : ""}
                          {!suggesting && row.spread > 0 ? ` · ${money(row.spread)} from the rest` : ""}
                        </div>
                      </div>
                      <span className="text-right tabular-nums">{money(doc.outstanding)}</span>
                      <Input
                        data-arrow-field="cash"
                        inputMode="decimal"
                        autoComplete="off"
                        aria-label={`Amount on ${doc.number}`}
                        className={cn("h-8 text-right tabular-nums", suggesting && row.spread > 0 && "border-dashed text-muted-foreground")}
                        placeholder="0.00"
                        value={inputValue}
                        onChange={(event) => setDocAmount(doc.id, event.target.value)}
                      />
                      <div className="flex justify-end">
                        {row.tied > 0 ? (
                          <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setDocAmount(doc.id, "")}>
                            Remove
                          </Button>
                        ) : (
                          <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => payThis(doc)}>
                            Pay this
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {creditNotes.length > 0 ? (
            <details className="rounded-lg border" open={effectiveCredits.length > 0}>
              <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Credit notes · {money(creditsApplied)} used</summary>
              <div className="divide-y border-t" data-arrow-nav="">
                {creditNotes.map((credit) => {
                  const applied = effectiveCredits.filter((line) => line.creditNoteId === credit.id);
                  return (
                    <div key={credit.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{credit.number}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          Open {money(credit.outstanding)}
                          {applied.length ? ` · nets against ${applied.map((line) => line.invoiceNumber).join(", ")}` : ""}
                        </div>
                      </div>
                      <Input
                        data-arrow-field="credit"
                        inputMode="decimal"
                        aria-label={`Use ${credit.number}`}
                        className="h-8 w-32 shrink-0 text-right tabular-nums"
                        placeholder="0.00"
                        value={creditUsed(effectiveCredits, credit.id) || ""}
                        onChange={(event) => {
                          setCreditsEdited(true);
                          setCredits((current) => scaleCreditNote(current, credit.id, parseReceiptMoney(event.target.value) || 0));
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </details>
          ) : null}

          {partyId && payment > 0 ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-muted/40 px-3 py-2.5 text-sm sm:grid-cols-4">
              <Stat label={side === "AR" ? "Received" : "Paying"} value={money(payment)} />
              <Stat label={`On ${copy.docs}`} value={money(roundMoney(payment - plan.unapplied))} />
              <Stat label={copy.leftLabel} value={money(plan.unapplied)} tone={plan.unapplied > 0.009 ? "warn" : undefined} />
              <Stat label={copy.owingLabel} value={money(stillOwing)} />
            </div>
          ) : null}

          {side === "AR" && !suggesting && plan.spread > 0.009 ? (
            <Notice icon={Icons.Info}>
              {money(plan.spread)} is not on an invoice you chose. When posted it pays{" "}
              {spreadTargets.map((row) => row.invoiceNumber).join(", ")} (soonest due first).
            </Notice>
          ) : null}
          {side === "AP" && !suggesting && plan.unapplied > 0.009 && docs.length > 0 ? (
            <Notice icon={Icons.Info}>
              {money(plan.unapplied)} is not on a bill. It is recorded as an advance to the supplier and can be set against a bill later.
            </Notice>
          ) : null}
          {duplicate ? (
            <Notice icon={Icons.Copy}>
              This looks like a line already in the list for {duplicate.partyName} ({money(duplicate.amount)}). Check before adding it again.
            </Notice>
          ) : null}
          {showErrors && problem ? <p className="text-sm text-destructive">{problem}</p> : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-4 py-3 sm:px-5">
        <p className="hidden text-xs text-muted-foreground sm:block">
          Press <kbd className="rounded border bg-background px-1 font-mono">Ctrl</kbd> +{" "}
          <kbd className="rounded border bg-background px-1 font-mono">Enter</kbd> to add and start the next {copy.party}.
        </p>
        <Button type="submit" className="ml-auto">
          {editing ? <Icons.Check className="mr-2 h-4 w-4" aria-hidden /> : <Icons.ListPlus className="mr-2 h-4 w-4" aria-hidden />}
          {editing ? "Update line" : "Add to list"}
        </Button>
      </div>
    </form>
  );
}

function Notice({ icon: Icon, children }: { icon: Icons.LucideIcon; children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("truncate font-semibold tabular-nums", tone === "warn" && "text-amber-700 dark:text-amber-400")}>{value}</div>
    </div>
  );
}
