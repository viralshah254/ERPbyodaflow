"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchNetworkCustomersApi,
  fetchNetworkCustomer360Api,
  type NetworkCustomerRow,
  type NetworkCustomer360,
} from "@/lib/api/franchise-customers";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { formatMoney } from "@/lib/money";
import {
  Users2,
  Search,
  TrendingUp,
  ShoppingCart,
  MapPin,
  Package,
  Calendar,
  Loader2,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function CustomerTypeLabel({ type }: { type?: string }) {
  if (!type) return null;
  const label = type.replace(/_/g, " ").toLowerCase().replace(/(^|\s)\w/g, (m) => m.toUpperCase());
  return (
    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
      {label}
    </Badge>
  );
}

// ─── Customer 360 Slide-over ──────────────────────────────────────────────────

function Customer360Sheet({
  networkCustomerId,
  open,
  onOpenChange,
}: {
  networkCustomerId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<NetworkCustomer360 | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || !networkCustomerId) {
      setData(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetchNetworkCustomer360Api(networkCustomerId)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load customer data"))
      .finally(() => setLoading(false));
  }, [open, networkCustomerId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-2">
            <Users2 className="h-5 w-5 text-muted-foreground" />
            <SheetTitle>
              {data?.name ?? (loading ? "Loading…" : "Customer 360")}
            </SheetTitle>
          </div>
          {data && (
            <SheetDescription className="flex flex-wrap items-center gap-3 text-sm">
              {data.phone && <span>{data.phone}</span>}
              {data.email && <span>{data.email}</span>}
              <CustomerTypeLabel type={data.customerType} />
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="flex-1 px-6 py-4 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {data && (
            <>
              {/* KPI row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border bg-muted/30 p-3 space-y-0.5">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Total spend
                  </p>
                  <p className="text-lg font-semibold">{formatMoney(data.totalSpend, "KES")}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 space-y-0.5">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <ShoppingCart className="h-3 w-3" /> Orders
                  </p>
                  <p className="text-lg font-semibold">{data.totalOrders}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 space-y-0.5">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Outlets
                  </p>
                  <p className="text-lg font-semibold">{data.outletAccounts.length}</p>
                </div>
              </div>

              {/* Outlet breakdown */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Outlet Accounts</h3>
                <div className="rounded-md border divide-y">
                  {data.outletAccounts.map((outlet) => (
                    <div key={outlet.partyId} className="p-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{outlet.outletName}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          {outlet.franchiseCode && <span>{outlet.franchiseCode}</span>}
                          {outlet.franchiseTerritory && <span>{outlet.franchiseTerritory}</span>}
                          {outlet.partyCode && <span>Cust. #{outlet.partyCode}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold">{formatMoney(outlet.totalSpend, "KES")}</p>
                        <p className="text-xs text-muted-foreground">{outlet.orderCount} orders · Last {formatDate(outlet.lastPurchase)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top products */}
              {data.topProducts.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    Top Products
                  </h3>
                  <div className="rounded-md border divide-y">
                    {data.topProducts.slice(0, 8).map((product) => (
                      <div key={product.productId} className="px-3 py-2 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm truncate">{product.name}</p>
                          {product.code && <p className="text-xs text-muted-foreground">{product.code}</p>}
                        </div>
                        <div className="text-right shrink-0 text-xs text-muted-foreground">
                          <span>{product.totalQty} units</span>
                          <span className="ml-2 font-medium text-foreground">{formatMoney(product.totalAmount, "KES")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent orders */}
              {data.recentOrders.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Recent Orders
                  </h3>
                  <div className="rounded-md border divide-y">
                    {data.recentOrders.slice(0, 10).map((order) => (
                      <div key={order.id} className="px-3 py-2 flex items-center justify-between gap-4 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium">{order.number}</p>
                          <p className="text-xs text-muted-foreground">{order.outletName} · {formatDate(order.date)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-medium">{formatMoney(order.totalAmount, order.currency ?? "KES")}</p>
                          <Badge
                            variant={order.status === "CONFIRMED" ? "default" : order.status === "INVOICED" ? "secondary" : "outline"}
                            className="text-[10px] px-1.5 py-0 mt-0.5"
                          >
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FranchiseCustomersPage() {
  const { orgRole } = useOrgContextStore();

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<NetworkCustomerRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  // Debounce search input
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch on search change
  React.useEffect(() => {
    if (orgRole !== "FRANCHISOR") return;
    setLoading(true);
    setRows([]);
    setCursor(null);
    fetchNetworkCustomersApi({ search: debouncedSearch || undefined, limit: 50 })
      .then((data) => {
        setRows(data.items);
        setTotal(data.total);
        setCursor(data.cursor);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [debouncedSearch, orgRole]);

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchNetworkCustomersApi({ search: debouncedSearch || undefined, limit: 50, cursor });
      setRows((prev) => [...prev, ...data.items]);
      setCursor(data.cursor);
    } finally {
      setLoadingMore(false);
    }
  };

  if (orgRole && orgRole !== "FRANCHISOR") {
    return (
      <PageShell>
        <PageHeader
          title="Network Customers"
          description="Cross-franchise customer intelligence"
          icon={<Users2 className="h-5 w-5" />}
        />
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
          <AlertTriangle className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">
            This page is only available to the franchisor (HQ) organization.
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Network Customers"
        description="Cross-franchise customer intelligence — view buying patterns and identity across all outlets"
        icon={<Users2 className="h-5 w-5" />}
      />

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <Card className="py-3">
          <CardContent className="px-4 py-0 flex items-center gap-3">
            <Users2 className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Unique identities</p>
              <p className="text-xl font-semibold">{total.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="px-4 py-0 flex items-center gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Multi-outlet customers</p>
              <p className="text-xl font-semibold">{rows.filter((r) => r.outletCount > 1).length.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name, phone, or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">All Network Customers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Users2 className="h-8 w-8" />
              <p className="text-sm">No customers found.</p>
              {debouncedSearch && <p className="text-xs">Try a different search term.</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Outlets</TableHead>
                    <TableHead className="text-right">Total Spend</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead>Last Purchase</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      key={row.networkCustomerId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedId(row.networkCustomerId);
                        setSheetOpen(true);
                      }}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{row.name}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                            {row.phone && <span>{row.phone}</span>}
                            {row.email && <span className={cn(row.phone && "hidden sm:inline")}>{row.email}</span>}
                            <CustomerTypeLabel type={row.customerType} />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {row.outlets.slice(0, 3).map((outlet) => (
                            <Badge
                              key={outlet.partyId}
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 truncate max-w-[100px]"
                              title={outlet.name}
                            >
                              {outlet.franchiseCode ?? outlet.name}
                            </Badge>
                          ))}
                          {row.outletCount > 3 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              +{row.outletCount - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatMoney(row.totalSpend, "KES")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.orderCount}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(row.lastPurchase)}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Load more */}
          {cursor && (
            <div className="flex justify-center py-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading…
                  </>
                ) : (
                  "Load more"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer 360 slide-over */}
      <Customer360Sheet
        networkCustomerId={selectedId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </PageShell>
  );
}
