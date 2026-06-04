"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LIST_PAGE_BODY_CLASS, LIST_PAGE_SHELL_CLASS, LIST_TABLE_SCROLL_BODY_CLASS, LIST_TABLE_SURFACE_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { SkeletonDataTable } from "@/components/ui/skeleton";
import { TableLinearProgress } from "@/components/ui/table-linear-progress";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  fetchManufacturingBomsPage,
  type ManufacturingBom,
} from "@/lib/api/manufacturing";
import { manufacturingAreaLabel, t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import type { FilterChip } from "@/components/ui/filter-chips";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const SEARCH_DEBOUNCE_MS = 400;
const PAGE_SIZE = 25;

type BomRow = {
  id: string;
  code: string;
  name: string;
  finishedProduct: string;
  quantity: number;
  uom: string;
  version: string;
  type: "bom" | "formula" | "disassembly";
  isActive: boolean;
};

const TYPE_OPTIONS = [
  { label: "All types", value: "" },
  { label: "BOM", value: "bom" },
  { label: "Formula", value: "formula" },
  { label: "Disassembly", value: "disassembly" },
];

const STATUS_OPTIONS = [
  { label: "All statuses", value: "" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

function toRow(b: ManufacturingBom): BomRow {
  return {
    id: b.id,
    code: b.code,
    name: b.name,
    finishedProduct: b.finishedProductSku
      ? `${b.finishedProductSku} — ${b.finishedProductName ?? b.finishedProductId}`
      : b.finishedProductName ?? b.finishedProductId,
    quantity: b.quantity,
    uom: b.uom,
    version: b.version,
    type: b.type,
    isActive: b.isActive,
  };
}

export default function BomsPage() {
  const router = useRouter();
  const terminology = useTerminology();
  const bomLabel = t("bom", terminology);
  const areaLabel = manufacturingAreaLabel(terminology);

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [rows, setRows] = React.useState<BomRow[]>([]);
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
        const page = await fetchManufacturingBomsPage({
          limit: PAGE_SIZE,
          cursor: String(offset),
          search: debouncedSearch.trim() || undefined,
          type: typeFilter || undefined,
          status: (statusFilter as "" | "active" | "inactive") || undefined,
        });
        setRows(page.items.map(toRow));
        setPageOffset(page.offset);
        setHasMore(page.hasMore);
        hasLoadedOnce.current = true;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load BOMs.");
      } finally {
        setInitialLoading(false);
        setFetching(false);
      }
    },
    [debouncedSearch, typeFilter, statusFilter]
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
    if (statusFilter) {
      const opt = STATUS_OPTIONS.find((o) => o.value === statusFilter);
      chips.push({ id: "status", label: "Status", value: opt?.label ?? statusFilter });
    }
    if (search.trim()) chips.push({ id: "q", label: "Search", value: search.trim() });
    return chips;
  }, [typeFilter, statusFilter, search]);

  const handleClearFilters = () => {
    setSearch("");
    setTypeFilter("");
    setStatusFilter("");
  };

  const handleRemoveFilterChip = (id: string) => {
    if (id === "type") setTypeFilter("");
    if (id === "status") setStatusFilter("");
    if (id === "q") setSearch("");
  };

  const columns = React.useMemo(
    () => [
      {
        id: "code",
        header: "Code",
        accessor: (r: BomRow) => (
          <Link
            href={`/manufacturing/boms/${r.id}`}
            className="font-mono text-sm font-semibold text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {r.code}
          </Link>
        ),
        sticky: true,
      },
      { id: "name", header: "Name", accessor: "name" as keyof BomRow },
      {
        id: "finishedProduct",
        header: "Finished product",
        accessor: (r: BomRow) => (
          <span className="block max-w-[min(360px,45vw)] truncate text-sm" title={r.finishedProduct}>
            {r.finishedProduct}
          </span>
        ),
      },
      {
        id: "qty",
        header: "Batch",
        accessor: (r: BomRow) => (
          <span className="tabular-nums text-sm">
            {r.quantity} {r.uom}
          </span>
        ),
      },
      { id: "version", header: "Ver.", accessor: "version" as keyof BomRow },
      {
        id: "type",
        header: "Type",
        accessor: (r: BomRow) => {
          const variant =
            r.type === "formula" ? "secondary" : r.type === "disassembly" ? "default" : "outline";
          const label =
            r.type === "disassembly" ? "Disassembly" : r.type === "formula" ? "Formula" : "BOM";
          return <Badge variant={variant}>{label}</Badge>;
        },
      },
      {
        id: "status",
        header: "Status",
        accessor: (r: BomRow) => (
          <Badge
            variant={r.isActive ? "outline" : "secondary"}
            className={cn(!r.isActive && "opacity-70")}
          >
            {r.isActive ? "Active" : "Inactive"}
          </Badge>
        ),
      },
    ],
    []
  );

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title={`Bills of Material (${bomLabel})`}
        description="Define product structures, formulas, and cost rollup"
        breadcrumbs={[{ label: areaLabel, href: "/manufacturing/boms" }, { label: "BOMs" }]}
        sticky
        showCommandHint
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/manufacturing/routing">Routing</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/manufacturing/mrp">MRP</Link>
            </Button>
            <Button size="sm" onClick={() => router.push("/manufacturing/boms/new")} data-tour-step="create-button">
              <Icons.Plus className="mr-2 h-4 w-4" />
              New BOM
            </Button>
          </div>
        }
      />
      <div className={LIST_PAGE_BODY_CLASS}>
        <DataTableToolbar className="shrink-0 rounded-xl border bg-card/80 shadow-sm backdrop-blur-sm"
          searchPlaceholder="Search code, name, or product…"
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
            columnWidths={["w-28", "w-36", "w-44", "w-20", "w-12", "w-24", "w-20"]}
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
              <DataTable<BomRow>
                data={rows}
                columns={columns}
                emptyMessage="No BOMs match your filters. Create one to get started."
                onRowClick={(r) => router.push(`/manufacturing/boms/${r.id}`)}
                scrollMode="fill"
                size="comfortable"
                className="min-h-0 flex-1 border-0"
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
          entityLabel="BOMs"
        />
      </div>
    </PageShell>
  );
}
