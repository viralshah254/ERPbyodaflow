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
import { fetchGRNs, postGRN } from "@/lib/api/grn";
import type { PurchasingDocRow } from "@/lib/types/purchasing";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function GoodsReceiptPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
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
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => [row.number, row.poRef ?? "", row.warehouse ?? "", row.status].join(" ").toLowerCase().includes(q));
  }, [rows, search]);

  const columns = React.useMemo(
    () => [
      { id: "number", header: "Number", accessor: (row: PurchasingDocRow) => <span className="font-medium">{row.number}</span> },
      { id: "date", header: "Date", accessor: "date" as keyof PurchasingDocRow },
      { id: "poRef", header: "PO reference", accessor: (row: PurchasingDocRow) => row.poRef || "—" },
      { id: "warehouse", header: "Warehouse", accessor: (row: PurchasingDocRow) => row.warehouse || "—" },
      { id: "status", header: "Status", accessor: "status" as keyof PurchasingDocRow },
      {
        id: "actions",
        header: "Actions",
        accessor: (row: PurchasingDocRow) => (
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
        ),
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
        <DataTableToolbar searchPlaceholder="Search GRNs..." searchValue={search} onSearchChange={setSearch} />
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
