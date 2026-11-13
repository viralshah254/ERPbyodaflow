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
import { OperationalFlowNav } from "@/components/operational/OperationalFlowNav";
import { manufacturingAreaLabel, t } from "@/lib/terminology";
import { productionTerms } from "@/lib/manufacturing/production-language";
import { useOrgContextStore, useTerminology } from "@/stores/orgContextStore";
import type { FilterChip } from "@/components/ui/filter-chips";
import { useCanWriteManufacturing } from "@/lib/rbac/use-write-guard";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";

import { BomPilotHelp } from "@/components/manufacturing/BomPilotHelp";

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
  const canWrite = useCanWriteManufacturing();
  const terminology = useTerminology();
  const templateId = useOrgContextStore((state) => state.templateId);
  const terms = productionTerms(templateId);
  const bomLabel = t("bom", terminology);
  const areaLabel = manufacturingAreaLabel(terminology);

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [rows, setRows] = React.useState<BomRow[]>([]);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState("");
  const requestSequence = React.useRef(0);
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
      const requestId = ++requestSequence.current;
      setLoadError("");
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
        if (requestId !== requestSequence.current) return;
        setRows(page.items.map(toRow));
        setPageOffset(page.offset);
        setHasMore(page.hasMore);
        hasLoadedOnce.current = true;
      } catch (error) {
        if (requestId === requestSequence.current) setLoadError(error instanceof Error ? error.message : "Failed to load BOMs.");
      } finally {
        if (requestId === requestSequence.current) {
          setInitialLoading(false);
          setFetching(false);
        }
      }
    },
    [debouncedSearch, typeFilter, statusFilter]
  );

  React.useEffect(() => {
    setPageOffset(0);
    void loadPage(0);
    return () => { requestSequence.current += 1; };
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
            href={`/manufacturing/boms/${encodeURIComponent(r.id)}`}
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
        header: "Batch output",
        accessor: (r: BomRow) => (
          <span className="tabular-nums text-sm">
            {r.quantity} {r.uom}
          </span>
        ),
      },
      { id: "version", header: "Version", accessor: "version" as keyof BomRow },
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
        title={bomLabel}
        help={<BomPilotHelp screen="list" steps={[
          { id: "search", target: "[data-bom-search]", title: "Find the recipe you need", description: "Search by BOM code, recipe name or finished product. This only filters the library; it does not change a recipe.", instruction: "Enter a search term, then continue. Clear it later to see all recipes.", complete: search.trim().length > 0 && !initialLoading && !tableBusy && !loadError },
          { id: "filters", target: "[data-bom-filters]", title: "Choose a recipe type or status", description: "BOM assembles components, Formula describes batch production, and Disassembly describes a reverse process. Active and inactive are availability filters, not revision approval states.", instruction: "Select a type or status. You can clear the filters afterwards.", complete: !!typeFilter || !!statusFilter },
          { id: "records", target: "[data-bom-records]", title: rows.length ? "Compare output and version" : "No matching recipes", description: rows.length ? "Batch output is the quantity and unit this recipe defines. Check the finished product, version and active status before opening a code or row. Counts here reflect this page, not the entire library." : "Try clearing the search or changing the filters. An empty result does not mean the library has no recipes." },
          { id: "next", target: "[data-bom-next]", title: canWrite ? "Open a record or create a BOM" : "Review an existing BOM", description: canWrite ? "New BOM defines the product and batch output first. Add components on the record after creating it. Recipe governance manages revisions; MRP is for material planning." : "Open a recipe code to inspect components and routing. Your current access does not allow creating or editing BOMs. Recipe governance and MRP are related workspaces." },
        ]} />}
        description={`A ${terms.formula} says what goes into a finished product and how much one batch makes. Link a routing to describe the production steps.`}
        breadcrumbs={[{ label: areaLabel, href: "/manufacturing/boms" }, { label: terms.formulasTitle }]}
        sticky
        showCommandHint
        actions={
          <div className="flex flex-wrap gap-2" data-bom-next>
            <Button variant="outline" size="sm" asChild>
              <Link href="/manufacturing/recipe-governance">{terms.governance}</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/manufacturing/mrp">MRP</Link>
            </Button>
            {canWrite && (
              <Button size="sm" onClick={() => router.push("/manufacturing/boms/new")} data-tour-step="create-button">
                <Icons.Plus className="mr-2 h-4 w-4" />
                {terms.newFormula}
              </Button>
            )}
          </div>
        }
      />
      <div className={LIST_PAGE_BODY_CLASS}>
        <OperationalFlowNav flow="manufacturing" current={terms.formulasTitle} />
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-muted-foreground">{terms.library} <span className="mx-2 text-border">/</span> Define the output, then build its components.</p>
          <span className="rounded-full border bg-card px-3 py-1 text-xs tabular-nums">{initialLoading ? `Loading ${terms.formulas}…` : loadError ? "Library unavailable" : `${rows.length} on this page${hasMore ? " · more available" : ""}`}</span>
        </div>
        <div data-bom-filters className="shrink-0 rounded-xl">
        <DataTableToolbar className="shrink-0 rounded-xl border bg-card/80 shadow-sm backdrop-blur-sm"
          searchPlaceholder="Search code, name, or product…"
          searchValue={search}
          onSearchChange={setSearch}
          searchInputDataHint="bom-search"
          searchInputProps={{
            "aria-label": `Search ${terms.formulas}`,
            ...{ "data-bom-search": true },
            spellCheck: false,
            autoComplete: "off",
          }}
          filters={[
            {
              id: "type",
              label: "Type",
              triggerClassName: "w-[140px]",
              options: TYPE_OPTIONS,
              value: typeFilter,
              onChange: setTypeFilter,
            },
            {
              id: "status",
              label: "Status",
              triggerClassName: "w-[140px]",
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
        </div>

        {loadError && <div role="alert" className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-card p-3 text-sm">
          <p>{loadError} Any rows shown are from the last successful load.</p>
          <Button variant="outline" size="sm" onClick={handleRefresh}>Retry loading BOMs</Button>
        </div>}
        {initialLoading ? (
          <SkeletonDataTable
            rows={PAGE_SIZE}
            columnWidths={["w-28", "w-36", "w-44", "w-20", "w-12", "w-24", "w-20"]}
          />
        ) : (
          <div className={LIST_TABLE_SURFACE_CLASS} data-bom-records>
            <TableLinearProgress active={tableBusy} />
            <div
              className={cn(
                LIST_TABLE_SCROLL_BODY_CLASS,
                tableBusy && "pointer-events-none opacity-60"
              )}
            >
              <DataTable<BomRow> dataScope="page"
                data={rows}
                columns={columns}
                emptyMessage={loadError ? "Unable to load BOMs. Use Retry loading BOMs above." : filterChips.length ? "No matching recipes. Clear search or filters to see more BOMs." : canWrite ? "No recipes yet. Choose New BOM to define your first product and batch output." : "No recipes yet. Ask a manufacturing editor to create a BOM."}
                onRowClick={(r) => router.push(`/manufacturing/boms/${encodeURIComponent(r.id)}`)}
                scrollMode="fill"
                size="comfortable"
                className="min-h-0 flex-1 border-0" searchable={false}
                />
            </div>
          </div>
        )}

        {!loadError && <TablePagination
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
        />}
      </div>
    </PageShell>
  );
}
