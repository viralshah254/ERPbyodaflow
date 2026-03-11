"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { DataTable } from "@/components/ui/data-table";
import { FiltersBar } from "@/components/ui/filters-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { RowActions } from "@/components/ui/row-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  listProducts,
  listVariants,
  listPackaging,
  createProduct,
} from "@/lib/data/products.repo";
import type { ProductRow } from "@/lib/mock/masters";
import { productDelete } from "@/lib/api/stub-endpoints";
import { toast } from "sonner";
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
  variantsCount: number;
  packagingCount: number;
}

function buildProductRow(row: ProductRow): Product {
  const variantsCount = listVariants(row.id).length;
  const packagingCount = listPackaging(row.id).length;

  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    category: row.category ?? "",
    stock: row.currentStock ?? 0,
    // Placeholder pricing/last updated until backend wiring
    price: 0,
    status: row.status === "ACTIVE" ? "Active" : row.status,
    lastUpdated: "",
    variantsCount,
    packagingCount,
  };
}

export default function ProductsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [rows, setRows] = React.useState<Product[]>([]);

  React.useEffect(() => {
    const products = listProducts().map(buildProductRow);
    setRows(products);
  }, []);

  const filteredProducts = React.useMemo(() => {
    return rows.filter((product) => {
      const matchesSearch =
        searchQuery === "" ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || product.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rows, searchQuery, statusFilter]);

  const handleView = (id: string) => {
    router.push(`/master/products/${id}`);
  };

  const handleEdit = (id: string) => {
    router.push(`/master/products/${id}`);
  };

  const handleDuplicate = (id: string) => {
    const all = listProducts();
    const original = all.find((p) => p.id === id);
    if (!original) {
      toast.error("Product not found.");
      return;
    }
    const { id: _id, ...rest } = original;
    const newSku = `${original.sku}-COPY`;
    const created = createProduct({ ...rest, sku: newSku });
    setRows((prev) => [...prev, buildProductRow(created)]);
    toast.success("Product duplicated (local only).");
  };

  const handleDelete = async (id: string) => {
    setRows((prev) => prev.filter((p) => p.id !== id));
    try {
      await productDelete(id);
      toast.success("Product deleted.");
    } catch (err) {
      const message = (err as Error).message === "STUB"
        ? "Delete (stub). Set NEXT_PUBLIC_API_URL to use backend."
        : (err as Error).message;
      toast.info(message);
    }
  };

  const columns = [
    {
      id: "name",
      header: "Product Name",
      accessor: (row: Product) => (
        <div className="space-y-1">
          <div className="font-medium">{row.name}</div>
          <div className="text-xs text-muted-foreground">{row.sku}</div>
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {row.variantsCount} variants
            </Badge>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {row.packagingCount} UOMs
            </Badge>
          </div>
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
              onClick: () => handleView(row.id),
            },
            {
              label: "Edit",
              icon: "Edit",
              onClick: () => handleEdit(row.id),
            },
            {
              label: "Duplicate",
              icon: "Copy",
              onClick: () => handleDuplicate(row.id),
            },
            {
              label: "Delete",
              icon: "Trash2",
              onClick: () => handleDelete(row.id),
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
        <Button onClick={() => router.push("/master/products")}>
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
                {filteredProducts.length} of {rows.length} products
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
            onRowClick={(row) => handleView(row.id)}
            emptyMessage="No products found. Create your first product to get started."
          />
        </CardContent>
      </Card>
    </PageLayout>
  );
}
