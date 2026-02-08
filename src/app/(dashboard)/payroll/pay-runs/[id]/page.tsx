"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
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
import { getPayRunById, listPayRunLines, listEmployees } from "@/lib/data/payroll.repo";
import type { PayRunLine } from "@/lib/payroll/types";
import { formatMoney } from "@/lib/money";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { toast } from "sonner";
import * as Icons from "lucide-react";

function exportPayRunBankCSV(runId: string, lines: PayRunLine[]) {
  const employees = listEmployees();
  const empMap = new Map(employees.map((e) => [e.id, e]));
  const headers = ["Employee", "Net", "Currency", "Bank account", "Payment method"];
  const rows = lines.map((l) => {
    const e = empMap.get(l.employeeId);
    return [
      l.employeeName,
      l.net,
      l.currency,
      e?.bankAccountMasked ?? "—",
      e?.paymentMethod ?? "BANK",
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

export default function PayRunDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [lineSheetOpen, setLineSheetOpen] = React.useState(false);
  const [selectedLine, setSelectedLine] = React.useState<PayRunLine | null>(null);

  const run = React.useMemo(() => getPayRunById(id), [id]);
  const lines = React.useMemo(() => (run ? listPayRunLines(run.id) : []), [run]);

  const openLine = (l: PayRunLine) => {
    setSelectedLine(l);
    setLineSheetOpen(true);
  };

  const handleApprove = () => {
    toast.info("Approve (stub). API pending.");
  };

  const handlePostJournal = () => {
    toast.info("Post payroll journal (stub). API pending.");
  };

  const handleExportBank = () => {
    exportPayRunBankCSV(id, lines);
  };

  if (!run) {
    return (
      <PageShell>
        <PageHeader title="Pay run not found" breadcrumbs={[{ label: "Payroll", href: "/payroll/overview" }, { label: "Pay runs", href: "/payroll/pay-runs" }, { label: id }]} />
        <div className="p-6">
          <p className="text-muted-foreground">Pay run not found.</p>
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
              <Button size="sm" onClick={handleApprove}>
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
            <Button variant="outline" size="sm" onClick={() => toast.info("Request approval (stub).")}>
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
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Pay run line</SheetTitle>
            <SheetDescription>{selectedLine?.employeeName ?? "—"}</SheetDescription>
          </SheetHeader>
          {selectedLine && (
            <div className="mt-6 space-y-2 text-sm">
              <p><span className="text-muted-foreground">Gross:</span> {formatMoney(selectedLine.gross, selectedLine.currency)}</p>
              <p><span className="text-muted-foreground">Statutory:</span> {formatMoney(selectedLine.statutoryTotal, selectedLine.currency)}</p>
              <p><span className="text-muted-foreground">Net:</span> {formatMoney(selectedLine.net, selectedLine.currency)}</p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
