"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchTrialBalanceApi, fetchFinancePeriodsApi, type TrialBalanceRow } from "@/lib/api/finance";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  ASSET: "Asset",
  LIABILITY: "Liability",
  EQUITY: "Equity",
  REVENUE: "Revenue",
  EXPENSE: "Expense",
};

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  ASSET: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300",
  LIABILITY: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300",
  EQUITY: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300",
  REVENUE: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300",
  EXPENSE: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300",
};

export default function TrialBalancePage() {
  const [periodId, setPeriodId] = React.useState<string | undefined>(undefined);
  const [periods, setPeriods] = React.useState<Array<{ id: string; fiscalYear: string; periodNumber: number; status: string }>>([]);
  const [trialBalance, setTrialBalance] = React.useState<Awaited<ReturnType<typeof fetchTrialBalanceApi>> | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [filterType, setFilterType] = React.useState<string>("ALL");

  const load = React.useCallback(async (pid?: string) => {
    setLoading(true);
    try {
      const data = await fetchTrialBalanceApi(pid);
      setTrialBalance(data);
    } catch (e) {
      toast.error((e as Error).message || "Failed to load trial balance");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchFinancePeriodsApi().then(setPeriods).catch(() => {});
    void load(undefined);
  }, [load]);

  const filteredRows = React.useMemo((): TrialBalanceRow[] => {
    if (!trialBalance) return [];
    const rows = trialBalance.rows.filter((r) => r.debit > 0 || r.credit > 0);
    if (filterType !== "ALL") return rows.filter((r) => r.type === filterType);
    return rows;
  }, [trialBalance, filterType]);

  const groupedRows = React.useMemo(() => {
    const groups: Record<string, TrialBalanceRow[]> = {};
    for (const row of filteredRows) {
      const type = row.type ?? "OTHER";
      if (!groups[type]) groups[type] = [];
      groups[type].push(row);
    }
    return groups;
  }, [filteredRows]);

  return (
    <PageLayout
      title="Trial Balance"
      description="Summary of all ledger account balances for a period"
      actions={
        <Button variant="outline" size="sm" onClick={() => void load(periodId)} disabled={loading}>
          <Icons.RefreshCw className={cn("mr-2 h-3.5 w-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      }
    >
      <div className="space-y-5">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <Select
            value={periodId ?? "all"}
            onValueChange={(v) => {
              const newPeriodId = v === "all" ? undefined : v;
              setPeriodId(newPeriodId);
              void load(newPeriodId);
            }}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="All periods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All periods</SelectItem>
              {periods.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.fiscalYear} — Period {p.periodNumber}{" "}
                  {p.status === "OPEN" ? "(Open)" : "(Closed)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              {Object.keys(ACCOUNT_TYPE_LABELS).map((type) => (
                <SelectItem key={type} value={type}>
                  {ACCOUNT_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {trialBalance && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {trialBalance.periodLabel}
              </span>
              {trialBalance.totals.isBalanced ? (
                <Badge variant="outline" className="text-green-700 border-green-300 text-xs">
                  <Icons.CheckCircle2 className="mr-1 h-3 w-3" />
                  Balanced
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">
                  <Icons.AlertTriangle className="mr-1 h-3 w-3" />
                  Out of balance
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Totals bar */}
        {trialBalance && (
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Debits</p>
                <p className="text-lg font-bold">{formatMoney(trialBalance.totals.debit, "KES")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Credits</p>
                <p className="text-lg font-bold">{formatMoney(trialBalance.totals.credit, "KES")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Difference</p>
                <p className={cn("text-lg font-bold", !trialBalance.totals.isBalanced && "text-red-600")}>
                  {formatMoney(Math.abs(trialBalance.totals.debit - trialBalance.totals.credit), "KES")}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Account groups */}
        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
            <Icons.Loader2 className="h-5 w-5 animate-spin" />
            Loading trial balance…
          </div>
        )}

        {!loading && trialBalance && filteredRows.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No posted transactions found for this period.
            </CardContent>
          </Card>
        )}

        {!loading &&
          Object.entries(groupedRows).map(([type, rows]) => (
            <Card key={type}>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn("text-xs", ACCOUNT_TYPE_COLORS[type])}
                  >
                    {ACCOUNT_TYPE_LABELS[type] ?? type}
                  </Badge>
                  <span className="text-muted-foreground font-normal">
                    {rows.length} account(s)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Code</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Account Name</th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground">Debit</th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground">Credit</th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.accountId} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{row.code}</td>
                          <td className="px-4 py-2">{row.name}</td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {row.debit > 0 ? formatMoney(row.debit, "KES") : "—"}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {row.credit > 0 ? formatMoney(row.credit, "KES") : "—"}
                          </td>
                          <td
                            className={cn(
                              "px-4 py-2 text-right tabular-nums font-medium",
                              row.balance < 0 && "text-red-600"
                            )}
                          >
                            {formatMoney(Math.abs(row.balance), "KES")}
                            {row.balance < 0 ? " Cr" : " Dr"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/30 font-semibold">
                        <td className="px-4 py-2" colSpan={2}>
                          Subtotal
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {formatMoney(rows.reduce((s, r) => s + r.debit, 0), "KES")}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {formatMoney(rows.reduce((s, r) => s + r.credit, 0), "KES")}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {formatMoney(Math.abs(rows.reduce((s, r) => s + r.balance, 0)), "KES")}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </PageLayout>
  );
}
