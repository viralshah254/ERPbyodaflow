"use client";

import * as React from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { PostingBatchSheet } from "@/components/finance/PostingBatchSheet";
import { fetchFinanceAccountsApi, fetchFinancePeriodsApi, fetchLedgerEntriesApi } from "@/lib/api/finance";
import { formatMoney } from "@/lib/money";
import { useBaseCurrency } from "@/lib/org/useBaseCurrency";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function GeneralLedgerPage() {
  const baseCurrency = useBaseCurrency();
  const [search, setSearch] = React.useState("");
  const [accountId, setAccountId] = React.useState("");
  const [periodId, setPeriodId] = React.useState("");
  const [accounts, setAccounts] = React.useState<Array<{ id: string; code: string; name: string }>>([]);
  const [periods, setPeriods] = React.useState<Array<{ id: string; fiscalYear: string; periodNumber: number }>>([]);
  const [entries, setEntries] = React.useState<Awaited<ReturnType<typeof fetchLedgerEntriesApi>>>([]);
  const [postingSource, setPostingSource] = React.useState<{ sourceType: string; sourceId: string } | null>(null);

  React.useEffect(() => {
    Promise.all([fetchFinanceAccountsApi(), fetchFinancePeriodsApi()])
      .then(([nextAccounts, nextPeriods]) => {
        setAccounts(nextAccounts);
        setPeriods(nextPeriods);
        setPeriodId(nextPeriods.find((period) => period.status === "OPEN")?.id ?? nextPeriods[0]?.id ?? "");
      })
      .catch((error) => toast.error((error as Error).message || "Failed to load GL filters."));
  }, []);

  React.useEffect(() => {
    fetchLedgerEntriesApi(accountId || undefined, periodId || undefined)
      .then(setEntries)
      .catch((error) => toast.error((error as Error).message || "Failed to load ledger entries."));
  }, [accountId, periodId]);

  const columns = React.useMemo(() => [
    { id: 'date', header: 'Date', accessor: (entry: (typeof entries)[number]) => entry.date.slice(0, 10), sortValue: (entry: (typeof entries)[number]) => entry.date },
    { id: 'account', header: 'Account', accessor: (entry: (typeof entries)[number]) => `${entry.accountCode} · ${entry.accountName}`, sortValue: (entry: (typeof entries)[number]) => `${entry.accountCode} ${entry.accountName}` },
    { id: 'description', header: 'Description', accessor: 'description' as const },
    { id: 'source', header: 'Source', accessor: (entry: (typeof entries)[number]) => <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setPostingSource({ sourceType: entry.sourceType, sourceId: entry.sourceId })}>{entry.documentNumber}</Button>, sortValue: (entry: (typeof entries)[number]) => entry.documentNumber },
    { id: 'debit', header: 'Debit', className: 'text-right', accessor: (entry: (typeof entries)[number]) => entry.debit ? formatMoney(entry.debit, baseCurrency) : '—', sortValue: (entry: (typeof entries)[number]) => entry.debit },
    { id: 'credit', header: 'Credit', className: 'text-right', accessor: (entry: (typeof entries)[number]) => entry.credit ? formatMoney(entry.credit, baseCurrency) : '—', sortValue: (entry: (typeof entries)[number]) => entry.credit },
    { id: 'balance', header: 'Balance', className: 'text-right', accessor: (entry: (typeof entries)[number]) => formatMoney(entry.balance, baseCurrency), sortValue: (entry: (typeof entries)[number]) => entry.balance },
  ], [baseCurrency]);

  return (
    <PageLayout
      title="General Ledger"
      description="View all accounting transactions"
      actions={
        <Button variant="outline">
          <Icons.Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      }
    >
      <Card className="min-w-0">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="shrink-0">Ledger Entries</CardTitle>
            <div className="flex min-w-0 flex-wrap gap-2">
              <Input placeholder="Search..." className="w-full min-w-[12rem] sm:w-64" value={search} onChange={(e) => setSearch(e.target.value)} />
              <Select value={accountId || "__all_accounts"} onValueChange={(value) => setAccountId(value === "__all_accounts" ? "" : value)}>
                <SelectTrigger className="w-52"><SelectValue placeholder="All accounts" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all_accounts">All accounts</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>{account.code} · {account.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={periodId || "__all_periods"} onValueChange={(value) => setPeriodId(value === "__all_periods" ? "" : value)}>
                <SelectTrigger className="w-44"><SelectValue placeholder="All periods" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all_periods">All periods</SelectItem>
                  {periods.map((period) => (
                    <SelectItem key={period.id} value={period.id}>{period.fiscalYear} · P{period.periodNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable data={entries} columns={columns} searchable={false} search={search} emptyMessage="No ledger entries found." />
          <p className="mt-2 text-xs text-muted-foreground">Balances follow the original posting sequence when rows are sorted.</p>
        </CardContent>
      </Card>
      <PostingBatchSheet
        open={!!postingSource}
        onOpenChange={(open) => {
          if (!open) setPostingSource(null);
        }}
        sourceType={postingSource?.sourceType}
        sourceId={postingSource?.sourceId}
      />
    </PageLayout>
  );
}





