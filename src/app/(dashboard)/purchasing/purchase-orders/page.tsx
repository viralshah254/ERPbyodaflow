"use client";

import * as React from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { DataTable } from "@/components/ui/data-table";
import { FiltersBar } from "@/components/ui/filters-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { RowActions } from "@/components/ui/row-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import * as Icons from "lucide-react";
import { format } from "date-fns";

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplier: string;
  orderDate: string;
  expectedDate: string;
  total: number;
  status: string;
  items: number;
}

export default function PurchaseOrdersPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  const orders: PurchaseOrder[] = [
    {
      id: "1",
      orderNumber: "PO-2024-001",
      supplier: "Supplier A",
      orderDate: "2024-01-15",
      expectedDate: "2024-01-25",
      total: 250000,
      status: "APPROVED",
      items: 8,
    },
    {
      id: "2",
      orderNumber: "PO-2024-002",
      supplier: "Supplier B",
      orderDate: "2024-01-16",
      expectedDate: "2024-01-28",
      total: 180000,
      status: "PENDING_APPROVAL",
      items: 5,
    },
    {
      id: "3",
      orderNumber: "PO-2024-003",
      supplier: "Supplier C",
      orderDate: "2024-01-17",
      expectedDate: "2024-01-30",
      total: 120000,
      status: "DRAFT",
      items: 3,
    },
  ];

  const filteredOrders = React.useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        searchQuery === "" ||
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.supplier.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const columns = [
    {
      id: "orderNumber",
      header: "PO Number",
      accessor: (row: PurchaseOrder) => (
        <div>
          <div className="font-medium">{row.orderNumber}</div>
          <div className="text-xs text-muted-foreground">
            {row.items} items
          </div>
        </div>
      ),
      sticky: true,
    },
    {
      id: "supplier",
      header: "Supplier",
      accessor: "supplier" as keyof PurchaseOrder,
    },
    {
      id: "orderDate",
      header: "Order Date",
      accessor: (row: PurchaseOrder) =>
        format(new Date(row.orderDate), "MMM dd, yyyy"),
    },
    {
      id: "expectedDate",
      header: "Expected Date",
      accessor: (row: PurchaseOrder) =>
        format(new Date(row.expectedDate), "MMM dd, yyyy"),
    },
    {
      id: "total",
      header: "Total",
      accessor: (row: PurchaseOrder) => (
        <div className="text-right font-semibold">
          KES {row.total.toLocaleString()}
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessor: (row: PurchaseOrder) => <StatusBadge status={row.status} />,
    },
    {
      id: "actions",
      header: "",
      accessor: (row: PurchaseOrder) => (
        <RowActions
          actions={[
            {
              label: "View",
              icon: "Eye",
              onClick: () => console.log("View", row.id),
            },
            {
              label: "Edit",
              icon: "Edit",
              onClick: () => console.log("Edit", row.id),
            },
            {
              label: "Receive Goods",
              icon: "PackageCheck",
              onClick: () => console.log("Receive", row.id),
            },
            {
              label: "Cancel",
              icon: "X",
              onClick: () => console.log("Cancel", row.id),
              variant: "destructive",
            },
          ]}
        />
      ),
      className: "w-[50px]",
    },
  ];

  return (
    <PageLayout
      title="Purchase Orders"
      description="Manage purchase orders and supplier orders"
      actions={
        <Button>
          <Icons.Plus className="mr-2 h-4 w-4" />
          Create PO
        </Button>
      }
    >
      <Card>
        <FiltersBar
          searchPlaceholder="Search by PO number or supplier..."
          onSearchChange={setSearchQuery}
          filters={[
            {
              id: "status",
              label: "Status",
              options: [
                { label: "All Statuses", value: "all" },
                { label: "Draft", value: "DRAFT" },
                { label: "Pending Approval", value: "PENDING_APPROVAL" },
                { label: "Approved", value: "APPROVED" },
                { label: "Processing", value: "PROCESSING" },
                { label: "Fulfilled", value: "FULFILLED" },
              ],
              value: statusFilter,
              onChange: setStatusFilter,
            },
          ]}
          activeFiltersCount={statusFilter !== "all" ? 1 : 0}
          onClearFilters={() => setStatusFilter("all")}
        />
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Purchase Orders</CardTitle>
              <CardDescription>
                {filteredOrders.length} of {orders.length} orders
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Icons.Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={filteredOrders}
            columns={columns}
            onRowClick={(row) => console.log("Row clicked", row.id)}
            emptyMessage="No purchase orders found. Create your first PO to get started."
          />
        </CardContent>
      </Card>
    </PageLayout>
  );
}
