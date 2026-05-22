"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LIST_PAGE_BODY_PAGINATED_CLASS,
  LIST_PAGE_SHELL_CLASS,
  LIST_TABLE_STATIC_CLASS,
  PageShell,
} from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { ExceptionBanner } from "@/components/operational/ExceptionBanner";
import { SkeletonDataTable } from "@/components/ui/skeleton";
import { TableLinearProgress } from "@/components/ui/table-linear-progress";
import { TablePagination } from "@/components/ui/table-pagination";
import { fetchApBillsPageApi } from "@/lib/api/payments";
import { bulkDocumentActionApi, fetchDocumentListPageApi } from "@/lib/api/documents";
import type { APBillRow } from "@/lib/types/ap";
import type { DocListRow } from "@/lib/types/documents";
import { getSavedViews, saveView, deleteSavedView } from "@/lib/saved-views";
import type { SavedView } from "@/components/ui/saved-views-dropdown";
import type { FilterChip } from "@/components/ui/filter-chips";
import { DualCurrencyAmount } from "@/components/ui/dual-currency-amount";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatMoney } from "@/lib/money";
import { useBaseCurrency } from "@/lib/org/useBaseCurrency";
import { downloadCsv } from "@/lib/export/csv";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const SEARCH_DEBOUNCE_MS = 400;
const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

const AP_STATUS_OPTIONS = [
  { label: "All open", value: "" },
  { label: "Open", value: "OPEN" },
  { label: "Partially paid", value: "PARTIALLY_APPLIED" },
];

const ALL_BILLS_STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Pending approval", value: "PENDING_APPROVAL" },
  { label: "Approved", value: "APPROVED" },
  { label: "Posted", value: "POSTED" },
  { label: "Cancelled", value: "CANCELLED" },
];

const scope = "ap-bills";

type Tab = "open" | "all";

function docToBillRow(r: DocListRow): APBillRow {
  return {
    id: r.id,
    number: r.number,
    date: r.date,
    party: r.party ?? "",
    total: r.total ?? 0,
    currency: r.currency,
    exchangeRate: r.exchangeRate,
    landedAllocated: r.landedAllocated,
    landedBreakdown: r.landedBreakdown,
    economicTotal: r.economicTotal,
    status: r.status,
    poRef: r.poRef,
  };
}

export default function APBillsPage() {
  const router = useRouter();
  const baseCurrency = useBaseCurrency();
  const [tab, setTab] = React.useState<Tab>("all");
  const [searchInput, setSearchInput] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [posting, setPosting] = React.useState(false);
  const [currentViewId, setCurrentViewId] = React.useState<string | null>(null);
  const [savedViews, setSavedViews] = React.useState<SavedView[]>(() => getSavedViews(scope));

  const [rows, setRows] = React.useState<APBillRow[]>([]);
  const [pageOffset, setPageOffset] = React.useState(0);
  const [pageSize, setPageSize] = React.useState<number>(25);
  const [hasMore, setHasMore] = React.useState(false);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [fetching, setFetching] = React.useState(false);
  const hasLoadedOnce = React.useRef(false);

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const loadPage = React.useCallback(
    async (offset: number) => {
      const isFirstLoad = !hasLoadedOnce.current;
      if (isFirstLoad) setInitialLoading(true);
      else setFetching(true);
      try {
        if (tab === "open") {
          const page = await fetchApBillsPageApi({
            limit: pageSize,
            cursor: String(offset),
            search: debouncedSearch || undefined,
            status: statusFilter || undefined,
          });
          setRows(page.items);
          setPageOffset(page.offset);
          setHasMore(page.hasMore);
        } else {
          const page = await fetchDocumentListPageApi("bill", {
            limit: pageSize,
            cursor: String(offset),
            search: debouncedSearch || undefined,
            status: statusFilter || undefined,
          });
          setRows(page.items.map(docToBillRow));
          setPageOffset(page.offset);
          setHasMore(page.hasMore);
        }
        setSelectedIds([]);
        hasLoadedOnce.current = true;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load bills.");
      } finally {
        setInitialLoading(false);
        setFetching(false);
      }
    },
    [tab, debouncedSearch, statusFilter, pageSize],
  );

  React.useEffect(() => {
    void loadPage(0);
  }, [loadPage]);

  const statusOptions = tab === "open" ? AP_STATUS_OPTIONS : ALL_BILLS_STATUS_OPTIONS;
  const searchPending = searchInput.trim() !== debouncedSearch.trim();
  const tableBusy = fetching || searchPending;

  const filterChips: FilterChip[] = React.useMemo(() => {
    const chips: FilterChip[] = [];
    if (statusFilter) {
      const opt = statusOptions.find((o) => o.value === statusFilter);
      chips.push({ id: "status", label: "Status", value: opt?.label ?? statusFilter });
    }
    if (searchInput.trim()) chips.push({ id: "q", label: "Search", value: searchInput.trim() });
    return chips;
  }, [statusFilter, searchInput, statusOptions]);

  const landedCostsCell = React.useCallback(
    (r: APBillRow) => {
      const breakdown = r.landedBreakdown ?? [];
      const amount = r.landedAllocated ?? 0;
      const cell = (
        <DualCurrencyAmount
          amount={amount}
          currency={baseCurrency}
          baseCurrency={baseCurrency}
          align="right"
          size="sm"
        />
      );
      if (breakdown.length === 0) {
        return amount > 0 ? cell : <span className="text-muted-foreground text-sm">—</span>;
      }
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-help inline-flex items-center gap-1">
                {cell}
                <Icons.Info className="h-3 w-3 text-muted-foreground shrink-0" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" className="w-48 p-3 space-y-1.5">
              <p className="text-xs font-semibold text-foreground mb-2">Cost breakdown</p>
              {breakdown.map((b) => (
                <div key={b.label} className="flex justify-between text-xs gap-4">
                  <span className="text-muted-foreground capitalize">{b.label}</span>
                  <span className="font-medium tabular-nums">{formatMoney(b.amount, baseCurrency)}</span>
                </div>
              ))}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
    [baseCurrency],
  );

  const columns = React.useMemo(() => {
    const base = [
      {
        id: "number",
        header: "Number",
        accessor: (r: APBillRow) => (
          <div className="flex items-center gap-2 min-w-[6rem]">
            <Icons.FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="font-mono text-sm font-medium">{r.number}</span>
          </div>
        ),
        sticky: true,
        sortable: true,
        sortValue: (r: APBillRow) => r.number.toLowerCase(),
      },
      {
        id: "date",
        header: "Date",
        accessor: (r: APBillRow) => <span className="tabular-nums text-sm">{r.date}</span>,
        sortable: true,
        sortValue: (r: APBillRow) => r.date,
      },
      {
        id: "party",
        header: "Supplier",
        accessor: (r: APBillRow) => (
          <div className="min-w-[8rem]">
            <div className="flex items-center gap-1.5">
              <Icons.Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="font-medium">{r.party}</span>
            </div>
            {r.poRef ? (
              <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">PO {r.poRef}</p>
            ) : null}
          </div>
        ),
        sortable: true,
        sortValue: (r: APBillRow) => r.party.toLowerCase(),
      },
      {
        id: "total",
        header: "Invoice total",
        accessor: (r: APBillRow) => (
          <DualCurrencyAmount
            amount={r.total}
            currency={r.currency ?? baseCurrency}
            exchangeRate={r.exchangeRate}
            baseCurrency={baseCurrency}
            align="right"
            size="sm"
          />
        ),
        sortable: true,
        sortValue: (r: APBillRow) => r.total,
      },
      {
        id: "landedAllocated",
        header: "Additional costs",
        accessor: landedCostsCell,
        sortable: true,
        sortValue: (r: APBillRow) => r.landedAllocated ?? 0,
      },
      {
        id: "economicTotal",
        header: "Economic total",
        accessor: (r: APBillRow) => {
          const hasLanded = (r.landedAllocated ?? 0) > 0;
          return (
            <div className="text-right">
              <DualCurrencyAmount
                amount={r.economicTotal ?? r.total}
                currency={r.currency ?? baseCurrency}
                exchangeRate={r.exchangeRate}
                baseCurrency={baseCurrency}
                align="right"
                size="sm"
                className={hasLanded ? "font-semibold" : undefined}
              />
              {hasLanded ? (
                <Badge variant="outline" className="mt-1 text-[10px] font-normal">
                  incl. landed
                </Badge>
              ) : null}
            </div>
          );
        },
        sortable: true,
        sortValue: (r: APBillRow) => r.economicTotal ?? r.total,
      },
    ];

    if (tab === "open") {
      base.push({
        id: "outstanding",
        header: "Outstanding",
        accessor: (r: APBillRow) => (
          <DualCurrencyAmount
            amount={r.outstanding ?? 0}
            currency={r.currency ?? baseCurrency}
            exchangeRate={r.exchangeRate}
            baseCurrency={baseCurrency}
            align="right"
            size="sm"
            className="font-semibold text-amber-700 dark:text-amber-400"
          />
        ),
        sortable: true,
        sortValue: (r: APBillRow) => r.outstanding ?? 0,
      });
    }

    base.push({
      id: "status",
      header: "Status",
      accessor: (r: APBillRow) => <StatusBadge status={r.status} />,
      sortable: true,
      sortValue: (r: APBillRow) => r.status.toLowerCase(),
    });

    return base;
  }, [baseCurrency, tab, landedCostsCell]);

  const handleClearFilters = () => {
    setStatusFilter("");
    setSearchInput("");
    setDebouncedSearch("");
  };

  const handleRemoveFilterChip = (id: string) => {
    if (id === "status") setStatusFilter("");
    if (id === "q") setSearchInput("");
  };

  const handleSaveView = () => {
    const v = saveView(scope, {
      name: `View ${savedViews.length + 1}`,
      filters: { q: searchInput, status: statusFilter, tab },
    });
    setSavedViews(getSavedViews(scope));
    setCurrentViewId(v.id);
  };

  const handleSelectView = (id: string) => {
    const v = savedViews.find((x) => x.id === id);
    if (v?.filters) {
      setSearchInput((v.filters.q as string) ?? "");
      setStatusFilter((v.filters.status as string) ?? "");
      const nextTab = v.filters.tab as Tab | undefined;
      if (nextTab === "open" || nextTab === "all") setTab(nextTab);
    }
    setCurrentViewId(id);
  };

  const handleDeleteView = (id: string) => {
    deleteSavedView(scope, id);
    setSavedViews(getSavedViews(scope));
    if (currentViewId === id) setCurrentViewId(null);
  };

  const refreshCurrentPage = () => void loadPage(pageOffset);

  const goToPreviousPage = () => {
    if (pageOffset <= 0 || initialLoading || fetching) return;
    void loadPage(Math.max(0, pageOffset - pageSize));
  };

  const goToNextPage = () => {
    if (!hasMore || initialLoading || fetching) return;
    void loadPage(pageOffset + pageSize);
  };

  const skeletonWidths =
    tab === "open"
      ? ["w-24", "w-20", "w-28", "w-24", "w-20", "w-24", "w-20", "w-16"]
      : ["w-24", "w-20", "w-28", "w-24", "w-20", "w-24", "w-16"];

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Bills"
        description="Supplier bills (AP)"
        breadcrumbs={[
          { label: "Finance", href: "/finance" },
          { label: "AP Bills" },
        ]}
        showCommandHint
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" asChild>
              <Link href="/ap/three-way-match">
                <Icons.GitCompare className="mr-2 h-4 w-4" />
                3-way match
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/ap/payments">
                <Icons.CreditCard className="mr-2 h-4 w-4" />
                AP Payments
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/docs/purchase-credit-note/new">
                <Icons.RotateCcw className="mr-2 h-4 w-4" />
                Credit Note
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/docs/purchase-debit-note/new">
                <Icons.BadgePlus className="mr-2 h-4 w-4" />
                Debit Note
              </Link>
            </Button>
            <Button asChild>
              <Link href="/docs/bill/new" data-tour-step="create-button">
                <Icons.Plus className="mr-2 h-4 w-4" />
                Create Bill
              </Link>
            </Button>
          </div>
        }
      />
      <div className={LIST_PAGE_BODY_PAGINATED_CLASS}>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
          {tab === "open" && (
            <div className="shrink-0 px-4 pt-4">
              <ExceptionBanner
                type="info"
                title="Open AP balances"
                description="Posted bills with outstanding balances from the AP subledger. Draft bills appear under All Bills."
              />
            </div>
          )}

          <div className="shrink-0 flex gap-1 border-b px-4 pt-3 pb-px">
            <button
              type="button"
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-t border-b-2 transition-colors",
                tab === "all"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
              onClick={() => {
                setTab("all");
                setStatusFilter("");
              }}
            >
              All Bills
            </button>
            <button
              type="button"
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-t border-b-2 transition-colors",
                tab === "open"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
              onClick={() => {
                setTab("open");
                setStatusFilter("");
              }}
            >
              Open Balances
            </button>
          </div>

          <div className="shrink-0 p-4 pb-0">
            <DataTableToolbar
              className="rounded-xl border bg-card/80 shadow-sm backdrop-blur-sm"
              searchPlaceholder="Search by number, supplier…"
              searchValue={searchInput}
              onSearchChange={setSearchInput}
              filters={[
                {
                  id: "status",
                  label: "Status",
                  options: statusOptions,
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
              onExport={() =>
                downloadCsv(
                  `ap-bills-${new Date().toISOString().slice(0, 10)}.csv`,
                  rows.map((row) => ({
                    number: row.number,
                    date: row.date,
                    supplier: row.party,
                    invoiceTotal: row.total,
                    additionalCosts: row.landedAllocated ?? 0,
                    economicTotal: row.economicTotal ?? row.total,
                    outstanding: row.outstanding ?? "",
                    currency: row.currency ?? baseCurrency,
                    status: row.status,
                  })),
                )
              }
              bulkActions={
                tab === "all" && selectedIds.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{selectedIds.length} selected</span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={posting}
                      onClick={async () => {
                        const postableIds = selectedIds.filter((sid) => {
                          const row = rows.find((r) => r.id === sid);
                          return row && row.status === "APPROVED";
                        });
                        if (!postableIds.length) {
                          toast.info(
                            "Select approved bills only. Draft bills must be submitted and approved before posting.",
                          );
                          return;
                        }
                        setPosting(true);
                        try {
                          const { results } = await bulkDocumentActionApi("bill", "post", postableIds);
                          const failed = results.filter((r) => r.error);
                          const succeeded = results.filter((r) => !r.error);
                          if (succeeded.length) toast.success(`${succeeded.length} bill(s) posted.`);
                          if (failed.length) {
                            toast.error(
                              `${failed.length} bill(s) failed: ${failed.map((f) => f.error).join("; ")}`,
                            );
                          }
                          setSelectedIds([]);
                          refreshCurrentPage();
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Bulk post failed.");
                        } finally {
                          setPosting(false);
                        }
                      }}
                    >
                      {posting ? <Icons.Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                      Post
                    </Button>
                  </div>
                ) : undefined
              }
            />
          </div>

          {initialLoading ? (
            <div className="p-4">
              <SkeletonDataTable rows={pageSize} columnWidths={skeletonWidths} />
            </div>
          ) : (
            <div
              className={cn(
                LIST_TABLE_STATIC_CLASS,
                "min-h-0 flex-1 border-0 border-t rounded-none shadow-none",
              )}
            >
              <TableLinearProgress active={tableBusy} />
              <div
                className={cn(
                  "transition-opacity duration-200",
                  tableBusy && "pointer-events-none opacity-60",
                )}
              >
                <DataTable<APBillRow>
                  data={rows}
                  columns={columns}
                  scrollMode="natural"
                  className="border-0 shadow-none"
                  onRowClick={(row) => router.push(`/docs/bill/${row.id}`)}
                  emptyMessage={
                    tab === "open"
                      ? "No open AP balances. Bills appear here once posted."
                      : "No bills match your filters."
                  }
                  selectable={tab === "all"}
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                />
              </div>
            </div>
          )}

          <TablePagination
            className="border-t px-4"
            pageOffset={pageOffset}
            pageSize={pageSize}
            itemCount={initialLoading ? 0 : rows.length}
            hasMore={hasMore}
            loading={initialLoading}
            busy={tableBusy}
            onPrevious={goToPreviousPage}
            onNext={goToNextPage}
            entityLabel="bills"
            pageSizeOptions={[...PAGE_SIZE_OPTIONS]}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>
    </PageShell>
  );
}
