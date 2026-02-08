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
import { getMockWhtSummary } from "@/lib/mock/tax/reports";
import { formatMoney } from "@/lib/money";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function WhtSummaryReportPage() {
  const rows = React.useMemo(() => getMockWhtSummary(), []);

  return (
    <PageShell>
      <PageHeader
        title="WHT summary"
        description="Withholding tax by period and code (mock)."
        breadcrumbs={[
          { label: "Reports", href: "/reports" },
          { label: "WHT summary" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <ExplainThis prompt="Explain WHT in Kenya. When to apply on AP and payments." label="Explain" />
            <Button variant="outline" size="sm" onClick={() => toast.info("Export (stub)")}>
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
            <CardDescription>By period and code. Base, amount. Mock data.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Currency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={`${r.period}-${r.code}-${i}`}>
                    <TableCell className="font-medium">{r.period}</TableCell>
                    <TableCell>{r.code}</TableCell>
                    <TableCell className="text-right">{formatMoney(r.base, r.currency)}</TableCell>
                    <TableCell className="text-right">{formatMoney(r.amount, r.currency)}</TableCell>
                    <TableCell>{r.currency}</TableCell>
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
