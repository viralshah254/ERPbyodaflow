"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { downloadTaxSummaryCsvApi, fetchVatSummaryApi } from "@/lib/api/reports";
import { formatMoney } from "@/lib/money";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function VatSummaryReportPage() {
  const [summary, setSummary] = React.useState<Awaited<ReturnType<typeof fetchVatSummaryApi>> | null>(null);

  const [loadError, setLoadError] = React.useState("");

  React.useEffect(() => {
    fetchVatSummaryApi()
      .then(setSummary)
      .catch((error) => setLoadError((error as Error).message || "Failed to load VAT summary."));
  }, []);

  return (
    <PageShell>
      <PageHeader
        title="VAT summary"
        description="Sales and purchase VAT with source-document drilldown."
        breadcrumbs={[
          { label: "Reports", href: "/reports" },
          { label: "VAT summary" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <ExplainThis prompt="Why is VAT higher this month? Explain VAT output vs input." label="Explain" />
            <Button
              variant="outline"
              size="sm"
              disabled={!summary}
              onClick={() =>
                downloadTaxSummaryCsvApi("vat-summary", "vat-summary.csv", (message) =>
                  toast.error(message || "Export failed.")
                )
              }
            >
              <Icons.Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/reports">Reports</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6">
        {loadError && <p role="alert" className="mb-4 rounded-md border border-destructive p-4 text-destructive">{loadError}</p>}
        <Card>
          <CardHeader>
            <CardTitle>VAT summary</CardTitle>
            <CardDescription>VAT counted once from canonical posted documents.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead className="text-right">Output VAT</TableHead><TableHead className="text-right">Purchase VAT</TableHead><TableHead className="text-right">Difference</TableHead>
                  <TableHead className="text-right">Posted invoices</TableHead>
                  <TableHead>Currency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">{summary?.dateFrom?.slice(0, 10) ?? "All time"}</TableCell>
                  <TableCell>{summary?.dateTo?.slice(0, 10) ?? "Current"}</TableCell>
                  <TableCell className="text-right">{summary ? formatMoney(summary.outputVat, "KES") : "—"}</TableCell><TableCell className="text-right">{summary ? formatMoney(summary.inputVat, "KES") : "—"}</TableCell><TableCell className="text-right">{summary ? formatMoney(summary.netVat, "KES") : "—"}</TableCell>
                  <TableCell className="text-right">{summary?.invoiceCount ?? "—"}</TableCell>
                  <TableCell>KES</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <p className="py-3 text-sm text-muted-foreground">{summary?.note}</p>
        <Table><TableHeader><TableRow><TableHead>Document</TableHead><TableHead>Side</TableHead><TableHead>CU reference</TableHead><TableHead>Gross KES</TableHead><TableHead>VAT KES</TableHead></TableRow></TableHeader>
          <TableBody>{summary?.rows.map((row) => <TableRow key={`${row.id}:${row.date}:${row.number}`}><TableCell><Link href={`/docs/${row.type}/${encodeURIComponent(row.id)}`} className="underline">{row.number}</Link></TableCell><TableCell>{row.side}</TableCell><TableCell>{row.cuNumber || "Missing CU reference"}</TableCell><TableCell>{formatMoney(row.gross, "KES")}</TableCell><TableCell>{formatMoney(row.tax, "KES")}</TableCell></TableRow>)}</TableBody></Table>
      </div>
    </PageShell>
  );
}
