"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AsyncSearchableSelect } from "@/components/ui/async-searchable-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { fetchFinanceAccountsApi, type FinanceAccount } from "@/lib/api/finance";
import {
  createApChequeApi,
  fetchApOpenItemsApi,
  previewApSettlementApi,
  searchApSupplierOptionsApi,
} from "@/lib/api/payments";
import type { PartyLookupOption } from "@/lib/api/parties";
import {
  applyPreview,
  creditsOnInvoice,
  roundMoney,
  settlementProblem,
  sumAmounts,
} from "@/lib/ar/settlement-edit";
import { formatMoney } from "@/lib/money";
import type { ArOpenItem, CreditNoteApplicationLine } from "@/lib/types/ar";
import { toast } from "sonner";

type ChequeRow = {
  id: string;
  payeeName: string;
  supplierId: string;
  supplier: PartyLookupOption | null;
  amount: string;
  chequeNumber: string;
  chequeDate: string;
  releasedBy: string;
  releasedOn: string;
  useAccount: boolean;
  counterAccountId: string;
  bills: ArOpenItem[];
  creditNotes: ArOpenItem[];
  billAmounts: Record<string, number>;
  creditApplications: CreditNoteApplicationLine[];
  expanded: boolean;
  dirty: boolean;
  cancel: boolean;
  error?: string;
};

const today = () => new Date().toISOString().slice(0, 10);

function blankRow(): ChequeRow {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    payeeName: "",
    supplierId: "",
    supplier: null,
    amount: "",
    chequeNumber: "",
    chequeDate: today(),
    releasedBy: "",
    releasedOn: today(),
    useAccount: false,
    counterAccountId: "",
    bills: [],
    creditNotes: [],
    billAmounts: {},
    creditApplications: [],
    expanded: false,
    dirty: false,
    cancel: false,
  };
}

function asOpenItem(
  row: { id: string; number: string; outstanding: number },
  sourceType: ArOpenItem["sourceType"]
): ArOpenItem {
  return {
    id: row.id,
    number: row.number,
    date: "",
    customerId: "",
    customerName: "",
    total: row.outstanding,
    allocated: 0,
    outstanding: row.outstanding,
    status: "OPEN",
    sourceType,
  };
}

function accountRank(account: FinanceAccount): number {
  const name = `${account.name} ${account.code}`.toLowerCase();
  if (name.includes("director") || name.includes("drawing")) return 0;
  if (name.includes("tax") || name.includes("kra") || name.includes("vat")) return 1;
  return 2;
}

function rowProblem(row: ChequeRow, bankAccountId: string): string | null {
  if (!bankAccountId) return "Choose the bank account.";
  if (!row.chequeNumber.trim()) return "Enter the cheque number.";
  if (!row.chequeDate) return "Enter the cheque date.";
  const amount = Number(row.amount);
  if (!Number.isFinite(amount) || amount <= 0) return "Enter the amount.";
  if (!row.payeeName.trim()) return "Enter who the cheque is paid to.";
  if (row.cancel) return null;
  if (row.useAccount) {
    if (!row.counterAccountId) return "Choose the ledger account, such as a director's account.";
    return null;
  }
  if (!row.supplierId) return "Choose a supplier, or post this cheque to a ledger account.";
  const cash = sumAmounts(Object.values(row.billAmounts));
  if (cash <= 0) return "Choose bills, or post this cheque to a ledger account.";
  return settlementProblem({
    amount,
    invoices: row.bills,
    creditNotes: row.creditNotes,
    invoiceAmounts: row.billAmounts,
    creditApplications: row.creditApplications,
  });
}

function ChequeRowCard({
  row,
  index,
  accounts,
  onChange,
}: {
  row: ChequeRow;
  index: number;
  accounts: Array<{ id: string; label: string }>;
  onChange: (patch: Partial<ChequeRow>) => void;
}) {
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  React.useEffect(() => {
    const amount = Number(row.amount);
    if (!row.supplierId || row.useAccount || row.dirty || !Number.isFinite(amount) || amount <= 0) return;
    let cancelled = false;
    const handle = window.setTimeout(() => {
      Promise.all([
        fetchApOpenItemsApi(row.supplierId),
        previewApSettlementApi({ partyId: row.supplierId, amount }),
      ])
        .then(([items, preview]) => {
          if (cancelled) return;
          const applied = applyPreview(preview);
          onChangeRef.current({
            bills: items.bills.map((bill) => asOpenItem(bill, "invoice")),
            creditNotes: items.creditNotes.map((credit) => asOpenItem(credit, "credit-note")),
            billAmounts: applied.invoiceAmounts,
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
  }, [row.supplierId, row.amount, row.dirty, row.useAccount, row.id]);

  const amount = Number(row.amount);
  const cash = sumAmounts(Object.values(row.billAmounts));

  return (
    <div className="space-y-2 rounded border p-3">
      <div className="grid gap-2 md:grid-cols-4">
        <Input
          placeholder={`Paid to ${index + 1}`}
          value={row.payeeName}
          onChange={(event) => onChange({ payeeName: event.target.value, error: undefined })}
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
      <div className="grid gap-2 md:grid-cols-2">
        <AsyncSearchableSelect
          value={row.supplierId}
          onValueChange={(value) =>
            onChange({
              supplierId: value,
              supplier: value ? row.supplier : null,
              useAccount: value ? false : row.useAccount,
              dirty: false,
              billAmounts: {},
              creditApplications: [],
              bills: [],
              creditNotes: [],
              error: undefined,
            })
          }
          onOptionSelect={(option) =>
            onChange({
              supplier: option,
              supplierId: option?.id ?? row.supplierId,
              payeeName: option?.label || row.payeeName,
            })
          }
          loadOptions={searchApSupplierOptionsApi}
          selectedOption={row.supplier}
          placeholder="Supplier, if this pays a bill"
          searchPlaceholder="Type a supplier name"
          emptyMessage="No suppliers found."
          recentStorageKey="lookup:recent-suppliers"
          allowClear
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Released by"
            value={row.releasedBy}
            onChange={(event) => onChange({ releasedBy: event.target.value })}
          />
          <Input type="date" value={row.releasedOn} onChange={(event) => onChange({ releasedOn: event.target.value })} />
        </div>
      </div>
      {row.useAccount ? (
        <SearchableSelect
          value={row.counterAccountId}
          onValueChange={(value) => onChange({ counterAccountId: value, error: undefined })}
          options={accounts}
          placeholder="Ledger account"
          searchPlaceholder="Director, tax, or another account"
        />
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {row.cancel
            ? "This cheque will be recorded as cancelled."
            : row.useAccount
              ? "This cheque posts to the ledger account."
              : row.supplierId
                ? `Bills ${formatMoney(cash, "KES")}`
                : "Match a supplier, or post to an account."}
        </span>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange({ useAccount: !row.useAccount, cancel: false, error: undefined })}
          >
            {row.useAccount ? "Settle bills" : "No bill"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange({ cancel: !row.cancel, error: undefined })}
          >
            {row.cancel ? "Undo cancel" : "Cancel cheque"}
          </Button>
          {!row.useAccount && row.supplierId ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ expanded: !row.expanded })}>
              {row.expanded ? "Hide split" : "Edit split"}
            </Button>
          ) : null}
        </div>
      </div>
      {row.error ? <p className="text-xs text-destructive">{row.error}</p> : null}
      {row.expanded && !row.useAccount ? (
        <div className="grid gap-2 md:grid-cols-2">
          <div className="max-h-40 divide-y overflow-auto rounded border">
            {row.bills.length === 0 ? (
              <p className="p-2 text-xs text-muted-foreground">No open bills</p>
            ) : (
              row.bills.map((bill) => (
                <div key={bill.id} className="flex items-center justify-between gap-2 p-2 text-xs">
                  <span className="truncate">
                    {bill.number} · {formatMoney(bill.outstanding, "KES")}
                    {creditsOnInvoice(row.creditApplications, bill.id) > 0
                      ? ` · credit ${formatMoney(creditsOnInvoice(row.creditApplications, bill.id), "KES")}`
                      : ""}
                  </span>
                  <Input
                    type="number"
                    className="h-7 w-24"
                    value={row.billAmounts[bill.id] ?? ""}
                    onChange={(event) =>
                      onChange({
                        dirty: true,
                        billAmounts: { ...row.billAmounts, [bill.id]: Number(event.target.value) || 0 },
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
                <div key={credit.id} className="p-2 text-xs">
                  {credit.number} · {formatMoney(credit.outstanding, "KES")}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ApChequeBoxSheet({
  open,
  onOpenChange,
  bankAccounts,
  onPosted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankAccounts: Array<{ id: string; name: string }>;
  onPosted: () => Promise<void> | void;
}) {
  const [bankAccountId, setBankAccountId] = React.useState("");
  const [rows, setRows] = React.useState<ChequeRow[]>([blankRow(), blankRow(), blankRow()]);
  const [accounts, setAccounts] = React.useState<Array<{ id: string; label: string }>>([]);
  const [posting, setPosting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setBankAccountId("");
    setRows([blankRow(), blankRow(), blankRow()]);
    fetchFinanceAccountsApi()
      .then((list) => {
        const posting = list.filter((account) => account.posts !== false);
        posting.sort((a, b) => accountRank(a) - accountRank(b) || a.code.localeCompare(b.code));
        setAccounts(posting.map((account) => ({ id: account.id, label: `${account.code} ${account.name}` })));
      })
      .catch(() => setAccounts([]));
  }, [open]);

  const updateRow = (id: string, patch: Partial<ChequeRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const postBox = async () => {
    const ready = rows.filter((row) => row.payeeName || row.amount || row.chequeNumber);
    if (!ready.length) {
      toast.error("Add at least one cheque.");
      return;
    }
    const seen = new Set<string>();
    setPosting(true);
    const remaining: ChequeRow[] = [];
    let posted = 0;
    let failed = false;
    for (const row of rows) {
      const touched = Boolean(row.payeeName || row.amount || row.chequeNumber);
      if (!touched) {
        remaining.push(row);
        continue;
      }
      const numberKey = row.chequeNumber.trim().toLowerCase();
      const duplicate = numberKey && seen.has(numberKey);
      if (numberKey) seen.add(numberKey);
      const problem = duplicate ? `Cheque ${row.chequeNumber.trim()} is entered twice.` : rowProblem(row, bankAccountId);
      if (problem) {
        failed = true;
        remaining.push({ ...row, error: problem, expanded: true });
        continue;
      }
      try {
        await createApChequeApi({
          payeeName: row.payeeName.trim(),
          partyId: row.useAccount || row.cancel ? undefined : row.supplierId || undefined,
          amount: Number(row.amount),
          date: row.chequeDate,
          bankAccountId,
          chequeNumber: row.chequeNumber.trim(),
          chequeDate: row.chequeDate,
          releasedBy: row.releasedBy.trim() || undefined,
          releasedOn: row.releasedOn || undefined,
          counterAccountId: row.useAccount && !row.cancel ? row.counterAccountId : undefined,
          allocations:
            row.useAccount || row.cancel
              ? []
              : Object.entries(row.billAmounts)
                  .filter(([, value]) => value > 0)
                  .map(([documentId, value]) => ({ documentId, amount: roundMoney(value) })),
          creditNoteApplications:
            row.useAccount || row.cancel
              ? []
              : row.creditApplications
                  .filter((line) => line.amount > 0)
                  .map((line) => ({
                    creditNoteId: line.creditNoteId,
                    invoiceId: line.invoiceId,
                    amount: roundMoney(line.amount),
                  })),
          cancelled: row.cancel,
        });
        posted += 1;
      } catch (error) {
        failed = true;
        remaining.push({ ...row, error: (error as Error).message || "This cheque was not posted.", expanded: true });
      }
    }
    if (posted) {
      toast.success(posted === 1 ? "1 cheque recorded." : `${posted} cheques recorded.`);
      await onPosted();
    }
    if (failed) {
      setRows(remaining.length ? remaining : [blankRow()]);
    } else {
      onOpenChange(false);
    }
    setPosting(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:w-[760px] sm:max-w-[760px]">
        <SheetHeader>
          <SheetTitle>Record cheques</SheetTitle>
          <SheetDescription>
            One line per cheque. Match a supplier bill when there is one. Otherwise post it to an account, such as a director&apos;s account or tax.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          <div className="space-y-2">
            <Label>Bank account</Label>
            <SearchableSelect
              value={bankAccountId}
              onValueChange={setBankAccountId}
              options={bankAccounts.map((account) => ({ id: account.id, label: account.name }))}
              placeholder="Bank account"
              searchPlaceholder="Search bank accounts"
            />
          </div>
          {rows.map((row, index) => (
            <ChequeRowCard
              key={row.id}
              row={row}
              index={index}
              accounts={accounts}
              onChange={(patch) => updateRow(row.id, patch)}
            />
          ))}
          <Button type="button" variant="outline" onClick={() => setRows((current) => [...current, blankRow()])}>
            Add cheque
          </Button>
        </div>
        <SheetFooter className="mt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" onClick={() => void postBox()} disabled={posting}>
            {posting ? "Posting…" : "Post cheques"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
