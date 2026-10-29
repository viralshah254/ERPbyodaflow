"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AsyncSearchableSelect } from "@/components/ui/async-searchable-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  createArPaymentApi,
  fetchArOpenItemsApi,
  previewArSettlementApi,
  searchArCustomerOptionsApi,
} from "@/lib/api/payments";
import type { PartyLookupOption } from "@/lib/api/parties";
import {
  applyPreview,
  creditUsed,
  creditsOnInvoice,
  explainSettlement,
  roundMoney,
  scaleCreditNote,
  settlementProblem,
  sumAmounts,
} from "@/lib/ar/settlement-edit";
import { formatMoney } from "@/lib/money";
import type { ArOpenItem, CreditNoteApplicationLine, SettlementPreview } from "@/lib/types/ar";
import { useCopilotFeatureEnabled } from "@/lib/copilot-feature";
import { useCopilotStore } from "@/stores/copilot-store";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export type ReceivePrefill = {
  customerId: string;
  customerName: string;
  invoiceNumber?: string;
  amount?: number;
};

type PaymentMethod = "BANK_TRANSFER" | "CHEQUE" | "CASH" | "MPESA";

const today = () => new Date().toISOString().slice(0, 10);

export function ArSettlementSheet({
  open,
  sessionKey,
  prefill,
  bankAccounts,
  onOpenChange,
  onPosted,
}: {
  open: boolean;
  sessionKey: number;
  prefill: ReceivePrefill | null;
  bankAccounts: Array<{ id: string; name: string }>;
  onOpenChange: (open: boolean) => void;
  onPosted: () => void;
}) {
  const copilotEnabled = useCopilotFeatureEnabled();
  const openWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);
  const [customerId, setCustomerId] = React.useState("");
  const [customer, setCustomer] = React.useState<PartyLookupOption | null>(null);
  const [amount, setAmount] = React.useState("");
  const [date, setDate] = React.useState(today());
  const [method, setMethod] = React.useState<PaymentMethod>("BANK_TRANSFER");
  const [bankAccountId, setBankAccountId] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [chequeNumber, setChequeNumber] = React.useState("");
  const [chequeDate, setChequeDate] = React.useState(today());
  const [mpesaTransactionNo, setMpesaTransactionNo] = React.useState("");
  const [pinnedInvoice, setPinnedInvoice] = React.useState<string | undefined>();
  const [invoices, setInvoices] = React.useState<ArOpenItem[]>([]);
  const [creditNotes, setCreditNotes] = React.useState<ArOpenItem[]>([]);
  const [invoiceAmounts, setInvoiceAmounts] = React.useState<Record<string, number>>({});
  const [creditApplications, setCreditApplications] = React.useState<CreditNoteApplicationLine[]>([]);
  const [preview, setPreview] = React.useState<SettlementPreview | null>(null);
  const [dirty, setDirty] = React.useState(false);
  const [loadingItems, setLoadingItems] = React.useState(false);
  const [posting, setPosting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setCustomerId(prefill?.customerId ?? "");
    setCustomer(
      prefill?.customerId
        ? { id: prefill.customerId, label: prefill.customerName || prefill.customerId }
        : null
    );
    setAmount(prefill?.amount && prefill.amount > 0 ? String(prefill.amount) : "");
    setDate(today());
    setMethod("BANK_TRANSFER");
    setBankAccountId("");
    setReference("");
    setChequeNumber("");
    setChequeDate(today());
    setMpesaTransactionNo("");
    setPinnedInvoice(prefill?.invoiceNumber);
    setInvoices([]);
    setCreditNotes([]);
    setInvoiceAmounts({});
    setCreditApplications([]);
    setPreview(null);
    setDirty(false);
  }, [open, sessionKey, prefill]);

  React.useEffect(() => {
    if (!open || !customerId) {
      setInvoices([]);
      setCreditNotes([]);
      return;
    }
    let cancelled = false;
    setLoadingItems(true);
    fetchArOpenItemsApi(customerId)
      .then((items) => {
        if (cancelled) return;
        setInvoices(items.invoices);
        setCreditNotes(items.creditNotes);
      })
      .catch((error) => {
        if (!cancelled) toast.error((error as Error).message || "Failed to load open items.");
      })
      .finally(() => {
        if (!cancelled) setLoadingItems(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, customerId]);

  React.useEffect(() => {
    if (!open || !customerId) return;
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    const handle = window.setTimeout(() => {
      const references = [pinnedInvoice, reference].filter((value): value is string => Boolean(value?.trim()));
      previewArSettlementApi({
        partyId: customerId,
        amount: parsed,
        reference: reference.trim() || undefined,
        references,
      })
        .then((next) => {
          if (cancelled) return;
          setPreview(next);
          if (!dirty) {
            const applied = applyPreview(next);
            setInvoiceAmounts(applied.invoiceAmounts);
            setCreditApplications(applied.creditApplications);
          }
        })
        .catch((error) => {
          if (!cancelled) toast.error((error as Error).message || "Could not suggest a match.");
        });
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [open, customerId, amount, reference, pinnedInvoice, dirty]);

  const parsedAmount = Number(amount);
  const cashApplied = sumAmounts(Object.values(invoiceAmounts));
  const creditsApplied = sumAmounts(creditApplications.map((line) => line.amount));
  const unapplied = Number.isFinite(parsedAmount) ? roundMoney(parsedAmount - cashApplied) : 0;
  const problem =
    !customerId
      ? "Select a customer."
      : !Number.isFinite(parsedAmount) || parsedAmount <= 0
        ? "Enter the amount received."
        : method === "CHEQUE" && !chequeNumber.trim()
          ? "Enter the cheque number."
          : method === "CHEQUE" && !chequeDate
            ? "Enter the cheque date."
            : method === "MPESA" && !mpesaTransactionNo.trim()
              ? "Enter the M-Pesa transaction number."
              : (method === "BANK_TRANSFER" || method === "CHEQUE") && !bankAccountId
                ? "Select the bank account."
                : settlementProblem({
                    amount: parsedAmount,
                    invoices,
                    creditNotes,
                    invoiceAmounts,
                    creditApplications,
                  });

  const applySuggestion = () => {
    if (!preview) return;
    const applied = applyPreview(preview);
    setInvoiceAmounts(applied.invoiceAmounts);
    setCreditApplications(applied.creditApplications);
    setDirty(false);
  };

  const clearAmounts = () => {
    setInvoiceAmounts({});
    setCreditApplications([]);
    setDirty(true);
  };

  const post = async () => {
    if (problem || !Number.isFinite(parsedAmount)) {
      toast.error(problem || "Check the receipt before posting.");
      return;
    }
    setPosting(true);
    try {
      const payment = await createArPaymentApi({
        customerId,
        amount: parsedAmount,
        date,
        bankAccountId: bankAccountId || undefined,
        paymentMethod: method,
        mpesaTransactionNo: method === "MPESA" ? mpesaTransactionNo.trim() : undefined,
        reference: reference.trim() || undefined,
        chequeNumber: method === "CHEQUE" ? chequeNumber.trim() : undefined,
        chequeDate: method === "CHEQUE" ? chequeDate : undefined,
        allocations: Object.entries(invoiceAmounts)
          .filter(([, value]) => value > 0)
          .map(([documentId, value]) => ({ documentId, amount: roundMoney(value) })),
        creditNoteApplications: creditApplications
          .filter((line) => line.amount > 0)
          .map((line) => ({
            creditNoteId: line.creditNoteId,
            invoiceId: line.invoiceId,
            amount: roundMoney(line.amount),
          })),
      });
      toast.success(`Receipt ${payment.number} posted.`);
      onOpenChange(false);
      onPosted();
    } catch (error) {
      toast.error((error as Error).message || "Failed to post the receipt.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto sm:w-[760px]">
        <SheetHeader>
          <SheetTitle>Receive payment</SheetTitle>
          <SheetDescription>
            One amount can clear several invoices. Credit notes are netted first. Nothing posts until you confirm.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Customer</Label>
              <AsyncSearchableSelect
                value={customerId}
                onValueChange={(value) => {
                  setCustomerId(value);
                  if (!value) setCustomer(null);
                  setDirty(false);
                  setInvoiceAmounts({});
                  setCreditApplications([]);
                }}
                onOptionSelect={(option) => setCustomer(option)}
                loadOptions={searchArCustomerOptionsApi}
                selectedOption={customer}
                placeholder="Select customer"
                searchPlaceholder="Type name, code, phone, or email"
                emptyMessage="No customers found."
                recentStorageKey="lookup:recent-customers"
              />
            </div>
            <div className="space-y-2">
              <Label>Amount received</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Payment method</Label>
              <Select value={method} onValueChange={(value) => setMethod(value as PaymentMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK_TRANSFER">Bank transfer</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="MPESA">M-Pesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {method !== "CASH" ? (
              <div className="space-y-2">
                <Label>Bank account</Label>
                <SearchableSelect
                  value={bankAccountId}
                  onValueChange={setBankAccountId}
                  options={bankAccounts.map((account) => ({ id: account.id, label: account.name }))}
                  placeholder="Select bank account"
                  searchPlaceholder="Type to search bank account"
                />
              </div>
            ) : null}
            {method === "CHEQUE" ? (
              <>
                <div className="space-y-2">
                  <Label>Cheque number</Label>
                  <Input value={chequeNumber} onChange={(event) => setChequeNumber(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Cheque date</Label>
                  <Input type="date" value={chequeDate} onChange={(event) => setChequeDate(event.target.value)} />
                </div>
              </>
            ) : null}
            {method === "MPESA" ? (
              <div className="space-y-2 sm:col-span-2">
                <Label>M-Pesa transaction number</Label>
                <Input
                  placeholder="e.g. SF94KX22Q"
                  value={mpesaTransactionNo}
                  onChange={(event) => setMpesaTransactionNo(event.target.value)}
                />
              </div>
            ) : null}
            {method === "BANK_TRANSFER" ? (
              <div className="space-y-2 sm:col-span-2">
                <Label>Transfer reference</Label>
                <Input
                  placeholder="Narration or invoice numbers"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                />
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>Credits {formatMoney(creditsApplied, "KES")}</span>
            <span>Cash {formatMoney(cashApplied, "KES")}</span>
            <span>Unapplied {formatMoney(Math.max(unapplied, 0), "KES")}</span>
            {loadingItems ? <span className="text-muted-foreground">Loading open items…</span> : null}
          </div>
          {problem && customerId && Number(amount) > 0 ? (
            <p className="text-sm text-destructive">{problem}</p>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Open invoices</Label>
              <div className="max-h-64 divide-y overflow-auto rounded border">
                {invoices.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">No open invoices</p>
                ) : (
                  invoices.map((invoice) => {
                    const credited = creditsOnInvoice(creditApplications, invoice.id);
                    return (
                      <div key={invoice.id} className="flex items-center justify-between gap-2 p-2 text-sm">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{invoice.number}</div>
                          <div className="text-xs text-muted-foreground">
                            Open {formatMoney(invoice.outstanding, invoice.currency || "KES")}
                            {credited > 0 ? ` · credit ${formatMoney(credited, invoice.currency || "KES")}` : ""}
                          </div>
                        </div>
                        <Input
                          type="number"
                          className="h-8 w-28 shrink-0"
                          placeholder="Cash"
                          value={invoiceAmounts[invoice.id] ?? ""}
                          onChange={(event) => {
                            setDirty(true);
                            setInvoiceAmounts((current) => ({
                              ...current,
                              [invoice.id]: Number(event.target.value) || 0,
                            }));
                          }}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Open credit notes</Label>
              <div className="max-h-64 divide-y overflow-auto rounded border">
                {creditNotes.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">No open credit notes</p>
                ) : (
                  creditNotes.map((credit) => (
                    <div key={credit.id} className="flex items-center justify-between gap-2 p-2 text-sm">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{credit.number}</div>
                        <div className="text-xs text-muted-foreground">
                          Open {formatMoney(credit.outstanding, credit.currency || "KES")}
                        </div>
                      </div>
                      <Input
                        type="number"
                        className="h-8 w-28 shrink-0"
                        placeholder="Apply"
                        value={creditUsed(creditApplications, credit.id) || ""}
                        onChange={(event) => {
                          setDirty(true);
                          setCreditApplications((current) =>
                            scaleCreditNote(current, credit.id, Number(event.target.value) || 0)
                          );
                        }}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {preview?.invoiceLines.length || preview?.creditNoteApplications.length ? (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {preview.creditNoteApplications.map((line) => (
                <li key={`${line.creditNoteId}-${line.invoiceId}`}>{line.reason}</li>
              ))}
              {preview.invoiceLines.map((line) => (
                <li key={line.invoiceId}>{line.reason}</li>
              ))}
            </ul>
          ) : null}

          <SheetFooter className="gap-2 sm:justify-between">
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={applySuggestion} disabled={!preview}>
                Apply suggestion
              </Button>
              <Button type="button" variant="outline" onClick={clearAmounts}>
                Clear
              </Button>
              {copilotEnabled ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => openWithPrompt(explainSettlement(preview, "KES"))}
                >
                  <Icons.Sparkles className="mr-2 h-4 w-4" />
                  Explain match
                </Button>
              ) : null}
            </div>
            <Button type="button" onClick={post} disabled={posting || Boolean(problem)}>
              {posting ? "Posting…" : "Post receipt"}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
