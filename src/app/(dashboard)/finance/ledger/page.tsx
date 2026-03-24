"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download } from "lucide-react";
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
import { PostingBatchSheet } from "@/components/finance/PostingBatchSheet";
import { fetchFinanceAccountsApi, fetchFinancePeriodsApi, fetchLedgerEntriesApi } from "@/lib/api/finance";
import { formatMoney } from "@/lib/money";
import { useBaseCurrency } from "@/lib/org/useBaseCurrency";
import { toast } from "sonner";

export default function LedgerPage() {
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
      .catch((error) => toast.error((error as Error).message || "Failed to load ledger filters."));
  }, []);

  React.useEffect(() => {
    fetchLedgerEntriesApi(accountId || undefined, periodId || undefined)
      .then(setEntries)
      .catch((error) => toast.error((error as Error).message || "Failed to load ledger entries."));
  }, [accountId, periodId]);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return entries;
    const query = search.trim().toLowerCase();
    return entries.filter(
      (entry) =>
        entry.accountCode.toLowerCase().includes(query) ||
        entry.accountName.toLowerCase().includes(query) ||
        entry.description.toLowerCase().includes(query) ||
        entry.documentNumber.toLowerCase().includes(query)
    );
  }, [entries, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">General Ledger</h1>
          <p className="text-muted-foreground">
            View all accounting entries
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search accounts or descriptions..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
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
        </CardContent>
      </Card>

      {/* Ledger Table */}
      <Card>
        <CardHeader>
          <CardTitle>Journal Entries</CardTitle>
          <CardDescription>
            {filtered.length} entries found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((entry) => (
                <TableRow key={`${entry.documentId}-${entry.accountId}-${entry.date}`}>
                  <TableCell>{entry.date.slice(0, 10)}</TableCell>
                  <TableCell className="font-medium">{entry.accountCode} · {entry.accountName}</TableCell>
                  <TableCell>{entry.description}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => setPostingSource({ sourceType: entry.sourceType, sourceId: entry.sourceId })}
                    >
                      {entry.documentNumber}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    {entry.debit > 0 ? formatMoney(entry.debit, baseCurrency) : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {entry.credit > 0 ? formatMoney(entry.credit, baseCurrency) : "-"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatMoney(entry.balance, baseCurrency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
    </div>
  );
}

