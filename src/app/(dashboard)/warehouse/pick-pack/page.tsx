"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  LIST_PAGE_BODY_PAGINATED_CLASS,
  LIST_PAGE_SHELL_CLASS,
  LIST_TABLE_STATIC_CLASS,
  PageShell,
} from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Badge } from "@/components/ui/badge";
import { TablePagination } from "@/components/ui/table-pagination";
import { fetchDocumentListPageApi } from "@/lib/api/documents";
import { fetchSalesDocumentFlowApi, startPickPackFromSalesOrderApi } from "@/lib/api/sales-document-flow";
import { fetchPickPackPage, fetchPickPackTasks, warehouseStatusLabel, type WarehousePickPackRow } from "@/lib/api/warehouse-execution";
import { formatActivityExact, formatDocumentCreatedLabel } from "@/lib/format/nairobi-datetime";
import { queueConfirmedSalesOrders } from "@/lib/warehouse/pick-pack-queue";
import { toast } from "sonner";

const TO_PICK = "PENDING,PICKED";
const PAGE_SIZE_OPTIONS = [20, 30] as const;
const SEARCH_DEBOUNCE_MS = 400;

const STATUS_OPTIONS = [
  { label: "To pick and pack", value: TO_PICK },
  { label: "Ready for dispatch", value: "PACKED" },
  { label: "All", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Picked", value: "PICKED" },
  { label: "Dispatched", value: "DISPATCHED" },
  { label: "Completed", value: "COMPLETED" },
];

export default function PickPackPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState(TO_PICK);
  const [pageSize, setPageSize] = React.useState<number>(20);
  const [pageOffset, setPageOffset] = React.useState(0);
  const [rows, setRows] = React.useState<WarehousePickPackRow[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [fetching, setFetching] = React.useState(false);
  const [flowMode, setFlowMode] = React.useState<string | null>(null);
  const [openingId, setOpeningId] = React.useState<string | null>(null);
  const hasLoaded = React.useRef(false);
  const pickPackFirst = flowMode === "pick_pack_first";

  React.useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPageOffset(0);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [search]);

  React.useEffect(() => {
    let cancelled = false;
    if (!hasLoaded.current) setInitialLoading(true);
    else setFetching(true);
    const waitingQueue = statusFilter === TO_PICK;
    void (async () => {
      try {
        let mode = flowMode;
        if (waitingQueue && !mode) {
          mode = (await fetchSalesDocumentFlowApi()).mode;
          if (!cancelled) setFlowMode(mode);
        }
        if (cancelled) return;
        if (waitingQueue && mode === "pick_pack_first") {
          const page = await fetchPickPackPage({
            status: statusFilter,
            search: debouncedSearch || undefined,
            limit: pageSize,
            offset: pageOffset,
            includeReadySalesOrders: true,
          });
          if (cancelled) return;
          if (page.includesReadySalesOrders) {
            setRows(page.items);
            setTotalCount(page.totalCount);
            setHasMore(page.hasMore);
            return;
          }
          const since = new Date();
          since.setDate(since.getDate() - 45);
          const dateFrom = since.toISOString().slice(0, 10);
          const [approved, partial, pending, picked, known] = await Promise.all([
            fetchDocumentListPageApi("sales-order", { status: "APPROVED", limit: 100, dateFrom }),
            fetchDocumentListPageApi("sales-order", { status: "PARTIALLY_FULFILLED", limit: 100, dateFrom }),
            fetchPickPackTasks({ status: "PENDING" }),
            fetchPickPackTasks({ status: "PICKED" }),
            fetchPickPackTasks(),
          ]);
          if (cancelled) return;
          const merged = queueConfirmedSalesOrders({
            openTasks: [...pending, ...picked],
            knownTasks: known,
            orders: [...approved.items, ...partial.items].map((order) => ({
              id: order.id,
              number: order.number,
              party: order.party,
              createdAt: order.createdAt,
              date: order.date,
            })),
          });
          const needle = debouncedSearch.toLowerCase();
          const filtered = needle
            ? merged.filter((row) =>
                [row.sourceDocumentNumber, row.customer, row.number]
                  .join(" ")
                  .toLowerCase()
                  .includes(needle)
              )
            : merged;
          setRows(filtered.slice(pageOffset, pageOffset + pageSize));
          setTotalCount(filtered.length);
          setHasMore(pageOffset + pageSize < filtered.length);
          return;
        }
        const page = await fetchPickPackPage({
          status: statusFilter || undefined,
          search: debouncedSearch || undefined,
          limit: pageSize,
          offset: pageOffset,
        });
        if (cancelled) return;
        setRows(page.items);
        setTotalCount(page.totalCount);
        setHasMore(page.hasMore);
      } catch (error) {
        if (cancelled) return;
        toast.error(error instanceof Error ? error.message : "Failed to load pick-pack tasks.");
      } finally {
        if (cancelled) return;
        hasLoaded.current = true;
        setInitialLoading(false);
        setFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [statusFilter, debouncedSearch, pageSize, pageOffset]);

  const waiting = statusFilter === TO_PICK && !debouncedSearch;
  const orderWord = pickPackFirst ? "sales order" : "delivery note";
  const queueLabel =
    totalCount === 1
      ? `1 ${orderWord} still to pick and pack`
      : `${totalCount} ${pickPackFirst ? "sales orders" : "delivery notes"} still to pick and pack`;

  const openRow = React.useCallback(
    async (row: WarehousePickPackRow) => {
      if (!row.readySalesOrderId) {
        router.push(`/warehouse/pick-pack/${row.id}`);
        return;
      }
      if (openingId) return;
      setOpeningId(row.readySalesOrderId);
      try {
        const started = await startPickPackFromSalesOrderApi(row.readySalesOrderId);
        router.push(`/warehouse/pick-pack/${started.pickPackId}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not start pick and pack.");
        setOpeningId(null);
      }
    },
    [openingId, router]
  );

  const columns = React.useMemo(
    () => [
      {
        id: "delivery",
        header: pickPackFirst ? "Sales order" : "Delivery note",
        accessor: (r: WarehousePickPackRow) => (
          <span className="font-medium">
            {r.sourceDocumentNumber ?? r.reference}
            {openingId && openingId === r.readySalesOrderId ? " · starting" : ""}
          </span>
        ),
        sticky: true,
      },
      {
        id: "when",
        header: "When",
        accessor: (r: WarehousePickPackRow) => {
          const when = formatDocumentCreatedLabel(r.createdAt) || "—";
          const exact = formatActivityExact(r.createdAt);
          return (
            <span className="whitespace-nowrap text-muted-foreground" title={exact || undefined}>
              {when}
            </span>
          );
        },
      },
      { id: "customer", header: "Customer", accessor: (r: WarehousePickPackRow) => r.customer ?? "—" },
      { id: "status", header: "Status", accessor: (r: WarehousePickPackRow) => <Badge variant="outline">{warehouseStatusLabel(r.status)}</Badge> },
      { id: "lines", header: "Lines", accessor: (r: WarehousePickPackRow) => r.lines.length },
      { id: "cartons", header: "Cartons", accessor: (r: WarehousePickPackRow) => r.cartonsCount ?? 0 },
    ],
    [openingId, pickPackFirst]
  );

  const emptyMessage = initialLoading
    ? pickPackFirst
      ? "Loading sales orders…"
      : "Loading delivery notes…"
    : waiting
      ? pickPackFirst
        ? "No confirmed sales order is waiting to be picked. Packed orders show on Dispatch."
        : "Nothing is waiting to be picked and packed. Packed notes show on Dispatch."
      : pickPackFirst
        ? "No sales orders match your filters."
        : "No delivery notes match your filters.";

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Pick & Pack"
        description={
          waiting
            ? pickPackFirst
              ? "Confirmed sales orders ready to pick and pack. The delivery note is created after packing."
              : "These are the delivery notes the floor still has to pick and pack."
            : pickPackFirst
              ? "Sales orders the floor is picking, packing, and sending."
              : "What the floor still has to pick, pack, and send."
        }
        breadcrumbs={[
          { label: "Warehouse", href: "/warehouse/overview" },
          { label: "Pick & Pack" },
        ]}
        sticky
        showCommandHint
      />
      <div className={LIST_PAGE_BODY_PAGINATED_CLASS}>
        <DataTableToolbar
          className="shrink-0"
          searchPlaceholder={pickPackFirst ? "Sales order or customer" : "Delivery note or customer"}
          searchValue={search}
          onSearchChange={setSearch}
          filters={[
            {
              id: "status",
              label: "Queue",
              options: STATUS_OPTIONS,
              value: statusFilter,
              onChange: (value) => {
                setStatusFilter(value);
                setPageOffset(0);
              },
            },
          ]}
        />
        <div className={LIST_TABLE_STATIC_CLASS}>
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-semibold">{waiting ? "To pick and pack" : pickPackFirst ? "Sales orders" : "Delivery notes"}</h3>
            <p className="text-xs text-muted-foreground">
              {waiting
                ? queueLabel
                : pickPackFirst
                  ? "Each row is a confirmed sales order the warehouse is working."
                  : "Each row is a delivery note the warehouse is working."}
            </p>
          </div>
          <DataTable<WarehousePickPackRow>
            data={rows}
            columns={columns}
            onRowClick={(row) => void openRow(row)}
            emptyMessage={emptyMessage}
            scrollMode="natural"
            size="comfortable"
            className="border-0 shadow-none"
          />
        </div>
        {initialLoading || (waiting && totalCount === 0) ? null : (
          <TablePagination
            pageOffset={pageOffset}
            pageSize={pageSize}
            itemCount={rows.length}
            hasMore={hasMore}
            totalCount={totalCount}
            loading={initialLoading}
            busy={fetching}
            onPrevious={() => setPageOffset((offset) => Math.max(0, offset - pageSize))}
            onNext={() => setPageOffset((offset) => offset + pageSize)}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPageOffset(0);
            }}
            pageSizeOptions={[...PAGE_SIZE_OPTIONS]}
            entityLabel={pickPackFirst ? "sales orders" : "delivery notes"}
          />
        )}
      </div>
    </PageShell>
  );
}
