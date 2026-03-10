"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { DataTable } from "@/components/ui/data-table";
import { FiltersBar } from "@/components/ui/filters-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { RowActions } from "@/components/ui/row-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getMockStock, type StockRow } from "@/lib/mock/stock";
import * as Icons from "lucide-react";

export default function StockLevelsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [warehouseFilter, setWarehouseFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  const stockItems = React.useMemo(() => getMockStock(), []);

  const filteredItems = React.useMemo(() => {
    return stockItems.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesWarehouse =
        warehouseFilter === "all" || item.warehouse === warehouseFilter;
      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;
      return matchesSearch && matchesWarehouse && matchesStatus;
    });
  }, [stockItems, searchQuery, warehouseFilter, statusFilter]);

  const openStockDetail = (row: StockRow) => {
    router.push(`/inventory/stock-levels/${row.id}`);
  };

  const columns = [
    {
      id: "sku",
      header: "SKU",
      accessor: (row: StockRow) => (
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
      accessor: (row: StockRow) => row.warehouse,
    },
    {
      id: "location",
      header: "Location",
      accessor: (row: StockRow) => row.location ?? "—",
    },
    {
      id: "quantity",
      header: "Quantity",
      accessor: (row: StockRow) => (
        <div className="text-right font-medium">{row.quantity}</div>
      ),
    },
    {
      id: "reserved",
      header: "Reserved",
      accessor: (row: StockRow) => (
        <div className="text-right text-muted-foreground">{row.reserved}</div>
      ),
    },
    {
      id: "available",
      header: "Available",
      accessor: (row: StockRow) => (
        <div className="text-right font-semibold">{row.available}</div>
      ),
    },
    {
      id: "reorderLevel",
      header: "Reorder Level",
      accessor: (row: StockRow) => (
        <div className="text-right">{row.reorderLevel}</div>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessor: (row: StockRow) => <StatusBadge status={row.status} />,
    },
    {
      id: "actions",
      header: "",
      accessor: (row: StockRow) => (
        <RowActions
          actions={[
            {
              label: "View Details",
              icon: "Eye",
              onClick: (e) => { e?.stopPropagation?.(); openStockDetail(row); },
            },
            {
              label: "Adjust Stock",
              icon: "Edit",
              onClick: (e) => { e?.stopPropagation?.(); router.push(`/inventory/stock-levels?adjust=${row.id}`); },
            },
            {
              label: "Transfer",
              icon: "ArrowLeftRight",
              onClick: (e) => { e?.stopPropagation?.(); router.push(`/inventory/transfers?from=${row.id}`); },
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
                { label: "WH-Main", value: "WH-Main" },
                { label: "WH-East", value: "WH-East" },
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
              value: statusFilter,
              onChange: setStatusFilter,
            },
          ]}
          activeFiltersCount={[warehouseFilter, statusFilter].filter((v) => v !== "all").length}
          onClearFilters={() => { setWarehouseFilter("all"); setStatusFilter("all"); }}
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
            onRowClick={(row) => openStockDetail(row)}
            emptyMessage="No stock items found."
          />
        </CardContent>
      </Card>
    </PageLayout>
  );
}
