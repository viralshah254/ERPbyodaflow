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
import { downloadTaxSummaryCsvApi, fetchWhtSummaryApi } from "@/lib/api/reports";
import { formatMoney } from "@/lib/money";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function WhtSummaryReportPage() {
  const [summary, setSummary] = React.useState<{ totalWht: number; billCount: number; dateFrom?: string; dateTo?: string } | null>(null);

  React.useEffect(() => {
    fetchWhtSummaryApi()
      .then(setSummary)
      .catch((error) => toast.error((error as Error).message || "Failed to load WHT summary."));
  }, []);

  return (
    <PageShell>
      <PageHeader
        title="WHT summary"
        description="Live withholding tax summary sourced from posted bills."
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
        <Card>
          <CardHeader>
            <CardTitle>WHT summary</CardTitle>
            <CardDescription>Aggregated withholding on posted bills for the selected scope.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead className="text-right">Total WHT</TableHead>
                  <TableHead className="text-right">Posted bills</TableHead>
                  <TableHead>Currency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">{summary?.dateFrom?.slice(0, 10) ?? "All time"}</TableCell>
                  <TableCell>{summary?.dateTo?.slice(0, 10) ?? "Current"}</TableCell>
                  <TableCell className="text-right">{formatMoney(summary?.totalWht ?? 0, "KES")}</TableCell>
                  <TableCell className="text-right">{summary?.billCount ?? 0}</TableCell>
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
