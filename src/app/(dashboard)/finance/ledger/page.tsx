"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PostingBatchSheet } from "@/components/finance/PostingBatchSheet";
import {
  fetchFinanceAccountsApi,
  fetchFinancePeriodsApi,
  fetchLedgerEntriesPageApi,
  type LedgerEntry,
} from "@/lib/api/finance";
import { formatMoney } from "@/lib/money";
import { useBaseCurrency } from "@/lib/org/useBaseCurrency";
import { toast } from "sonner";
import { DataTable } from "@/components/ui/data-table";
import { TablePagination } from "@/components/ui/table-pagination";
import { LIST_PAGE_SHELL_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";

const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const SEARCH_DEBOUNCE_MS = 400;

export default function LedgerPage() {
  const baseCurrency = useBaseCurrency();
  const [searchInput, setSearchInput] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [accountId, setAccountId] = React.useState("");
  const [periodId, setPeriodId] = React.useState("");
  const [accounts, setAccounts] = React.useState<Array<{ id: string; code: string; name: string }>>([]);
  const [periods, setPeriods] = React.useState<Array<{ id: string; fiscalYear: string; periodNumber: number }>>([]);
  const [entries, setEntries] = React.useState<LedgerEntry[]>([]);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [fetching, setFetching] = React.useState(false);
  const [postingSource, setPostingSource] = React.useState<{ sourceType: string; sourceId: string } | null>(null);
  const [pageOffset, setPageOffset] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);
  const [totalCount, setTotalCount] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);
  const hasLoadedOnce = React.useRef(false);

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  React.useEffect(() => {
    Promise.all([fetchFinanceAccountsApi(), fetchFinancePeriodsApi()])
      .then(([nextAccounts, nextPeriods]) => {
        setAccounts(nextAccounts);
        setPeriods(nextPeriods);
        setPeriodId(nextPeriods.find((period) => period.status === "OPEN")?.id ?? nextPeriods[0]?.id ?? "");
      })
      .catch((error) => toast.error((error as Error).message || "Failed to load ledger filters."));
  }, []);

  const loadPage = React.useCallback(
    async (offset: number) => {
      const isFirstLoad = !hasLoadedOnce.current;
      if (isFirstLoad) setInitialLoading(true);
      else setFetching(true);
      try {
        const page = await fetchLedgerEntriesPageApi({
          accountId: accountId || undefined,
          periodId: periodId || undefined,
          search: debouncedSearch || undefined,
          limit: pageSize,
          cursor: String(offset),
        });
        setEntries(page.entries);
        setPageOffset(page.offset);
        setTotalCount(page.total);
        setHasMore(page.hasMore);
        hasLoadedOnce.current = true;
      } catch (error) {
        toast.error((error as Error).message || "Failed to load ledger entries.");
      } finally {
        setInitialLoading(false);
        setFetching(false);
      }
    },
    [accountId, debouncedSearch, pageSize, periodId]
  );

  React.useEffect(() => {
    void loadPage(0);
  }, [loadPage]);

  const loading = initialLoading || fetching;

  const columns = React.useMemo(
    () => [
      {
        id: "date",
        header: "Date",
        accessor: (row: LedgerEntry) => row.date.slice(0, 10),
      },
      {
        id: "account",
        header: "Account",
        accessor: (row: LedgerEntry) => (
          <span className="font-medium">{row.accountCode} · {row.accountName}</span>
        ),
      },
      {
        id: "description",
        header: "Description",
        accessor: (row: LedgerEntry) => row.description,
      },
      {
        id: "source",
        header: "Source",
        accessor: (row: LedgerEntry) => (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => setPostingSource({ sourceType: row.sourceType, sourceId: row.sourceId })}
          >
            {row.documentNumber}
          </Button>
        ),
      },
      {
        id: "debit",
        header: "Debit",
        headerClassName: "text-right",
        className: "text-right",
        accessor: (row: LedgerEntry) =>
          row.debit > 0 ? formatMoney(row.debit, baseCurrency) : "–",
      },
      {
        id: "credit",
        header: "Credit",
        headerClassName: "text-right",
        className: "text-right",
        accessor: (row: LedgerEntry) =>
          row.credit > 0 ? formatMoney(row.credit, baseCurrency) : "–",
      },
      {
        id: "balance",
        header: "Balance",
        headerClassName: "text-right",
        className: "text-right font-medium",
        accessor: (row: LedgerEntry) => formatMoney(row.balance, baseCurrency),
      },
    ],
    [baseCurrency]
  );

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="General Ledger"
        description="View all accounting entries"
        actions={
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        }
      />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
        <Card className="shrink-0">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search accounts or descriptions…"
                    className="pl-9"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
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

        <Card className="shrink-0">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Journal Entries</CardTitle>
              {!loading && (
                <p className="text-sm text-muted-foreground mt-1">
                  {totalCount === 0
                    ? "No entries match your filters."
                    : `${totalCount} ${totalCount === 1 ? "entry" : "entries"} found`}
                </p>
              )}
            </div>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </CardHeader>
          <CardContent className="p-0">
            <DataTable<LedgerEntry>
              data={entries}
              columns={columns}
              emptyMessage={loading ? "Loading entries…" : "No ledger entries found."}
              scrollMode="natural"
              size="comfortable"
            />
          </CardContent>
        </Card>

        <TablePagination
          className="shrink-0"
          pageOffset={pageOffset}
          pageSize={pageSize}
          itemCount={entries.length}
          totalCount={totalCount || undefined}
          hasMore={hasMore}
          loading={loading}
          onPrevious={() => {
            if (pageOffset <= 0 || loading) return;
            void loadPage(Math.max(0, pageOffset - pageSize));
          }}
          onNext={() => {
            if (!hasMore || loading) return;
            void loadPage(pageOffset + pageSize);
          }}
          entityLabel="entries"
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPageOffset(0);
          }}
        />
      </div>
      <PostingBatchSheet
        open={!!postingSource}
        onOpenChange={(open) => {
          if (!open) setPostingSource(null);
        }}
        sourceType={postingSource?.sourceType}
        sourceId={postingSource?.sourceId}
      />
    </PageShell>
  );
}
