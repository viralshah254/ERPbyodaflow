"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LIST_PAGE_BODY_CLASS, LIST_PAGE_SHELL_CLASS, LIST_TABLE_SURFACE_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { SkeletonDataTable } from "@/components/ui/skeleton";
import { fetchSalesDocumentsPageApi } from "@/lib/api/sales-docs";
import type { SalesDocRow } from "@/lib/types/sales";
import { downloadCsv } from "@/lib/export/csv";
import { exportDocumentListApi } from "@/lib/api/documents";
import { isApiConfigured } from "@/lib/api/client";
import {
  getSavedViews,
  saveView,
  deleteSavedView,
} from "@/lib/saved-views";
import type { SavedView } from "@/components/ui/saved-views-dropdown";
import type { FilterChip } from "@/components/ui/filter-chips";
import { toast } from "sonner";
import { bulkDocumentActionApi } from "@/lib/api/documents";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "In Transit", value: "IN_TRANSIT" },
  { label: "Delivered", value: "DELIVERED" },
];

const scope = "sales-deliveries";
const PAGE_SIZE = 25;

export default function SalesDeliveriesPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [currentViewId, setCurrentViewId] = React.useState<string | null>(null);
  const [savedViews, setSavedViews] = React.useState<SavedView[]>(() => getSavedViews(scope));

  const [rows, setRows] = React.useState<SalesDocRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [pageOffset, setPageOffset] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(id);
  }, [search]);

  const loadPage = React.useCallback(
    async (offset: number) => {
      setLoading(true);
      try {
        const page = await fetchSalesDocumentsPageApi("delivery-note", {
          limit: PAGE_SIZE,
          cursor: String(offset),
          search: debouncedSearch.trim() || undefined,
          status: statusFilter || undefined,
        });
        setRows(page.items);
        setPageOffset(page.offset);
        setHasMore(page.hasMore);
        setSelectedIds([]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load deliveries.");
      } finally {
        setLoading(false);
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
    if (pageOffset <= 0 || loading) return;
    void loadPage(Math.max(0, pageOffset - PAGE_SIZE));
  };

  const goToNextPage = () => {
    if (!hasMore || loading) return;
    void loadPage(pageOffset + PAGE_SIZE);
  };

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
      { id: "date", header: "Date", accessor: "date" as keyof SalesDocRow },
      { id: "party", header: "Customer", accessor: "party" as keyof SalesDocRow },
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

  const pageNumber = Math.floor(pageOffset / PAGE_SIZE) + 1;
  const rangeStart = rows.length > 0 ? pageOffset + 1 : 0;
  const rangeEnd = pageOffset + rows.length;

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Deliveries"
        description="Delivery notes and shipments"
        breadcrumbs={[
          { label: "Sales", href: "/sales/overview" },
          { label: "Deliveries" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button asChild>
            <Link href="/docs/delivery-note/new">
              <Icons.Plus className="mr-2 h-4 w-4" />
              Create Delivery Note
            </Link>
          </Button>
        }
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
          actions={
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
              <Icons.RefreshCw className={cn("h-4 w-4 mr-1.5", loading && "animate-spin")} />
              Refresh
            </Button>
          }
          onExport={() => {
            const fileName = `deliveries-${new Date().toISOString().slice(0, 10)}.csv`;
            if (isApiConfigured()) {
              exportDocumentListApi("delivery-note", fileName, (msg) => toast.error(msg));
              return;
            }
            downloadCsv(
              fileName,
              rows.map((row) => ({
                number: row.number,
                date: row.date,
                party: row.party ?? "",
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
                    try {
                      await bulkDocumentActionApi("delivery-note", "post", selectedIds);
                      await loadPage(pageOffset);
                      toast.success("Delivery note(s) posted.");
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Failed to post delivery notes.");
                    }
                  }}
                >
                  Post
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    downloadCsv(
                      `deliveries-selected-${new Date().toISOString().slice(0, 10)}.csv`,
                      rows
                        .filter((row) => selectedIds.includes(row.id))
                        .map((row) => ({
                          number: row.number,
                          date: row.date,
                          party: row.party ?? "",
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
        {loading ? (
          <SkeletonDataTable rows={PAGE_SIZE} columnWidths={["w-20", "w-24", "w-36", "w-28", "w-24"]} />
        ) : (
          <DataTable<SalesDocRow>
            data={rows}
            columns={columns}
            onRowClick={(row) => router.push(`/docs/delivery-note/${row.id}`)}
            emptyMessage="No deliveries yet."
            selectable
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            scrollMode="fill"
            size="comfortable"
            className="min-h-0 flex-1 border-0"
            />
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground tabular-nums">
            {loading
              ? "Loading deliveries…"
              : rows.length === 0
                ? "No deliveries match your filters."
                : `Showing ${rangeStart}–${rangeEnd}`}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={loading || pageOffset <= 0} onClick={goToPreviousPage}>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground tabular-nums px-1">Page {pageNumber}</span>
            <Button variant="outline" size="sm" disabled={loading || !hasMore} onClick={goToNextPage}>
              Next
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">{PAGE_SIZE} per page</span>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
