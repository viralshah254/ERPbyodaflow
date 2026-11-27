"use client";

import * as React from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { SettlementEntryForm, focusEntryParty, type EntryDefaults, type EntryPrefill } from "@/components/finance/SettlementEntryForm";
import { createArPaymentApi, createBatchApPaymentApi, downloadArReceiptPdfApi } from "@/lib/api/payments";
import { fetchBankAccountsApi } from "@/lib/api/treasury-ops";
import { batchTotals, methodLabel, postingGroups, type BatchLine, type SettlementSide } from "@/lib/finance/settlement-batch";
import { FastEntryPanel, type FastEntrySettings } from "@/components/finance/FastEntryPanel";
import { roundMoney } from "@/lib/ar/settlement-edit";
import { isFmcgTemplateId } from "@/lib/fmcg/sfa-customer";
import { todayNairobiYmd } from "@/lib/format/nairobi-datetime";
import { formatMoney } from "@/lib/money";
import { useHasPermission } from "@/lib/rbac/use-write-guard";
import { useAuthStore } from "@/stores/auth-store";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { cn } from "@/lib/utils";

type PageCopy = {
  title: string;
  description: string;
  listHref: string;
  listLabel: string;
  permissions: string[];
  noun: string;
  nouns: string;
  emptyHint: string;
  partyColumn: string;
  paysColumn: string;
  leftChip: string;
  storage: string;
};

const PAGES: Record<SettlementSide, PageCopy> = {
  AR: {
    title: "Receive payments",
    description: "Record money from one or many customers in one sitting. Each customer becomes its own receipt. Nothing posts until you press Post.",
    listHref: "/ar/payments",
    listLabel: "AR Payments",
    permissions: ["finance.write", "finance.receipts.write"],
    noun: "receipt",
    nouns: "receipts",
    emptyHint: "Choose a customer, type the amount and how they paid, then press Add to list. Repeat for each customer on the bank statement or cheque list.",
    partyColumn: "Customer",
    paysColumn: "Pays",
    leftChip: "On account",
    storage: "erp.ar.receive-batch",
  },
  AP: {
    title: "Pay suppliers",
    description: "Pay one or many suppliers in one sitting. Each supplier becomes its own payment. Nothing posts until you press Post.",
    listHref: "/ap/payments",
    listLabel: "AP Payments",
    permissions: ["finance.write"],
    noun: "payment",
    nouns: "payments",
    emptyHint: "Choose a supplier, type the amount and how you paid, then press Add to list. Repeat for each supplier you are paying today.",
    partyColumn: "Supplier",
    paysColumn: "Settles",
    leftChip: "Advance",
    storage: "erp.ap.pay-batch",
  },
};

function instrument(line: BatchLine): string {
  if (line.method === "CHEQUE") return ["Cheque", line.chequeNumber, line.chequeDate].filter(Boolean).join(" · ");
  if (line.method === "MPESA") return `M-Pesa ${line.mpesaTransactionNo}`;
  if (line.method === "CASH") return "Cash";
  return line.bankAccountName || "Bank transfer";
}

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
    window.sessionStorage.removeItem(key);
  } catch {
    /* storage full or blocked: the batch still works for this visit */
  }
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);

/** A plain list to bank the physical cheques with: number, drawer, amount, total. */
function printBankingList(lines: BatchLine[]) {
  const cheques = lines.filter((line) => line.method === "CHEQUE");
  if (!cheques.length) {
    toast.message("There are no cheques in this batch.");
    return;
  }
  const byBank = new Map<string, BatchLine[]>();
  for (const line of cheques) {
    const bank = line.bankAccountName || "No bank account";
    byBank.set(bank, [...(byBank.get(bank) ?? []), line]);
  }
  const sections = [...byBank.entries()]
    .map(([bank, rows]) => {
      const total = roundMoney(rows.reduce((sum, row) => sum + row.amount, 0));
      const body = rows
        .map(
          (row, index) =>
            `<tr><td>${index + 1}</td><td>${escapeHtml(row.chequeNumber)}</td><td>${escapeHtml(row.partyName)}</td><td>${escapeHtml(row.chequeDate || row.date)}</td><td class="n">${escapeHtml(formatMoney(row.amount, "KES"))}</td></tr>`,
        )
        .join("");
      return `<h2>${escapeHtml(bank)}</h2><table><thead><tr><th>#</th><th>Cheque no.</th><th>From</th><th>Date</th><th class="n">Amount</th></tr></thead><tbody>${body}</tbody><tfoot><tr><td colspan="4">${rows.length} cheque${rows.length === 1 ? "" : "s"}</td><td class="n">${escapeHtml(formatMoney(total, "KES"))}</td></tr></tfoot></table>`;
    })
    .join("");
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    toast.error("Allow pop-ups to print the banking list.");
    return;
  }
  win.document.write(
    `<!doctype html><html><head><title>Cheques to bank</title><style>body{font:13px system-ui,sans-serif;margin:24px;color:#111}h1{font-size:18px;margin:0 0 4px}h2{font-size:14px;margin:20px 0 6px}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #ddd;padding:5px 6px;text-align:left}th{font-size:11px;text-transform:uppercase;color:#555}.n{text-align:right;font-variant-numeric:tabular-nums}tfoot td{font-weight:600;border-top:2px solid #111}</style></head><body><h1>Cheques to bank</h1><div>Printed ${escapeHtml(new Date().toLocaleString("en-KE"))}</div>${sections}</body></html>`,
  );
  win.document.close();
  win.focus();
  win.print();
}

/** Payment numbers are count + 1 on the server, so parallel posts could take the same number. */
const POST_WORKERS = 1;

function loadBatch(key: string): BatchLine[] {
  try {
    const raw = window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as BatchLine[]) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((line) => typeof line?.partyId === "string")
      .map((line) =>
        line.status === "posting"
          ? { ...line, status: "failed" as const, error: "Not confirmed. Check the payments list before posting again." }
          : line,
      );
  } catch {
    return [];
  }
}

function postLine(side: SettlementSide, line: BatchLine): Promise<{ id: string; number: string }> {
  const body = {
    clientRequestId: line.clientRequestId,
    customerId: line.partyId,
    amount: line.amount,
    date: line.date,
    bankAccountId: line.bankAccountId || undefined,
    paymentMethod: line.method,
    mpesaTransactionNo: line.mpesaTransactionNo || undefined,
    reference: line.reference || undefined,
    chequeNumber: line.chequeNumber || undefined,
    chequeDate: line.chequeDate || undefined,
    allocations: line.allocations
      .filter((row) => row.amount > 0)
      .map((row) => ({ documentId: row.invoiceId, amount: roundMoney(row.amount) })),
    creditNoteApplications: line.creditApplications
      .filter((row) => row.amount > 0)
      .map((row) => ({ creditNoteId: row.creditNoteId, invoiceId: row.invoiceId, amount: roundMoney(row.amount) })),
  };
  return side === "AR" ? createArPaymentApi(body) : createBatchApPaymentApi({ ...body, payeeName: line.partyName });
}

export function SettlementBatchPage({ side, prefill }: { side: SettlementSide; prefill: EntryPrefill | null }) {
  const page = PAGES[side];
  const canRecord = useHasPermission(...page.permissions);
  const orgId = useAuthStore((s) => s.org?.orgId ?? "");
  const templateId = useOrgContextStore((s) => s.templateId);
  const issueReceipt = side === "AR" && isFmcgTemplateId(templateId);
  const today = todayNairobiYmd();
  const storageKey = `${page.storage}.${orgId || "org"}`;
  const breadcrumbs = [
    { label: "Finance", href: "/finance" },
    { label: page.listLabel, href: page.listHref },
    { label: page.title },
  ];

  const [bankAccounts, setBankAccounts] = React.useState<Array<{ id: string; name: string }>>([]);
  const [lines, setLines] = React.useState<BatchLine[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [editingKey, setEditingKey] = React.useState<string | null>(null);
  const [posting, setPosting] = React.useState(false);
  const [progress, setProgress] = React.useState({ done: 0, total: 0 });
  const [mode, setMode] = React.useState<"fast" | "form">("fast");
  const [fast, setFast] = React.useState<FastEntrySettings>({ method: "CHEQUE", bankAccountId: "", date: today, tally: "" });
  const [defaults, setDefaults] = React.useState<EntryDefaults>({
    date: today,
    method: "BANK_TRANSFER",
    bankAccountId: "",
    chequeDate: today,
  });

  React.useEffect(() => {
    fetchBankAccountsApi()
      .then((rows) => setBankAccounts(rows.filter((row) => row.active !== false).map((row) => ({ id: row.id, name: row.name }))))
      .catch(() => setBankAccounts([]));
  }, []);

  React.useEffect(() => {
    const restored = loadBatch(storageKey);
    setLines(restored);
    const savedMode = readJson<"fast" | "form">(`${storageKey}.mode`);
    setMode(prefill ? "form" : savedMode === "form" ? "form" : "fast");
    const savedFast = readJson<FastEntrySettings>(`${storageKey}.fast`);
    if (savedFast) {
      setFast(restored.length ? savedFast : { ...savedFast, date: todayNairobiYmd(), tally: "" });
    }
    setLoaded(true);
  }, [storageKey, prefill]);

  React.useEffect(() => {
    if (!loaded) return;
    writeJson(storageKey, lines.length ? lines : null);
  }, [lines, loaded, storageKey]);

  React.useEffect(() => {
    if (!loaded) return;
    writeJson(`${storageKey}.mode`, mode);
    writeJson(`${storageKey}.fast`, fast);
  }, [mode, fast, loaded, storageKey]);

  const waiting = lines.filter((line) => line.status === "ready" || line.status === "failed");
  const posted = lines.filter((line) => line.status === "posted");

  React.useEffect(() => {
    if (!waiting.length) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [waiting.length]);

  const editing = lines.find((line) => line.key === editingKey) ?? null;

  const saveLine = (draft: Omit<BatchLine, "key" | "clientRequestId" | "status">) => {
    setDefaults((current) => ({
      date: draft.date,
      method: draft.method,
      bankAccountId: draft.bankAccountId || current.bankAccountId,
      chequeDate: draft.chequeDate || draft.date,
    }));
    if (editing) {
      setLines((current) =>
        current.map((line) =>
          line.key === editing.key ? { ...draft, key: line.key, clientRequestId: crypto.randomUUID(), status: "ready" } : line,
        ),
      );
      setEditingKey(null);
      toast.success(`Updated ${draft.partyName}.`);
      return;
    }
    setLines((current) => [...current, { ...draft, key: crypto.randomUUID(), clientRequestId: crypto.randomUUID(), status: "ready" }]);
  };

  const removeLine = (key: string) => {
    setLines((current) => current.filter((line) => line.key !== key));
    if (editingKey === key) setEditingKey(null);
  };

  const postAll = async () => {
    const queue = lines.filter((line) => line.status === "ready" || line.status === "failed");
    if (!queue.length || posting) return;
    setEditingKey(null);
    setPosting(true);
    setProgress({ done: 0, total: queue.length });
    let ok = 0;
    let failed = 0;
    const groups = postingGroups(queue);
    const worker = async () => {
      for (let group = groups.shift(); group; group = groups.shift()) {
        for (const line of group) {
          setLines((current) => current.map((row) => (row.key === line.key ? { ...row, status: "posting", error: undefined } : row)));
          try {
            const result = await postLine(side, line);
            ok += 1;
            setLines((current) =>
              current.map((row) =>
                row.key === line.key ? { ...row, status: "posted", paymentId: result.id, paymentNumber: result.number } : row,
              ),
            );
          } catch (error) {
            failed += 1;
            const message = (error as Error).message || `Could not post this ${page.noun}.`;
            setLines((current) => current.map((row) => (row.key === line.key ? { ...row, status: "failed", error: message } : row)));
          }
          setProgress((current) => ({ ...current, done: current.done + 1 }));
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(POST_WORKERS, groups.length) }, worker));
    setPosting(false);
    if (failed === 0) toast.success(`${ok} ${ok === 1 ? page.noun : page.nouns} posted.`);
    else toast.error(`${ok} posted, ${failed} need attention. Fix them in the list and post again.`);
  };

  const totals = batchTotals(waiting);
  const postedTotal = batchTotals(posted);

  if (!canRecord) {
    return (
      <PageShell>
        <PageHeader title={page.title} breadcrumbs={breadcrumbs} />
        <p className="text-sm text-muted-foreground">You do not have permission to record {page.nouns}.</p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title={page.title}
        description={page.description}
        breadcrumbs={breadcrumbs}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div role="radiogroup" aria-label="Entry mode" className="flex gap-1 rounded-lg border bg-muted/40 p-1">
              {(
                [
                  { value: "fast", label: "Fast entry", icon: Icons.Zap },
                  { value: "form", label: "One at a time", icon: Icons.ListChecks },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={mode === option.value}
                  onClick={() => {
                    setMode(option.value);
                    setEditingKey(null);
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    mode === option.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <option.icon className="h-3.5 w-3.5" aria-hidden />
                  {option.label}
                </button>
              ))}
            </div>
            <Button variant="outline" asChild>
              <Link href={page.listHref}>
                <Icons.ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
                {page.listLabel}
              </Link>
            </Button>
          </div>
        }
      />

      <div className="space-y-4 pb-28">
        {mode === "fast" && !editing ? (
          <FastEntryPanel
            side={side}
            lines={lines}
            settings={fast}
            onSettingsChange={setFast}
            bankAccounts={bankAccounts}
            today={today}
            onAdd={saveLine}
          />
        ) : (
          <SettlementEntryForm
            side={side}
            lines={lines}
            editing={editing}
            defaults={defaults}
            prefill={prefill}
            bankAccounts={bankAccounts}
            today={today}
            onSave={saveLine}
            onCancelEdit={() => setEditingKey(null)}
          />
        )}

        <section aria-label={`${page.nouns} in this batch`} className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 sm:px-5">
            <div>
              <h2 className="text-sm font-semibold">
                {page.nouns[0].toUpperCase() + page.nouns.slice(1)} to post{" "}
                {waiting.length ? <span className="text-muted-foreground">· {waiting.length}</span> : null}
              </h2>
              <p className="text-xs text-muted-foreground">
                {waiting.length
                  ? totals.byMethod.map((row) => `${methodLabel(row.method)} ${formatMoney(row.total, "KES")} (${row.count})`).join(" · ")
                  : `${page.nouns[0].toUpperCase() + page.nouns.slice(1)} you add appear here.`}
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {side === "AR" && lines.some((line) => line.method === "CHEQUE") ? (
                <Button type="button" variant="outline" size="sm" onClick={() => printBankingList(lines)}>
                  <Icons.Printer className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                  Banking list
                </Button>
              ) : null}
              {posted.length ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => setLines((current) => current.filter((line) => line.status !== "posted"))}>
                  Clear {posted.length} posted
                </Button>
              ) : null}
            </div>
          </div>

          {lines.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <Icons.Inbox className="h-8 w-8 text-muted-foreground/60" aria-hidden />
              <p className="text-sm font-medium">No {page.nouns} yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">{page.emptyHint}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="w-10 px-4 py-2 text-left font-medium">#</th>
                    <th className="px-2 py-2 text-left font-medium">{page.partyColumn}</th>
                    <th className="px-2 py-2 text-left font-medium">Paid by</th>
                    <th className="px-2 py-2 text-right font-medium">Amount</th>
                    <th className="px-2 py-2 text-left font-medium">{page.paysColumn}</th>
                    <th className="px-2 py-2 text-left font-medium">Status</th>
                    <th className="w-28 px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(mode === "fast" ? [...lines].reverse() : lines).map((line) => (
                    <BatchRow
                      key={line.key}
                      line={line}
                      index={lines.indexOf(line)}
                      page={page}
                      side={side}
                      editing={line.key === editingKey}
                      busy={posting}
                      issueReceipt={issueReceipt}
                      onEdit={() => {
                        setEditingKey(line.key);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                        focusEntryParty();
                      }}
                      onRemove={() => removeLine(line.key)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {lines.length > 0 ? (
        <div className="sticky bottom-0 z-10 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
              <span>
                <span className="text-muted-foreground">To post </span>
                <span className="text-lg font-semibold tabular-nums">{formatMoney(totals.total, "KES")}</span>
                <span className="text-muted-foreground"> in {totals.count} {totals.count === 1 ? page.noun : page.nouns}</span>
              </span>
              {posted.length ? (
                <span className="text-muted-foreground">
                  Posted {formatMoney(postedTotal.total, "KES")} ({postedTotal.count})
                </span>
              ) : null}
            </div>
            <Button type="button" size="lg" onClick={postAll} disabled={posting || waiting.length === 0 || Boolean(editingKey)}>
              {posting ? <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Icons.Send className="mr-2 h-4 w-4" aria-hidden />}
              {posting ? `Posting ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…` : `Post ${waiting.length || ""} ${waiting.length === 1 ? page.noun : page.nouns}`}
            </Button>
          </div>
          {editingKey ? <p className="mt-1 text-xs text-muted-foreground">Finish or cancel the edit before posting.</p> : null}
        </div>
      ) : null}
    </PageShell>
  );
}

function BatchRow({
  line,
  index,
  page,
  side,
  editing,
  busy,
  issueReceipt,
  onEdit,
  onRemove,
}: {
  line: BatchLine;
  index: number;
  page: PageCopy;
  side: SettlementSide;
  editing: boolean;
  busy: boolean;
  issueReceipt: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const locked = line.status === "posted" || line.status === "posting";
  const postedHref =
    side === "AR" ? `/ar/payments?paymentSearch=${encodeURIComponent(line.paymentNumber ?? "")}` : page.listHref;
  return (
    <tr className={cn("align-top", editing && "bg-primary/5", line.status === "posted" && "text-muted-foreground")}>
      <td className="px-4 py-3 tabular-nums text-muted-foreground">{index + 1}</td>
      <td className="px-2 py-3">
        <div className="font-medium text-foreground">{line.partyName}</div>
        <div className="text-xs text-muted-foreground">{line.date}</div>
      </td>
      <td className="px-2 py-3">
        <div>{instrument(line)}</div>
        {line.reference ? (
          <div className="max-w-[14rem] truncate text-xs text-muted-foreground" title={line.reference}>
            {line.reference}
          </div>
        ) : null}
      </td>
      <td className="px-2 py-3 text-right font-semibold tabular-nums text-foreground">{formatMoney(line.amount, "KES")}</td>
      <td className="px-2 py-3">
        <div className="flex max-w-[22rem] flex-wrap gap-1">
          {line.allocations.map((row) => (
            <span
              key={`${row.invoiceId}-${row.tied ? "t" : "s"}`}
              title={row.tied ? "Chosen by you" : "Soonest due first"}
              className={cn(
                "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs",
                row.tied ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
              )}
            >
              {row.tied ? <Icons.Link2 className="h-3 w-3" aria-hidden /> : null}
              {row.invoiceNumber} · {formatMoney(row.amount, "KES")}
            </span>
          ))}
          {line.creditApplications.map((row) => (
            <span key={`${row.creditNoteId}-${row.invoiceId}`} className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              {row.creditNoteNumber} → {row.invoiceNumber} · {formatMoney(row.amount, "KES")}
            </span>
          ))}
          {line.unapplied > 0.009 ? (
            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-700 dark:text-amber-400">
              {page.leftChip} · {formatMoney(line.unapplied, "KES")}
            </span>
          ) : null}
        </div>
      </td>
      <td className="px-2 py-3">
        {line.status === "ready" ? <span className="text-xs text-muted-foreground">Ready</span> : null}
        {line.status === "posting" ? (
          <span className="inline-flex items-center gap-1 text-xs">
            <Icons.Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Posting
          </span>
        ) : null}
        {line.status === "posted" ? (
          <Link href={postedHref} className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400">
            <Icons.CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> {line.paymentNumber}
          </Link>
        ) : null}
        {line.status === "failed" ? (
          <span className="inline-flex max-w-[16rem] items-start gap-1 text-xs text-destructive">
            <Icons.AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {line.error}
          </span>
        ) : null}
      </td>
      <td className="px-4 py-2 text-right">
        {line.status === "posted" && issueReceipt && line.paymentId ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              void downloadArReceiptPdfApi(line.paymentId!, `${line.paymentNumber}.pdf`, (message) => toast.error(message));
            }}
          >
            Receipt
          </Button>
        ) : null}
        {!locked ? (
          <div className="flex justify-end gap-1">
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onEdit} aria-label={`Edit ${line.partyName}`}>
              <Icons.Pencil className="h-3.5 w-3.5" aria-hidden />
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onRemove} aria-label={`Remove ${line.partyName}`}>
              <Icons.Trash2 className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </div>
        ) : null}
      </td>
    </tr>
  );
}
