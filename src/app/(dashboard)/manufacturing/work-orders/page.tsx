"use client";

import * as React from "react";
import { OperationalFlowNav } from "@/components/operational/OperationalFlowNav";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LIST_PAGE_BODY_CLASS, LIST_PAGE_SHELL_CLASS, LIST_TABLE_SCROLL_BODY_CLASS, LIST_TABLE_SURFACE_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { StatusBadge } from "@/components/ui/status-badge";
import { NewWorkOrderSheet } from "@/components/manufacturing/new-work-order-sheet";
import { SkeletonDataTable } from "@/components/ui/skeleton";
import { TableLinearProgress } from "@/components/ui/table-linear-progress";
import { TablePagination } from "@/components/ui/table-pagination";
import { t, manufacturingAreaLabel } from "@/lib/terminology";
import { useOrgContextStore, useTerminology } from "@/stores/orgContextStore";
import { productionVoice } from "@/lib/manufacturing/production-language";
import type { FilterChip } from "@/components/ui/filter-chips";
import { cn } from "@/lib/utils";
import {
  fetchManufacturingWorkOrdersPage,
  type ManufacturingWorkOrder,
} from "@/lib/api/manufacturing";
import { useCanWriteManufacturing } from "@/lib/rbac/use-write-guard";
import { toast } from "sonner";
import { Plus, RefreshCw } from "lucide-react";

const SEARCH_DEBOUNCE_MS = 400;
const PAGE_SIZE = 25;

const STATUS_OPTIONS = [
  { label: "All statuses", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Released", value: "RELEASED" },
  { label: "In progress", value: "IN_PROGRESS" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
];

export default function WorkOrdersPage() {
  const router = useRouter();
  const canWrite = useCanWriteManufacturing();
  const templateId = useOrgContextStore((s) => s.templateId);
  const bakery = productionVoice(templateId) === "bakery";
  const terminology = useTerminology();
  const woLabel = t("workOrder", terminology);
  const areaLabel = manufacturingAreaLabel(terminology);

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [rows, setRows] = React.useState<ManufacturingWorkOrder[]>([]);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [fetching, setFetching] = React.useState(false);
  const [pageOffset, setPageOffset] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);
  const hasLoadedOnce = React.useRef(false);

  const [sheetOpen, setSheetOpen] = React.useState(false);

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
        const page = await fetchManufacturingWorkOrdersPage({
          limit: PAGE_SIZE,
          cursor: String(offset),
          search: debouncedSearch.trim() || undefined,
          status: statusFilter || undefined,
        });
        setRows(page.items);
        setPageOffset(page.offset);
        setHasMore(page.hasMore);
        hasLoadedOnce.current = true;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load work orders.");
      } finally {
        setInitialLoading(false);
        setFetching(false);
      }
    },
    [debouncedSearch, statusFilter]
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
    if (statusFilter) {
      const opt = STATUS_OPTIONS.find((o) => o.value === statusFilter);
      chips.push({ id: "status", label: "Status", value: opt?.label ?? statusFilter });
    }
    if (search.trim()) chips.push({ id: "q", label: "Search", value: search.trim() });
    return chips;
  }, [statusFilter, search]);

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("");
  };

  const handleRemoveFilterChip = (id: string) => {
    if (id === "status") setStatusFilter("");
    if (id === "q") setSearch("");
  };

  const handleCreated = React.useCallback(() => {
    void loadPage(0);
  }, [loadPage]);

  const columns = React.useMemo(
    () => [
      {
        id: "number",
        header: "Number",
        accessor: (r: ManufacturingWorkOrder) => (
          <Link
            href={`/manufacturing/work-orders/${encodeURIComponent(r.id)}`}
            className="font-mono text-sm font-semibold text-primary underline-offset-2 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {r.number}
          </Link>
        ),
        sticky: true,
      },
      { id: "status", header: "Status", className: "whitespace-nowrap", accessor: (r: ManufacturingWorkOrder) => <StatusBadge status={r.status} /> },
      {
        id: "product",
        header: "Product",
        accessor: (r: ManufacturingWorkOrder) => (
          <span className="block max-w-[16rem] truncate text-sm" title={r.productName ?? r.productId}>
            {r.productName ?? r.productId}
          </span>
        ),
      },
      {
        id: "qty",
        header: "Planned qty",
        className: "whitespace-nowrap text-right",
        accessor: (r: ManufacturingWorkOrder) => <span className="tabular-nums text-sm">{r.plannedQuantity}</span>,
      },
      {
        id: "produced",
        header: "Produced",
        className: "whitespace-nowrap text-right",
        accessor: (r: ManufacturingWorkOrder) => <span className="tabular-nums text-sm">{r.producedQuantity}</span>,
      },
      {
        id: "open",
        header: "Open",
        className: "whitespace-nowrap text-right",
        accessor: (r: ManufacturingWorkOrder) => <span className="tabular-nums text-sm">{r.openQuantity}</span>,
      },
      ...(bakery
        ? []
        : [{ id: "dueDate", header: "Due date", className: "whitespace-nowrap", accessor: (r: ManufacturingWorkOrder) => r.dueDate?.slice(0, 10) ?? "—" }]),
      {
        id: "bom",
        header: "BOM",
        accessor: (r: ManufacturingWorkOrder) => (
          <span className="block max-w-[14rem] truncate" title={r.bomName ?? undefined}>
            {r.bomName ?? "—"}
          </span>
        ),
      },
      {
        id: "routing",
        header: "Routing",
        accessor: (r: ManufacturingWorkOrder) => (
          <span className="block max-w-[10rem] truncate" title={r.routingName ?? undefined}>
            {r.routingName ?? "—"}
          </span>
        ),
      },
      {
        id: "grn",
        header: "GRN batch",
        className: "whitespace-nowrap",
        accessor: (r: ManufacturingWorkOrder) =>
          r.grnNumber ? (
            <span className="text-xs font-medium text-primary">{r.grnNumber}</span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
    ],
    [bakery]
  );

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title={woLabel}
        description="Open a work order to release, start, and complete it. Actions are not on the list so similar products are harder to mix up."
        breadcrumbs={[{ label: areaLabel, href: "/manufacturing/work-orders" }, { label: woLabel }]}
        sticky
        actions={<><Button size="sm" variant="outline" asChild><Link href="/manufacturing/capacity">Capacity planner</Link></Button><Button size="sm" variant="outline" asChild><Link href="/manufacturing/trusted-devices">Trusted devices</Link></Button>{
          canWrite ? (
            <Button size="sm" onClick={() => setSheetOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New work order
            </Button>
          ) : undefined
        }</>}
      />

      <div className={LIST_PAGE_BODY_CLASS}>
        <OperationalFlowNav flow="manufacturing" current="Work orders" />
        <DataTableToolbar className="shrink-0 rounded-xl border bg-card/80 shadow-sm backdrop-blur-sm"
          searchPlaceholder="Search number, product, BOM, or GRN…"
          searchValue={search}
          onSearchChange={setSearch}
          searchInputProps={{
            spellCheck: false,
            autoComplete: "off",
          }}
          filters={[
            {
              id: "status",
              label: "Status",
              options: STATUS_OPTIONS,
              value: statusFilter,
              onChange: setStatusFilter,
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
              <RefreshCw
                className={cn("h-4 w-4 mr-1.5", (initialLoading || fetching) && "animate-spin")}
              />
              Refresh
            </Button>
          }
        />

        {initialLoading ? (
          <SkeletonDataTable
            rows={PAGE_SIZE}
            columnWidths={["w-24", "w-44", "w-32", "w-28", "w-20", "w-20", "w-20", "w-16", "w-24", "w-24"]}
          />
        ) : (
          <div className={LIST_TABLE_SURFACE_CLASS}>
            <TableLinearProgress active={tableBusy} />
            <div
              className={cn(
                LIST_TABLE_SCROLL_BODY_CLASS,
                tableBusy && "pointer-events-none opacity-60"
              )}
            >
              <DataTable dataScope="page"
                data={rows}
                columns={columns}
                emptyMessage="No work orders match your filters."
                scrollMode="fill"
                size="comfortable"
                className="min-h-0 flex-1 border-0"
                onRowClick={(r) => router.push(`/manufacturing/work-orders/${encodeURIComponent(r.id)}`)} searchable={false}
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
          entityLabel="work orders"
        />
      </div>

      <NewWorkOrderSheet open={sheetOpen} onOpenChange={setSheetOpen} onCreated={handleCreated} />

    </PageShell>
  );
}
