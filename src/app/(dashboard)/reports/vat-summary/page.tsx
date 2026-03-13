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
  const [summary, setSummary] = React.useState<{ totalVat: number; invoiceCount: number; dateFrom?: string; dateTo?: string } | null>(null);

  React.useEffect(() => {
    fetchVatSummaryApi()
      .then(setSummary)
      .catch((error) => toast.error((error as Error).message || "Failed to load VAT summary."));
  }, []);

  return (
    <PageShell>
      <PageHeader
        title="VAT summary"
        description="Live VAT summary sourced from posted invoices."
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
        <Card>
          <CardHeader>
            <CardTitle>VAT summary</CardTitle>
            <CardDescription>Header and line tax aggregated from posted invoices.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead className="text-right">Total VAT</TableHead>
                  <TableHead className="text-right">Posted invoices</TableHead>
                  <TableHead>Currency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">{summary?.dateFrom?.slice(0, 10) ?? "All time"}</TableCell>
                  <TableCell>{summary?.dateTo?.slice(0, 10) ?? "Current"}</TableCell>
                  <TableCell className="text-right">{formatMoney(summary?.totalVat ?? 0, "KES")}</TableCell>
                  <TableCell className="text-right">{summary?.invoiceCount ?? 0}</TableCell>
                  <TableCell>KES</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
