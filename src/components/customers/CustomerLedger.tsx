"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { statementDocHref } from "@/components/finance/PartyStatementPanel";
import {
  allTimeStatementDates,
  downloadPartyStatementPdfApi,
  emailPartyStatementApi,
  fetchPartyStatementApi,
  type PartyStatement,
  type PartyStatementLine,
} from "@/lib/api/party-statements";
import { formatActivityExact, formatActivityWhen } from "@/lib/format/nairobi-datetime";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const PAGE_SIZE_OPTIONS = [15, 30, 60];

function monthStart(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

function presets(now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const last90 = new Date(now);
  last90.setUTCDate(last90.getUTCDate() - 89);
  const yearStart = `${now.getUTCFullYear()}-01-01`;
  return [
    { id: "month", label: "This month", from: monthStart(now), to: today },
    { id: "90", label: "Last 90 days", from: last90.toISOString().slice(0, 10), to: today },
    { id: "year", label: "This year", from: yearStart, to: today },
    { id: "all", label: "All time", ...allTimeStatementDates(now) },
  ];
}

function prettyRange(from: string, to: string) {
  const fmt = (value: string) => formatActivityExact(value) || value;
  if (from.startsWith("2000-01-01")) return `All activity through ${fmt(to)}`;
  return `${fmt(from)} – ${fmt(to)}`;
}

export function CustomerLedger({
  partyId,
  partyName,
  canEmail,
}: {
  partyId: string;
  partyName: string;
  canEmail: boolean;
}) {
  const router = useRouter();
  const initial = React.useMemo(() => allTimeStatementDates(), []);
  const [from, setFrom] = React.useState(initial.from);
  const [to, setTo] = React.useState(initial.to);
  const [activePreset, setActivePreset] = React.useState("all");
  const [statement, setStatement] = React.useState<PartyStatement | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [emailTo, setEmailTo] = React.useState("");
  const [emailing, setEmailing] = React.useState(false);
  const [pageSize, setPageSize] = React.useState(15);
  const [pageOffset, setPageOffset] = React.useState(0);

  const load = React.useCallback(
    async (range: { from: string; to: string }) => {
      setLoading(true);
      try {
        const data = await fetchPartyStatementApi("customer", partyId, range.from, range.to);
        setStatement(data);
        setEmailTo((current) => current || data.party.email || "");
        setPageOffset(0);
      } catch (error) {
        setStatement(null);
        toast.error((error as Error).message || "Failed to load ledger");
      } finally {
        setLoading(false);
      }
    },
    [partyId]
  );

  React.useEffect(() => {
    void load(initial);
  }, [initial, load]);

  const lines = statement?.lines ?? [];
  const page = lines.slice(pageOffset, pageOffset + pageSize);
  const currency = statement?.currency || "KES";

  const applyPreset = (id: string) => {
    const preset = presets().find((item) => item.id === id);
    if (!preset) return;
    setActivePreset(id);
    setFrom(preset.from);
    setTo(preset.to);
    void load(preset);
  };

  const applyCustom = () => {
    setActivePreset("");
    void load({ from, to });
  };

  const downloadPdf = async () => {
    if (!statement) return;
    const fileName = `statement_${statement.party.name}_${statement.from}_${statement.to}.pdf`;
    await downloadPartyStatementPdfApi(
      "customer",
      statement.party.id,
      statement.from,
      statement.to,
      fileName,
      (message) => toast.error(message)
    );
  };

  const sendEmail = async () => {
    if (!statement) return;
    setEmailing(true);
    try {
      const result = await emailPartyStatementApi("customer", statement.party.id, {
        from: statement.from,
        to: statement.to,
        overrideTo: emailTo.trim() || undefined,
      });
      toast.success(`Statement emailed to ${result.to}`);
    } catch (error) {
      toast.error((error as Error).message || "Failed to email statement");
    } finally {
      setEmailing(false);
    }
  };

  const openLine = (line: PartyStatementLine) => {
    const href = statementDocHref("customer", line.sourceType, line.sourceId);
    if (href) router.push(href);
  };

  return (
    <div id="customer-ledger" className="space-y-4">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #customer-ledger, #customer-ledger * { visibility: visible !important; }
          #customer-ledger {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
          }
          #customer-ledger [data-print-hide] { display: none !important; }
          #customer-ledger tr[data-off-page] { display: table-row !important; }
        }
      `}</style>

      <div className="flex flex-wrap items-end justify-between gap-3" data-print-hide>
        <div className="flex flex-wrap gap-2">
          {presets().map((preset) => (
            <Button
              key={preset.id}
              type="button"
              size="sm"
              variant={activePreset === preset.id ? "default" : "outline"}
              onClick={() => applyPreset(preset.id)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => window.print()} disabled={!statement}>
            <Icons.Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => void downloadPdf()} disabled={!statement}>
            <Icons.Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2" data-print-hide>
        <Input className="w-[11rem]" type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-label="From" />
        <Input className="w-[11rem]" type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-label="To" />
        <Button type="button" size="sm" variant="secondary" onClick={applyCustom} disabled={loading}>
          {loading ? <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Show
        </Button>
        {canEmail ? (
          <>
            <Input
              className="w-[16rem]"
              type="email"
              value={emailTo}
              placeholder="Email statement to"
              onChange={(event) => setEmailTo(event.target.value)}
              aria-label="Email statement to"
            />
            <Button type="button" size="sm" variant="outline" onClick={() => void sendEmail()} disabled={emailing || !emailTo.trim()}>
              {emailing ? <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icons.Mail className="mr-2 h-4 w-4" />}
              Email
            </Button>
          </>
        ) : null}
      </div>

      <div className="rounded-xl border bg-card">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer statement</p>
            <h2 className="mt-1 text-lg font-semibold">{statement?.party.name || partyName}</h2>
            <p className="text-sm text-muted-foreground">
              {statement ? prettyRange(statement.from, statement.to) : "Loading statement…"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Balance due</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {statement ? formatMoney(statement.closingBalance, currency) : "—"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
          {[
            ["Opening", statement?.openingBalance],
            ["Charges", statement?.periodDebits],
            ["Payments", statement?.periodCredits],
            ["Closing", statement?.closingBalance],
          ].map(([label, amount]) => (
            <div key={String(label)} className="bg-card px-5 py-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 font-medium tabular-nums">
                {statement && typeof amount === "number" ? formatMoney(amount, currency) : "—"}
              </p>
            </div>
          ))}
        </div>

        {statement ? (
          <div className="grid grid-cols-3 gap-3 border-t px-5 py-3 text-sm sm:grid-cols-6">
            {(
              [
                ["Current", statement.aging.current],
                ["1–30", statement.aging.days_1_30],
                ["31–60", statement.aging.days_31_60],
                ["61–90", statement.aging.days_61_90],
                ["90+", statement.aging.over_90],
                ["Open total", statement.aging.total],
              ] as const
            ).map(([label, amount]) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-medium tabular-nums">{formatMoney(amount, currency)}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {loading && !statement ? (
        <p className="text-sm text-muted-foreground">Loading ledger…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={5}>
                  Opening balance
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {statement ? formatMoney(statement.openingBalance, currency) : "—"}
                </TableCell>
              </TableRow>
              {lines.map((line, index) => {
                const href = statementDocHref("customer", line.sourceType, line.sourceId);
                const offPage = index < pageOffset || index >= pageOffset + pageSize;
                return (
                  <TableRow
                    key={`${line.sourceType}-${line.sourceId}-${index}`}
                    data-off-page={offPage ? "true" : undefined}
                    className={offPage ? "hidden" : href ? "cursor-pointer" : undefined}
                    tabIndex={offPage || !href ? undefined : 0}
                    onClick={() => openLine(line)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") openLine(line);
                    }}
                  >
                    <TableCell>
                      <span className="print:hidden" title={formatActivityExact(line.date)}>
                        {formatActivityWhen(line.date)}
                      </span>
                      <span className="hidden print:inline">{formatActivityExact(line.date) || line.date}</span>
                    </TableCell>
                    <TableCell className="font-medium">{line.sourceNumber || line.sourceTypeLabel}</TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">{line.sourceTypeLabel}</span>
                      {line.description && line.description !== line.sourceTypeLabel ? (
                        <span className="mt-0.5 block text-sm">{line.description}</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {line.debit ? formatMoney(line.debit, line.currency || currency) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {line.credit ? formatMoney(line.credit, line.currency || currency) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatMoney(line.balance, line.currency || currency)}
                    </TableCell>
                  </TableRow>
                );
              })}
              {lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    No posted transactions in this period. Draft documents stay off the ledger until they are posted.
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="font-medium">
                    Closing balance
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {statement ? formatMoney(statement.closingBalance, currency) : "—"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {lines.length > 0 ? (
            <div data-print-hide>
              <TablePagination
                className="rounded-none border-0 border-t shadow-none"
                pageOffset={pageOffset}
                pageSize={pageSize}
                itemCount={page.length}
                hasMore={pageOffset + pageSize < lines.length}
                totalCount={lines.length}
                entityLabel="entries"
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPageOffset(0);
                }}
                onPrevious={() => setPageOffset((offset) => Math.max(0, offset - pageSize))}
                onNext={() => setPageOffset((offset) => offset + pageSize)}
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
