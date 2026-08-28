"use client";

import * as React from "react";
import Link from "next/link";
import { LIST_TABLE_WORKLIST_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { TablePagination } from "@/components/ui/table-pagination";
import { SkeletonDataTable } from "@/components/ui/skeleton";
import { TableLinearProgress } from "@/components/ui/table-linear-progress";
import { manufacturingAreaLabel } from "@/lib/terminology";
import { isSeafoodOrg } from "@/config/industry";
import { useOrgContextStore, useTerminology } from "@/stores/orgContextStore";
import { useCanWriteManufacturing } from "@/lib/rbac/use-write-guard";
import {
  applyProductionPlan,
  explodeProductionPlan,
  fetchProductionPlanDefaults,
  type ExplodedProductionPlan,
  type ProductionPlanRow,
  type ProductionPlanTreeNode,
} from "@/lib/api/manufacturing";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const SEARCH_DEBOUNCE_MS = 400;

function qtyLabel(value: number, uom?: string) {
  const n = Number.isFinite(value) ? value : 0;
  return uom ? `${n} ${uom}` : String(n);
}

/** Same check as Complete: on-hand only. Incoming WOs do not fill the warehouse. */
function warehouseShortfall(row: ProductionPlanRow): number {
  if (typeof row.warehouseShortfallQty === "number") {
    return row.warehouseShortfallQty;
  }
  return Math.round(Math.max(0, row.requiredQty - row.onHandQty) * 1000) / 1000;
}

function TreeBlock({ nodes }: { nodes: ProductionPlanTreeNode[] }) {
  if (!nodes.length) return null;
  return (
    <ul className="space-y-1 text-sm">
      {nodes.map((node) => (
        <li key={`${node.kind}-${node.productId}-${node.quantity}`}>
          <span className="text-muted-foreground">{node.kind}</span>{" "}
          <Link
            href={`/inventory/stock-levels?search=${encodeURIComponent(node.productName)}`}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            {node.productName}
          </Link>{" "}
          <span className="tabular-nums">{qtyLabel(node.quantity, node.uom)}</span>
          {node.children.length > 0 && (
            <div className="ml-4 mt-1 border-l pl-3">
              <TreeBlock nodes={node.children} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function stockLevelsHref(row: { productSku?: string; productName: string }): string {
  return `/inventory/stock-levels?search=${encodeURIComponent(row.productSku || row.productName)}`;
}

function ProductStockLink({ row }: { row: ProductionPlanRow }) {
  const label = row.productSku ? `${row.productSku} — ${row.productName}` : row.productName;
  return (
    <Link
      href={stockLevelsHref(row)}
      className="text-sm font-medium text-primary underline-offset-2 hover:underline"
    >
      {label}
    </Link>
  );
}

function makeAction(row: ProductionPlanRow): string {
  if (row.shortageQty > 0) {
    return `Make in production — raise a work order for ${row.shortageQty} ${row.uom}. Not a supplier purchase.`;
  }
  if (warehouseShortfall(row) > 0 && row.incomingQty > 0) {
    return `Still 0 on the shelf. Finish incoming work orders (${row.incomingQty} ${row.uom}), then pack.`;
  }
  if (warehouseShortfall(row) > 0) {
    return `Not on the shelf. Make ${warehouseShortfall(row)} ${row.uom} before packing.`;
  }
  return "Already on the shelf.";
}

function packAction(row: ProductionPlanRow): string {
  if (row.incomingQty > 0 && row.shortageQty <= 0) {
    return `This is the finished pack, not something to buy. Complete existing work orders (${row.incomingQty} ${row.uom}).`;
  }
  if (row.shortageQty > 0) {
    return `Create a pack work order for ${row.shortageQty} ${row.uom}.`;
  }
  return "Pack qty is covered.";
}

function buyAction(row: ProductionPlanRow): string {
  const short = warehouseShortfall(row);
  if (short > 0) {
    return `Buy ${short} ${row.uom} from a supplier — not enough on the shelf.`;
  }
  return "Already on the shelf — do not raise a purchase.";
}

function plannedNameList(rowsById: Record<string, ProductionPlanRow>, qtyById: Record<string, string>): string {
  const names = Object.entries(qtyById)
    .filter(([, raw]) => Number(raw) > 0)
    .map(([productId, raw]) => {
      const row = rowsById[productId];
      const qty = Number(raw) || 0;
      const name = row?.productName ?? productId;
      const uom = row?.uom ?? "";
      return `${name} (${qty}${uom ? ` ${uom}` : ""})`;
    });
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 3).join(", ")} + ${names.length - 3} more`;
}

export default function ProductionPlanPage() {
  const terminology = useTerminology();
  const areaLabel = manufacturingAreaLabel(terminology);
  const canWrite = useCanWriteManufacturing();
  const templateId = useOrgContextStore((s) => s.templateId);
  const industryCategory = useOrgContextStore((s) => s.industryCategory);
  const seafoodOrg = isSeafoodOrg(templateId, industryCategory);
  const resultsRef = React.useRef<HTMLDivElement>(null);

  const [defaults, setDefaults] = React.useState<ProductionPlanRow[]>([]);
  const [rowsById, setRowsById] = React.useState<Record<string, ProductionPlanRow>>({});
  const [qtyById, setQtyById] = React.useState<Record<string, string>>({});
  const [showAllSkus, setShowAllSkus] = React.useState(true);
  const [searchInput, setSearchInput] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [fetching, setFetching] = React.useState(false);
  const [totalCount, setTotalCount] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);
  const hasLoadedOnce = React.useRef(false);
  const [calculating, setCalculating] = React.useState(false);
  const [applying, setApplying] = React.useState(false);
  const [plan, setPlan] = React.useState<ExplodedProductionPlan | null>(null);
  const [createdOrders, setCreatedOrders] = React.useState<
    Array<{ id: string; number: string; productId: string; quantity: number; reused?: boolean }> | null
  >(null);
  const [pageOffset, setPageOffset] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(10);

  React.useEffect(() => {
    const id = window.setTimeout(() => setSearchQuery(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const mergeRows = React.useCallback((items: ProductionPlanRow[]) => {
    setRowsById((current) => {
      const next = { ...current };
      for (const item of items) next[item.productId] = item;
      return next;
    });
    setQtyById((current) => {
      const next = { ...current };
      for (const item of items) {
        if (next[item.productId] == null) next[item.productId] = "";
      }
      return next;
    });
  }, []);

  const loadDefaults = React.useCallback(async () => {
    const first = !hasLoadedOnce.current;
    if (first) setLoading(true);
    else setFetching(true);
    try {
      const result = await fetchProductionPlanDefaults({
        search: searchQuery || undefined,
        limit: pageSize,
        cursor: String(pageOffset),
      });
      const items = result.items ?? [];
      setDefaults(items);
      mergeRows(items);
      setTotalCount(result.totalCount ?? items.length);
      setHasMore(Boolean(result.hasMore));
      hasLoadedOnce.current = true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load pack list.");
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, [mergeRows, pageOffset, pageSize, searchQuery]);

  React.useEffect(() => {
    if (!showAllSkus) {
      setLoading(false);
      return;
    }
    void loadDefaults();
  }, [loadDefaults, showAllSkus]);

  React.useEffect(() => {
    setPageOffset(0);
  }, [searchQuery, pageSize]);

  const packLines = React.useMemo(
    () =>
      Object.entries(qtyById)
        .map(([productId, raw]) => ({
          productId,
          quantity: Number(raw) || 0,
        }))
        .filter((line) => line.quantity > 0),
    [qtyById]
  );

  const plannedRows = React.useMemo(
    () =>
      packLines
        .map((line) => rowsById[line.productId])
        .filter((row): row is ProductionPlanRow => Boolean(row)),
    [packLines, rowsById]
  );

  const visibleDefaults = showAllSkus ? defaults : plannedRows;

  const pagedDefaults = React.useMemo(() => {
    if (showAllSkus) return visibleDefaults;
    return visibleDefaults.slice(pageOffset, pageOffset + pageSize);
  }, [pageOffset, pageSize, showAllSkus, visibleDefaults]);

  const tableTotal = showAllSkus ? totalCount : plannedRows.length;
  const tableHasMore = showAllSkus ? hasMore : pageOffset + pageSize < plannedRows.length;
  const searchPending = searchInput.trim() !== searchQuery;
  const tableBusy = fetching || searchPending;

  const prefillFromSales = async () => {
    setFetching(true);
    try {
      const result = await fetchProductionPlanDefaults({ suggestedOnly: true, limit: 100 });
      const items = result.items ?? [];
      mergeRows(items);
      const next: Record<string, string> = { ...qtyById };
      for (const item of items) {
        next[item.productId] = item.suggestedQty && item.suggestedQty > 0 ? String(item.suggestedQty) : "";
      }
      setQtyById(next);
      setPlan(null);
      setCreatedOrders(null);
      setShowAllSkus(false);
      setSearchInput("");
      setSearchQuery("");
      if (!items.length) toast.info("No open sales shortages to prefill.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to prefill from sales.");
    } finally {
      setFetching(false);
    }
  };

  const handleCalculate = async () => {
    if (!packLines.length) {
      toast.error("Type a pack quantity on at least one finished product, then work backwards.");
      return;
    }
    setCalculating(true);
    try {
      const exploded = await explodeProductionPlan(packLines);
      setPlan(exploded);
      setShowAllSkus(false);
      const buyNeed = exploded.buy.filter((row) => warehouseShortfall(row) > 0).length;
      const makeNeed = exploded.make.filter((row) => row.shortageQty > 0 || warehouseShortfall(row) > 0).length;
      toast.success(
        buyNeed > 0
          ? `Worked backwards. Make ${makeNeed} in production. Buy ${buyNeed} from suppliers.`
          : `Worked backwards. Make ${makeNeed} in production. Nothing to buy — purchased ingredients are on the shelf.`
      );
      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to explode the pack plan.");
    } finally {
      setCalculating(false);
    }
  };

  const handleApply = async () => {
    if (!canWrite) return;
    if (!packLines.length) {
      toast.error("Type a pack quantity on at least one finished product, then work backwards.");
      return;
    }
    setApplying(true);
    try {
      const result = await applyProductionPlan(packLines);
      setPlan(result.explode);
      setShowAllSkus(false);
      setCreatedOrders(result.created);
      const componentShort = result.explode.make.filter(
        (row) => warehouseShortfall(row) > 0 || row.shortageQty > 0
      );
      const buyNeed = result.explode.buy.filter((row) => warehouseShortfall(row) > 0);
      const fresh = result.created.filter((row) => !row.reused).length;
      const reused = result.created.filter((row) => row.reused).length;
      if (buyNeed.length) {
        toast.warning(
          `Also buy: ${buyNeed.map((row) => row.productSku ?? row.productName).join(", ")}.`
        );
      } else if (componentShort.length) {
        toast.warning(
          `Drafts created. Make these first (not purchases): ${componentShort.map((row) => row.productSku ?? row.productName).join(", ")}.`
        );
      } else if (!result.created.length) {
        toast.success("No work orders needed — stock already covers this plan.");
      } else if (fresh === 0) {
        toast.info(
          `Work orders already exist for this plan (${result.created.map((row) => row.number).join(", ")}).`
        );
      } else if (reused) {
        toast.success(
          `Created ${fresh} draft work order${fresh === 1 ? "" : "s"}. ${reused} already existed.`
        );
      } else {
        toast.success(
          `Created ${fresh} draft work order${fresh === 1 ? "" : "s"}: ${result.created.map((row) => row.number).join(", ")}.`
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create work orders.");
    } finally {
      setApplying(false);
    }
  };

  const packColumns = React.useMemo(
    () => [
      {
        id: "sku",
        header: "SKU",
        accessor: (r: ProductionPlanRow) => (
          <span className="font-mono text-xs">{r.productSku ?? "—"}</span>
        ),
        sticky: true,
      },
      {
        id: "name",
        header: "Finished product",
        accessor: (r: ProductionPlanRow) => <span className="font-medium text-sm">{r.productName}</span>,
      },
      {
        id: "onHand",
        header: "On hand",
        accessor: (r: ProductionPlanRow) => <span className="tabular-nums text-sm">{r.onHandQty}</span>,
      },
      {
        id: "sales",
        header: "Open sales",
        accessor: (r: ProductionPlanRow) => <span className="tabular-nums text-sm">{r.requiredQty}</span>,
      },
      {
        id: "incoming",
        header: "Open WOs",
        accessor: (r: ProductionPlanRow) => <span className="tabular-nums text-sm">{r.incomingQty}</span>,
      },
      {
        id: "qty",
        header: "Pack qty",
        accessor: (r: ProductionPlanRow) => (
          <Input
            type="number"
            min={0}
            step="1"
            className="h-8 w-24 tabular-nums"
            value={qtyById[r.productId] ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              setQtyById((prev) => ({ ...prev, [r.productId]: value }));
              setPlan(null);
              setCreatedOrders(null);
            }}
            aria-label={`Pack quantity for ${r.productName}`}
          />
        ),
      },
    ],
    [qtyById]
  );

  const makeColumns = React.useMemo(
    () => [
      {
        id: "item",
        header: "Item",
        accessor: (r: ProductionPlanRow) => <ProductStockLink row={r} />,
      },
      {
        id: "need",
        header: "Need",
        accessor: (r: ProductionPlanRow) => (
          <span className="tabular-nums text-sm">
            {r.requiredQty} {r.uom}
          </span>
        ),
      },
      {
        id: "onHand",
        header: "On the shelf",
        accessor: (r: ProductionPlanRow) => <span className="tabular-nums text-sm">{r.onHandQty}</span>,
      },
      {
        id: "do",
        header: "What to do",
        accessor: (r: ProductionPlanRow) => (
          <div className="max-w-[28rem] space-y-1">
            <p className="text-sm">{makeAction(r)}</p>
            <Link href="/manufacturing/work-orders" className="text-xs text-primary underline-offset-2 hover:underline">
              Open work orders
            </Link>
          </div>
        ),
      },
    ],
    []
  );

  const packResultColumns = React.useMemo(
    () => [
      {
        id: "item",
        header: "Finished pack",
        accessor: (r: ProductionPlanRow) => <ProductStockLink row={r} />,
      },
      {
        id: "need",
        header: "Pack qty",
        accessor: (r: ProductionPlanRow) => (
          <span className="tabular-nums text-sm">
            {r.requiredQty} {r.uom}
          </span>
        ),
      },
      {
        id: "onHand",
        header: "On the shelf",
        accessor: (r: ProductionPlanRow) => <span className="tabular-nums text-sm">{r.onHandQty}</span>,
      },
      {
        id: "incoming",
        header: "Open WOs",
        accessor: (r: ProductionPlanRow) => <span className="tabular-nums text-sm">{r.incomingQty}</span>,
      },
      {
        id: "do",
        header: "What to do",
        accessor: (r: ProductionPlanRow) => (
          <div className="max-w-[28rem] space-y-1">
            <p className="text-sm">{packAction(r)}</p>
            <Link href="/manufacturing/work-orders" className="text-xs text-primary underline-offset-2 hover:underline">
              Open work orders
            </Link>
          </div>
        ),
      },
    ],
    []
  );

  const buyColumns = React.useMemo(
    () => [
      {
        id: "item",
        header: "Item",
        accessor: (r: ProductionPlanRow) => <ProductStockLink row={r} />,
      },
      {
        id: "need",
        header: "Need",
        accessor: (r: ProductionPlanRow) => (
          <span className="tabular-nums text-sm">
            {r.requiredQty} {r.uom}
          </span>
        ),
      },
      {
        id: "onHand",
        header: "On the shelf",
        accessor: (r: ProductionPlanRow) => <span className="tabular-nums text-sm">{r.onHandQty}</span>,
      },
      {
        id: "buy",
        header: "Buy",
        accessor: (r: ProductionPlanRow) => {
          const short = warehouseShortfall(r);
          return short > 0 ? (
            <span className="tabular-nums text-sm font-semibold">{short} {r.uom}</span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          );
        },
      },
      {
        id: "do",
        header: "What to do",
        accessor: (r: ProductionPlanRow) => (
          <div className="max-w-[28rem] space-y-1">
            <p className="text-sm">{buyAction(r)}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <Link href={stockLevelsHref(r)} className="text-xs text-primary underline-offset-2 hover:underline">
                Stock levels
              </Link>
              {warehouseShortfall(r) > 0 ? (
                <Link href="/docs/purchase-order/new" className="text-xs text-primary underline-offset-2 hover:underline">
                  New purchase order
                </Link>
              ) : null}
            </div>
          </div>
        ),
      },
    ],
    []
  );

  const componentRows = plan?.make ?? [];
  const packResultRows = plan?.packLines ?? [];
  const buyShortRows = plan?.buy.filter((row) => warehouseShortfall(row) > 0) ?? [];
  const makeWork = componentRows.filter((row) => row.shortageQty > 0 || warehouseShortfall(row) > 0);

  return (
    <PageShell>
      <PageHeader
        title="Production Plan"
        description={
          seafoodOrg
            ? "Enter pack quantities on the fish SKUs you will process today. Work backwards ignores empty pack qty."
            : "Enter pack quantities on the SKUs you will make today. Work backwards ignores empty pack qty."
        }
        breadcrumbs={[
          { label: areaLabel, href: "/manufacturing/boms" },
          { label: "Production Plan" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/manufacturing/work-orders">Work orders</Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-4 px-4 py-4 pb-12 sm:px-6 sm:py-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[16rem] flex-1">
            <Icons.Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
                setShowAllSkus(true);
              }}
              placeholder="Search finished SKU or name…"
              spellCheck={false}
              autoComplete="off"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => void prefillFromSales()} disabled={loading}>
            Prefill from sales
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setShowAllSkus((v) => !v); setPageOffset(0); }}>
            {showAllSkus ? "Show planned SKUs only" : "Show all SKUs"}
          </Button>
          <Button size="sm" onClick={() => void handleCalculate()} disabled={calculating || loading}>
            {calculating ? "Working backwards…" : plan ? "Recalculate" : "Work backwards"}
          </Button>
          {canWrite && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void handleApply()}
              disabled={applying || loading || createdOrders != null}
            >
              {applying
                ? "Creating…"
                : createdOrders != null
                  ? "Work orders created"
                  : "Create work orders"}
            </Button>
          )}
        </div>

        {loading ? (
          <SkeletonDataTable rows={8} columnWidths={["w-20", "w-48", "w-16", "w-16", "w-16", "w-24"]} />
        ) : (
          <div className={LIST_TABLE_WORKLIST_CLASS}>
            <TableLinearProgress active={tableBusy} />
            <div className={cn("flex min-h-0 flex-1 flex-col", tableBusy && "pointer-events-none opacity-60")}>
            <DataTable
              data={pagedDefaults}
              columns={packColumns}
              emptyMessage={
                showAllSkus
                  ? searchQuery
                    ? "No pack SKUs match that search."
                    : seafoodOrg
                      ? "No packed fish SKUs with a processing recipe were found."
                      : "No finished products with a recipe were found."
                  : "No pack quantities yet. Search a SKU, type a quantity, then work backwards."
              }
              scrollMode="fill"
              className="min-h-0 flex-1 border-0 shadow-none"
              size="comfortable"
            />
            </div>
            {tableTotal > 0 ? (
              <TablePagination
                className="rounded-none border-0 border-t shadow-none bg-card"
                pageOffset={pageOffset}
                pageSize={pageSize}
                itemCount={pagedDefaults.length}
                totalCount={tableTotal}
                hasMore={tableHasMore}
                onPrevious={() => setPageOffset((offset) => Math.max(0, offset - pageSize))}
                onNext={() => setPageOffset((offset) => offset + pageSize)}
                entityLabel="finished products"
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPageOffset(0);
                }}
              />
            ) : null}
          </div>
        )}

        {plan ? (
          <div ref={resultsRef} className="space-y-6">
            <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
              <p className="font-medium">
                Worked backwards from {plannedNameList(rowsById, qtyById)}.
              </p>
              <p className="mt-1 text-muted-foreground">
                {makeWork.length
                  ? `Make in production first: ${makeWork.map((row) => row.productName).join(", ")}.`
                  : "No extra batches to raise for components."}{" "}
                {buyShortRows.length
                  ? `Then buy from suppliers: ${buyShortRows.map((row) => row.productName).join(", ")}.`
                  : seafoodOrg
                    ? "Buy is empty because purchased fish and packing are already in the cold store — processed items (fillets, steaks) are made here, so they never appear on Buy."
                    : "Buy is empty because purchased inputs and packaging are already on the shelf — made items are produced here, so they never appear on Buy."}
              </p>
              {(buyShortRows.length > 0 || makeWork.length > 0 || packResultRows.length > 0) ? (
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-foreground">
                  {buyShortRows.map((row) => (
                    <li key={`buy-${row.productId}`}>
                      <ProductStockLink row={row} />
                      <span className="text-muted-foreground"> — {buyAction(row)}</span>
                    </li>
                  ))}
                  {makeWork.map((row) => (
                    <li key={row.productId}>
                      <ProductStockLink row={row} />
                      <span className="text-muted-foreground"> — {makeAction(row)}</span>
                    </li>
                  ))}
                  {packResultRows.map((row) => (
                    <li key={`pack-${row.productId}`}>
                      <ProductStockLink row={row} />
                      <span className="text-muted-foreground"> — {packAction(row)}</span>
                    </li>
                  ))}
                </ol>
              ) : null}
              {createdOrders != null ? (
                <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
                  {createdOrders.length ? (
                    <>
                      <span className="font-medium text-foreground">
                        Draft work orders (Release → Complete next):
                      </span>
                      {createdOrders.map((wo) => (
                        <Link
                          key={wo.id}
                          href={`/manufacturing/work-orders/${encodeURIComponent(wo.id)}`}
                          className="font-mono text-primary underline underline-offset-2"
                        >
                          {wo.number}
                          {wo.reused ? " (existing)" : ""}
                        </Link>
                      ))}
                    </>
                  ) : (
                    <span className="font-medium text-foreground">
                      No new drafts — this plan is already covered.
                    </span>
                  )}
                </p>
              ) : null}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold">Make in production</h2>
                  <Badge variant="default">{componentRows.length}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  These have a recipe. Get more by completing work orders, not by buying the SKU. Click a name for
                  stock levels.
                </p>
                <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                  <DataTable
                    data={componentRows}
                    columns={makeColumns}
                    emptyMessage="Nothing to make for this pack qty."
                    scrollMode="natural"
                    size="comfortable"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold">Buy from suppliers</h2>
                  <Badge variant="secondary">{buyShortRows.length}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {seafoodOrg
                    ? "Only purchased items that are short in the cold store (whole fish from farms or brokers, ice, crates). Processed SKUs never belong here."
                    : "Only purchased items that are short on the shelf (inputs, packaging). Made items never belong here."}
                </p>
                <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                  <DataTable
                    data={buyShortRows}
                    columns={buyColumns}
                    emptyMessage={
                      seafoodOrg
                        ? "Nothing to buy. Whole fish and packing for this plan are already in the cold store. If fillets or other processed SKUs are short, raise them under Make in production."
                        : "Nothing to buy. Purchased inputs and packaging for this plan are already on the shelf. If a made item is short, raise it under Make in production."
                    }
                    scrollMode="natural"
                    size="comfortable"
                  />
                </div>
              </div>
              <div className="space-y-3 lg:col-span-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold">Pack today</h2>
                  <Badge variant="outline">{packResultRows.length}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Finished product you typed a pack qty for. Zero on the shelf is expected until you complete the pack
                  work orders. Click a name for stock.
                </p>
                <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                  <DataTable
                    data={packResultRows}
                    columns={packResultColumns}
                    emptyMessage="No pack lines."
                    scrollMode="natural"
                    size="comfortable"
                  />
                </div>
              </div>
              <div className="space-y-3 lg:col-span-2">
                <h2 className="text-base font-semibold">Recipe tree</h2>
                <p className="text-sm text-muted-foreground">
                  Full formula. <span className="font-medium text-foreground">make</span> is produced here.{" "}
                  <span className="font-medium text-foreground">buy</span> is a purchased ingredient in the recipe —
                  it only shows on Buy from suppliers if the shelf is short. Names open stock levels.
                </p>
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                  {plan.tree.length ? (
                    <TreeBlock nodes={plan.tree} />
                  ) : (
                    <p className="text-sm text-muted-foreground">No pack lines to explode.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Icons.Info className="mt-0.5 h-4 w-4 shrink-0" />
            Type pack qty only on the SKUs you want to make. Work backwards then lists what to make, what to buy, and
            how to pack — empty pack qty is ignored.
          </p>
        )}

        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Icons.Info className="mt-0.5 h-4 w-4 shrink-0" />
          {seafoodOrg
            ? "Create work orders for processing first (whole fish, then fillets or steaks), complete them so they hit the cold store, then complete the pack. Buy from suppliers only when Buy from suppliers has rows."
            : "Create work orders for Make items first (components, then finished packs), complete them so they hit the shelf, then complete the pack. Buy from suppliers only when Buy from suppliers has rows."}
      </div>
    </PageShell>
  );
}
