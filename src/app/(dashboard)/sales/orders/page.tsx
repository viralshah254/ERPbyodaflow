"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchSalesDocumentsApi } from "@/lib/api/sales-docs";
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
import { bulkDocumentActionApi, documentActionApi } from "@/lib/api/documents";
import { fetchInboundOrders, acceptInboundOrder, type InboundOrderRow } from "@/lib/api/cool-catch";
import { useNavCounts } from "@/lib/use-nav-counts";
import { useOrgContextStore } from "@/stores/orgContextStore";
import * as Icons from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatMoney } from "@/lib/money";
import { DualCurrencyAmount } from "@/components/ui/dual-currency-amount";
import { useBaseCurrency } from "@/lib/org/useBaseCurrency";

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Pending", value: "PENDING_APPROVAL" },
  { label: "Approved", value: "APPROVED" },
  { label: "Fulfilled", value: "FULFILLED" },
];

const CHANNEL_OPTIONS = [
  { label: "All channels", value: "" },
  { label: "WhatsApp", value: "whatsapp" },
];

/** WhatsApp-native and Coolcatch WhatsApp bot — same list UX (badge + channel filter). */
function isWhatsAppStyleSalesOrder(r: SalesDocRow): boolean {
  return (
    r.orderChannel === "WHATSAPP" ||
    r.orderChannel === "COOLCATCH_WA" ||
    (r.reference?.startsWith("WA:") ?? false)
  );
}

const scope = "sales-orders";

// ─── Franchise Inbound Orders panel ──────────────────────────────────────────

function franchiseInboundDetailHref(r: InboundOrderRow) {
  return `/sales/orders/franchise-inbound/${encodeURIComponent(r.outletOrgId)}/${encodeURIComponent(r.id)}`;
}

function FranchiseOrdersTab({ onRowsChange }: { onRowsChange?: (count: number) => void }) {
  const router = useRouter();
  const [rows, setRows] = React.useState<InboundOrderRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [acceptingId, setAcceptingId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchInboundOrders();
      setRows(data.items);
      onRowsChange?.(data.items.length);
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to load franchise orders.");
    } finally {
      setLoading(false);
    }
  }, [onRowsChange]);

  React.useEffect(() => { void load(); }, [load]);

  const handleAccept = async (row: InboundOrderRow) => {
    setAcceptingId(row.id);
    try {
      const result = await acceptInboundOrder(row.outletOrgId, row.id);
      toast.success(`Sales order ${result.soNumber} created for ${result.outletName}.`);
      router.push(`/docs/sales-order/${result.soId}`);
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to accept order.");
    } finally {
      setAcceptingId(null);
    }
  };

  const columns = [
    { id: "outlet", header: "Outlet", accessor: (r: InboundOrderRow) => <span className="font-medium">{r.outletName}</span> },
    {
      id: "number",
      header: "PR Number",
      accessor: (r: InboundOrderRow) => (
        <Link href={franchiseInboundDetailHref(r)} className="font-medium text-primary hover:underline">
          {r.number}
        </Link>
      ),
    },
    { id: "date", header: "Date", accessor: (r: InboundOrderRow) => r.date ?? "—" },
    {
      id: "products",
      header: "Products",
      accessor: (r: InboundOrderRow) => (
        <span className="text-xs text-muted-foreground">
          {r.lines.slice(0, 2).map((l) => l.productName ?? l.sku ?? l.productId ?? "—").join(", ")}
          {r.lines.length > 2 ? ` +${r.lines.length - 2} more` : ""}
        </span>
      ),
    },
    {
      id: "total",
      header: "Total",
      accessor: (r: InboundOrderRow) =>
        formatMoney(r.total, r.currency || "KES", { decimals: (r.total ?? 0) % 1 === 0 ? 0 : 2 }),
    },
    {
      id: "status",
      header: "Status",
      accessor: (r: InboundOrderRow) => <StatusBadge status={r.status} />,
    },
    {
      id: "action",
      header: "",
      accessor: (r: InboundOrderRow) => (
        <div className="flex justify-end gap-1">
          <Button variant="outline" size="sm" asChild>
            <Link href={franchiseInboundDetailHref(r)} onClick={(e) => e.stopPropagation()}>
              <Icons.ExternalLink className="h-3 w-3 mr-1" />
              View
            </Link>
          </Button>
          <Button
            size="sm"
            disabled={acceptingId === r.id || r.status === "CONVERTED"}
            onClick={(e) => { e.stopPropagation(); void handleAccept(r); }}
          >
            {acceptingId === r.id ? (
              <Icons.Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Icons.CheckCircle className="h-3 w-3 mr-1" />
            )}
            {r.status === "CONVERTED" ? "Accepted" : "Accept"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Purchase requests from franchise outlets — accept to create a sales order on HQ side.
        </p>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <Icons.RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
      <DataTable<InboundOrderRow>
        data={rows}
        columns={columns}
        emptyMessage={loading ? "Loading franchise orders…" : "No inbound orders from franchise outlets."}
        onRowClick={(r) => router.push(franchiseInboundDetailHref(r))}
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SalesOrdersPage() {
  const router = useRouter();
  const baseCurrency = useBaseCurrency();
  const navCounts = useNavCounts();
  const orgRole = useOrgContextStore((s) => s.orgRole);
  const isFranchisor = orgRole === "FRANCHISOR";
  const [franchiseRowsCount, setFranchiseRowsCount] = React.useState<number | null>(null);
  const franchiseOrdersBadge =
    franchiseRowsCount !== null ? franchiseRowsCount : (navCounts["franchise-inbound-orders"] ?? 0);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [channelFilter, setChannelFilter] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [currentViewId, setCurrentViewId] = React.useState<string | null>(null);
  const [savedViews, setSavedViews] = React.useState<SavedView[]>(() =>
    getSavedViews(scope)
  );

  const [allRows, setAllRows] = React.useState<SalesDocRow[]>([]);
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);

  const refreshRows = React.useCallback(async () => {
    const items = await fetchSalesDocumentsApi("sales-order");
    setAllRows(items);
  }, []);

  React.useEffect(() => {
    void refreshRows().catch((error) => {
      toast.error(error instanceof Error ? error.message : "Failed to load sales orders.");
    });
  }, [refreshRows]);
  const filtered = React.useMemo(() => {
    let out = allRows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter(
        (r) =>
          r.number.toLowerCase().includes(q) ||
          (r.party?.toLowerCase().includes(q))
      );
    }
    if (statusFilter) out = out.filter((r) => r.status === statusFilter);
    if (channelFilter === "whatsapp") out = out.filter((r) => isWhatsAppStyleSalesOrder(r));
    return out;
  }, [allRows, search, statusFilter, channelFilter]);

  const filterChips: FilterChip[] = React.useMemo(() => {
    const chips: FilterChip[] = [];
    if (statusFilter) {
      const opt = STATUS_OPTIONS.find((o) => o.value === statusFilter);
      chips.push({ id: "status", label: "Status", value: opt?.label ?? statusFilter });
    }
    if (channelFilter === "whatsapp") chips.push({ id: "channel", label: "Channel", value: "WhatsApp" });
    if (search.trim()) chips.push({ id: "q", label: "Search", value: search.trim() });
    return chips;
  }, [statusFilter, channelFilter, search]);

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
          r.total != null ? (
            <DualCurrencyAmount
              amount={r.total}
              currency={r.currency ?? baseCurrency}
              exchangeRate={r.exchangeRate}
              baseCurrency={baseCurrency}
              align="right"
              size="sm"
            />
          ) : "—",
      },
      {
        id: "status",
        header: "Status",
        accessor: (r: SalesDocRow) => (
          <div className="flex items-center gap-2">
            <StatusBadge status={r.status} />
            {isWhatsAppStyleSalesOrder(r) && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1 text-green-700 border-green-300 dark:text-green-400 dark:border-green-700">
                <Icons.MessageCircle className="h-2.5 w-2.5" />
                WhatsApp
              </Badge>
            )}
          </div>
        ),
      },
      {
        id: "actions",
        header: "",
        accessor: (r: SalesDocRow) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <Icons.MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem asChild>
                <Link href={`/docs/sales-order/${r.id}`}>
                  <Icons.Eye className="mr-2 h-4 w-4" />
                  View
                </Link>
              </DropdownMenuItem>
              {r.status === "PENDING_APPROVAL" && (
                <DropdownMenuItem
                  disabled={actionLoadingId === r.id}
                  onClick={async () => {
                    setActionLoadingId(r.id);
                    try {
                      await documentActionApi("sales-order", r.id, "approve");
                      await refreshRows();
                      toast.success(`${r.number} approved.`);
                    } catch (e) { toast.error((e as Error).message); }
                    finally { setActionLoadingId(null); }
                  }}
                >
                  <Icons.Check className="mr-2 h-4 w-4 text-emerald-500" />
                  Approve
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [actionLoadingId, refreshRows, baseCurrency]
  );

  const handleClearFilters = () => {
    setStatusFilter("");
    setChannelFilter("");
    setSearch("");
  };
  const handleRemoveFilterChip = (id: string) => {
    if (id === "status") setStatusFilter("");
    if (id === "channel") setChannelFilter("");
    if (id === "q") setSearch("");
  };
  const handleSaveView = () => {
    const v = saveView(scope, {
      name: `View ${savedViews.length + 1}`,
      filters: { q: search, status: statusFilter, channel: channelFilter },
    });
    setSavedViews(getSavedViews(scope));
    setCurrentViewId(v.id);
  };
  const handleSelectView = (id: string) => {
    const v = savedViews.find((x) => x.id === id);
    if (v?.filters) {
      setSearch((v.filters.q as string) ?? "");
      setStatusFilter((v.filters.status as string) ?? "");
      setChannelFilter((v.filters.channel as string) ?? "");
    }
    setCurrentViewId(id);
  };
  const handleDeleteView = (id: string) => {
    deleteSavedView(scope, id);
    setSavedViews(getSavedViews(scope));
    if (currentViewId === id) setCurrentViewId(null);
  };

  return (
    <PageShell>
      <PageHeader
        title="Sales Orders"
        description="Orders and fulfillment"
        breadcrumbs={[
          { label: "Sales", href: "/sales/overview" },
          { label: "Sales Orders" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button asChild>
            <Link href="/docs/sales-order/new">
              <Icons.Plus className="mr-2 h-4 w-4" />
              Create Sales Order
            </Link>
          </Button>
        }
      />
      <div className="p-6 space-y-4">
        {isFranchisor ? (
          <Tabs defaultValue="orders">
            <TabsList>
              <TabsTrigger value="orders">Sales Orders</TabsTrigger>
              <TabsTrigger value="franchise-orders" className="gap-1.5">
                Franchise Orders
                <Badge variant="secondary" className="text-xs px-1.5 py-0">Inbound</Badge>
                {franchiseOrdersBadge > 0 ? (
                  <Badge variant="default" className="tabular-nums h-5 min-w-5 rounded-full px-1.5 text-[10px]">
                    {franchiseOrdersBadge > 99 ? "99+" : franchiseOrdersBadge}
                  </Badge>
                ) : null}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="franchise-orders" className="mt-4">
              <FranchiseOrdersTab onRowsChange={setFranchiseRowsCount} />
            </TabsContent>
            <TabsContent value="orders" className="mt-4 space-y-4">
              <DataTableToolbar
                searchPlaceholder="Search by number, customer..."
                searchValue={search}
                onSearchChange={setSearch}
                filters={[
                  { id: "status", label: "Status", options: STATUS_OPTIONS, value: statusFilter, onChange: (v) => setStatusFilter(v) },
                  { id: "channel", label: "Channel", options: CHANNEL_OPTIONS, value: channelFilter, onChange: (v) => setChannelFilter(v) },
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
                onExport={() => {
                  const fileName = `sales-orders-${new Date().toISOString().slice(0, 10)}.csv`;
                  if (isApiConfigured()) { exportDocumentListApi("sales-order", fileName, (msg) => toast.error(msg)); return; }
                  downloadCsv(fileName, filtered.map((row) => ({ number: row.number, date: row.date, party: row.party ?? "", total: row.total ?? 0, status: row.status })));
                }}
              />
              <DataTable<SalesDocRow>
                data={filtered}
                columns={columns}
                onRowClick={(row) => router.push(`/docs/sales-order/${row.id}`)}
                emptyMessage="No sales orders yet."
                selectable
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <>
            <DataTableToolbar
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
                {
                  id: "channel",
                  label: "Channel",
                  options: CHANNEL_OPTIONS,
                  value: channelFilter,
                  onChange: (v) => setChannelFilter(v),
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
              onExport={() => {
                const fileName = `sales-orders-${new Date().toISOString().slice(0, 10)}.csv`;
                if (isApiConfigured()) {
                  exportDocumentListApi("sales-order", fileName, (msg) => toast.error(msg));
                  return;
                }
                downloadCsv(fileName, filtered.map((row) => ({
                  number: row.number,
                  date: row.date,
                  party: row.party ?? "",
                  total: row.total ?? 0,
                  status: row.status,
                })));
              }}
            />
            <DataTable<SalesDocRow>
              data={filtered}
              columns={columns}
              onRowClick={(row) => router.push(`/docs/sales-order/${row.id}`)}
              emptyMessage="No sales orders yet."
              selectable
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
            />
          </>
        )}
      </div>
    </PageShell>
  );
}
