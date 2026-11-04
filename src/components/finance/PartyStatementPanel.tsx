"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LIST_TABLE_SURFACE_CLASS } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { isApiConfigured } from "@/lib/api/client";
import {
  allTimeStatementDates,
  defaultStatementDates,
  downloadPartyStatementPdfApi,
  emailPartyStatementApi,
  fetchPartyStatementApi,
  type PartyStatement,
  type PartyStatementKind,
} from "@/lib/api/party-statements";
import { useAuthStore } from "@/stores/auth-store";
import { useHasPermission } from "@/lib/rbac/use-write-guard";
import { downloadPartyStatementData } from "@/lib/api/party-statements";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export function statementDocHref(
  kind: PartyStatementKind,
  sourceType: string,
  sourceId: string
): string | null {
  if (sourceType === "payment") {
    return kind === "customer" ? "/ar/payments" : "/ap/payments";
  }
  if (sourceType === "OPENING_BALANCE") return null;
  return `/docs/${sourceType}/${sourceId}`;
}

export function PartyStatementPanel(props: {
  kind: PartyStatementKind;
  partyId: string;
  from?: string | null;
  to?: string | null;
  currency?: string | null;
  canEmail: boolean;
  /** Keep standalone statement pages in sync with the query string. */
  syncUrl?: boolean;
  defaultAllTime?: boolean;
  hideAccountCard?: boolean;
}) {
  const router = useRouter();
  const scopeKey = useAuthStore((s) => `${s.org?.orgId}:${s.user?.userId}:${s.permissions.join(",")}`);
  const canExport = useHasPermission("reports.export.read");
  const serial = React.useRef(0);
  const cancelPending = React.useCallback(() => { serial.current++; }, []);
  const [currency, setCurrency] = React.useState(props.currency ?? "");
  const fallback = React.useMemo(
    () => (props.defaultAllTime ? allTimeStatementDates() : defaultStatementDates()),
    [props.defaultAllTime]
  );
  const [from, setFrom] = React.useState(props.from || fallback.from);
  const [to, setTo] = React.useState(props.to || fallback.to);
  const [statement, setStatement] = React.useState<PartyStatement | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [emailTo, setEmailTo] = React.useState("");
  const [emailing, setEmailing] = React.useState(false);

  React.useEffect(() => {
    if (props.currency) setCurrency(props.currency);
    if (props.from) setFrom(props.from);
    if (props.to) setTo(props.to);
  }, [props.currency, props.from, props.to]);

  const load = React.useCallback(async (range?: { from: string; to: string }) => {
    if (!isApiConfigured()) {
      toast.error("API not configured.");
      return;
    }
    if (!props.partyId) return;
    const fromDate = range?.from ?? from;
    const toDate = range?.to ?? to;
    const request = ++serial.current;
    setLoading(true); setStatement(null);
    try {
      const data = await fetchPartyStatementApi(props.kind, props.partyId, fromDate, toDate, currency);
      if (request !== serial.current) return;
      setStatement(data);
      setEmailTo((current) => current || data.party.email || "");
      if (props.syncUrl) {
        const params = new URLSearchParams();
        params.set("partyId", props.partyId);
        params.set("from", data.from);
        params.set("to", data.to);
        params.set("currency", data.currency);
        const href = props.kind === "customer" ? "/ar/statements" : "/ap/statements";
        router.replace(`${href}?${params.toString()}`, { scroll: false });
      }
    } catch (error) {
      if (request !== serial.current) return;
      setStatement(null);
      toast.error((error as Error).message || "Failed to load statement");
    } finally {
      if (request === serial.current) setLoading(false);
    }
  }, [currency, from, props.kind, props.partyId, props.syncUrl, router, to]);

  React.useEffect(() => {
    setStatement(null); setEmailTo(""); void load();
    return cancelPending;
    // Run automatically only on identity/scope changes; date and currency use Generate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.partyId, props.kind, scopeKey]);

  const entity = props.kind === "customer" ? "customer" : "supplier";
  const newDocHref = props.kind === "customer" ? "/docs/invoice/new" : "/docs/bill/new";
  const newDocLabel = props.kind === "customer" ? "New invoice" : "New bill";
  const importHref = "/settings/migrations";

  const applyAllTime = () => {
    const range = allTimeStatementDates();
    setFrom(range.from);
    setTo(range.to);
    void load(range);
  };

  const printStatement = () => {
    window.print();
  };

  const downloadPdf = async () => {
    if (!statement) return;
    const fileName = `${statement.kind}-statement_${statement.party.name}_${statement.from}_${statement.to}.pdf`;
    await downloadPartyStatementPdfApi(
      props.kind,
      statement.party.id,
      statement.from,
      statement.to,
      fileName,
      (message) => toast.error(message),
      statement.currency
    );
  };

  const sendEmail = async () => {
    if (!statement) return;
    setEmailing(true);
    try {
      const result = await emailPartyStatementApi(props.kind, statement.party.id, {
        from: statement.from,
        to: statement.to,
        currency: statement.currency,
        overrideTo: emailTo.trim() || undefined,
      });
      toast.success(`Statement emailed to ${result.to}`);
    } catch (error) {
      toast.error((error as Error).message || "Failed to email statement");
    } finally {
      setEmailing(false);
    }
  };

  const isBlankLedger =
    statement &&
    statement.lines.length === 0 &&
    Math.abs(statement.openingBalance) < 0.005 &&
    Math.abs(statement.closingBalance) < 0.005;

  return (
    <div className="space-y-4 print:space-y-3">
      <Card className="print:hidden">
        <CardContent className="grid gap-4 pt-6 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="statement-from">From</Label>
            <Input id="statement-from" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setStatement(null); serial.current++; setLoading(false); }} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="statement-to">To</Label>
            <Input id="statement-to" type="date" value={to} onChange={(e) => { setTo(e.target.value); setStatement(null); serial.current++; setLoading(false); }} />
          </div>
          <div className="space-y-2"><Label htmlFor="statement-currency">Currency</Label><Input id="statement-currency" maxLength={3} placeholder="Auto (single currency)" value={currency} onChange={(e) => { setCurrency(e.target.value.toUpperCase()); setStatement(null); serial.current++; setLoading(false); }} /></div>
          <div className="md:col-span-4 flex flex-wrap items-end gap-2">
            <Button onClick={() => void load()} disabled={loading || !props.partyId}>
              {loading ? <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icons.FileText className="mr-2 h-4 w-4" />}
              Generate
            </Button>
            <Button type="button" variant="outline" onClick={applyAllTime}>
              All time
            </Button>
            <Button variant="outline" onClick={printStatement} disabled={!statement || !canExport}>
              <Icons.Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" onClick={() => void downloadPdf()} disabled={!statement || !canExport}>
              <Icons.Download className="mr-2 h-4 w-4" />
              PDF
            </Button>
            <Button variant="outline" disabled={!statement || !canExport || !statement.exportFormats?.includes("xlsx")} onClick={() => statement && void downloadPartyStatementData(props.kind, statement.party.id, statement.from, statement.to, statement.currency, "xlsx", (message) => toast.error(message))}><Icons.Sheet className="mr-2 h-4 w-4" />Excel</Button>
          </div>
          {props.canEmail && statement ? (
            <div className="md:col-span-4 flex flex-wrap items-end gap-2">
              <div className="min-w-[16rem] flex-1 space-y-2">
                <Label htmlFor="statement-email">Email to</Label>
                <Input
                  id="statement-email"
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder={`${entity} email`}
                />
              </div>
              <Button variant="secondary" onClick={() => void sendEmail()} disabled={emailing || !emailTo.trim()}>
                {emailing ? <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icons.Mail className="mr-2 h-4 w-4" />}
                Email PDF
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {statement ? (
        <div className="space-y-4">
          {statement.warnings?.map((warning) => <p key={warning} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-muted-foreground">{warning}</p>)}
          <div className={`grid gap-3 ${props.hideAccountCard ? "md:grid-cols-3" : "md:grid-cols-4"}`}>
            {props.hideAccountCard ? null : (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Account</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold">{statement.party.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {statement.from} – {statement.to}
                  </p>
                  {statement.branches?.length ? (
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {statement.branches.map((branch) => (
                        <li key={branch.name}>
                          {branch.name} · {branch.from} – {branch.to}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Opening</CardTitle>
              </CardHeader>
              <CardContent className="text-lg font-semibold">
                {formatMoney(statement.openingBalance, statement.currency)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Period movement</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <div>{props.kind === "supplier" ? "Charges" : "Debits"} {formatMoney(statement.periodDebits, statement.currency)}</div>
                <div>{props.kind === "supplier" ? "Settlements / credits" : "Credits"} {formatMoney(statement.periodCredits, statement.currency)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Closing</CardTitle>
              </CardHeader>
              <CardContent className="text-lg font-semibold">
                {formatMoney(statement.closingBalance, statement.currency)}
              </CardContent>
            </Card>
          </div>

          {isBlankLedger ? (
            <EmptyState
              icon="FileText"
              title="No posted transactions"
              description={`This ledger only includes posted ${
                props.kind === "customer" ? "invoices, credit notes, and receipts" : "bills, credit notes, and payments"
              }. Draft documents do not appear. Import opening balances if you are cutting over from another system.`}
              action={{ label: newDocLabel, onClick: () => router.push(newDocHref) }}
            />
          ) : (
            <div className={LIST_TABLE_SURFACE_CLASS}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    {statement.branches?.length ? <TableHead>Branch</TableHead> : null}
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">{props.kind === "supplier" ? "Charges" : "Debit"}</TableHead>
                    <TableHead className="text-right">{props.kind === "supplier" ? "Settlements / credits" : "Credit"}</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={statement.branches?.length ? 5 : 4} className="text-muted-foreground">
                      Opening balance
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatMoney(statement.openingBalance, statement.currency)}
                    </TableCell>
                  </TableRow>
                  {statement.lines.map((line) => {
                    const href = statementDocHref(props.kind, line.sourceType, line.sourceId);
                    return (
                      <TableRow key={`${line.sourceType}-${line.sourceId}`}>
                        <TableCell>
                          <span>{line.date}</span>
                          {statement.branches?.length && line.dueDate ? (
                            <span className="block text-xs text-muted-foreground">Due {line.dueDate}</span>
                          ) : null}
                        </TableCell>
                        {statement.branches?.length ? <TableCell>{line.branchName || "—"}</TableCell> : null}
                        <TableCell>
                          {href ? (
                            <Link href={href} className="hover:underline">
                              {line.description}
                            </Link>
                          ) : (
                            line.description
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {line.debit ? formatMoney(line.debit, line.currency) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {line.credit ? formatMoney(line.credit, line.currency) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatMoney(line.balance, line.currency)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {statement.lines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={statement.branches?.length ? 6 : 5} className="text-muted-foreground">
                        No transactions in this period. Try All time, or post an invoice or payment.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          )}

          {isBlankLedger ? (
            <p className="text-xs text-muted-foreground print:hidden">
              Need historical balances? Import them from{" "}
              <Link href={importHref} className="underline">
                Settings → Migrations
              </Link>
              .
            </p>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Current outstanding aging {statement.agingAsOf ? `· ${statement.agingAsOf}` : ""}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6 text-sm">
                {[
                  ["Current", statement.aging.current],
                  ["1–30", statement.aging.days_1_30],
                  ["31–60", statement.aging.days_31_60],
                  ["61–90", statement.aging.days_61_90],
                  ["90+", statement.aging.over_90],
                  ["Total", statement.aging.total],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-muted-foreground">{label}</p>
                    <p className="font-medium">{formatMoney(Number(value), statement.currency)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      ) : loading ? (
        <p className="text-sm text-muted-foreground">Loading ledger…</p>
      ) : (
        <p className="text-sm text-muted-foreground">Choose a date range, then generate a statement.</p>
      )}
    </div>
  );
}
