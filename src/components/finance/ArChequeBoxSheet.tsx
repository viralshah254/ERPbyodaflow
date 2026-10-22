"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AsyncSearchableSelect } from "@/components/ui/async-searchable-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { createArPaymentApi, fetchArOpenItemsApi, previewArSettlementApi, searchArCustomerOptionsApi } from "@/lib/api/payments";
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
import type { ArOpenItem, CreditNoteApplicationLine } from "@/lib/types/ar";
import { toast } from "sonner";

type ChequeRow = {
  id: string;
  customerId: string;
  customer: PartyLookupOption | null;
  amount: string;
  chequeNumber: string;
  chequeDate: string;
  invoices: ArOpenItem[];
  creditNotes: ArOpenItem[];
  invoiceAmounts: Record<string, number>;
  creditApplications: CreditNoteApplicationLine[];
  expanded: boolean;
  dirty: boolean;
  error?: string;
};

const today = () => new Date().toISOString().slice(0, 10);

function blankRow(): ChequeRow {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    customerId: "",
    customer: null,
    amount: "",
    chequeNumber: "",
    chequeDate: today(),
    invoices: [],
    creditNotes: [],
    invoiceAmounts: {},
    creditApplications: [],
    expanded: false,
    dirty: false,
  };
}

function ChequeRowCard({
  row,
  index,
  onChange,
}: {
  row: ChequeRow;
  index: number;
  onChange: (patch: Partial<ChequeRow>) => void;
}) {
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  React.useEffect(() => {
    const amount = Number(row.amount);
    if (!row.customerId || row.dirty || !Number.isFinite(amount) || amount <= 0) return;
    let cancelled = false;
    const handle = window.setTimeout(() => {
      Promise.all([
        fetchArOpenItemsApi(row.customerId),
        previewArSettlementApi({ partyId: row.customerId, amount }),
      ])
        .then(([items, preview]) => {
          if (cancelled) return;
          const applied = applyPreview(preview);
          onChangeRef.current({
            invoices: items.invoices,
            creditNotes: items.creditNotes,
            invoiceAmounts: applied.invoiceAmounts,
            creditApplications: applied.creditApplications,
            error: undefined,
          });
        })
        .catch((error) => {
          if (!cancelled) onChangeRef.current({ error: (error as Error).message || "Could not match this cheque." });
        });
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [row.customerId, row.amount, row.dirty, row.id]);

  const amount = Number(row.amount);
  const cash = sumAmounts(Object.values(row.invoiceAmounts));
  const unapplied = Number.isFinite(amount) ? roundMoney(amount - cash) : 0;

  return (
    <div className="space-y-2 rounded border p-3">
      <div className="grid gap-2 md:grid-cols-4">
        <AsyncSearchableSelect
          value={row.customerId}
          onValueChange={(value) =>
            onChange({
              customerId: value,
              customer: value ? row.customer : null,
              dirty: false,
              invoiceAmounts: {},
              creditApplications: [],
              invoices: [],
              creditNotes: [],
              error: undefined,
            })
          }
          onOptionSelect={(option) => onChange({ customer: option, customerId: option?.id ?? row.customerId })}
          loadOptions={searchArCustomerOptionsApi}
          selectedOption={row.customer}
          placeholder={`Customer ${index + 1}`}
          searchPlaceholder="Type name, code, phone, or email"
          emptyMessage="No customers found."
          recentStorageKey="lookup:recent-customers"
        />
        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="Amount"
          value={row.amount}
          onChange={(event) => onChange({ amount: event.target.value, dirty: false, error: undefined })}
        />
        <Input
          placeholder="Cheque no."
          value={row.chequeNumber}
          onChange={(event) => onChange({ chequeNumber: event.target.value, error: undefined })}
        />
        <Input type="date" value={row.chequeDate} onChange={(event) => onChange({ chequeDate: event.target.value })} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {row.customerId
            ? `Cash ${formatMoney(cash, "KES")} · unapplied ${formatMoney(Math.max(unapplied, 0), "KES")}`
            : "Choose a customer to match invoices."}
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ expanded: !row.expanded })}>
          {row.expanded ? "Hide split" : "Edit split"}
        </Button>
      </div>
      {row.error ? <p className="text-xs text-destructive">{row.error}</p> : null}
      {row.expanded ? (
        <div className="grid gap-2 md:grid-cols-2">
          <div className="max-h-40 divide-y overflow-auto rounded border">
            {row.invoices.length === 0 ? (
              <p className="p-2 text-xs text-muted-foreground">No open invoices</p>
            ) : (
              row.invoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between gap-2 p-2 text-xs">
                  <span className="truncate">
                    {invoice.number} · {formatMoney(invoice.outstanding, "KES")}
                    {creditsOnInvoice(row.creditApplications, invoice.id) > 0
                      ? ` · credit ${formatMoney(creditsOnInvoice(row.creditApplications, invoice.id), "KES")}`
                      : ""}
                  </span>
                  <Input
                    type="number"
                    className="h-7 w-24"
                    value={row.invoiceAmounts[invoice.id] ?? ""}
                    onChange={(event) =>
                      onChange({
                        dirty: true,
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
          <div className="max-h-40 divide-y overflow-auto rounded border">
            {row.creditNotes.length === 0 ? (
              <p className="p-2 text-xs text-muted-foreground">No open credit notes</p>
            ) : (
              row.creditNotes.map((credit) => (
                <div key={credit.id} className="flex items-center justify-between gap-2 p-2 text-xs">
                  <span className="truncate">
                    {credit.number} · {formatMoney(credit.outstanding, "KES")}
                  </span>
                  <Input
                    type="number"
                    className="h-7 w-24"
                    value={creditUsed(row.creditApplications, credit.id) || ""}
                    onChange={(event) =>
                      onChange({
                        dirty: true,
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
      ) : null}
    </div>
  );
}

function rowProblem(row: ChequeRow, bankAccountId: string): string | null {
  if (!row.customerId) return "Select a customer.";
  const amount = Number(row.amount);
  if (!Number.isFinite(amount) || amount <= 0) return "Enter the cheque amount.";
  if (!row.chequeNumber.trim()) return "Enter the cheque number.";
  if (!row.chequeDate) return "Enter the cheque date.";
  if (!bankAccountId) return "Select the bank account for this deposit.";
  return settlementProblem({
    amount,
    invoices: row.invoices,
    creditNotes: row.creditNotes,
    invoiceAmounts: row.invoiceAmounts,
    creditApplications: row.creditApplications,
  });
}

export function ArChequeBoxSheet({
  open,
  bankAccounts,
  onOpenChange,
  onPosted,
}: {
  open: boolean;
  bankAccounts: Array<{ id: string; name: string }>;
  onOpenChange: (open: boolean) => void;
  onPosted: () => void;
}) {
  const [bankAccountId, setBankAccountId] = React.useState("");
  const [depositDate, setDepositDate] = React.useState(today());
  const [rows, setRows] = React.useState<ChequeRow[]>([blankRow(), blankRow(), blankRow()]);
  const [posting, setPosting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setBankAccountId("");
    setDepositDate(today());
    setRows([blankRow(), blankRow(), blankRow()]);
  }, [open]);

  const updateRow = (id: string, patch: Partial<ChequeRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const postBox = async () => {
    const ready = rows.filter((row) => row.customerId || row.amount || row.chequeNumber);
    if (!ready.length) {
      toast.error("Add at least one cheque.");
      return;
    }
    setPosting(true);
    const remaining: ChequeRow[] = [];
    let posted = 0;
    let failed = false;
    for (const row of rows) {
      const touched = Boolean(row.customerId || row.amount || row.chequeNumber);
      if (!touched) {
        remaining.push(row);
        continue;
      }
      const problem = rowProblem(row, bankAccountId);
      if (problem) {
        failed = true;
        remaining.push({ ...row, error: problem, expanded: true });
        continue;
      }
      try {
        await createArPaymentApi({
          customerId: row.customerId,
          amount: Number(row.amount),
          date: depositDate,
          bankAccountId,
          paymentMethod: "CHEQUE",
          chequeNumber: row.chequeNumber.trim(),
          chequeDate: row.chequeDate,
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
          error: (error as Error).message || "This cheque was not posted.",
          expanded: true,
        });
      }
    }
    setPosting(false);
    if (posted) {
      toast.success(posted === 1 ? "1 cheque posted." : `${posted} cheques posted.`);
      onPosted();
    }
    if (failed) {
      setRows(remaining);
      return;
    }
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto sm:w-[860px]">
        <SheetHeader>
          <SheetTitle>Record cheques</SheetTitle>
          <SheetDescription>
            One row is one cheque. Each row is matched to that customer&apos;s invoices and credit notes. A row that does not balance stays here.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
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
          </div>
          <div className="space-y-3">
            {rows.map((row, index) => (
              <ChequeRowCard key={row.id} row={row} index={index} onChange={(patch) => updateRow(row.id, patch)} />
            ))}
          </div>
          <SheetFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="outline" onClick={() => setRows((current) => [...current, blankRow()])}>
              Add cheque
            </Button>
            <Button type="button" onClick={postBox} disabled={posting}>
              {posting ? "Posting…" : "Post cheques"}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
