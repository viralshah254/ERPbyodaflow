"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { getMockAPSuppliers, type APSupplierRow } from "@/lib/mock/ap";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function APSuppliersPage() {
  const [search, setSearch] = React.useState("");

  const allRows = React.useMemo(() => getMockAPSuppliers(), []);
  const filtered = React.useMemo(() => {
    if (!search.trim()) return allRows;
    const q = search.trim().toLowerCase();
    return allRows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.email?.toLowerCase().includes(q))
    );
  }, [allRows, search]);

  const columns = React.useMemo(
    () => [
      {
        id: "name",
        header: "Name",
        accessor: (r: APSupplierRow) => <span className="font-medium">{r.name}</span>,
        sticky: true,
      },
      { id: "email", header: "Email", accessor: "email" as keyof APSupplierRow },
      { id: "paymentTerms", header: "Payment terms", accessor: "paymentTerms" as keyof APSupplierRow },
      {
        id: "status",
        header: "Status",
        accessor: (r: APSupplierRow) => <StatusBadge status={r.status} />,
      },
    ],
    []
  );

  return (
    <PageShell>
      <PageHeader
        title="AP Suppliers"
        description="Suppliers and payment terms"
        breadcrumbs={[
          { label: "Finance", href: "/finance" },
          { label: "AP Suppliers" },
        ]}
        sticky
        showCommandHint
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search suppliers..."
          searchValue={search}
          onSearchChange={setSearch}
          onExport={() => toast.info("Export (stub)")}
        />
        <DataTable<APSupplierRow>
          data={filtered}
          columns={columns}
          emptyMessage="No suppliers found."
        />
      </div>
    </PageShell>
  );
}
