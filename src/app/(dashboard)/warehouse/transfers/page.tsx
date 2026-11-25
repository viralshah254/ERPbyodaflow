"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LIST_PAGE_BODY_CLASS, LIST_PAGE_SHELL_CLASS, LIST_TABLE_SURFACE_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AsyncSearchableSelect } from "@/components/ui/async-searchable-select";
import { exportTransfersCsv, fetchTransferHistory, updateTransferStatus, type TransferRow, type TransferStatus } from "@/lib/api/warehouse-transfers";
import { fetchWarehouseOptions, type LookupOption } from "@/lib/api/lookups";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { useCanWriteInventory } from "@/lib/rbac/use-write-guard";
import { formatActivityStamp, formatActivityWhen } from "@/lib/format/nairobi-datetime";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as Icons from "lucide-react";

type Direction = "" | "out" | "in";

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: "All", value: "" },
  { label: "Transferred", value: "RECEIVED" },
  { label: "Draft", value: "DRAFT" },
  { label: "Approved", value: "APPROVED" },
  { label: "In transit", value: "IN_TRANSIT" },
];

const STATUS_LABEL: Record<TransferStatus, string> = {
  DRAFT: "Draft",
  APPROVED: "Approved",
  IN_TRANSIT: "In transit",
  RECEIVED: "Transferred",
  CANCELLED: "Cancelled",
};

const DIRECTIONS: Array<{ value: Direction; label: string }> = [
  { value: "", label: "Both ways" },
  { value: "out", label: "Sent out" },
  { value: "in", label: "Received" },
];

function statusVariant(s: TransferStatus): "default" | "secondary" | "outline" | "destructive" {
  if (s === "RECEIVED") return "secondary";
  if (s === "IN_TRANSIT") return "default";
  if (s === "DRAFT") return "outline";
  return "default";
}

function formatQty(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

type HistoryFilters = { warehouseId: string; direction: Direction; status: string; dateFrom: string; dateTo: string };

const EMPTY_FILTERS: HistoryFilters = { warehouseId: "", direction: "", status: "", dateFrom: "", dateTo: "" };

function readFilters(search: string): HistoryFilters {
  const params = new URLSearchParams(search);
  const direction = params.get("direction");
  return {
    warehouseId: params.get("warehouse") ?? "",
    direction: direction === "in" || direction === "out" ? direction : "",
    status: params.get("status") ?? "",
    dateFrom: params.get("from") ?? "",
    dateTo: params.get("to") ?? "",
  };
}

function writeFilters(filters: HistoryFilters) {
  const params = new URLSearchParams();
  if (filters.warehouseId) params.set("warehouse", filters.warehouseId);
  if (filters.warehouseId && filters.direction) params.set("direction", filters.direction);
  if (filters.status) params.set("status", filters.status);
  if (filters.dateFrom) params.set("from", filters.dateFrom);
  if (filters.dateTo) params.set("to", filters.dateTo);
  const query = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
}

export default function WarehouseTransfersPage() {
  const router = useRouter();
  const canWrite = useCanWriteInventory();
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [filters, setFilters] = React.useState<HistoryFilters | null>(null);
  const [warehouses, setWarehouses] = React.useState<LookupOption[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [rows, setRows] = React.useState<TransferRow[]>([]);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    setFilters(readFilters(window.location.search));
    void fetchWarehouseOptions().then(setWarehouses).catch(() => setWarehouses([]));
  }, []);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const query = React.useMemo(() => filters && ({
    status: filters.status || undefined,
    search: debouncedSearch || undefined,
    warehouseId: filters.warehouseId || undefined,
    direction: filters.warehouseId && filters.direction ? filters.direction : undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  }), [filters, debouncedSearch]);

  React.useEffect(() => {
    if (!query) return;
    let cancelled = false;
    setLoading(true);
    setSelectedIds([]);
    fetchTransferHistory(query)
      .then((page) => {
        if (cancelled) return;
        setRows(page.items);
        setHasMore(page.hasMore);
      })
      .catch((error: Error) => {
        if (cancelled) return;
        setRows([]);
        setHasMore(false);
        toast.error(error.message || "Transfers could not load.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query, reloadKey]);

  const loadMore = async () => {
    if (!query) return;
    setLoadingMore(true);
    try {
      const page = await fetchTransferHistory({ ...query, offset: rows.length });
      setRows((current) => [...current, ...page.items.filter((item) => !current.some((row) => row.id === item.id))]);
      setHasMore(page.hasMore);
    } catch (error) {
      toast.error((error as Error).message || "More transfers could not load.");
    } finally {
      setLoadingMore(false);
    }
  };

  const updateFilters = (patch: Partial<HistoryFilters>) => {
    setFilters((current) => {
      const next = { ...(current ?? EMPTY_FILTERS), ...patch };
      if (!next.warehouseId) next.direction = "";
      writeFilters(next);
      return next;
    });
  };

  const active = filters ?? EMPTY_FILTERS;
  const store = warehouses.find((wh) => wh.id === active.warehouseId);
  const storeName = store?.label ?? (active.warehouseId ? "this store" : "");
  const hasFilters = Boolean(active.warehouseId || active.status || active.dateFrom || active.dateTo || search.trim());
  const sentCount = active.warehouseId ? rows.filter((row) => row.fromWarehouseId === active.warehouseId).length : 0;
  const receivedCount = active.warehouseId ? rows.filter((row) => row.toWarehouseId === active.warehouseId).length : 0;

  const columns = React.useMemo(
    () => [
      {
        id: "number",
        header: "Number",
        sticky: true,
        accessor: (r: TransferRow) => (
          <span className="block">
            <span className="font-medium">{r.number}</span>
            {r.reference ? <span className="block text-xs text-muted-foreground">{r.reference}</span> : null}
          </span>
        ),
      },
      {
        id: "date",
        header: "Date",
        accessor: (r: TransferRow) => {
          const instant = r.createdAt || r.date;
          const relative = formatActivityWhen(instant);
          const exact = formatActivityStamp(instant);
          return (
            <span className="block leading-snug">
              <span className="block whitespace-nowrap">{relative}</span>
              {exact && exact !== relative ? (
                <span className="block whitespace-nowrap text-xs text-muted-foreground">{exact}</span>
              ) : null}
            </span>
          );
        },
      },
      {
        id: "route",
        header: "From → To",
        accessor: (r: TransferRow) => {
          const out = active.warehouseId && r.fromWarehouseId === active.warehouseId;
          const into = active.warehouseId && r.toWarehouseId === active.warehouseId;
          return (
            <span className="flex flex-wrap items-center gap-1.5">
              {out ? <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-400">Out</Badge> : null}
              {into ? <Badge variant="outline" className="border-emerald-500/50 text-emerald-700 dark:text-emerald-400">In</Badge> : null}
              <span className={cn(out && "font-medium")}>{r.fromWarehouse}</span>
              <Icons.ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="to" />
              <span className={cn(into && "font-medium")}>{r.toWarehouse}</span>
            </span>
          );
        },
      },
      {
        id: "products",
        header: "Products",
        accessor: (r: TransferRow) => {
          const [first, ...rest] = r.lines;
          if (!first) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="block max-w-[22rem]" title={r.lines.map((line) => `${line.productName}: ${formatQty(line.quantity)} ${line.unit ?? ""}`).join("\n")}>
              <span className="block truncate">
                {first.productName} <span className="tabular-nums text-muted-foreground">· {formatQty(first.quantity)} {first.unit}</span>
              </span>
              {rest.length ? <span className="block text-xs text-muted-foreground">+{rest.length} more product{rest.length === 1 ? "" : "s"}</span> : null}
            </span>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        accessor: (r: TransferRow) => <Badge variant={statusVariant(r.status)}>{STATUS_LABEL[r.status] ?? r.status}</Badge>,
      },
      { id: "by", header: "By", accessor: (r: TransferRow) => r.createdBy ?? <span className="text-muted-foreground">—</span> },
    ],
    [active.warehouseId]
  );

  const selected = selectedIds.length > 0 ? rows.filter((r) => selectedIds.includes(r.id)) : [];
  const canApprove = selected.some((r) => r.status === "DRAFT");
  const canMarkInTransit = selected.some((r) => r.status === "APPROVED");
  const canReceive = selected.some((r) => r.status === "IN_TRANSIT");

  const handleBulk = async (action: "approve" | "transit" | "receive") => {
    if (selectedIds.length === 0) return;
    try {
      if (action === "approve") {
        await Promise.all(selected.filter((r) => r.status === "DRAFT").map((r) => updateTransferStatus(r.id, "APPROVED")));
        toast.success("Transfer(s) approved.");
      } else if (action === "transit") {
        await Promise.all(selected.filter((r) => r.status === "APPROVED").map((r) => updateTransferStatus(r.id, "IN_TRANSIT")));
        toast.success("Transfer(s) marked in transit.");
      } else {
        await Promise.all(selected.filter((r) => r.status === "IN_TRANSIT").map((r) => updateTransferStatus(r.id, "RECEIVED")));
        toast.success("Transfer(s) received.");
      }
      setReloadKey((value) => value + 1);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Transfers"
        description="Every stock transfer between stores. Pick a store to see what it sent and received."
        breadcrumbs={[
          { label: "Warehouse", href: "/warehouse/overview" },
          { label: "Transfers" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex items-center gap-2">
            <ExplainThis prompt="Explain inter-warehouse transfers and status lifecycle." label="Explain transfers" />
            {canWrite && (
              <Button size="sm" asChild>
                <Link href="/warehouse/transfers/new" data-tour-step="create-button">
                  <Icons.ArrowRightLeft className="mr-2 h-4 w-4" />
                  Transfer stock
                </Link>
              </Button>
            )}
          </div>
        }
      />
      <div className={LIST_PAGE_BODY_CLASS}>
        <DataTableToolbar className="shrink-0"
          searchPlaceholder="Search by number, reference or product"
          searchValue={search}
          onSearchChange={setSearch}
          filters={[
            { id: "status", label: "Status", options: STATUS_OPTIONS, value: active.status, onChange: (v) => updateFilters({ status: v }) },
          ]}
          onExport={() => exportTransfersCsv(rows)}
          bulkActions={
            selectedIds.length > 0 && canWrite ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{selectedIds.length} selected</span>
                {canApprove && <Button variant="outline" size="sm" onClick={() => handleBulk("approve")}>Approve</Button>}
                {canMarkInTransit && <Button variant="outline" size="sm" onClick={() => handleBulk("transit")}>Mark in transit</Button>}
                {canReceive && <Button variant="outline" size="sm" onClick={() => handleBulk("receive")}>Receive</Button>}
              </div>
            ) : undefined
          }
        >
          <div className="flex flex-wrap items-end gap-x-4 gap-y-3 border-t pt-3">
            <div className="w-full space-y-1 sm:w-72">
              <Label htmlFor="transfer-history-store" className="text-xs text-muted-foreground">Store</Label>
              <AsyncSearchableSelect
                id="transfer-history-store"
                value={active.warehouseId}
                selectedOption={store ?? null}
                onValueChange={(value) => updateFilters({ warehouseId: value })}
                loadOptions={async (text) => {
                  const needle = text.trim().toLowerCase();
                  return warehouses.filter((wh) => !needle || wh.label.toLowerCase().includes(needle)).map((wh) => ({ id: wh.id, label: wh.label }));
                }}
                reloadToken={warehouses.length}
                searchDebounceMs={0}
                allowClear
                placeholder="All stores"
                searchPlaceholder="Find a store or route"
                emptyMessage="No store matches."
                minDropdownWidth={280}
              />
            </div>
            <div role="group" aria-label="Direction" className={cn("inline-flex rounded-lg border bg-muted/40 p-0.5 text-sm", !active.warehouseId && "opacity-50")}>
              {DIRECTIONS.map((option) => (
                <button
                  key={option.value || "both"}
                  type="button"
                  aria-pressed={active.direction === option.value}
                  disabled={!active.warehouseId}
                  onClick={() => updateFilters({ direction: option.value })}
                  className={cn(
                    "rounded-md px-3 py-1 font-medium transition disabled:pointer-events-none",
                    active.direction === option.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="transfer-history-from" className="text-xs text-muted-foreground">From date</Label>
                <Input id="transfer-history-from" type="date" className="h-9 w-40" value={active.dateFrom} max={active.dateTo || undefined}
                  onChange={(event) => updateFilters({ dateFrom: event.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="transfer-history-to" className="text-xs text-muted-foreground">To date</Label>
                <Input id="transfer-history-to" type="date" className="h-9 w-40" value={active.dateTo} min={active.dateFrom || undefined}
                  onChange={(event) => updateFilters({ dateTo: event.target.value })} />
              </div>
            </div>
            {hasFilters ? (
              <Button variant="ghost" size="sm" className="h-9" onClick={() => { setSearch(""); updateFilters(EMPTY_FILTERS); }}>
                Clear
              </Button>
            ) : null}
          </div>
        </DataTableToolbar>
        <div className={LIST_TABLE_SURFACE_CLASS}>
          <div className="flex shrink-0 flex-wrap items-baseline justify-between gap-2 border-b px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold">{storeName ? `Transfer history · ${storeName}` : "Transfer history"}</h3>
              <p className="text-xs text-muted-foreground">
                {loading ? "Loading…"
                  : `${rows.length}${hasMore ? "+" : ""} transfer${rows.length === 1 ? "" : "s"}`
                    + (active.warehouseId && !active.direction ? ` · ${sentCount} sent out · ${receivedCount} received` : "")}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">Newest first</p>
          </div>
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading transfers…</div>
          ) : (
            <>
              <DataTable<TransferRow>
                data={rows}
                columns={columns}
                onRowClick={(row) => router.push(`/warehouse/transfers/${row.id}`)}
                emptyMessage={hasFilters ? "No transfers match these filters." : "No transfers yet."}
                selectable
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                scrollMode="fill"
                size="comfortable"
                className="min-h-0 flex-1 border-0" searchable={false}
              />
              {hasMore ? (
                <div className="shrink-0 border-t p-3 text-center">
                  <Button variant="outline" size="sm" onClick={() => void loadMore()} disabled={loadingMore}>
                    {loadingMore ? "Loading…" : "Load older transfers"}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}
