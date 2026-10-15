"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LIST_PAGE_BODY_CLASS, LIST_PAGE_SHELL_CLASS, LIST_TABLE_PAGINATION_CLASS, LIST_TABLE_SCROLL_BODY_CLASS, LIST_TABLE_SURFACE_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { SkeletonDataTable } from "@/components/ui/skeleton";
import { TableLinearProgress } from "@/components/ui/table-linear-progress";
import { TablePagination } from "@/components/ui/table-pagination";
import type { SalesDocRow } from "@/lib/types/sales";
import { downloadCsv } from "@/lib/export/csv";
import { fetchSalesDocumentsPageApi } from "@/lib/api/sales-docs";
import { bulkDocumentActionApi, exportDocumentListApi } from "@/lib/api/documents";
import { isApiConfigured } from "@/lib/api/client";
import { formatActivityExact, formatActivityWhen } from "@/lib/format/nairobi-datetime";
import {
  filterIdsForBulkPost,
  partitionBulkDocResults,
} from "@/lib/documents/bulk-eligibility";
import {
  getSavedViews,
  saveView,
  deleteSavedView,
} from "@/lib/saved-views";
import type { SavedView } from "@/components/ui/saved-views-dropdown";
import type { FilterChip } from "@/components/ui/filter-chips";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { useCanWriteSales } from "@/lib/rbac/use-write-guard";
import { CustomerLink } from "@/components/customers/CustomerLink";

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Posted", value: "POSTED" },
];

const scope = "sales-invoices";
const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [20, 25, 30, 50] as const;

function invoiceWhen(row: SalesDocRow): string {
  return row.createdAt || row.date;
}

export default function SalesInvoicesPage() {
  const canWrite = useCanWriteSales();
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [currentViewId, setCurrentViewId] = React.useState<string | null>(null);
  const [savedViews, setSavedViews] = React.useState<SavedView[]>(() =>
    getSavedViews(scope)
  );

  const [rows, setRows] = React.useState<SalesDocRow[]>([]);
  const [pageSize, setPageSize] = React.useState<number>(DEFAULT_PAGE_SIZE);
  const [pageSizeOptions, setPageSizeOptions] = React.useState<number[]>([...PAGE_SIZE_OPTIONS]);
  const [pageOffset, setPageOffset] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);
  const [totalCount, setTotalCount] = React.useState<number | undefined>(undefined);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [fetching, setFetching] = React.useState(false);
  const hasLoadedOnce = React.useRef(false);

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(id);
  }, [search]);

  const loadPage = React.useCallback(
    async (offset: number) => {
      const isFirstLoad = !hasLoadedOnce.current;
      if (isFirstLoad) setInitialLoading(true);
      else setFetching(true);
      try {
        const page = await fetchSalesDocumentsPageApi("invoice", {
          limit: pageSize,
          cursor: String(offset),
          search: debouncedSearch || undefined,
          status: statusFilter || undefined,
        });
        setRows(page.items);
        setPageOffset(page.offset);
        setHasMore(page.hasMore);
        setTotalCount(page.totalCount);
        if (page.pageSizeOptions?.length) setPageSizeOptions(page.pageSizeOptions);
        setSelectedIds([]);
        hasLoadedOnce.current = true;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load invoices.");
        setRows([]);
        setHasMore(false);
        setTotalCount(undefined);
      } finally {
        setInitialLoading(false);
        setFetching(false);
      }
    },
    [debouncedSearch, pageSize, statusFilter]
  );

  React.useEffect(() => {
    void loadPage(0);
  }, [loadPage]);

  const refreshRows = React.useCallback(async () => {
    await loadPage(pageOffset);
  }, [loadPage, pageOffset]);

  const goToPreviousPage = React.useCallback(() => {
    void loadPage(Math.max(0, pageOffset - pageSize));
  }, [loadPage, pageOffset, pageSize]);

  const goToNextPage = React.useCallback(() => {
    void loadPage(pageOffset + pageSize);
  }, [loadPage, pageOffset, pageSize]);

  const selectedRows = React.useMemo(
    () => rows.filter((r) => selectedIds.includes(r.id)),
    [rows, selectedIds]
  );

  const filterChips: FilterChip[] = React.useMemo(() => {
    const chips: FilterChip[] = [];
    if (statusFilter) {
      const opt = STATUS_OPTIONS.find((o) => o.value === statusFilter);
      chips.push({ id: "status", label: "Status", value: opt?.label ?? statusFilter });
    }
    if (search.trim()) chips.push({ id: "q", label: "Search", value: search.trim() });
    return chips;
  }, [statusFilter, search]);

  const columns = React.useMemo(
    () => [
      {
        id: "number",
        header: "Number",
        accessor: (r: SalesDocRow) => <span className="font-medium">{r.number}</span>,
        sticky: true,
      },
      {
        id: "date",
        header: "Date",
        accessor: (r: SalesDocRow) => {
          const when = invoiceWhen(r);
          const exact = formatActivityExact(when);
          return (
            <span className="whitespace-nowrap text-sm text-muted-foreground" title={exact || undefined}>
              {formatActivityWhen(when)}
            </span>
          );
        },
      },
      {
        id: "party",
        header: "Customer",
        accessor: (r: SalesDocRow) => <CustomerLink id={r.partyId} name={r.party} />,
      },
      {
        id: "total",
        header: "Total",
        accessor: (r: SalesDocRow) =>
          r.total != null ? `KES ${r.total.toLocaleString()}` : "—",
      },
      {
        id: "status",
        header: "Status",
        accessor: (r: SalesDocRow) => <StatusBadge status={r.status} />,
      },
    ],
    []
  );

  const handleClearFilters = () => {
    setStatusFilter("");
    setSearch("");
  };
  const handleRemoveFilterChip = (id: string) => {
    if (id === "status") setStatusFilter("");
    if (id === "q") setSearch("");
  };
  const handleSaveView = () => {
    const v = saveView(scope, {
      name: `View ${savedViews.length + 1}`,
      filters: { q: search, status: statusFilter },
    });
    setSavedViews(getSavedViews(scope));
    setCurrentViewId(v.id);
  };
  const handleSelectView = (id: string) => {
    const v = savedViews.find((x) => x.id === id);
    if (v?.filters) {
      setSearch((v.filters.q as string) ?? "");
      setStatusFilter((v.filters.status as string) ?? "");
    }
    setCurrentViewId(id);
  };
  const handleDeleteView = (id: string) => {
    deleteSavedView(scope, id);
    setSavedViews(getSavedViews(scope));
    if (currentViewId === id) setCurrentViewId(null);
  };

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Invoices"
        description="Bills for what left the gate. Delivery sales are invoiced from the delivery note after proof of delivery."
        breadcrumbs={[
          { label: "Sales", href: "/sales/overview" },
          { label: "Invoices" },
        ]}
        sticky
        showCommandHint
        actions={canWrite ? (
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/docs/credit-note/new">
                <Icons.RotateCcw className="mr-2 h-4 w-4" />
                Credit Note
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/docs/debit-note/new">
                <Icons.BadgePlus className="mr-2 h-4 w-4" />
                Debit Note
              </Link>
            </Button>
            <Button asChild>
              <Link href="/docs/invoice/new" data-tour-step="create-button" title="Pickup / ad-hoc invoice — for delivery sales, convert from the delivery note after POD">
                <Icons.Plus className="mr-2 h-4 w-4" />
                Pickup / ad-hoc invoice
              </Link>
            </Button>
          </div>
        ) : undefined}
      />
      <div className={LIST_PAGE_BODY_CLASS}>
        <DataTableToolbar className="shrink-0"
          searchPlaceholder="Search by number, customer..."
          searchValue={search}
          onSearchChange={setSearch}
          filters={[
            {
              id: "status",
              label: "Status",
              options: STATUS_OPTIONS,
              value: statusFilter,
              onChange: (v) => setStatusFilter(v),
            },
          ]}
          activeFiltersCount={filterChips.length}
          onClearFilters={handleClearFilters}
          filterChips={filterChips}
          onRemoveFilterChip={handleRemoveFilterChip}
          savedViews={savedViews}
          currentViewId={currentViewId}
          onSelectView={handleSelectView}
          onSaveCurrentView={handleSaveView}
          onDeleteView={handleDeleteView}
          onExport={() => {
            const fileName = `sales-invoices-${new Date().toISOString().slice(0, 10)}.csv`;
            if (isApiConfigured()) {
              exportDocumentListApi("invoice", fileName, (msg) => toast.error(msg));
              return;
            }
            downloadCsv(
              fileName,
              rows.map((row) => ({
                number: row.number,
                date: formatActivityExact(invoiceWhen(row)) || row.date,
                customer: row.party ?? "",
                total: row.total ?? 0,
                status: row.status,
              }))
            );
          }}
          bulkActions={
            selectedIds.length > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedIds.length} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const postIds = filterIdsForBulkPost("invoice", selectedRows, selectedIds);
                    if (!postIds.length) {
                      toast.info(
                        "None of the selected invoices can be signed and posted. Choose drafts or approved invoices that are not already posted or cancelled. Pending-approval invoices must be approved first."
                      );
                      return;
                    }
                    try {
                      const { results } = await bulkDocumentActionApi("invoice", "post", postIds);
                      const { succeeded, failed } = partitionBulkDocResults(results);
                      await refreshRows();
                      if (succeeded.length) {
                        toast.success(`${succeeded.length} invoice(s) signed and posted.`);
                      }
                      if (failed.length) {
                        toast.error(`${failed.length} failed: ${failed.map((f) => f.error).join("; ")}`);
                      }
                      setSelectedIds([]);
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Failed to post invoices.");
                    }
                  }}
                >
                  Sign and post
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    downloadCsv(
                      `sales-invoices-selected-${new Date().toISOString().slice(0, 10)}.csv`,
                      rows
                        .filter((row) => selectedIds.includes(row.id))
                        .map((row) => ({
                          number: row.number,
                          date: formatActivityExact(invoiceWhen(row)) || row.date,
                          customer: row.party ?? "",
                          total: row.total ?? 0,
                          status: row.status,
                        }))
                    )
                  }
                >
                  Export
                </Button>
              </div>
            ) : undefined
          }
        />
        <div className={LIST_TABLE_SURFACE_CLASS}>
          {initialLoading ? (
            <div className="p-4">
              <SkeletonDataTable rows={pageSize} columnWidths={["w-24", "w-28", "w-40", "w-24", "w-24"]} />
            </div>
          ) : (
            <>
              <TableLinearProgress active={fetching} />
              <div className={LIST_TABLE_SCROLL_BODY_CLASS}>
                <DataTable<SalesDocRow>
                  data={rows}
                  columns={columns}
                  onRowClick={(row) => router.push(`/docs/invoice/${row.id}`)}
                  emptyMessage="No invoices yet."
                  selectable
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                  scrollMode="fill"
                  size="comfortable"
                  className="min-h-0 flex-1 border-0 shadow-none"
                />
              </div>
            </>
          )}
          <TablePagination
            className={`${LIST_TABLE_PAGINATION_CLASS} rounded-none border-x-0 border-b-0 bg-card shadow-none`}
            pageOffset={pageOffset}
            pageSize={pageSize}
            itemCount={initialLoading ? 0 : rows.length}
            hasMore={hasMore}
            loading={initialLoading}
            busy={fetching}
            totalCount={totalCount}
            onPrevious={goToPreviousPage}
            onNext={goToNextPage}
            entityLabel="invoices"
            pageSizeOptions={pageSizeOptions}
            onPageSizeChange={(size) => {
              if (size === pageSize) return;
              setPageSize(size);
            }}
          />
        </div>
      </div>
    </PageShell>
  );
}
