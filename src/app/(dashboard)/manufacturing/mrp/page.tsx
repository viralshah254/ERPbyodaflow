"use client";

import * as React from "react";
import Link from "next/link";
import { LIST_PAGE_SHELL_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { SkeletonDataTable } from "@/components/ui/skeleton";
import { TableLinearProgress } from "@/components/ui/table-linear-progress";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  fetchManufacturingMrpPage,
  type ManufacturingMrpSuggestion,
  type ManufacturingMrpSummary,
} from "@/lib/api/manufacturing";
import { manufacturingAreaLabel } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import type { FilterChip } from "@/components/ui/filter-chips";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const SEARCH_DEBOUNCE_MS = 400;
const PAGE_SIZE = 25;

const TYPE_OPTIONS = [
  { label: "All types", value: "" },
  { label: "Make", value: "WORK_ORDER" },
  { label: "Buy", value: "PURCHASE" },
];

const emptySummary: ManufacturingMrpSummary = {
  workOrderSuggestions: 0,
  purchaseSuggestions: 0,
  totalShortageQty: 0,
};

export default function MrpPage() {
  const terminology = useTerminology();
  const areaLabel = manufacturingAreaLabel(terminology);

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [rows, setRows] = React.useState<ManufacturingMrpSuggestion[]>([]);
  const [summary, setSummary] = React.useState<ManufacturingMrpSummary>(emptySummary);
  const [totalCount, setTotalCount] = React.useState<number | null>(null);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [fetching, setFetching] = React.useState(false);
  const [pageOffset, setPageOffset] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);
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
        const page = await fetchManufacturingMrpPage({
          limit: PAGE_SIZE,
          cursor: String(offset),
          search: debouncedSearch.trim() || undefined,
          type: (typeFilter as "" | "WORK_ORDER" | "PURCHASE") || undefined,
        });
        setRows(page.suggestions ?? []);
        setSummary(page.summary ?? emptySummary);
        setTotalCount(typeof page.totalCount === "number" ? page.totalCount : null);
        setPageOffset(page.offset ?? offset);
        setHasMore(!!page.hasMore);
        hasLoadedOnce.current = true;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load MRP plan.");
      } finally {
        setInitialLoading(false);
        setFetching(false);
      }
    },
    [debouncedSearch, typeFilter]
  );

  React.useEffect(() => {
    hasLoadedOnce.current = false;
    setPageOffset(0);
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

  const filterChips: FilterChip[] = React.useMemo(() => {
    const chips: FilterChip[] = [];
    if (typeFilter) {
      const opt = TYPE_OPTIONS.find((o) => o.value === typeFilter);
      chips.push({ id: "type", label: "Type", value: opt?.label ?? typeFilter });
    }
    if (search.trim()) chips.push({ id: "q", label: "Search", value: search.trim() });
    return chips;
  }, [typeFilter, search]);

  const handleClearFilters = () => {
    setSearch("");
    setTypeFilter("");
  };

  const handleRemoveFilterChip = (id: string) => {
    if (id === "type") setTypeFilter("");
    if (id === "q") setSearch("");
  };

  const columns = React.useMemo(
    () => [
      {
        id: "type",
        header: "Type",
        accessor: (r: ManufacturingMrpSuggestion) => (
          <Badge variant={r.type === "WORK_ORDER" ? "default" : "secondary"}>
            {r.type === "WORK_ORDER" ? "Make" : "Buy"}
          </Badge>
        ),
        sticky: true,
      },
      {
        id: "item",
        header: "Item",
        accessor: (r: ManufacturingMrpSuggestion) => (
          <span
            className="block max-w-[min(360px,45vw)] truncate font-medium text-sm"
            title={r.productSku ? `${r.productSku} - ${r.productName}` : r.productName}
          >
            {r.productSku ? `${r.productSku} - ${r.productName}` : r.productName}
          </span>
        ),
      },
      {
        id: "required",
        header: "Required",
        accessor: (r: ManufacturingMrpSuggestion) => (
          <span className="tabular-nums text-sm">{r.requiredQty}</span>
        ),
      },
      {
        id: "onHand",
        header: "On hand",
        accessor: (r: ManufacturingMrpSuggestion) => (
          <span className="tabular-nums text-sm">{r.onHandQty}</span>
        ),
      },
      {
        id: "incoming",
        header: "Incoming",
        accessor: (r: ManufacturingMrpSuggestion) => (
          <span className="tabular-nums text-sm">{r.incomingQty}</span>
        ),
      },
      {
        id: "shortage",
        header: "Shortage",
        accessor: (r: ManufacturingMrpSuggestion) => (
          <span className="tabular-nums text-sm font-semibold text-destructive">{r.shortageQty}</span>
        ),
      },
      {
        id: "reason",
        header: "Reason",
        accessor: (r: ManufacturingMrpSuggestion) => (
          <span className="block max-w-[min(420px,50vw)] truncate text-sm text-muted-foreground" title={r.reason}>
            {r.reason}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="MRP"
        description="Material requirements planning — periods × items, requirements and planned orders"
        breadcrumbs={[
          { label: areaLabel, href: "/manufacturing/boms" },
          { label: "MRP" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/manufacturing/boms">BOMs</Link>
          </Button>
        }
      />

      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
        {!initialLoading && (summary.workOrderSuggestions > 0 || summary.purchaseSuggestions > 0) && (
          <div className="flex flex-wrap gap-3">
            <div className="rounded-lg border bg-card px-4 py-3 text-sm shadow-sm">
              <span className="text-muted-foreground">Make suggestions</span>
              <p className="text-lg font-semibold tabular-nums">{summary.workOrderSuggestions}</p>
            </div>
            <div className="rounded-lg border bg-card px-4 py-3 text-sm shadow-sm">
              <span className="text-muted-foreground">Buy suggestions</span>
              <p className="text-lg font-semibold tabular-nums">{summary.purchaseSuggestions}</p>
            </div>
            <div className="rounded-lg border bg-card px-4 py-3 text-sm shadow-sm">
              <span className="text-muted-foreground">Total shortage qty</span>
              <p className="text-lg font-semibold tabular-nums">{summary.totalShortageQty}</p>
            </div>
            {totalCount != null && (
              <div className="rounded-lg border bg-card px-4 py-3 text-sm shadow-sm">
                <span className="text-muted-foreground">Matching rows</span>
                <p className="text-lg font-semibold tabular-nums">{totalCount}</p>
              </div>
            )}
          </div>
        )}

        <div className="space-y-1">
          <p className="text-sm text-muted-foreground max-w-3xl">
            Live shortages and replenishment recommendations derived from sales-order demand, on-hand stock, and open
            work orders. Inbound stock updates when goods are received to a warehouse (post GRNs with a warehouse, and
            receive subcontract outputs into a chosen warehouse).
          </p>
        </div>

        <DataTableToolbar className="shrink-0 rounded-xl border bg-card/80 shadow-sm backdrop-blur-sm"
          searchPlaceholder="Search SKU, name, or reason…"
          searchValue={search}
          onSearchChange={setSearch}
          searchInputProps={{
            spellCheck: false,
            autoComplete: "off",
          }}
          filters={[
            {
              id: "type",
              label: "Type",
              options: TYPE_OPTIONS,
              value: typeFilter,
              onChange: setTypeFilter,
            },
          ]}
          activeFiltersCount={filterChips.length}
          onClearFilters={handleClearFilters}
          filterChips={filterChips}
          onRemoveFilterChip={handleRemoveFilterChip}
          actions={
            <Button
              variant="outline"
              size="sm"
              disabled={initialLoading || fetching}
              onClick={handleRefresh}
            >
              <Icons.RefreshCw
                className={cn("h-4 w-4 mr-1.5", (initialLoading || fetching) && "animate-spin")}
              />
              Refresh
            </Button>
          }
        />

        {initialLoading ? (
          <SkeletonDataTable
            rows={PAGE_SIZE}
            columnWidths={["w-20", "w-44", "w-20", "w-20", "w-20", "w-20", "w-48"]}
          />
        ) : (
          <div className="relative rounded-xl border bg-card shadow-sm">
            <TableLinearProgress active={tableBusy} />
            <div
              className={cn(
                "flex min-h-0 flex-1 flex-col transition-opacity duration-200",
                tableBusy && "pointer-events-none opacity-60"
              )}
            >
              <DataTable
                data={rows}
                columns={columns}
                emptyMessage="No shortages match your filters."
                scrollMode="natural"
                size="comfortable"
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
          entityLabel="suggestions"
        />
      </div>
    </PageShell>
  );
}
