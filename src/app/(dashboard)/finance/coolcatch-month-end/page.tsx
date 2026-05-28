"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  fetchMonthEndReconciliations,
  generateMonthEnd,
  postMonthEndReconciliation,
  type MonthEndReconciliation,
} from "@/lib/api/coolcatch-gap";
import { toast } from "sonner";

function formatKes(n: number) {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(n);
}

export default function CoolcatchMonthEndPage() {
  const [periodMonth, setPeriodMonth] = React.useState(() => {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
  const [items, setItems] = React.useState<MonthEndReconciliation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);
  const [postingId, setPostingId] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const { items: rows } = await fetchMonthEndReconciliations(periodMonth);
      setItems(rows ?? []);
    } catch (e) {
      toast.error((e as Error).message || "Failed to load month-end reconciliations.");
    } finally {
      setLoading(false);
    }
  }, [periodMonth]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { id } = await generateMonthEnd(periodMonth);
      toast.success(`Month-end draft generated (${id}).`);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message || "Generate failed.");
    } finally {
      setGenerating(false);
    }
  };

  const handlePost = async (id: string) => {
    setPostingId(id);
    try {
      const result = await postMonthEndReconciliation(id);
      toast.success(
        result.journalId
          ? `Posted. Journal ${result.journalId}`
          : "Month-end reconciliation posted."
      );
      await refresh();
    } catch (e) {
      toast.error((e as Error).message || "Post failed.");
    } finally {
      setPostingId(null);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="CoolCatch month-end"
        description="Consolidate stock take variances, commission, and net settlement per franchise."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Month-end" }]}
        sticky
        actions={
          <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
            Refresh
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Generate reconciliation</CardTitle>
            <CardDescription>
              Variances are held until finance approves and posts in one batch journal.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="period-month">Period (YYYY-MM)</Label>
              <Input
                id="period-month"
                value={periodMonth}
                onChange={(e) => setPeriodMonth(e.target.value)}
                placeholder="2026-05"
                className="w-40"
              />
            </div>
            <Button onClick={() => void handleGenerate()} disabled={generating}>
              {generating ? "Generating…" : "Generate draft"}
            </Button>
          </CardContent>
        </Card>

        {items.map((rec) => (
          <Card key={rec.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{rec.periodMonth}</CardTitle>
                <CardDescription>Reconciliation id: {rec.id}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={rec.status === "POSTED" ? "default" : "secondary"}>{rec.status}</Badge>
                {rec.status !== "POSTED" ? (
                  <Button
                    size="sm"
                    onClick={() => void handlePost(rec.id)}
                    disabled={postingId === rec.id}
                  >
                    {postingId === rec.id ? "Posting…" : "Approve & post"}
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {(rec.outletLines ?? []).length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No outlet lines.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Outlet</TableHead>
                      <TableHead className="text-right">Variance kg</TableHead>
                      <TableHead className="text-right">Variance KES</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                      <TableHead className="text-right">Net settlement</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(rec.outletLines ?? []).map((line) => (
                      <TableRow key={line.outletOrgId}>
                        <TableCell>{line.outletName ?? line.outletOrgId}</TableCell>
                        <TableCell className="text-right">
                          {(line.varianceKg ?? 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatKes(line.varianceKes ?? 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatKes(line.commissionKes ?? 0)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatKes(line.netSettlementKes ?? 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ))}

        {!loading && items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center">
            No reconciliation for this period. Generate a draft to begin.
          </p>
        ) : null}
      </div>
    </PageShell>
  );
}
