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
import { getMockVatSummary } from "@/lib/mock/tax/reports";
import { formatMoney } from "@/lib/money";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function VatSummaryReportPage() {
  const rows = React.useMemo(() => getMockVatSummary(), []);

  return (
    <PageShell>
      <PageHeader
        title="VAT summary"
        description="VAT output, input, net (mock)."
        breadcrumbs={[
          { label: "Reports", href: "/reports" },
          { label: "VAT summary" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <ExplainThis prompt="Why is VAT higher this month? Explain VAT output vs input." label="Explain" />
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
            <CardTitle>VAT summary</CardTitle>
            <CardDescription>By period. Output, input, net. Mock data.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Output</TableHead>
                  <TableHead className="text-right">Input</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Currency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.period}>
                    <TableCell className="font-medium">{r.period}</TableCell>
                    <TableCell className="text-right">{formatMoney(r.output, r.currency)}</TableCell>
                    <TableCell className="text-right">{formatMoney(r.input, r.currency)}</TableCell>
                    <TableCell className="text-right">{formatMoney(r.net, r.currency)}</TableCell>
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
