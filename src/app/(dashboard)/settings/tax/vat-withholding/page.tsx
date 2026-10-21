"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  fetchVatWithholdingApi,
  importVatWithholdingApi,
  type VatWithholdingImportResult,
  type VatWithholdingReport,
} from "@/lib/api/vat-withholding";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";

function statusLabel(status: string): string {
  switch (status) {
    case "MATCHED":
      return "Matched";
    case "PARTIAL":
      return "Partial";
    case "NOT_FOUND":
      return "Invoice not found";
    case "AMBIGUOUS":
      return "Ambiguous";
    case "WRONG_COMPANY_PIN":
      return "Wrong company PIN";
    case "INACTIVE":
      return "Inactive";
    case "AMOUNT_DIFFERENCE":
      return "Amount difference";
    case "DUPLICATE":
      return "Already imported";
    case "NOT_IN_LEDGER":
      return "Not in customer list";
    case "AMBIGUOUS_NAME":
      return "More than one customer";
    case "PIN_CONFLICT":
      return "PIN conflict";
    case "WEAK_NAME":
      return "Name too short";
    case "HIDDEN":
      return "Hidden customer";
    case "INACTIVE_CERTIFICATE":
      return "No active certificate";
    default:
      return status;
  }
}

export default function VatWithholdingPage() {
  const [report, setReport] = React.useState<VatWithholdingReport | null>(null);
  const [imported, setImported] = React.useState<VatWithholdingImportResult | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setReport(await fetchVatWithholdingApi());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load VAT withholding.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const result = await importVatWithholdingApi(file);
      setImported(result);
      toast.success(`${result.appointed.length} customers appointed as VAT withholding agents.`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const ratePercent = report ? Math.round(report.rule.rate * 10000) / 100 : 2;

  return (
    <PageShell>
      <PageHeader
        title="VAT withholding"
        description="KRA withholds VAT from appointed agents. The sales invoice stays at the gross amount."
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Tax", href: "/settings/tax/kenya" },
          { label: "VAT withholding" },
        ]}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings/tax/withholding">Income withholding</Link>
          </Button>
        }
      />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rule</CardTitle>
            <CardDescription>
              {ratePercent}% of the taxable value from {report?.rule.effectiveFrom ?? "2023-01-01"}. On a KES 100,000 taxable invoice the VAT is KES 16,000, the gross invoice is KES 116,000, and the customer is expected to pay KES 114,000. The KES 2,000 stays on the invoice until a KRA certificate is matched. A customer deduction alone is not a tax credit.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(event) => void onFile(event.target.files?.[0])}
            />
            <Button type="button" disabled={busy} onClick={() => fileRef.current?.click()}>
              {busy ? "Importing…" : "Import KRA Excel"}
            </Button>
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading the register…" : `${report?.counts.agents ?? 0} agents, ${report?.counts.certificates ?? 0} certificates.`}
            </p>
          </CardContent>
        </Card>

        {imported ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">This import</CardTitle>
              <CardDescription>
                {imported.parsedRows} certificate rows were read
                {imported.declaredRecordCount != null ? ` of ${imported.declaredRecordCount} declared on the report` : ""}.
                {imported.rowShortfall ? ` ${imported.rowShortfall} rows are not in this file, so those PINs were not checked.` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>KRA PIN</TableHead>
                    <TableHead>How matched</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {imported.appointed.map((row) => (
                    <TableRow key={row.partyId}>
                      <TableCell>{row.partyName}</TableCell>
                      <TableCell className="font-mono text-xs">{row.pin}</TableCell>
                      <TableCell>{row.method === "PIN" ? "Stored PIN" : "Legal name, PIN written"}</TableCell>
                    </TableRow>
                  ))}
                  {imported.notAppointed.map((row) => (
                    <TableRow key={row.pin}>
                      <TableCell>{row.withholderName}</TableCell>
                      <TableCell className="font-mono text-xs">{row.pin}</TableCell>
                      <TableCell>{statusLabel(row.reason)}. {row.detail}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appointed agents</CardTitle>
            <CardDescription>Only these customers get VAT withholding on new invoices.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>KRA PIN</TableHead>
                  <TableHead>KRA name</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(report?.agents ?? []).map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <Link href={`/sales/customers/${agent.id}`} className="hover:underline">
                        {agent.name}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{agent.taxId || "—"}</TableCell>
                    <TableCell>{agent.vatWithholding?.withholderName || "—"}</TableCell>
                  </TableRow>
                ))}
                {!loading && (report?.agents.length ?? 0) === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">
                      No withholding agents yet. Import the KRA VAT withholding report.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Certificates</CardTitle>
            <CardDescription>
              A certificate is matched by the customer PIN and the invoice or CU number. The amount alone is not used.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Certificate</TableHead>
                  <TableHead>Withholder</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(report?.certificates ?? []).map((row) => (
                  <TableRow key={row._id}>
                    <TableCell className="font-mono text-xs">{row.certificateNo}</TableCell>
                    <TableCell>
                      <div>{row.withholderName}</div>
                      <div className="font-mono text-xs text-muted-foreground">{row.withholderPin}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.invoiceNo}</TableCell>
                    <TableCell>{row.certificateDate}</TableCell>
                    <TableCell className="text-right">{formatMoney(row.amount, "KES")}</TableCell>
                    <TableCell>{statusLabel(row.matchStatus)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
