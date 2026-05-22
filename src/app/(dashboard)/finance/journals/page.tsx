"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { PostingBatchSheet } from "@/components/finance/PostingBatchSheet";
import { StatusBadge } from "@/components/ui/status-badge";
import { DocumentNumber } from "@/components/docs/document-number";
import { SkeletonDataTable } from "@/components/ui/skeleton";
import { TableLinearProgress } from "@/components/ui/table-linear-progress";
import { TablePagination } from "@/components/ui/table-pagination";
import { format } from "date-fns";
import { downloadCsv } from "@/lib/export/csv";
import { formatMoney } from "@/lib/money";
import { useBaseCurrency } from "@/lib/org/useBaseCurrency";
import { fetchDocumentListPageApi } from "@/lib/api/documents";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const SEARCH_DEBOUNCE_MS = 400;
const PAGE_SIZE = 25;

interface JournalEntry {
  id: string;
  journalNumber: string;
  date: string;
  memo?: string;
  reference?: string;
  totalDebit: number;
  totalCredit: number;
  status: string;
}

function mapJournalRow(doc: {
  id: string;
  number: string;
  date: string;
  reference?: string;
  total?: number;
  status: string;
}): JournalEntry {
  return {
    id: doc.id,
    journalNumber: doc.number,
    date: doc.date,
    memo: doc.reference,
    reference: doc.reference,
    totalDebit: doc.total ?? 0,
    totalCredit: doc.total ?? 0,
    status: doc.status,
  };
}

export default function JournalEntriesPage() {
  const baseCurrency = useBaseCurrency();
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [fetching, setFetching] = React.useState(false);
  const [rows, setRows] = React.useState<JournalEntry[]>([]);
  const [pageOffset, setPageOffset] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);
  const [postingSource, setPostingSource] = React.useState<{ sourceType: string; sourceId: string } | null>(null);
  const hasLoadedOnce = React.useRef(false);

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [search]);

  const loadPage = React.useCallback(
    async (offset: number) => {
      const isFirstLoad = !hasLoadedOnce.current;
      if (isFirstLoad) setInitialLoading(true);
      else setFetching(true);
      try {
        const page = await fetchDocumentListPageApi("journal", {
          limit: PAGE_SIZE,
          cursor: String(offset),
          status: statusFilter || undefined,
          search: debouncedSearch.trim() || undefined,
        });
        setRows(page.items.map(mapJournalRow));
        setPageOffset(page.offset);
        setHasMore(page.hasMore);
        hasLoadedOnce.current = true;
      } catch (error) {
        toast.error((error as Error).message || "Failed to load journals.");
      } finally {
        setInitialLoading(false);
        setFetching(false);
      }
    },
    [debouncedSearch, statusFilter]
  );

  React.useEffect(() => {
    void loadPage(0);
  }, [loadPage]);

  const handleRefresh = React.useCallback(() => {
    void loadPage(pageOffset);
  }, [loadPage, pageOffset]);

  const goToPreviousPage = () => {
    if (pageOffset <= 0 || initialLoading || fetching) return;
    void loadPage(Math.max(0, pageOffset - PAGE_SIZE));
  };

  const goToNextPage = () => {
    if (!hasMore || initialLoading || fetching) return;
    void loadPage(pageOffset + PAGE_SIZE);
  };

  const searchPending = search.trim() !== debouncedSearch.trim();
  const tableBusy = fetching || searchPending;

  const columns = React.useMemo(
    () => [
      {
        id: "journalNumber",
        header: "Number",
        accessor: (row: JournalEntry) => (
          <DocumentNumber value={row.journalNumber} className="font-medium" />
        ),
        sticky: true,
      },
      {
        id: "date",
        header: "Date",
        accessor: (row: JournalEntry) => format(new Date(row.date), "MMM dd, yyyy"),
      },
      {
        id: "reference",
        header: "Reference",
        accessor: (row: JournalEntry) =>
          row.reference ? (
            <span className="block max-w-[min(320px,40vw)] truncate font-mono text-xs" title={row.reference}>
              {row.reference}
            </span>
          ) : (
            "—"
          ),
      },
      {
        id: "debit",
        header: "Debit",
        accessor: (row: JournalEntry) => (
          <span className="font-medium tabular-nums">
            {formatMoney(row.totalDebit, baseCurrency)}
          </span>
        ),
      },
      {
        id: "credit",
        header: "Credit",
        accessor: (row: JournalEntry) => (
          <span className="font-medium tabular-nums">
            {formatMoney(row.totalCredit, baseCurrency)}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        accessor: (row: JournalEntry) => <StatusBadge status={row.status} />,
      },
      {
        id: "posting",
        header: "",
        accessor: (row: JournalEntry) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              setPostingSource({ sourceType: "journal", sourceId: row.id });
            }}
          >
            Posting
          </Button>
        ),
      },
    ],
    [baseCurrency]
  );

  return (
    <PageShell>
      <PageHeader
        title="Journal Entries"
        description="Create and manage journal entries"
        breadcrumbs={[
          { label: "Finance", href: "/finance" },
          { label: "Journal Entries" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button asChild>
            <Link href="/docs/journal/new">
              <Icons.Plus className="mr-2 h-4 w-4" />
              Create Journal
            </Link>
          </Button>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
        <DataTableToolbar
          className="rounded-xl border bg-card/80 shadow-sm backdrop-blur-sm"
          searchPlaceholder="Search by number or reference…"
          searchValue={search}
          onSearchChange={setSearch}
          searchInputProps={{
            spellCheck: false,
            autoComplete: "off",
            className: "font-mono text-sm tracking-tight",
          }}
          filters={[
            {
              id: "status",
              label: "Status",
              options: [
                { label: "All", value: "" },
                { label: "Draft", value: "DRAFT" },
                { label: "Posted", value: "POSTED" },
              ],
              value: statusFilter,
              onChange: (v) => setStatusFilter(v),
            },
          ]}
          actions={
            <Button
              variant="outline"
              size="sm"
              disabled={initialLoading || fetching}
              onClick={handleRefresh}
            >
              <Icons.RefreshCw className={cn("h-4 w-4 mr-1.5", (initialLoading || fetching) && "animate-spin")} />
              Refresh
            </Button>
          }
          onExport={() =>
            downloadCsv(
              `journal-entries-${new Date().toISOString().slice(0, 10)}.csv`,
              rows.map((row) => ({
                journalNumber: row.journalNumber,
                date: row.date,
                memo: row.memo,
                reference: row.reference,
                totalDebit: row.totalDebit,
                totalCredit: row.totalCredit,
                status: row.status,
              }))
            )
          }
        />
        {initialLoading ? (
          <SkeletonDataTable
            rows={PAGE_SIZE}
            columnWidths={["w-20", "w-24", "w-40", "w-24", "w-24", "w-20", "w-16"]}
          />
        ) : (
          <div className="relative overflow-hidden rounded-xl border bg-card shadow-sm">
            <TableLinearProgress active={tableBusy} />
            <div
              className={cn(
                "transition-opacity duration-200",
                tableBusy && "pointer-events-none opacity-60"
              )}
            >
              <DataTable<JournalEntry>
                data={rows}
                columns={columns}
                onRowClick={(row) => router.push(`/docs/journal/${row.id}`)}
                emptyMessage="No journal entries. Create one to get started."
              />
            </div>
          </div>
        )}
        <TablePagination
          sticky
          pageOffset={pageOffset}
          pageSize={PAGE_SIZE}
          itemCount={initialLoading ? 0 : rows.length}
          hasMore={hasMore}
          loading={initialLoading || fetching}
          busy={searchPending}
          onPrevious={goToPreviousPage}
          onNext={goToNextPage}
          entityLabel="journal entries"
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
