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

interface StockItem {
  id: string;
  sku: string;
  name: string;
  warehouse: string;
  location: string;
  quantity: number;
  reserved: number;
  available: number;
  reorderLevel: number;
  status: string;
}

export default function StockLevelsPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [warehouseFilter, setWarehouseFilter] = React.useState<string>("all");

  const stockItems: StockItem[] = [
    {
      id: "1",
      sku: "WID-A-001",
      name: "Premium Widget A",
      warehouse: "Main Warehouse",
      location: "A-01-02",
      quantity: 150,
      reserved: 25,
      available: 125,
      reorderLevel: 50,
      status: "In Stock",
    },
    {
      id: "2",
      sku: "WID-B-002",
      name: "Standard Widget B",
      warehouse: "Main Warehouse",
      location: "A-02-03",
      quantity: 75,
      reserved: 10,
      available: 65,
      reorderLevel: 100,
      status: "Low Stock",
    },
    {
      id: "3",
      sku: "COMP-X-003",
      name: "Component X",
      warehouse: "Main Warehouse",
      location: "B-01-01",
      quantity: 0,
      reserved: 0,
      available: 0,
      reorderLevel: 20,
      status: "Out of Stock",
    },
    {
      id: "4",
      sku: "KIT-Y-004",
      name: "Assembly Kit Y",
      warehouse: "Secondary Warehouse",
      location: "C-03-05",
      quantity: 45,
      reserved: 5,
      available: 40,
      reorderLevel: 30,
      status: "In Stock",
    },
  ];

  const filteredItems = React.useMemo(() => {
    return stockItems.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesWarehouse =
        warehouseFilter === "all" || item.warehouse === warehouseFilter;
      return matchesSearch && matchesWarehouse;
    });
  }, [searchQuery, warehouseFilter]);

  const columns = [
    {
      id: "sku",
      header: "SKU",
      accessor: (row: StockItem) => (
        <div>
          <div className="font-medium">{row.sku}</div>
          <div className="text-xs text-muted-foreground">{row.name}</div>
        </div>
      ),
      sticky: true,
    },
    {
      id: "warehouse",
      header: "Warehouse",
      accessor: "warehouse" as keyof StockItem,
    },
    {
      id: "location",
      header: "Location",
      accessor: "location" as keyof StockItem,
    },
    {
      id: "quantity",
      header: "Quantity",
      accessor: (row: StockItem) => (
        <div className="text-right font-medium">{row.quantity}</div>
      ),
    },
    {
      id: "reserved",
      header: "Reserved",
      accessor: (row: StockItem) => (
        <div className="text-right text-muted-foreground">{row.reserved}</div>
      ),
    },
    {
      id: "available",
      header: "Available",
      accessor: (row: StockItem) => (
        <div className="text-right font-semibold">{row.available}</div>
      ),
    },
    {
      id: "reorderLevel",
      header: "Reorder Level",
      accessor: (row: StockItem) => (
        <div className="text-right">{row.reorderLevel}</div>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessor: (row: StockItem) => <StatusBadge status={row.status} />,
    },
    {
      id: "actions",
      header: "",
      accessor: (row: StockItem) => (
        <RowActions
          actions={[
            {
              label: "View Details",
              icon: "Eye",
              onClick: () => console.log("View", row.id),
            },
            {
              label: "Adjust Stock",
              icon: "Edit",
              onClick: () => console.log("Adjust", row.id),
            },
            {
              label: "Transfer",
              icon: "ArrowLeftRight",
              onClick: () => console.log("Transfer", row.id),
            },
          ]}
        />
      ),
      className: "w-[50px]",
    },
  ];

  return (
    <PageLayout
      title="Stock Levels"
      description="View current inventory levels across all warehouses"
      actions={
        <>
          <Button variant="outline">
            <Icons.Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button>
            <Icons.Plus className="mr-2 h-4 w-4" />
            Stock Adjustment
          </Button>
        </>
      }
    >
      <Card>
        <FiltersBar
          searchPlaceholder="Search by SKU or product name..."
          onSearchChange={setSearchQuery}
          filters={[
            {
              id: "warehouse",
              label: "Warehouse",
              options: [
                { label: "All Warehouses", value: "all" },
                { label: "Main Warehouse", value: "Main Warehouse" },
                {
                  label: "Secondary Warehouse",
                  value: "Secondary Warehouse",
                },
              ],
              value: warehouseFilter,
              onChange: setWarehouseFilter,
            },
            {
              id: "status",
              label: "Status",
              options: [
                { label: "All Statuses", value: "all" },
                { label: "In Stock", value: "In Stock" },
                { label: "Low Stock", value: "Low Stock" },
                { label: "Out of Stock", value: "Out of Stock" },
              ],
            },
          ]}
          activeFiltersCount={warehouseFilter !== "all" ? 1 : 0}
          onClearFilters={() => setWarehouseFilter("all")}
        />
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Stock Levels</CardTitle>
              <CardDescription>
                {filteredItems.length} items across all locations
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={filteredItems}
            columns={columns}
            onRowClick={(row) => console.log("Row clicked", row.id)}
            emptyMessage="No stock items found."
          />
        </CardContent>
      </Card>
    </PageLayout>
  );
}
