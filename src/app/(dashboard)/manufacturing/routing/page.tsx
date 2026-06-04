"use client";

import * as React from "react";
import Link from "next/link";
import { LIST_PAGE_BODY_CLASS, LIST_PAGE_SHELL_CLASS, LIST_TABLE_SCROLL_BODY_CLASS, LIST_TABLE_SURFACE_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { SkeletonDataTable } from "@/components/ui/skeleton";
import { TableLinearProgress } from "@/components/ui/table-linear-progress";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  createManufacturingRoute,
  fetchManufacturingRouteById,
  fetchManufacturingRoutesPage,
  updateManufacturingRoute,
  type ManufacturingRoute,
} from "@/lib/api/manufacturing";
import { manufacturingAreaLabel } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import type { FilterChip } from "@/components/ui/filter-chips";
import { useCanWriteManufacturing } from "@/lib/rbac/use-write-guard";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const SEARCH_DEBOUNCE_MS = 400;
const PAGE_SIZE = 25;

type RouteRow = {
  id: string;
  code: string;
  name: string;
  operationCount: number;
  description: string;
};

type RouteOperationInput = {
  id: string;
  sequence: string;
  name: string;
  workCenter: string;
  setupMinutes: string;
  runMinutesPerUnit: string;
};

function toRow(route: ManufacturingRoute): RouteRow {
  return {
    id: route.id,
    code: route.code,
    name: route.name,
    operationCount: route.operationCount ?? route.operations?.length ?? 0,
    description: route.description ?? "",
  };
}

export default function RoutingPage() {
  const canWrite = useCanWriteManufacturing();
  const terminology = useTerminology();
  const areaLabel = manufacturingAreaLabel(terminology);

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [rows, setRows] = React.useState<RouteRow[]>([]);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [fetching, setFetching] = React.useState(false);
  const [pageOffset, setPageOffset] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);
  const hasLoadedOnce = React.useRef(false);

  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [sheetLoading, setSheetLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [editingRouteId, setEditingRouteId] = React.useState<string | null>(null);
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [operations, setOperations] = React.useState<RouteOperationInput[]>([]);

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
        const page = await fetchManufacturingRoutesPage({
          limit: PAGE_SIZE,
          cursor: String(offset),
          search: debouncedSearch.trim() || undefined,
        });
        setRows(page.items.map(toRow));
        setPageOffset(page.offset);
        setHasMore(page.hasMore);
        hasLoadedOnce.current = true;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load routing.");
      } finally {
        setInitialLoading(false);
        setFetching(false);
      }
    },
    [debouncedSearch]
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
    if (!search.trim()) return [];
    return [{ id: "q", label: "Search", value: search.trim() }];
  }, [search]);

  function resetSheetForm() {
    setCode("");
    setName("");
    setDescription("");
    setOperations([]);
  }

  function applyRouteToForm(route: ManufacturingRoute) {
    setCode(route.code ?? "");
    setName(route.name ?? "");
    setDescription(route.description ?? "");
    setOperations(
      (route.operations ?? []).map((operation) => ({
        id: operation.id,
        sequence: String(operation.sequence),
        name: operation.name,
        workCenter: operation.workCenter ?? operation.workCenterId ?? "",
        setupMinutes: String(operation.setupMinutes ?? 0),
        runMinutesPerUnit: String(operation.runMinutesPerUnit ?? 0),
      }))
    );
  }

  async function openNewRoute() {
    setEditingRouteId(null);
    resetSheetForm();
    setSheetOpen(true);
  }

  async function openEditRoute(routeId: string) {
    setEditingRouteId(routeId);
    setSheetOpen(true);
    setSheetLoading(true);
    resetSheetForm();
    try {
      const full = await fetchManufacturingRouteById(routeId);
      if (!full) {
        toast.error("Route not found.");
        setSheetOpen(false);
        return;
      }
      applyRouteToForm(full);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load route.");
      setSheetOpen(false);
    } finally {
      setSheetLoading(false);
    }
  }

  function addOperation() {
    setOperations((current) => [
      ...current,
      {
        id: `op-${Date.now()}`,
        sequence: String(current.length + 1),
        name: "",
        workCenter: "",
        setupMinutes: "0",
        runMinutesPerUnit: "0",
      },
    ]);
  }

  const columns = React.useMemo(
    () => [
      {
        id: "code",
        header: "Code",
        accessor: (r: RouteRow) => (
          <span className="font-mono text-sm font-semibold text-primary">{r.code}</span>
        ),
        sticky: true,
      },
      { id: "name", header: "Name", accessor: "name" as keyof RouteRow },
      {
        id: "operations",
        header: "Operations",
        accessor: (r: RouteRow) => (
          <Badge variant="secondary" className="tabular-nums font-normal">
            {r.operationCount}
          </Badge>
        ),
      },
      {
        id: "description",
        header: "Description",
        accessor: (r: RouteRow) => (
          <span className="block max-w-[min(360px,45vw)] truncate text-sm text-muted-foreground" title={r.description}>
            {r.description || "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        accessor: (r: RouteRow) => canWrite ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-8"
            onClick={(e) => {
              e.stopPropagation();
              void openEditRoute(r.id);
            }}
          >
            Edit
          </Button>
        ) : null,
      },
    ],
    [canWrite]
  );

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Routing"
        description="Live operation sequences used by manufacturing BOMs and work orders."
        breadcrumbs={[
          { label: areaLabel, href: "/manufacturing/boms" },
          { label: "Routing" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/manufacturing/boms">BOMs</Link>
            </Button>
            {canWrite && (
              <Button size="sm" onClick={() => void openNewRoute()}>
                <Icons.Plus className="mr-2 h-4 w-4" />
                New route
              </Button>
            )}
          </div>
        }
      />

      <div className={LIST_PAGE_BODY_CLASS}>
        <DataTableToolbar className="shrink-0 rounded-xl border bg-card/80 shadow-sm backdrop-blur-sm"
          searchPlaceholder="Search code, name, or description…"
          searchValue={search}
          onSearchChange={setSearch}
          activeFiltersCount={filterChips.length}
          onClearFilters={() => setSearch("")}
          filterChips={filterChips}
          onRemoveFilterChip={() => setSearch("")}
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
            columnWidths={["w-24", "w-36", "w-16", "w-44", "w-16"]}
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
              <DataTable<RouteRow>
                data={rows}
                columns={columns}
                emptyMessage="No routes match your search. Create one to define operation sequences."
                onRowClick={(r) => void openEditRoute(r.id)}
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
          entityLabel="routes"
        />
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="flex w-full flex-col sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{editingRouteId ? "Edit route" : "New route"}</SheetTitle>
            <SheetDescription>
              Define the operation sequence, work centers, and timing standards.
            </SheetDescription>
          </SheetHeader>

          {sheetLoading ? (
            <div className="flex flex-1 items-center justify-center py-12 text-sm text-muted-foreground">
              <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading route…
            </div>
          ) : (
            <div className="flex-1 space-y-4 overflow-y-auto py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Code</Label>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="RT-001"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Filleting route" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Operations</Label>
                  <Button size="sm" variant="outline" onClick={addOperation}>
                    <Icons.Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add operation
                  </Button>
                </div>
                {operations.map((operation, index) => (
                  <div key={operation.id} className="rounded-xl border bg-muted/20 p-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Sequence</Label>
                        <Input
                          value={operation.sequence}
                          onChange={(e) =>
                            setOperations((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, sequence: e.target.value } : item
                              )
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Name</Label>
                        <Input
                          value={operation.name}
                          onChange={(e) =>
                            setOperations((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, name: e.target.value } : item
                              )
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Work center</Label>
                        <Input
                          value={operation.workCenter}
                          onChange={(e) =>
                            setOperations((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, workCenter: e.target.value } : item
                              )
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Setup min</Label>
                        <Input
                          value={operation.setupMinutes}
                          onChange={(e) =>
                            setOperations((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, setupMinutes: e.target.value } : item
                              )
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Run min/unit</Label>
                        <Input
                          value={operation.runMinutesPerUnit}
                          onChange={(e) =>
                            setOperations((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, runMinutesPerUnit: e.target.value }
                                  : item
                              )
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() =>
                          setOperations((current) => current.filter((item) => item.id !== operation.id))
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
                {operations.length === 0 && (
                  <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No operations yet. Add at least one step for execution planning.
                  </p>
                )}
              </div>
            </div>
          )}

          <SheetFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={saving || sheetLoading || !name.trim()}
              onClick={async () => {
                setSaving(true);
                try {
                  const payload = {
                    code: code.trim(),
                    name: name.trim(),
                    description: description.trim() || undefined,
                    operations: operations.map((operation) => ({
                      id: operation.id,
                      sequence: Number(operation.sequence) || 0,
                      name: operation.name.trim(),
                      workCenter: operation.workCenter.trim(),
                      setupMinutes: Number(operation.setupMinutes) || 0,
                      runMinutesPerUnit: Number(operation.runMinutesPerUnit) || 0,
                    })),
                  };
                  if (editingRouteId) {
                    await updateManufacturingRoute(editingRouteId, payload);
                  } else {
                    await createManufacturingRoute(payload);
                  }
                  toast.success(`Route ${editingRouteId ? "updated" : "created"}.`);
                  setSheetOpen(false);
                  await loadPage(pageOffset);
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to save route.");
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? (
                <>
                  <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save route"
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
