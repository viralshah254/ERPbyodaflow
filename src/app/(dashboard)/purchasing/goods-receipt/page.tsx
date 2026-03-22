"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { fetchGRNs, postGRN } from "@/lib/api/grn";
import type { PurchasingDocRow } from "@/lib/types/purchasing";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const GRN_STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Pending Approval", value: "PENDING_APPROVAL" },
  { label: "Approved", value: "APPROVED" },
  { label: "Posted", value: "POSTED" },
  { label: "Received", value: "RECEIVED" },
  { label: "Cancelled", value: "CANCELLED" },
];

export default function GoodsReceiptPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("DRAFT");
  const [rows, setRows] = React.useState<PurchasingDocRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchGRNs());
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = React.useMemo(() => {
    let out = rows;
    if (statusFilter) out = out.filter((row) => row.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (q) out = out.filter((row) => [row.number, row.poRef ?? "", row.warehouse ?? "", row.status].join(" ").toLowerCase().includes(q));
    return out;
  }, [rows, search, statusFilter]);

  const columns = React.useMemo(
    () => [
      { id: "number", header: "Number", accessor: (row: PurchasingDocRow) => <span className="font-medium">{row.number}</span> },
      { id: "date", header: "Date", accessor: "date" as keyof PurchasingDocRow },
      { id: "poRef", header: "PO reference", accessor: (row: PurchasingDocRow) => row.poRef || "—" },
      { id: "warehouse", header: "Warehouse", accessor: (row: PurchasingDocRow) => row.warehouse || "—" },
      { id: "status", header: "Status", accessor: (row: PurchasingDocRow) => <StatusBadge status={row.status} /> },
      {
        id: "actions",
        header: "Actions",
        accessor: (row: PurchasingDocRow) =>
          row.status === "DRAFT" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  await postGRN(row.id);
                  toast.success(`GRN ${row.number} posted.`);
                  await refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to post GRN.");
                }
              }}
            >
              Post
            </Button>
          ) : null,
      },
    ],
    [refresh]
  );

  return (
    <PageShell>
      <PageHeader
        title="Goods Receipt (GRN)"
        description="Record and post goods receipts for inventory updates and AP matching."
        breadcrumbs={[{ label: "Purchasing", href: "/purchasing/orders" }, { label: "Goods Receipt" }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/inventory/receipts">Open Receipts</Link>
            </Button>
            <Button asChild>
              <Link href="/docs/grn/new">
                <Icons.Plus className="mr-2 h-4 w-4" />
                Create GRN
              </Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search GRNs..."
          searchValue={search}
          onSearchChange={setSearch}
          filters={[
            {
              id: "status",
              label: "Status",
              options: GRN_STATUS_OPTIONS,
              value: statusFilter,
              onChange: (v) => setStatusFilter(v),
            },
          ]}
        />
        <Card>
          <CardHeader>
            <CardTitle>Goods Receipt Notes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading GRNs...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState icon="PackageCheck" title="No GRNs" description="Record goods received to update inventory." action={{ label: "Create GRN", onClick: () => router.push("/docs/grn/new") }} />
              </div>
            ) : (
              <DataTable<PurchasingDocRow> data={filtered} columns={columns} onRowClick={(row) => router.push(`/inventory/receipts/${row.id}`)} emptyMessage="No GRNs found." />
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
