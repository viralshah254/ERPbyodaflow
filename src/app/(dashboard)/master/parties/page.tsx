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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { EntityDrawer } from "@/components/masters/EntityDrawer";
import { EmptyState } from "@/components/ui/empty-state";
import { getMockParties, type PartyRow } from "@/lib/mock/masters";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import * as Icons from "lucide-react";

export default function MasterPartiesPage() {
  const terminology = useTerminology();
  const customerLabel = t("customer", terminology);
  const supplierLabel = t("supplier", terminology);

  const [tab, setTab] = React.useState<"customers" | "suppliers">("customers");
  const [search, setSearch] = React.useState("");
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const customers = React.useMemo(() => getMockParties("customer"), []);
  const suppliers = React.useMemo(() => getMockParties("supplier"), []);

  const filteredCustomers = React.useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.trim().toLowerCase();
    return customers.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.email?.toLowerCase().includes(q))
    );
  }, [customers, search]);

  const filteredSuppliers = React.useMemo(() => {
    if (!search.trim()) return suppliers;
    const q = search.trim().toLowerCase();
    return suppliers.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.email?.toLowerCase().includes(q))
    );
  }, [suppliers, search]);

  const columns = React.useMemo(
    () => [
      {
        id: "name",
        header: "Name",
        accessor: (r: PartyRow) => <span className="font-medium">{r.name}</span>,
        sticky: true,
      },
      { id: "email", header: "Email", accessor: "email" as keyof PartyRow },
      { id: "phone", header: "Phone", accessor: "phone" as keyof PartyRow },
      {
        id: "status",
        header: "Status",
        accessor: (r: PartyRow) => <StatusBadge status={r.status} />,
      },
    ],
    []
  );

  const label = tab === "customers" ? customerLabel : supplierLabel;
  const data = tab === "customers" ? filteredCustomers : filteredSuppliers;

  return (
    <PageShell>
      <PageHeader
        title="Parties"
        description={`${customerLabel}s and ${supplierLabel}s`}
        breadcrumbs={[
          { label: "Masters", href: "/master" },
          { label: "Parties" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button
            onClick={() => {
              setEditingId(null);
              setDrawerOpen(true);
            }}
          >
            <Icons.Plus className="mr-2 h-4 w-4" />
            Add {label}
          </Button>
        }
      />
      <div className="p-6 space-y-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "customers" | "suppliers")}>
          <TabsList>
            <TabsTrigger value="customers">{customerLabel}s</TabsTrigger>
            <TabsTrigger value="suppliers">{supplierLabel}s</TabsTrigger>
          </TabsList>
          <TabsContent value="customers" className="mt-4 space-y-4">
            <DataTableToolbar
              searchPlaceholder={`Search ${customerLabel.toLowerCase()}s...`}
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
            {filteredCustomers.length === 0 ? (
              <EmptyState
                icon="Users"
                title={`No ${customerLabel.toLowerCase()}s`}
                description="Add your first customer."
                action={{
                  label: `Add ${customerLabel}`,
                  onClick: () => setDrawerOpen(true),
                }}
              />
            ) : (
              <DataTable<PartyRow>
                data={filteredCustomers}
                columns={columns}
                onRowClick={(row) => {
                  setEditingId(row.id);
                  setDrawerOpen(true);
                }}
                emptyMessage={`No ${customerLabel.toLowerCase()}s.`}
              />
            )}
          </TabsContent>
          <TabsContent value="suppliers" className="mt-4 space-y-4">
            <DataTableToolbar
              searchPlaceholder={`Search ${supplierLabel.toLowerCase()}s...`}
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
            {filteredSuppliers.length === 0 ? (
              <EmptyState
                icon="Building2"
                title={`No ${supplierLabel.toLowerCase()}s`}
                description="Add your first supplier."
                action={{
                  label: `Add ${supplierLabel}`,
                  onClick: () => setDrawerOpen(true),
                }}
              />
            ) : (
              <DataTable<PartyRow>
                data={filteredSuppliers}
                columns={columns}
                onRowClick={(row) => {
                  setEditingId(row.id);
                  setDrawerOpen(true);
                }}
                emptyMessage={`No ${supplierLabel.toLowerCase()}s.`}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <EntityDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={editingId ? `Edit ${label}` : `New ${label}`}
        description={editingId ? `Update ${label.toLowerCase()} details.` : `Add a new ${label.toLowerCase()}.`}
        mode={editingId ? "edit" : "create"}
        duplicateWarning={!editingId ? `Possible duplicate: similar name exists (stub).` : undefined}
      >
        <div className="space-y-4 pr-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input placeholder="Party name" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" placeholder="email@example.com" />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input placeholder="Phone" />
          </div>
        </div>
      </EntityDrawer>
    </PageShell>
  );
}
