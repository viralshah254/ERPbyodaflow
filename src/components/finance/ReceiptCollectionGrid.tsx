"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AsyncSearchableSelect } from "@/components/ui/async-searchable-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createArPaymentApi, fetchArOpenItemsApi, previewArSettlementApi, searchArCustomerOptionsApi } from "@/lib/api/payments";
import { fetchBankAccountsApi } from "@/lib/api/treasury-ops";
import type { PartyLookupOption } from "@/lib/api/parties";
import {
  applyPreview,
  creditUsed,
  creditsOnInvoice,
  roundMoney,
  scaleCreditNote,
  settlementProblem,
  sumAmounts,
} from "@/lib/ar/settlement-edit";
import { formatMoney } from "@/lib/money";
import { useBaseCurrency } from "@/lib/org/useBaseCurrency";
import type { ArOpenItem, CreditNoteApplicationLine } from "@/lib/types/ar";
import { toast } from "sonner";

type ReceiptMethod = "CHEQUE" | "CASH" | "BANK_TRANSFER" | "MPESA";

type ReceiptRow = {
  id: string;
  customerId: string;
  customer: PartyLookupOption | null;
  method: ReceiptMethod;
  reference: string;
  amount: string;
  invoices: ArOpenItem[];
  creditNotes: ArOpenItem[];
  invoiceAmounts: Record<string, number>;
  creditApplications: CreditNoteApplicationLine[];
  matchLabels: string[];
  openLoading: boolean;
  matching: boolean;
  expanded: boolean;
  dirty: boolean;
  error?: string;
};

const METHODS: Array<{ id: ReceiptMethod; label: string }> = [
  { id: "CHEQUE", label: "Cheque" },
  { id: "CASH", label: "Cash" },
  { id: "BANK_TRANSFER", label: "Bank" },
  { id: "MPESA", label: "M-Pesa" },
];

const today = () => new Date().toISOString().slice(0, 10);

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function blankRow(): ReceiptRow {
  return {
    id: newId(),
    customerId: "",
    customer: null,
    method: "CHEQUE",
    reference: "",
    amount: "",
    invoices: [],
    creditNotes: [],
    invoiceAmounts: {},
    creditApplications: [],
    matchLabels: [],
    openLoading: false,
    matching: false,
    expanded: false,
    dirty: false,
  };
}

function freshRows(): ReceiptRow[] {
  return [blankRow(), blankRow(), blankRow(), blankRow()];
}

function rowTouched(row: ReceiptRow): boolean {
  return Boolean(row.customerId || row.amount.trim() || row.reference.trim());
}

function referenceTokens(reference: string): string[] {
  return [
    ...new Set(
      reference
        .split(/[\s,;]+/)
        .map((part) => part.trim())
        .filter((part) => part.length >= 3)
    ),
  ];
}

function referencePlaceholder(method: ReceiptMethod): string {
  if (method === "CHEQUE") return "Cheque no.";
  if (method === "MPESA") return "M-Pesa code";
  return "Reference";
}

function matchText(row: ReceiptRow, currency: string): string {
  if (!row.customerId) return "Choose a customer";
  if (row.openLoading && row.invoices.length === 0) return "Loading invoices…";
  const openTotal = sumAmounts(row.invoices.map((invoice) => invoice.outstanding));
  const amount = Number(row.amount);
  const hasAmount = Number.isFinite(amount) && amount > 0;
  if (!hasAmount) {
    if (row.invoices.length === 0) return "No open invoices";
    const count = row.invoices.length === 1 ? "1 open invoice" : `${row.invoices.length} open invoices`;
    return `${count} · ${formatMoney(openTotal, currency)}`;
  }
  if (row.matching && row.matchLabels.length === 0 && !row.dirty) return "Matching invoices…";
  const fromAmounts = row.invoices
    .filter((invoice) => (row.invoiceAmounts[invoice.id] ?? 0) > 0)
    .map((invoice) => invoice.number);
  const labels = row.dirty || fromAmounts.length > 0 ? fromAmounts : row.matchLabels;
  const cash = sumAmounts(Object.values(row.invoiceAmounts));
  const unapplied = roundMoney(amount - cash);
  const applied = labels.length ? labels.join(" · ") : "Nothing matched";
  return unapplied > 0.009 ? `${applied} · unapplied ${formatMoney(unapplied, currency)}` : applied;
}

function rowProblem(row: ReceiptRow): string | null {
  if (!row.customerId) return "Select a customer.";
  const amount = Number(row.amount);
  if (!Number.isFinite(amount) || amount <= 0) return "Enter the amount received.";
  if ((row.method === "CHEQUE" || row.method === "MPESA") && !row.reference.trim()) {
    return row.method === "CHEQUE" ? "Enter the cheque number." : "Enter the M-Pesa code.";
  }
  return settlementProblem({
    amount,
    invoices: row.invoices,
    creditNotes: row.creditNotes,
    invoiceAmounts: row.invoiceAmounts,
    creditApplications: row.creditApplications,
  });
}

function ReceiptLine({
  row,
  index,
  currency,
  onChange,
  onAmountEnter,
  openCustomer,
}: {
  row: ReceiptRow;
  index: number;
  currency: string;
  onChange: (patch: Partial<ReceiptRow>) => void;
  onAmountEnter: () => void;
  openCustomer: boolean;
}) {
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;
  const dirtyRef = React.useRef(row.dirty);
  dirtyRef.current = row.dirty;

  React.useEffect(() => {
    if (!row.customerId) return;
    let cancelled = false;
    onChangeRef.current({ openLoading: true, error: undefined });
    fetchArOpenItemsApi(row.customerId)
      .then((items) => {
        if (cancelled) return;
        onChangeRef.current({
          invoices: items.invoices,
          creditNotes: items.creditNotes,
          openLoading: false,
        });
      })
      .catch((error) => {
        if (!cancelled) {
          onChangeRef.current({
            openLoading: false,
            error: (error as Error).message || "Could not load open invoices.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [row.customerId, row.id]);

  React.useEffect(() => {
    const amount = Number(row.amount);
    if (!row.customerId || row.dirty || !Number.isFinite(amount) || amount <= 0) return;
    let cancelled = false;
    const handle = window.setTimeout(() => {
      const references = referenceTokens(row.reference);
      onChangeRef.current({ matching: true });
      previewArSettlementApi({
        partyId: row.customerId,
        amount,
        ...(references.length ? { reference: row.reference.trim(), references } : {}),
      })
        .then((preview) => {
          if (cancelled || dirtyRef.current) {
            if (!cancelled) onChangeRef.current({ matching: false });
            return;
          }
          const applied = applyPreview(preview);
          onChangeRef.current({
            invoiceAmounts: applied.invoiceAmounts,
            creditApplications: applied.creditApplications,
            matchLabels: [...new Set(preview.invoiceLines.map((line) => line.invoiceNumber).filter(Boolean))],
            matching: false,
            error: undefined,
          });
        })
        .catch((error) => {
          if (!cancelled) {
            onChangeRef.current({
              matching: false,
              error: (error as Error).message || "Could not match this receipt.",
            });
          }
        });
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [row.customerId, row.amount, row.reference, row.dirty, row.id]);

  const clearCustomerMatch = (customerId: string) => {
    if (customerId === row.customerId) return;
    onChange({
      customerId,
      customer: customerId ? row.customer : null,
      dirty: false,
      invoiceAmounts: {},
      creditApplications: [],
      invoices: [],
      creditNotes: [],
      matchLabels: [],
      matching: false,
      openLoading: Boolean(customerId),
      error: undefined,
    });
  };

  return (
    <>
      <TableRow>
        <TableCell className="w-10 text-muted-foreground">{index + 1}</TableCell>
        <TableCell className="min-w-[220px]">
          <AsyncSearchableSelect
            value={row.customerId}
            onValueChange={clearCustomerMatch}
            onOptionSelect={(option) => onChange({ customer: option, customerId: option?.id ?? row.customerId })}
            loadOptions={searchArCustomerOptionsApi}
            selectedOption={row.customer}
            placeholder="Customer"
            searchPlaceholder="Type name, code, phone, or email"
            emptyMessage="No customers found."
            recentStorageKey="lookup:recent-customers"
            triggerClassName="h-9 min-h-9 py-1"
            openSignal={openCustomer ? row.id : undefined}
          />
        </TableCell>
        <TableCell className="w-36">
          <select
            aria-label={`Method ${index + 1}`}
            className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={row.method}
            onChange={(event) => onChange({ method: event.target.value as ReceiptMethod, error: undefined })}
          >
            {METHODS.map((method) => (
              <option key={method.id} value={method.id}>
                {method.label}
              </option>
            ))}
          </select>
        </TableCell>
        <TableCell className="w-40">
          <Input
            aria-label={`Reference ${index + 1}`}
            className="h-9"
            placeholder={referencePlaceholder(row.method)}
            value={row.reference}
            onChange={(event) => onChange({ reference: event.target.value, error: undefined })}
          />
        </TableCell>
        <TableCell className="w-36">
          <Input
            aria-label={`Amount ${index + 1}`}
            type="number"
            min="0"
            step="0.01"
            className="h-9"
            placeholder="Amount"
            value={row.amount}
            onChange={(event) => {
              const next = event.target.value;
              const amount = Number(next);
              const cleared = !Number.isFinite(amount) || amount <= 0;
              onChange({
                amount: next,
                dirty: false,
                error: undefined,
                matching: !cleared,
                ...(cleared ? { invoiceAmounts: {}, creditApplications: [], matchLabels: [], matching: false } : {}),
              });
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              onAmountEnter();
            }}
          />
        </TableCell>
        <TableCell className="min-w-[220px]">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs leading-5 text-muted-foreground">{matchText(row, currency)}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 px-2"
              disabled={!row.customerId}
              onClick={() => onChange({ expanded: !row.expanded })}
            >
              {row.expanded ? "Hide split" : "Edit split"}
            </Button>
          </div>
          {row.error ? <p className="mt-1 text-xs text-destructive">{row.error}</p> : null}
        </TableCell>
      </TableRow>
      {row.expanded ? (
        <TableRow>
          <TableCell colSpan={6} className="bg-muted/30">
            <div className="grid gap-2 md:grid-cols-2">
              <div className="max-h-48 divide-y overflow-auto rounded border bg-background">
                {row.invoices.length === 0 ? (
                  <p className="p-2 text-xs text-muted-foreground">
                    {row.openLoading ? "Loading invoices…" : "No open invoices"}
                  </p>
                ) : (
                  row.invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between gap-2 p-2 text-xs">
                      <span className="truncate">
                        {invoice.number} · {formatMoney(invoice.outstanding, currency)}
                        {creditsOnInvoice(row.creditApplications, invoice.id) > 0
                          ? ` · credit ${formatMoney(creditsOnInvoice(row.creditApplications, invoice.id), currency)}`
                          : ""}
                      </span>
                      <Input
                        type="number"
                        aria-label={`Apply to ${invoice.number}`}
                        className="h-7 w-24"
                        value={row.invoiceAmounts[invoice.id] ?? ""}
                        onChange={(event) =>
                          onChange({
                            dirty: true,
                            matching: false,
                            invoiceAmounts: {
                              ...row.invoiceAmounts,
                              [invoice.id]: Number(event.target.value) || 0,
                            },
                          })
                        }
                      />
                    </div>
                  ))
                )}
              </div>
              <div className="max-h-48 divide-y overflow-auto rounded border bg-background">
                {row.creditNotes.length === 0 ? (
                  <p className="p-2 text-xs text-muted-foreground">No open credit notes</p>
                ) : (
                  row.creditNotes.map((credit) => (
                    <div key={credit.id} className="flex items-center justify-between gap-2 p-2 text-xs">
                      <span className="truncate">
                        {credit.number} · {formatMoney(credit.outstanding, currency)}
                      </span>
                      <Input
                        type="number"
                        aria-label={`Apply ${credit.number}`}
                        className="h-7 w-24"
                        value={creditUsed(row.creditApplications, credit.id) || ""}
                        onChange={(event) =>
                          onChange({
                            dirty: true,
                            matching: false,
                            creditApplications: scaleCreditNote(
                              row.creditApplications,
                              credit.id,
                              Number(event.target.value) || 0
                            ),
                          })
                        }
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

export function ReceiptCollectionGrid() {
  const currency = useBaseCurrency();
  const [bankAccounts, setBankAccounts] = React.useState<Array<{ id: string; name: string }>>([]);
  const [bankAccountId, setBankAccountId] = React.useState("");
  const [depositDate, setDepositDate] = React.useState(today());
  const [rows, setRows] = React.useState<ReceiptRow[]>(() => freshRows());
  const [posting, setPosting] = React.useState(false);
  const [focusRowId, setFocusRowId] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchBankAccountsApi()
      .then((accounts) => setBankAccounts(accounts.map((account) => ({ id: account.id, name: account.name }))))
      .catch(() => setBankAccounts([]));
  }, []);

  React.useEffect(() => {
    if (!focusRowId) return;
    setFocusRowId(null);
  }, [focusRowId]);

  const updateRow = (id: string, patch: Partial<ReceiptRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const startNextLine = (row: ReceiptRow) => {
    if (!rowTouched(row)) return;
    const index = rows.findIndex((item) => item.id === row.id);
    const following = index >= 0 ? rows[index + 1] : undefined;
    if (following && !rowTouched(following)) {
      setFocusRowId(following.id);
      return;
    }
    const next = blankRow();
    setRows((current) => {
      const at = current.findIndex((item) => item.id === row.id);
      if (at < 0) return [...current, next];
      const copy = [...current];
      copy.splice(at + 1, 0, next);
      return copy;
    });
    setFocusRowId(next.id);
  };

  const batchTotal = sumAmounts(
    rows.filter(rowTouched).map((row) => {
      const amount = Number(row.amount);
      return Number.isFinite(amount) ? amount : 0;
    })
  );

  const postBatch = async () => {
    const ready = rows.filter(rowTouched);
    if (!ready.length) {
      toast.error("Add at least one receipt.");
      return;
    }
    if (!bankAccountId) {
      toast.error("Select the bank account for this deposit.");
      return;
    }
    if (!depositDate) {
      toast.error("Enter the deposit date.");
      return;
    }
    setPosting(true);
    const remaining: ReceiptRow[] = [];
    let posted = 0;
    let failed = false;
    for (const row of rows) {
      if (!rowTouched(row)) {
        remaining.push(row);
        continue;
      }
      const problem = rowProblem(row);
      if (problem) {
        failed = true;
        remaining.push({ ...row, error: problem, expanded: true });
        continue;
      }
      try {
        const reference = row.reference.trim();
        await createArPaymentApi({
          customerId: row.customerId,
          amount: Number(row.amount),
          date: depositDate,
          bankAccountId,
          paymentMethod: row.method,
          chequeNumber: row.method === "CHEQUE" ? reference : undefined,
          chequeDate: row.method === "CHEQUE" ? depositDate : undefined,
          mpesaTransactionNo: row.method === "MPESA" ? reference : undefined,
          reference: row.method === "BANK_TRANSFER" || row.method === "CASH" ? reference || undefined : undefined,
          allocations: Object.entries(row.invoiceAmounts)
            .filter(([, value]) => value > 0)
            .map(([documentId, value]) => ({ documentId, amount: roundMoney(value) })),
          creditNoteApplications: row.creditApplications
            .filter((line) => line.amount > 0)
            .map((line) => ({
              creditNoteId: line.creditNoteId,
              invoiceId: line.invoiceId,
              amount: roundMoney(line.amount),
            })),
        });
        posted += 1;
      } catch (error) {
        failed = true;
        remaining.push({
          ...row,
          error: (error as Error).message || "This receipt was not posted.",
          expanded: true,
        });
      }
    }
    setPosting(false);
    if (posted) {
      toast.success(posted === 1 ? "1 receipt posted." : `${posted} receipts posted.`);
    }
    if (failed) {
      const blanks = remaining.some((row) => !rowTouched(row)) ? remaining : [...remaining, blankRow()];
      setRows(blanks);
      return;
    }
    setRows(freshRows());
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-end">
        <div className="space-y-2">
          <Label>Bank account</Label>
          <SearchableSelect
            value={bankAccountId}
            onValueChange={setBankAccountId}
            options={bankAccounts.map((account) => ({ id: account.id, label: account.name }))}
            placeholder="Deposit account"
            searchPlaceholder="Type to search bank account"
          />
        </div>
        <div className="space-y-2">
          <Label>Deposit date</Label>
          <Input type="date" value={depositDate} onChange={(event) => setDepositDate(event.target.value)} />
        </div>
        <p className="pb-2 text-sm text-muted-foreground">
          Batch total <span className="font-medium text-foreground">{formatMoney(batchTotal, currency)}</span>
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Enter on the amount starts the next line. Choosing a customer loads open invoices, then the amount is matched to the oldest invoices. Type an invoice number in the reference to prefer that invoice.
      </p>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="w-36">Method</TableHead>
              <TableHead className="w-40">Reference</TableHead>
              <TableHead className="w-36">Amount</TableHead>
              <TableHead>Matched invoices</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <ReceiptLine
                key={row.id}
                row={row}
                index={index}
                currency={currency}
                onChange={(patch) => updateRow(row.id, patch)}
                onAmountEnter={() => startNextLine(row)}
                openCustomer={focusRowId === row.id}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="outline" onClick={() => setRows((current) => [...current, blankRow()])}>
          Add line
        </Button>
        <Button type="button" onClick={postBatch} disabled={posting}>
          {posting ? "Posting…" : "Post receipts"}
        </Button>
      </div>
    </div>
  );
}
