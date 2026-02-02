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
import { getMockStatutories } from "@/lib/mock/payroll/statutories";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import * as Icons from "lucide-react";

export default function StatutoriesPage() {
  const stats = React.useMemo(() => getMockStatutories(), []);

  return (
    <PageShell>
      <PageHeader
        title="Statutories"
        description="Kenya NSSF, NHIF, PAYE. Config placeholders."
        breadcrumbs={[
          { label: "Payroll", href: "/payroll/overview" },
          { label: "Statutories" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <ExplainThis prompt="Explain VAT vs WHT in Kenya. Explain NSSF, NHIF, PAYE." label="Explain" />
            <Button variant="outline" size="sm" asChild>
              <Link href="/payroll/overview">Overview</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Kenya statutories</CardTitle>
            <CardDescription>NSSF, NHIF, PAYE. Seed list; allow edit (stub).</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Cap</TableHead>
                  <TableHead>Currency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.code}</TableCell>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{s.rate != null ? `${s.rate}%` : "—"}</TableCell>
                    <TableCell>{s.cap != null ? s.cap.toLocaleString() : "—"}</TableCell>
                    <TableCell>{s.currency}</TableCell>
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
