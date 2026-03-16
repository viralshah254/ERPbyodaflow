"use client";

import * as React from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CashflowForecastRow } from "@/lib/types/treasury";
import { fetchCashflowApi } from "@/lib/api/treasury";
import { formatMoney } from "@/lib/money";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { toast } from "sonner";

export default function CashflowPage() {
  const [currencyFilter, setCurrencyFilter] = React.useState("KES");
  const [from, setFrom] = React.useState("2025-01-01");
  const [to, setTo] = React.useState("2025-02-28");
  const [rows, setRows] = React.useState<CashflowForecastRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await fetchCashflowApi({ currency: currencyFilter, from, to });
        if (!cancelled) setRows(data);
      } catch (error) {
        if (!cancelled) toast.error((error as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [currencyFilter, from, to]);

  return (
    <PageShell>
      <PageHeader
        title="Cashflow forecast"
        description="Forecast view, date range, currency"
        breadcrumbs={[
          { label: "Treasury", href: "/treasury/overview" },
          { label: "Cashflow" },
        ]}
        sticky
        showCommandHint
        actions={
          <ExplainThis prompt="Explain cashflow forecast and drilldowns to source docs." label="Explain cashflow" />
        }
      />
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Currency</Label>
            <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="KES">KES</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Forecast</CardTitle>
            <CardDescription>Base vs document currency with live treasury cashflow data.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Inflow</TableHead>
                  <TableHead>Outflow</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.date}</TableCell>
                    <TableCell>{r.description}</TableCell>
                    <TableCell className="text-green-600 dark:text-green-400">
                      {r.inflow > 0 ? formatMoney(r.inflow, r.currency) : "—"}
                    </TableCell>
                    <TableCell className="text-destructive">
                      {r.outflow > 0 ? formatMoney(r.outflow, r.currency) : "—"}
                    </TableCell>
                    <TableCell>{formatMoney(r.balance, r.currency)}</TableCell>
                    <TableCell>
                      {r.sourceDoc ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toast.info(`Source document: ${r.sourceDoc}`)}
                        >
                          View doc
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!loading && rows.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No forecast data for selected filters.
              </div>
            )}
            {loading && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Loading cashflow...
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
