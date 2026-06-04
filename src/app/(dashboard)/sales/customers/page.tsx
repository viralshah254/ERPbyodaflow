"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LIST_PAGE_BODY_CLASS,
  LIST_PAGE_SHELL_CLASS,
  LIST_TABLE_SURFACE_CLASS,
  PageShell,
} from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { FiltersBar } from "@/components/ui/filters-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { RowActions } from "@/components/ui/row-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import * as Icons from "lucide-react";
import { fetchArCustomerSummariesApi, type ArCustomerSummary } from "@/lib/api/payments";
import { formatMoney } from "@/lib/money";
import { downloadCsv } from "@/lib/export/csv";
import { isApiConfigured } from "@/lib/api/client";
import { useFinancialSettings } from "@/lib/org/useFinancialSettings";
import { toast } from "sonner";
import type { CustomerType } from "@/lib/types/masters";
import { useCanWriteSales } from "@/lib/rbac/use-write-guard";

const CUSTOMER_TYPES: CustomerType[] = ["DISTRIBUTOR", "WHOLESALER", "RETAILER", "FRANCHISEE", "END_CUSTOMER"];

function humanizeSegment(value: string) {
  return value.replace(/_/g, " ");
}

/** Sales roster: live AR customer summaries (same `/api/ar/customers` feed as Finance → AR Customers). */
export default function CustomersPage() {
  const canWrite = useCanWriteSales();
  const router = useRouter();
  const { settings } = useFinancialSettings();
  const currency = settings.baseCurrency?.trim()?.toUpperCase() || "KES";

  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [filterType, setFilterType] = React.useState<string>("all");
  const [filterStatus, setFilterStatus] = React.useState<string>("all");
  const [summaries, setSummaries] = React.useState<ArCustomerSummary[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchQuery.trim()), 250);
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  React.useEffect(() => {
    if (!isApiConfigured()) {
      setSummaries([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchArCustomerSummariesApi(debouncedSearch)
      .then((items) => {
        if (!cancelled) setSummaries(items ?? []);
      })
      .catch((e) => {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Failed to load customers.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  const filtered = React.useMemo(() => {
    return summaries.filter((row) => {
      if (filterType !== "all") {
        if (filterType === "__unset__") {
          if (row.customerType) return false;
        } else if (row.customerType !== filterType) return false;
      }
      if (filterStatus !== "all") {
        const st = (row.status ?? "ACTIVE").toUpperCase();
        if (filterStatus === "ACTIVE" && st !== "ACTIVE") return false;
        if (filterStatus === "INACTIVE" && st === "ACTIVE") return false;
      }
      return true;
    });
  }, [summaries, filterType, filterStatus]);

  const columns = React.useMemo(
    () => [
      {
        id: "name",
        header: "Customer",
        accessor: (row: ArCustomerSummary) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {row.name
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="font-medium truncate">{row.name}</div>
              <div className="text-xs text-muted-foreground truncate">{row.email ?? row.code ?? ""}</div>
            </div>
          </div>
        ),
        sticky: true,
      },
      {
        id: "phone",
        header: "Phone",
        accessor: (row: ArCustomerSummary) => <span>{row.phone ?? "—"}</span>,
      },
      {
        id: "type",
        header: "Type",
        accessor: (row: ArCustomerSummary) =>
          row.customerType ? (
            <Badge variant="outline">{humanizeSegment(row.customerType)}</Badge>
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          ),
      },
      {
        id: "creditLimit",
        header: "Credit limit",
        accessor: (row: ArCustomerSummary) => {
          const amt = row.creditLimit ?? row.creditLimitAmount;
          return (
            <div className="text-right">{amt != null && Number.isFinite(amt) ? formatMoney(amt, currency) : "—"}</div>
          );
        },
      },
      {
        id: "outstanding",
        header: "Outstanding",
        accessor: (row: ArCustomerSummary) => {
          const amt = row.outstandingBalance ?? 0;
          return (
            <div className="text-right font-medium">{formatMoney(Number.isFinite(amt) ? amt : 0, currency)}</div>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        accessor: (row: ArCustomerSummary) => <StatusBadge status={row.status ?? "ACTIVE"} />,
      },
      {
        id: "actions",
        header: "",
        accessor: (row: ArCustomerSummary) => (
          <RowActions
            actions={[
              {
                label: "View / edit AR profile",
                icon: "Pencil",
                onClick: () => router.push(`/ar/customers?id=${encodeURIComponent(row.id)}`),
              },
              {
                label: "New sales order",
                icon: "ShoppingCart",
                onClick: () => router.push("/docs/sales-order/new"),
              },
              {
                label: "AR aging",
                icon: "FileText",
                onClick: () => router.push("/ar/aging"),
              },
              {
                label: "Party master",
                icon: "Building2",
                onClick: () => router.push("/master/parties"),
              },
            ]}
          />
        ),
        className: "w-[50px]",
      },
    ],
    [currency, router]
  );

  if (!isApiConfigured()) {
    return (
      <PageShell className={LIST_PAGE_SHELL_CLASS}>
        <PageHeader
          title="Customers"
          description="Manage customer accounts and relationships."
          breadcrumbs={[{ label: "Sales", href: "/sales/overview" }, { label: "Customers" }]}
        />
        <div className={LIST_PAGE_BODY_CLASS}>
          <EmptyState
            icon="PlugZap"
            title="API not configured"
            description="Set NEXT_PUBLIC_API_URL to load customers from your organisation."
          />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Customers"
        description="Live customer roster from Accounts Receivable. Edit credit and terms under Finance → AR Customers."
        breadcrumbs={[{ label: "Sales", href: "/sales/overview" }, { label: "Customers" }]}
        sticky
        showCommandHint
        actions={canWrite ? (
          <Button asChild>
            <Link href="/ar/customers?new=1">
              <Icons.Plus className="mr-2 h-4 w-4" />
              Add customer
            </Link>
          </Button>
        ) : undefined}
      />
      <div className={LIST_PAGE_BODY_CLASS}>
        <FiltersBar
          className="shrink-0"
          searchPlaceholder="Search by name or email..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          filters={[
            {
              id: "type",
              label: "Type",
              value: filterType,
              onChange: setFilterType,
              options: [
                { label: "All types", value: "all" },
                ...CUSTOMER_TYPES.map((t) => ({ label: humanizeSegment(t), value: t })),
                { label: "Not set", value: "__unset__" },
              ],
            },
            {
              id: "status",
              label: "Status",
              value: filterStatus,
              onChange: setFilterStatus,
              options: [
                { label: "All statuses", value: "all" },
                { label: "Active", value: "ACTIVE" },
                { label: "Inactive", value: "INACTIVE" },
              ],
            },
          ]}
        />
        <div className={LIST_TABLE_SURFACE_CLASS}>
          <div className="shrink-0 border-b px-4 py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold">Customers</h3>
                <CardDescription className="mt-1">
                  {loading ? "Loading…" : `${filtered.length} customer${filtered.length === 1 ? "" : "s"}`}
                  {" · "}
                  <Link href="/ar/customers" className="text-primary underline-offset-4 hover:underline">
                    Open AR Customers
                  </Link>{" "}
                  for full credit workflow
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() =>
                    downloadCsv(
                      `sales-customers-${new Date().toISOString().slice(0, 10)}.csv`,
                      filtered.map((r) => ({
                        name: r.name,
                        email: r.email ?? "",
                        phone: r.phone ?? "",
                        customerType: r.customerType ?? "",
                        creditLimit: r.creditLimit ?? r.creditLimitAmount ?? "",
                        outstanding: r.outstandingBalance ?? "",
                        status: r.status ?? "",
                      }))
                    )
                  }
                  disabled={loading || filtered.length === 0}
                >
                  <Icons.Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/settings/migrations">
                    <Icons.Upload className="mr-2 h-4 w-4" />
                    Import
                  </Link>
                </Button>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              <Icons.Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading customers…
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon="Users"
                title="No customers match"
                description="Try clearing filters or add a customer via AR Customers."
                action={{
                  label: "Add customer",
                  onClick: () => router.push("/ar/customers?new=1"),
                }}
              />
            </div>
          ) : (
            <DataTable
              data={filtered}
              columns={columns}
              onRowClick={(row) => router.push(`/ar/customers?id=${encodeURIComponent(row.id)}`)}
              emptyMessage="No customers found."
              scrollMode="fill"
              size="comfortable"
              className="min-h-0 flex-1 border-0"
            />
          )}
        </div>
      </div>
    </PageShell>
  );
}
