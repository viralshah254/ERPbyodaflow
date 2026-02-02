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

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  price: number;
  status: string;
  lastUpdated: string;
}

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  // Mock data - more realistic
  const products: Product[] = [
    {
      id: "1",
      name: "Premium Widget A",
      sku: "WID-A-001",
      category: "Electronics",
      stock: 150,
      price: 29.99,
      status: "Active",
      lastUpdated: "2024-01-20",
    },
    {
      id: "2",
      name: "Standard Widget B",
      sku: "WID-B-002",
      category: "Electronics",
      stock: 75,
      price: 39.99,
      status: "Active",
      lastUpdated: "2024-01-19",
    },
    {
      id: "3",
      name: "Component X",
      sku: "COMP-X-003",
      category: "Components",
      stock: 0,
      price: 15.50,
      status: "Out of Stock",
      lastUpdated: "2024-01-18",
    },
    {
      id: "4",
      name: "Assembly Kit Y",
      sku: "KIT-Y-004",
      category: "Kits",
      stock: 45,
      price: 89.99,
      status: "Active",
      lastUpdated: "2024-01-20",
    },
    {
      id: "5",
      name: "Raw Material Z",
      sku: "RAW-Z-005",
      category: "Raw Materials",
      stock: 12,
      price: 5.25,
      status: "Low Stock",
      lastUpdated: "2024-01-17",
    },
  ];

  const filteredProducts = React.useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        searchQuery === "" ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || product.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const columns = [
    {
      id: "name",
      header: "Product Name",
      accessor: (row: Product) => (
        <div>
          <div className="font-medium">{row.name}</div>
          <div className="text-xs text-muted-foreground">{row.sku}</div>
        </div>
      ),
      sticky: true,
    },
    {
      id: "category",
      header: "Category",
      accessor: "category" as keyof Product,
    },
    {
      id: "stock",
      header: "Stock",
      accessor: (row: Product) => (
        <div className="text-right">
          <div className="font-medium">{row.stock}</div>
          {row.stock < 20 && (
            <div className="text-xs text-destructive">Low stock</div>
          )}
        </div>
      ),
    },
    {
      id: "price",
      header: "Price",
      accessor: (row: Product) => (
        <div className="text-right font-medium">
          KES {row.price.toFixed(2)}
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessor: (row: Product) => <StatusBadge status={row.status} />,
    },
    {
      id: "lastUpdated",
      header: "Last Updated",
      accessor: "lastUpdated" as keyof Product,
    },
    {
      id: "actions",
      header: "",
      accessor: (row: Product) => (
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
              label: "Duplicate",
              icon: "Copy",
              onClick: () => console.log("Duplicate", row.id),
            },
            {
              label: "Delete",
              icon: "Trash2",
              onClick: () => console.log("Delete", row.id),
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
      title="Products"
      description="Manage your product catalog"
      actions={
        <Button>
          <Icons.Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      }
    >
      <Card>
        <FiltersBar
          searchPlaceholder="Search products by name or SKU..."
          onSearchChange={setSearchQuery}
          filters={[
            {
              id: "status",
              label: "Status",
              options: [
                { label: "All", value: "all" },
                { label: "Active", value: "Active" },
                { label: "Low Stock", value: "Low Stock" },
                { label: "Out of Stock", value: "Out of Stock" },
              ],
              value: statusFilter,
              onChange: setStatusFilter,
            },
            {
              id: "category",
              label: "Category",
              options: [
                { label: "All Categories", value: "all" },
                { label: "Electronics", value: "Electronics" },
                { label: "Components", value: "Components" },
                { label: "Kits", value: "Kits" },
                { label: "Raw Materials", value: "Raw Materials" },
              ],
            },
          ]}
          activeFiltersCount={
            statusFilter !== "all" ? 1 : 0
          }
          onClearFilters={() => setStatusFilter("all")}
        />
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Products</CardTitle>
              <CardDescription>
                {filteredProducts.length} of {products.length} products
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Icons.Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button variant="outline" size="sm">
                <Icons.Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={filteredProducts}
            columns={columns}
            onRowClick={(row) => console.log("Row clicked", row.id)}
            emptyMessage="No products found. Create your first product to get started."
          />
        </CardContent>
      </Card>
    </PageLayout>
  );
}
