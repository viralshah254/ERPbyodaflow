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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchFinanceAccountsApi, fetchFinancePeriodsApi, fetchLedgerEntriesApi } from "@/lib/api/finance";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function GeneralLedgerPage() {
  const [search, setSearch] = React.useState("");
  const [accountId, setAccountId] = React.useState("");
  const [periodId, setPeriodId] = React.useState("");
  const [accounts, setAccounts] = React.useState<Array<{ id: string; code: string; name: string }>>([]);
  const [periods, setPeriods] = React.useState<Array<{ id: string; fiscalYear: string; periodNumber: number }>>([]);
  const [entries, setEntries] = React.useState<Awaited<ReturnType<typeof fetchLedgerEntriesApi>>>([]);

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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Ledger Entries</CardTitle>
            <div className="flex gap-2">
              <Input placeholder="Search..." className="w-64" value={search} onChange={(e) => setSearch(e.target.value)} />
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((entry) => (
                <TableRow key={`${entry.documentId}-${entry.accountId}-${entry.date}`}>
                  <TableCell>{entry.date.slice(0, 10)}</TableCell>
                  <TableCell>{entry.accountCode} · {entry.accountName}</TableCell>
                  <TableCell>{entry.description}</TableCell>
                  <TableCell className="text-right">{entry.debit ? formatMoney(entry.debit, "KES") : "—"}</TableCell>
                  <TableCell className="text-right">{entry.credit ? formatMoney(entry.credit, "KES") : "—"}</TableCell>
                  <TableCell className="text-right">{formatMoney(entry.balance, "KES")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filtered.length === 0 ? (
            <p className="pt-4 text-sm text-muted-foreground">No ledger entries found.</p>
          ) : null}
        </CardContent>
      </Card>
    </PageLayout>
  );
}





