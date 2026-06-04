"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LIST_PAGE_BODY_CLASS, LIST_PAGE_SHELL_CLASS, LIST_TABLE_SCROLL_BODY_CLASS, LIST_TABLE_SURFACE_CLASS, PageShell } from "@/components/layout/page-shell";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { fetchApBillsApi } from "@/lib/api/payments";
import type { APBillRow } from "@/lib/types/ap";
import { DualCurrencyAmount } from "@/components/ui/dual-currency-amount";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { useCanWritePurchasing } from "@/lib/rbac/use-write-guard";

export default function SupplierInvoicesPage() {
  const router = useRouter();
  const canWrite = useCanWritePurchasing();
  const [search, setSearch] = React.useState("");
  const [rows, setRows] = React.useState<APBillRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchApBillsApi(search));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load supplier invoices.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => [row.number, row.party, row.status].join(" ").toLowerCase().includes(q));
  }, [rows, search]);

  const columns = React.useMemo(
    () => [
      { id: "number", header: "Number", accessor: (row: APBillRow) => <span className="font-medium">{row.number}</span> },
      { id: "date", header: "Date", accessor: "date" as keyof APBillRow },
      { id: "supplier", header: "Supplier", accessor: "party" as keyof APBillRow },
      {
        id: "amount",
        header: "Amount",
        accessor: (row: APBillRow) => (
          <DualCurrencyAmount
            amount={row.total}
            currency={row.currency ?? "KES"}
            exchangeRate={row.exchangeRate}
            align="right"
            size="sm"
          />
        ),
      },
      { id: "status", header: "Status", accessor: "status" as keyof APBillRow },
    ],
    []
  );

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Supplier Invoices (AP Bills)"
        description="Manage supplier invoices, due amounts, and AP bill posting flow."
        breadcrumbs={[{ label: "Purchasing", href: "/purchasing/orders" }, { label: "Supplier Invoices" }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/ap/bills">Open AP Bills</Link>
            </Button>
            {canWrite && (
              <Button asChild>
                <Link href="/docs/bill/new">
                  <Icons.Plus className="mr-2 h-4 w-4" />
                  Record Bill
                </Link>
              </Button>
            )}
          </div>
        }
      />
      <div className={LIST_PAGE_BODY_CLASS}>
        <DataTableToolbar className="shrink-0" searchPlaceholder="Search by number, supplier..." searchValue={search} onSearchChange={setSearch} />
        <div className={LIST_TABLE_SURFACE_CLASS}>
          <div className="shrink-0 border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Supplier Invoices</h3>
          </div>
          {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading supplier invoices...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon="FileText"
                  title="No supplier invoices"
                  description="Record supplier invoices to track accounts payable."
                  action={canWrite ? { label: "Record Bill", onClick: () => router.push("/docs/bill/new") } : undefined}
                />
              </div>
            ) : (
              <div className={cn(LIST_TABLE_SCROLL_BODY_CLASS)}>
                <DataTable<APBillRow> data={filtered} columns={columns} onRowClick={(row) => router.push(`/docs/bill/${row.id}`)} emptyMessage="No supplier invoices found."
              scrollMode="fill"
              size="comfortable"
              className="border-0"
              />
              </div>
            )}
        </div>
      </div>
    </PageShell>
  );
}
