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
  fetchProductsApi,
  deleteProductApi,
} from "@/lib/api/products";
import { fetchProductCategoriesApi, type ItemCategoryRow } from "@/lib/api/product-categories";
import { setProductsCache } from "@/lib/data/products.repo";
import type { ProductRow } from "@/lib/types/masters";
import type { ProductKind } from "@/lib/products/product-type";
import { productTypeSortKey, rowMatchesProductTypeFilter } from "@/lib/products/product-type";
import { ProductTypeBadge } from "@/components/products/ProductTypeBadge";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";
import * as Icons from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string;
  productType?: ProductKind;
  category: string;
  stock: number;
  price: number;
  status: string;
  lastUpdated: string;
  variantsCount: number;
  packagingCount: number;
}

function buildProductRow(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    productType: row.productType,
    category: row.category ?? "",
    stock: row.currentStock ?? 0,
    // Until the products list returns richer pricing metadata, keep these read-only fields neutral.
    price: 0,
    status: row.status === "ACTIVE" ? "Active" : row.status,
    lastUpdated: "",
    variantsCount: 0,
    packagingCount: 0,
  };
}

export default function ProductsPage() {
  const router = useRouter();
  const permissions = useAuthStore((s) => s.permissions);
  const canDelete = permissions.includes("admin.settings");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [productTypeFilter, setProductTypeFilter] = React.useState<"all" | ProductKind>("all");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [rows, setRows] = React.useState<Product[]>([]);
  const [categories, setCategories] = React.useState<ItemCategoryRow[]>([]);
  // Map categoryId → display name for the table column
  const categoryNameById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categories) m.set(c.id, c.name);
    return m;
  }, [categories]);

  React.useEffect(() => {
    let active = true;
    void Promise.all([
      fetchProductsApi(),
      fetchProductCategoriesApi().catch(() => [] as ItemCategoryRow[]),
    ])
      .then(([products, cats]) => {
        if (!active) return;
        setCategories(cats);
        setProductsCache(products);
        setRows(products.map(buildProductRow));
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Failed to load products.");
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredProducts = React.useMemo(() => {
    return rows.filter((product) => {
      const matchesSearch =
        searchQuery === "" ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || product.status === statusFilter;
      const matchesCategory =
        categoryFilter === "all" || product.category === categoryFilter;
      const matchesType = rowMatchesProductTypeFilter(product.productType, productTypeFilter);
      return matchesSearch && matchesStatus && matchesCategory && matchesType;
    });
  }, [rows, searchQuery, statusFilter, categoryFilter, productTypeFilter]);

  const handleView = (id: string) => {
    router.push(`/master/products/${id}`);
  };

  const handleEdit = (id: string) => {
    router.push(`/master/products/${id}`);
  };

  const handleDuplicate = (id: string) => {
    router.push(`/master/products/${id}`);
  };

  const handleDelete = async (id: string) => {
    setRows((prev) => prev.filter((p) => p.id !== id));
    try {
      await deleteProductApi(id);
      toast.success("Product deleted.");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const columns = [
    {
      id: "name",
      header: "Product Name",
      sortable: true,
      sortValue: (row: Product) => row.name.toLowerCase(),
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
      id: "productType",
      header: "Product type",
      sortable: true,
      sortValue: (row: Product) => productTypeSortKey(row.productType),
      accessor: (row: Product) => <ProductTypeBadge type={row.productType} />,
    },
    {
      id: "category",
      header: "Category",
      sortable: true,
      sortValue: (row: Product) =>
        (categoryNameById.get(row.category) ?? row.category ?? "").toLowerCase(),
      accessor: (row: Product) => {
        const name = categoryNameById.get(row.category) ?? row.category;
        return name ? (
          <Badge variant="secondary" className="text-xs font-normal">{name}</Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        );
      },
    },
    {
      id: "stock",
      header: "Stock",
      sortable: true,
      sortValue: (row: Product) => row.stock,
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
      sortable: true,
      sortValue: (row: Product) => row.price,
      accessor: (row: Product) => (
        <div className="text-right font-medium">
          KES {row.price.toFixed(2)}
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortable: true,
      sortValue: (row: Product) => row.status.toLowerCase(),
      accessor: (row: Product) => <StatusBadge status={row.status} />,
    },
    {
      id: "lastUpdated",
      header: "Last Updated",
      sortable: true,
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
            ...(canDelete
              ? [
                  {
                    label: "Delete",
                    icon: "Trash2" as const,
                    onClick: () => handleDelete(row.id),
                    variant: "destructive" as const,
                  },
                ]
              : []),
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
              id: "productType",
              label: "Product type",
              options: [
                { label: "All types", value: "all" },
                { label: "Purchased product", value: "RAW" },
                { label: "Finished product", value: "FINISHED" },
                { label: "Stock product", value: "BOTH" },
              ],
              value: productTypeFilter,
              onChange: (v) => setProductTypeFilter(v as "all" | ProductKind),
            },
            {
              id: "category",
              label: "Category",
              options: [
                { label: "All Categories", value: "all" },
                ...categories.map((c) => ({ label: c.name, value: c.id })),
              ],
              value: categoryFilter,
              onChange: setCategoryFilter,
            },
          ]}
          activeFiltersCount={
            (statusFilter !== "all" ? 1 : 0) +
            (productTypeFilter !== "all" ? 1 : 0) +
            (categoryFilter !== "all" ? 1 : 0)
          }
          onClearFilters={() => {
            setStatusFilter("all");
            setProductTypeFilter("all");
            setCategoryFilter("all");
          }}
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
