"use client";
import { WithholdingIncomeTaxPanel } from "@/components/finance/WithholdingIncomeTaxPanel";

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
import { downloadTaxSummaryCsvApi, fetchWhtSummaryApi } from "@/lib/api/reports";
import { formatMoney } from "@/lib/money";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function WhtSummaryReportPage() {
  const [summary, setSummary] = React.useState<{ totalWht: number; billCount: number; dateFrom?: string; dateTo?: string } | null>(null);

  const [loadError, setLoadError] = React.useState("");

  React.useEffect(() => {
    fetchWhtSummaryApi()
      .then(setSummary)
      .catch((error) => setLoadError((error as Error).message || "Failed to load WHT summary."));
  }, []);

  return (
    <PageShell>
      <PageHeader
        title="WHT summary"
        description="Withholding income tax deductions recorded against supplier payments."
        breadcrumbs={[
          { label: "Reports", href: "/reports" },
          { label: "WHT summary" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <ExplainThis prompt="Explain WHT in Kenya. When to apply on AP and payments." label="Explain" />
            <Button
              variant="outline"
              size="sm"
              disabled={!summary}
              onClick={() =>
                downloadTaxSummaryCsvApi("wht-summary", "wht-summary.csv", (message) =>
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
            <CardTitle>WHT summary</CardTitle>
            <CardDescription>Recorded withholding deductions. Ordinary purchase VAT and withholding VAT are reported separately.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead className="text-right">Total WHT</TableHead>
                  <TableHead className="text-right">Bills with deductions</TableHead>
                  <TableHead>Currency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">{summary?.dateFrom?.slice(0, 10) ?? "All time"}</TableCell>
                  <TableCell>{summary?.dateTo?.slice(0, 10) ?? "Current"}</TableCell>
                  <TableCell className="text-right">{summary ? formatMoney(summary.totalWht, "KES") : "—"}</TableCell>
                  <TableCell className="text-right">{summary?.billCount ?? "—"}</TableCell>
                  <TableCell>KES</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        {summary && <WithholdingIncomeTaxPanel />}
      </div>
    </PageShell>
  );
}
