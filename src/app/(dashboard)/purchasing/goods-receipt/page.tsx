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
import { fetchGRNs, postGRN, type GrnPostError } from "@/lib/api/grn";
import type { PurchasingDocRow } from "@/lib/types/purchasing";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const GRN_STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Posted", value: "POSTED" },
  { label: "Received", value: "RECEIVED" },
  { label: "Bill linked (Converted)", value: "CONVERTED" },
  { label: "Cancelled", value: "CANCELLED" },
];

export default function GoodsReceiptPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
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
    if (q) out = out.filter((row) => [row.number, row.poRef ?? "", row.warehouse ?? "", row.party ?? "", row.status].join(" ").toLowerCase().includes(q));
    return out;
  }, [rows, search, statusFilter]);

  const columns = React.useMemo(
    () => [
      { id: "number", header: "Number", accessor: (row: PurchasingDocRow) => <span className="font-medium">{row.number}</span> },
      { id: "date", header: "Date", accessor: "date" as keyof PurchasingDocRow },
      { id: "party", header: "Supplier", accessor: (row: PurchasingDocRow) => row.party || "—" },
      { id: "poRef", header: "PO reference", accessor: (row: PurchasingDocRow) => row.poRef || "—" },
      { id: "warehouse", header: "Warehouse", accessor: (row: PurchasingDocRow) => row.warehouse || "—" },
      {
        id: "status",
        header: "Status",
        accessor: (row: PurchasingDocRow) => {
          if (row.status === "CONVERTED") {
            return (
              <div className="flex flex-col gap-0.5">
                <StatusBadge status="POSTED" />
                <span className="text-[10px] text-muted-foreground leading-tight">Bill linked</span>
              </div>
            );
          }
          return <StatusBadge status={row.status} />;
        },
      },
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
                } catch (raw) {
                  const e = raw as GrnPostError;
                  const msg = e.message ?? "Failed to post GRN.";
                  if (e.code === "GRN_MISSING_WEIGHT") {
                    toast.error(msg, { description: "Enter received weight (kg) on the GRN lines before posting." });
                  } else if (e.code === "GRN_OPEN_VARIANCE") {
                    const url = e.poId
                      ? `/purchasing/cash-weight-audit?poId=${encodeURIComponent(e.poId)}`
                      : "/purchasing/cash-weight-audit";
                    toast.error(msg, {
                      action: { label: "Go to audit", onClick: () => { window.location.href = url; } },
                      duration: 8000,
                    });
                  } else {
                    toast.error(msg);
                  }
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
        description="Purchasing view of GRNs. Use Inventory Receipts as the canonical operations queue."
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
