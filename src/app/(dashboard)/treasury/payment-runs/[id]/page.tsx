"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchPaymentRunApi, approvePaymentRunApi, exportPaymentRunApi } from "@/lib/api/treasury-ops";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const METHOD_LABELS: Record<string, string> = {
  BANK_TRANSFER: "Bank transfer",
  M_PESA: "M-Pesa",
  CHEQUE: "Cheque",
};

export default function PaymentRunDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [run, setRun] = React.useState<any | undefined | null>(undefined);

  const refreshRun = React.useCallback(async () => {
    setRun(await fetchPaymentRunApi(id));
  }, [id]);

  React.useEffect(() => {
    void refreshRun();
  }, [refreshRun]);

  if (run === undefined) {
    return (
      <PageShell>
        <PageHeader title="Loading..." breadcrumbs={[{ label: "Treasury", href: "/treasury/overview" }, { label: "Payment runs", href: "/treasury/payment-runs" }, { label: id }]} />
        <div className="p-6 text-muted-foreground">Loading payment run...</div>
      </PageShell>
    );
  }

  if (!run) {
    return (
      <PageShell>
        <PageHeader title="Not found" breadcrumbs={[{ label: "Treasury", href: "/treasury/overview" }, { label: "Payment runs", href: "/treasury/payment-runs" }, { label: id }]} />
        <div className="p-6">
          <p className="text-muted-foreground">Payment run not found.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/treasury/payment-runs">Back to list</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const canApprove = run.status === "PENDING_APPROVAL";
  const canExport = run.status === "DRAFT" || run.status === "PENDING_APPROVAL" || run.status === "APPROVED";

  return (
    <PageShell>
      <PageHeader
        title={run.number}
        description={`${formatMoney(run.totalAmount, run.currency)} · ${run.supplierCount} supplier(s)`}
        breadcrumbs={[
          { label: "Treasury", href: "/treasury/overview" },
          { label: "Payment runs", href: "/treasury/payment-runs" },
          { label: run.number },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            {canApprove && (
              <Button
                size="sm"
                onClick={async () => {
                  try {
                    await approvePaymentRunApi(id);
                    await refreshRun();
                    toast.success("Payment run approved.");
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
              >
                Approve
              </Button>
            )}
            {canExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  exportPaymentRunApi(id, (msg) => toast.info(msg || "Export not yet available."));
                }}
              >
                Export
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/approvals/inbox">Approvals inbox</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/treasury/payment-runs">Back to list</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Header</CardTitle>
            <Badge>{run.status.replace("_", " ")}</Badge>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>{run.number} · {run.date}</p>
            <p>Total: {formatMoney(run.totalAmount, run.currency)} · {run.billCount} bill(s) · {run.supplierCount} supplier(s)</p>
            <p>Method: {METHOD_LABELS[run.paymentMethod] ?? run.paymentMethod}</p>
            {run.bankAccountName ? <p>Bank account: {run.bankAccountName}</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Run lines</CardTitle>
            <CardDescription>Suppliers and bills included in this payment run.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <TooltipProvider>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Bill / GRN / PO</TableHead>
                    <TableHead className="text-right">Bill amount</TableHead>
                    <TableHead className="text-right">Landed costs</TableHead>
                    <TableHead className="text-right">Economic total</TableHead>
                    <TableHead>Currency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(run.lines ?? []).map((line: any) => {
                    const hasLanded = (line.landedAllocated ?? 0) > 0;
                    return (
                      <TableRow key={line.id}>
                        <TableCell>{line.supplierName ?? line.supplierId}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5 text-xs">
                            <span className="font-medium text-sm">{line.billNumber ?? line.billId ?? "Manual line"}</span>
                            {line.grnNumber && <span className="text-muted-foreground">GRN: {line.grnNumber}</span>}
                            {line.poRef && <span className="text-muted-foreground">PO: {line.poRef}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formatMoney(line.amount, line.currency)}</TableCell>
                        <TableCell className="text-right">
                          {hasLanded ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-amber-700 font-medium cursor-default underline decoration-dotted">
                                  +{formatMoney(line.landedAllocated, line.currency)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs text-xs">
                                <p className="font-medium mb-1">Landed cost breakdown</p>
                                {(line.landedBreakdown ?? []).map((b: { label: string; amount: number }) => (
                                  <p key={b.label}>{b.label}: {formatMoney(b.amount, line.currency)}</p>
                                ))}
                                <p className="mt-1 text-muted-foreground">Already posted to inventory. Not part of this payment.</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatMoney(line.economicTotal ?? line.amount, line.currency)}
                        </TableCell>
                        <TableCell>{line.currency}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TooltipProvider>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
