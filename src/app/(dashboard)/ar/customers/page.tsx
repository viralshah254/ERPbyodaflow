"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { EntityDrawer } from "@/components/masters/EntityDrawer";
import { EmptyState } from "@/components/ui/empty-state";
import { getMockARCustomers, type ARCustomerRow } from "@/lib/mock/ar";
import { formatMoney } from "@/lib/money";
import * as Icons from "lucide-react";

export default function ARCustomersPage() {
  const [search, setSearch] = React.useState("");
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const allRows = React.useMemo(() => getMockARCustomers(), []);
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
        accessor: (r: ARCustomerRow) => <span className="font-medium">{r.name}</span>,
        sticky: true,
      },
      { id: "email", header: "Email", accessor: "email" as keyof ARCustomerRow },
      {
        id: "creditLimit",
        header: "Credit limit",
        accessor: (r: ARCustomerRow) =>
          r.creditLimit != null ? formatMoney(r.creditLimit, "KES") : "—",
      },
      { id: "paymentTerms", header: "Payment terms", accessor: "paymentTerms" as keyof ARCustomerRow },
      {
        id: "status",
        header: "Status",
        accessor: (r: ARCustomerRow) => <StatusBadge status={r.status} />,
      },
    ],
    []
  );

  return (
    <PageShell>
      <PageHeader
        title="AR Customers"
        description="Customers with credit limit, payment terms, and AR settings"
        breadcrumbs={[
          { label: "Finance", href: "/finance" },
          { label: "AR Customers" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button onClick={() => { setEditingId(null); setDrawerOpen(true); }}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            Add customer
          </Button>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search customers..."
          searchValue={search}
          onSearchChange={setSearch}
          onExport={() => window.alert("Export (stub)")}
          actions={
            <Link
              href="/settings/customizer/fields"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Custom fields
            </Link>
          }
        />
        {filtered.length === 0 ? (
          <EmptyState
            icon="Users"
            title="No AR customers"
            description="Add customers with credit limit and payment terms."
            action={{
              label: "Add customer",
              onClick: () => setDrawerOpen(true),
            }}
          />
        ) : (
          <DataTable<ARCustomerRow>
            data={filtered}
            columns={columns}
            onRowClick={(row) => {
              setEditingId(row.id);
              setDrawerOpen(true);
            }}
            emptyMessage="No customers found."
          />
        )}
      </div>

      <EntityDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={editingId ? "Edit AR customer" : "New AR customer"}
        description={editingId ? "Update customer and AR settings." : "Add customer with credit limit, payment terms."}
        mode={editingId ? "edit" : "create"}
        duplicateWarning={!editingId ? "Possible duplicate: similar name (stub)." : undefined}
      >
        <div className="space-y-4 pr-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input placeholder="Customer name" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" placeholder="email@example.com" />
          </div>
          <div className="space-y-2">
            <Label>Credit limit</Label>
            <Input type="number" placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label>Payment terms</Label>
            <Input placeholder="e.g. Net 30" />
          </div>
          <div className="space-y-2">
            <Label>Currency preference</Label>
            <Input placeholder="e.g. KES" />
          </div>
          <div className="space-y-2">
            <Label>Tax PIN (stub)</Label>
            <Input placeholder="Optional" />
          </div>
        </div>
      </EntityDrawer>
    </PageShell>
  );
}
