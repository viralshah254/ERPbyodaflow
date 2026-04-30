"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  approvePayRunApi,
  fetchPayRunDetailApi,
  postPayRunJournalApi,
  submitPayRunForApprovalApi,
} from "@/lib/api/payroll";
import type { PayRun, PayRunLine } from "@/lib/payroll/types";
import { formatMoney } from "@/lib/money";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { toast } from "sonner";
import * as Icons from "lucide-react";

function exportPayRunBankCSV(runId: string, lines: PayRunLine[]) {
  const headers = ["Employee", "Net", "Currency", "Bank account", "Payment method"];
  const rows = lines.map((l) => {
    return [
      l.employeeName,
      l.net,
      l.currency,
      "—",
      "BANK",
    ].join(",");
  });
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `payrun-bank-${runId}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function lineDeductionPreview(l: PayRunLine): { label: string; amount: number }[] {
  if (l.manualDeductionLines?.length) return l.manualDeductionLines;
  const s = l.statBreakdown;
  if (!s) {
    return l.statutoryTotal > 0 ? [{ label: "Deductions", amount: l.statutoryTotal }] : [];
  }
  const rows: { label: string; amount: number }[] = [];
  if (s.paye > 0) rows.push({ label: "PAYE", amount: s.paye });
  const t1 = s.nssfTierIEmployee ?? 0;
  const t2 = s.nssfTierIIEmployee ?? 0;
  if (t1 > 0) rows.push({ label: "NSSF Tier I (employee)", amount: t1 });
  if (t2 > 0) rows.push({ label: "NSSF Tier II (employee)", amount: t2 });
  if (t1 === 0 && t2 === 0 && s.nssfEmployee > 0) rows.push({ label: "NSSF (employee)", amount: s.nssfEmployee });
  if (s.shif > 0) rows.push({ label: "SHIF", amount: s.shif });
  if (s.ahl > 0) rows.push({ label: "Housing levy (AHL)", amount: s.ahl });
  if (s.lst > 0) rows.push({ label: "LST", amount: s.lst });
  if (s.wht > 0) rows.push({ label: "WHT", amount: s.wht });
  return rows;
}

function employmentLabel(t?: string) {
  if (t === "CONSULTANT") return "Consultant";
  if (t === "CASUAL") return "Casual";
  return "Full-time";
}

export default function PayRunDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [lineSheetOpen, setLineSheetOpen] = React.useState(false);
  const [selectedLine, setSelectedLine] = React.useState<PayRunLine | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [run, setRun] = React.useState<PayRun | null>(null);
  const [lines, setLines] = React.useState<PayRunLine[]>([]);

  const refreshRun = React.useCallback(async () => {
    setLoading(true);
    try {
      const detail = await fetchPayRunDetailApi(id);
      setRun(detail?.run ?? null);
      setLines(detail?.lines ?? []);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void refreshRun();
  }, [refreshRun]);

  const openLine = (l: PayRunLine) => {
    setSelectedLine(l);
    setLineSheetOpen(true);
  };

  const [approving, setApproving] = React.useState(false);
  const handleApprove = async () => {
    setApproving(true);
    try {
      await approvePayRunApi(id);
      await refreshRun();
      toast.success("Pay run approved.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setApproving(false);
    }
  };

  const handlePostJournal = async () => {
    try {
      await postPayRunJournalApi(id);
      await refreshRun();
      toast.success("Payroll journal posted.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleExportBank = () => {
    exportPayRunBankCSV(id, lines);
  };

  if (!run) {
    return (
      <PageShell>
        <PageHeader title="Pay run not found" breadcrumbs={[{ label: "Payroll", href: "/payroll/overview" }, { label: "Pay runs", href: "/payroll/pay-runs" }, { label: id }]} />
        <div className="p-6">
          <p className="text-muted-foreground">{loading ? "Loading pay run..." : "Pay run not found."}</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/payroll/pay-runs">Back to list</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title={run.number}
        description={`${run.month} · ${run.branch ?? "—"} · ${run.currency}`}
        breadcrumbs={[
          { label: "Payroll", href: "/payroll/overview" },
          { label: "Pay runs", href: "/payroll/pay-runs" },
          { label: run.number },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <ExplainThis prompt="Explain pay run approval and bank file generation." label="Explain" />
            {(run.status === "DRAFT" || run.status === "SUBMITTED") && (
              <Button size="sm" disabled={approving} onClick={handleApprove}>
                Approve
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handlePostJournal}>
              <Icons.FileEdit className="mr-2 h-4 w-4" />
              Post payroll journal
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportBank}>
              <Icons.Download className="mr-2 h-4 w-4" />
              Generate bank file
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await submitPayRunForApprovalApi(id);
                  await refreshRun();
                  toast.success("Approval request sent to the workflow queue.");
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              Request approval
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/payroll/pay-runs">Back to list</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
            <CardDescription>Gross → statutory → net.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p><span className="text-muted-foreground">Status:</span> <Badge variant={run.status === "APPROVED" || run.status === "PROCESSED" ? "secondary" : "outline"}>{run.status.replace("_", " ")}</Badge></p>
            <p><span className="text-muted-foreground">Total gross:</span> {formatMoney(run.totalGross, run.currency)}</p>
            <p><span className="text-muted-foreground">Total net:</span> {formatMoney(run.totalNet, run.currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lines</CardTitle>
            <CardDescription>Open a line to view details (E2E: open pay run line).</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Statutory</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((l) => (
                  <TableRow key={l.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openLine(l)}>
                    <TableCell className="font-medium">{l.employeeName}</TableCell>
                    <TableCell className="text-right">{formatMoney(l.gross, l.currency)}</TableCell>
                    <TableCell className="text-right">{formatMoney(l.statutoryTotal, l.currency)}</TableCell>
                    <TableCell className="text-right">{formatMoney(l.net, l.currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Sheet open={lineSheetOpen} onOpenChange={setLineSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Pay run line</SheetTitle>
            <SheetDescription>
              {selectedLine?.employeeName ?? "—"}
              {selectedLine?.employmentType && (
                <span className="text-muted-foreground"> · {employmentLabel(selectedLine.employmentType)} · {selectedLine.taxCountry ?? "—"}</span>
              )}
            </SheetDescription>
          </SheetHeader>
          {selectedLine && (
            <div className="mt-6 space-y-4 text-sm">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <p><span className="text-muted-foreground">Gross:</span> {formatMoney(selectedLine.gross, selectedLine.currency)}</p>
                <p><span className="text-muted-foreground">Total deductions:</span> {formatMoney(selectedLine.statutoryTotal, selectedLine.currency)}</p>
                <p className="font-semibold"><span className="text-muted-foreground font-normal">Net:</span> {formatMoney(selectedLine.net, selectedLine.currency)}</p>
                {(selectedLine.statBreakdown?.nssfEmployer ?? 0) > 0 && (
                  <p className="text-xs text-amber-600">Employer NSSF: {formatMoney(selectedLine.statBreakdown!.nssfEmployer, selectedLine.currency)}</p>
                )}
              </div>
              <div className="rounded-lg border p-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Breakdown</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  {lineDeductionPreview(selectedLine).map((row) => (
                    <React.Fragment key={row.label}>
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="text-right tabular-nums">{formatMoney(row.amount, selectedLine.currency)}</span>
                    </React.Fragment>
                  ))}
                </div>
                {lineDeductionPreview(selectedLine).length === 0 && (
                  <p className="text-xs text-muted-foreground">No itemised deduction lines.</p>
                )}
              </div>
              {selectedLine.statBreakdown && (selectedLine.statBreakdown.payeTaxableIncome ?? 0) > 0 && (
                <div className="rounded-lg border p-4 space-y-1 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">PAYE reference</p>
                  <p>Taxable pay: {formatMoney(selectedLine.statBreakdown.payeTaxableIncome ?? 0, selectedLine.currency)}</p>
                  {(selectedLine.statBreakdown.payeTaxBeforeRelief ?? 0) > 0 && (
                    <p>Tax before relief: {formatMoney(selectedLine.statBreakdown.payeTaxBeforeRelief ?? 0, selectedLine.currency)}</p>
                  )}
                  <p>Personal relief: {formatMoney(selectedLine.statBreakdown.payePersonalRelief ?? 0, selectedLine.currency)}</p>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
