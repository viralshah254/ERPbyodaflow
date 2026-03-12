"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { listFiscalYears } from "@/lib/data/fiscal.repo";
import type { FiscalYearRow } from "@/lib/mock/fiscal";
import { periodClose, periodReopen } from "@/lib/api/stub-endpoints";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function FiscalYearsPage() {
  const [years, setYears] = React.useState<FiscalYearRow[]>(() => listFiscalYears());
  const [selectedYearId, setSelectedYearId] = React.useState<string | null>(() => listFiscalYears()[0]?.id ?? null);
  const selected = years.find((y) => y.id === selectedYearId) ?? years[0] ?? null;

  const refreshYears = React.useCallback(() => {
    setYears(listFiscalYears());
  }, []);

  const handleClosePeriod = async (periodId: string) => {
    await periodClose({ periodId });
    refreshYears();
    toast.success(`Period ${periodId} closed.`);
  };

  const handleReopen = async (periodId: string) => {
    await periodReopen(periodId);
    refreshYears();
    toast.success(`Period ${periodId} reopened.`);
  };

  return (
    <PageShell>
      <PageHeader
        title="Fiscal years"
        description="Years and periods. Close and reopen periods in demo mode or against the backend."
        breadcrumbs={[
          { label: "Settings", href: "/settings/org" },
          { label: "Financial", href: "/settings/financial/currencies" },
          { label: "Fiscal years" },
        ]}
        sticky
        showCommandHint
      />
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap gap-2">
          {years.map((y) => (
            <Button
              key={y.id}
              variant={selectedYearId === y.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedYearId(y.id)}
            >
              {y.year}
            </Button>
          ))}
        </div>

        {selected && (
          <Card>
            <CardHeader>
              <CardTitle>FY {selected.year}</CardTitle>
              <CardDescription>
                {selected.startDate} — {selected.endDate}. Period status: Open / Closed.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-40">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selected.periods.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {p.monthName} {p.year}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.status === "Closed" ? "secondary" : "default"}>
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {p.status === "Open" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleClosePeriod(p.id)}
                          >
                            Close period
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReopen(p.id)}
                          >
                            Reopen
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
