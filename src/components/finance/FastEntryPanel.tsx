"use client";

import * as React from "react";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AsyncSearchableSelect } from "@/components/ui/async-searchable-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { PartyLookupOption } from "@/lib/api/parties";
import { sumAmounts } from "@/lib/ar/settlement-edit";
import { parseReceiptMoney } from "@/lib/ar/receipt-money";
import {
  PAYMENT_METHODS,
  batchClaims,
  likelyDuplicate,
  needsBankAccount,
  suggestLine,
  type BatchLine,
  withoutClaims,
  type PaymentMethod,
  type SettlementSide,
} from "@/lib/finance/settlement-batch";
import { SETTLEMENT_SOURCES, loadPartyOpenItems, type PartyOpenItems } from "@/lib/finance/settlement-sources";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export type FastEntrySettings = {
  method: PaymentMethod;
  bankAccountId: string;
  date: string;
};

const money = (value: number) => formatMoney(value, "KES");

function instrumentLabel(method: PaymentMethod): string {
  if (method === "CHEQUE") return "Cheque no.";
  if (method === "MPESA") return "M-Pesa code";
  return "Reference";
}

export function FastEntryPanel({
  side,
  lines,
  settings,
  onSettingsChange,
  bankAccounts,
  today,
  onAdd,
}: {
  side: SettlementSide;
  lines: BatchLine[];
  settings: FastEntrySettings;
  onSettingsChange: (next: FastEntrySettings) => void;
  bankAccounts: Array<{ id: string; name: string }>;
  today: string;
  onAdd: (line: Omit<BatchLine, "key" | "clientRequestId" | "status">) => void;
}) {
  const party = side === "AR" ? "customer" : "supplier";
  const docs = side === "AR" ? "invoices" : "bills";
  const doc = side === "AR" ? "invoice" : "bill";
  const source = SETTLEMENT_SOURCES[side];
  const [partyId, setPartyId] = React.useState("");
  const [partyOption, setPartyOption] = React.useState<PartyLookupOption | null>(null);
  const [instrument, setInstrument] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [documents, setDocuments] = React.useState("");
  const [items, setItems] = React.useState<PartyOpenItems | null>(null);
  const [problem, setProblem] = React.useState("");
  const [confirmDuplicate, setConfirmDuplicate] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const [openSignal, setOpenSignal] = React.useState("start");
  const cache = React.useRef(new Map<string, Promise<PartyOpenItems>>());
  const instrumentRef = React.useRef<HTMLInputElement | null>(null);
  const amountRef = React.useRef<HTMLInputElement | null>(null);

  const postedCount = lines.filter((line) => line.status === "posted").length;
  React.useEffect(() => {
    cache.current.clear();
  }, [postedCount]);

  const itemsFor = React.useCallback(
    (id: string) => {
      let pending = cache.current.get(id);
      if (!pending) {
        pending = loadPartyOpenItems(side, id);
        pending.catch(() => cache.current.delete(id));
        cache.current.set(id, pending);
      }
      return pending;
    },
    [side],
  );

  React.useEffect(() => {
    setItems(null);
    if (!partyId) return;
    let cancelled = false;
    itemsFor(partyId)
      .then((loaded) => {
        if (!cancelled) setItems(loaded);
      })
      .catch((error) => {
        if (!cancelled) setProblem((error as Error).message || `Could not load this ${party}'s open ${docs}.`);
      });
    return () => {
      cancelled = true;
    };
  }, [partyId, itemsFor, party, docs]);

  const parsedAmount = parseReceiptMoney(amount);
  const value = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0;
  // Open documents the box can suggest: not already claimed by another line in this batch.
  const openDocs = React.useMemo(
    () => (partyId && items ? withoutClaims(items.invoices, batchClaims(lines, partyId).invoices) : []),
    [partyId, items, lines],
  );
  const preview =
    partyId && items
      ? suggestLine({ partyId, amount: value, lines, documents, invoices: items.invoices, creditNotes: items.creditNotes, credits: items.credits })
      : null;

  const entered = sumAmounts(lines.map((line) => line.amount));

  const clearRow = () => {
    setPartyId("");
    setPartyOption(null);
    setInstrument("");
    setAmount("");
    setDocuments("");
    setProblem("");
    setConfirmDuplicate("");
    setOpenSignal(crypto.randomUUID());
  };

  const add = async () => {
    if (adding) return;
    const method = settings.method;
    const check =
      needsBankAccount(method) && !settings.bankAccountId
        ? "Choose the bank account at the top first."
        : !settings.date
          ? "Choose the date at the top first."
          : !partyId
            ? `Choose the ${party}.`
            : (method === "CHEQUE" || method === "MPESA") && !instrument.trim()
              ? `Enter the ${instrumentLabel(method).toLowerCase()}`
              : !Number.isFinite(parsedAmount) || value <= 0
                ? "Enter the amount."
                : "";
    if (check) {
      setProblem(check);
      if (!partyId) setOpenSignal(crypto.randomUUID());
      else if ((method === "CHEQUE" || method === "MPESA") && !instrument.trim()) instrumentRef.current?.focus();
      else amountRef.current?.focus();
      return;
    }
    const code = instrument.trim();
    const draft = {
      partyId,
      amount: value,
      method,
      reference: method === "CHEQUE" || method === "MPESA" ? "" : code,
      chequeNumber: method === "CHEQUE" ? code : "",
      mpesaTransactionNo: method === "MPESA" ? code.toUpperCase() : "",
    };
    const duplicate = likelyDuplicate(lines, draft);
    const signature = `${partyId}|${code}|${value}`;
    if (duplicate && confirmDuplicate !== signature) {
      const row = lines.indexOf(duplicate) + 1;
      setConfirmDuplicate(signature);
      setProblem(
        `Looks like row ${row} (${duplicate.partyName}, ${money(duplicate.amount)}) again. Press Enter again to add it anyway.`,
      );
      amountRef.current?.focus();
      return;
    }
    setAdding(true);
    try {
      const loaded = await itemsFor(partyId);
      const plan = suggestLine({ partyId, amount: value, lines, documents, invoices: loaded.invoices, creditNotes: loaded.creditNotes, credits: loaded.credits });
      if (side === "AP" && method === "CHEQUE" && plan.allocations.length === 0) {
        setProblem("This supplier has no open bills. A supplier cheque must pay a bill.");
        return;
      }
      onAdd({
        ...draft,
        reference: [draft.reference, plan.unknown.length ? `Typed ${doc} ${plan.unknown.join(", ")}` : ""].filter(Boolean).join(" · "),
        partyName: partyOption?.label ?? partyId,
        date: settings.date,
        bankAccountId: method === "CASH" ? "" : settings.bankAccountId,
        bankAccountName: method === "CASH" ? "" : bankAccounts.find((account) => account.id === settings.bankAccountId)?.name ?? "",
        chequeDate: method === "CHEQUE" ? settings.date : "",
        allocations: plan.allocations,
        creditApplications: plan.creditApplications,
        unapplied: plan.unapplied,
      });
      clearRow();
    } catch (error) {
      setProblem((error as Error).message || `Could not load this ${party}'s open ${docs}.`);
    } finally {
      setAdding(false);
    }
  };

  const onFieldKey = (event: React.KeyboardEvent<HTMLInputElement>, next: () => void) => {
    if (event.key === "Enter") {
      event.preventDefault();
      next();
    } else if (event.key === "Escape") {
      event.preventDefault();
      clearRow();
    }
  };

  const set = (patch: Partial<FastEntrySettings>) => onSettingsChange({ ...settings, ...patch });

  return (
    <section aria-label="Fast entry" className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="grid gap-3 border-b bg-muted/30 px-4 py-3 sm:px-5 md:grid-cols-[auto_minmax(0,1.4fr)_10rem]">
        <div className="space-y-1">
          <Label className="text-xs">Paid by</Label>
          <div role="radiogroup" aria-label="Payment method" className="flex gap-1 rounded-lg border bg-background/60 p-1">
            {PAYMENT_METHODS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={settings.method === option.value}
                onClick={() => set({ method: option.value })}
                className={cn(
                  "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                  settings.method === option.value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{side === "AR" ? "Banking into" : "Paying from"}</Label>
          {settings.method === "CASH" ? (
            <p className="flex h-10 items-center text-sm text-muted-foreground">Cash — no bank account</p>
          ) : (
            <SearchableSelect
              value={settings.bankAccountId}
              onValueChange={(id) => set({ bankAccountId: id })}
              options={bankAccounts.map((account) => ({ id: account.id, label: account.name }))}
              placeholder="Choose bank account"
              searchPlaceholder="Find bank account"
            />
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="fast-entry-date" className="text-xs">
            {side === "AR" ? "Date received" : "Date paid"}
          </Label>
          <Input id="fast-entry-date" type="date" value={settings.date} max={today} onChange={(event) => set({ date: event.target.value })} />
        </div>
      </div>

      <div className="px-4 py-4 sm:px-5">
        <div className="grid items-end gap-2 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <div className="space-y-1">
            <Label className="text-xs">{party === "customer" ? "Customer" : "Supplier"}</Label>
            <AsyncSearchableSelect
              value={partyId}
              onValueChange={(id) => {
                setPartyId(id);
                setProblem("");
                setConfirmDuplicate("");
              }}
              onOptionSelect={(option) => {
                setPartyOption(option);
                if (option) window.setTimeout(() => instrumentRef.current?.focus(), 0);
              }}
              loadOptions={source.loadParties}
              selectedOption={partyOption}
              placeholder={`Type ${party} name or code`}
              searchPlaceholder="Name, code, phone"
              emptyMessage={`No ${party}s found.`}
              openSignal={openSignal}
              searchDebounceMs={150}
              showDragHandle={false}
              recentStorageKey={`erp.fast-entry.${side}.recent`}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fast-entry-instrument" className="text-xs">
              {instrumentLabel(settings.method)}
              {settings.method === "CHEQUE" || settings.method === "MPESA" ? null : (
                <span className="font-normal text-muted-foreground"> (optional)</span>
              )}
            </Label>
            <Input
              id="fast-entry-instrument"
              ref={instrumentRef}
              autoComplete="off"
              inputMode={settings.method === "CHEQUE" ? "numeric" : "text"}
              className={cn("tabular-nums", settings.method === "MPESA" && "uppercase")}
              value={instrument}
              onChange={(event) => {
                setInstrument(event.target.value);
                setConfirmDuplicate("");
              }}
              onKeyDown={(event) => onFieldKey(event, () => amountRef.current?.focus())}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fast-entry-amount" className="text-xs">
              Amount
            </Label>
            <Input
              id="fast-entry-amount"
              ref={amountRef}
              inputMode="decimal"
              autoComplete="off"
              className="text-right font-medium tabular-nums"
              placeholder="0.00"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setConfirmDuplicate("");
              }}
              onKeyDown={(event) => onFieldKey(event, () => void add())}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fast-entry-documents" className="text-xs">
              For {doc} <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="fast-entry-documents"
              list="fast-entry-open-docs"
              autoComplete="off"
              className="tabular-nums"
              placeholder={partyId ? "Type or pick" : `Choose the ${party} first`}
              disabled={!partyId}
              value={documents}
              onChange={(event) => {
                setDocuments(event.target.value);
                setProblem("");
              }}
              onKeyDown={(event) => onFieldKey(event, () => void add())}
            />
            <datalist id="fast-entry-open-docs">
              {openDocs.map((invoice) => (
                <option key={invoice.id} value={invoice.number}>
                  {`${money(invoice.outstanding)} · ${invoice.dueDate ? `due ${invoice.dueDate}` : invoice.date}`}
                </option>
              ))}
            </datalist>
          </div>
          <Button type="button" onClick={() => void add()} disabled={adding} className="h-10">
            {adding ? <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Icons.CornerDownLeft className="mr-2 h-4 w-4" aria-hidden />}
            Add
          </Button>
        </div>

        <div className="mt-2 min-h-[1.25rem] text-xs">
          {problem ? (
            <p className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
              <Icons.AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {problem}
            </p>
          ) : partyId && !items ? (
            <p className="text-muted-foreground">Loading open {docs}…</p>
          ) : preview ? (
            <p className="text-muted-foreground">
              {side === "AR" ? "Owes" : "We owe"} {money(preview.owing)}
              {value > 0 && preview.allocations.length ? (
                <>
                  {" · pays "}
                  <span className="text-foreground">
                    {preview.allocations.map((row) => `${row.invoiceNumber} ${money(row.amount)}${row.tied ? " (named)" : ""}`).join(", ")}
                  </span>
                </>
              ) : null}
              {value > 0 && preview.unapplied > 0.009 ? (
                <span className="text-amber-700 dark:text-amber-400">
                  {" · "}
                  {money(preview.unapplied)} {side === "AR" ? "more than owed, stays on account" : "more than owed, recorded as an advance"}
                </span>
              ) : null}
              {preview.unknown.length ? (
                <span className="text-muted-foreground">
                  {" · "}
                  Not an open {doc}: {preview.unknown.join(", ")}. Kept on the line; the amount is allocated automatically.
                </span>
              ) : null}
            </p>
          ) : (
            <p className="text-muted-foreground">
              Type the {party}, press Enter, type the {instrumentLabel(settings.method).toLowerCase()}, Enter, the amount, Enter. To pay a specific {doc}, press Tab after the amount and type its number. Esc clears the row.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t bg-muted/20 px-4 py-2.5 text-sm sm:px-5">
        <span>
          <span className="font-semibold tabular-nums">{lines.length}</span>
          <span className="text-muted-foreground"> {lines.length === 1 ? "line" : "lines"} · </span>
          <span className="font-semibold tabular-nums">{money(entered)}</span>
          <span className="text-muted-foreground"> entered</span>
        </span>
      </div>
    </section>
  );
}
