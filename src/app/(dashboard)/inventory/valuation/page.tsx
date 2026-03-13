"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { fetchInventoryValuation } from "@/lib/api/inventory-costing";
import { toast } from "sonner";

export default function InventoryValuationPage() {
  const [valuationRows, setValuationRows] = React.useState<Array<{
    sku: string;
    productName: string;
    unitCost: number;
    stockQty: number;
    stockValue: number;
  }>>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchInventoryValuation()
      .then((payload) => {
        if (cancelled) return;
        setValuationRows(
          payload.rows.map((row) => ({
            sku: row.sku,
            productName: row.productName,
            unitCost: row.unitCost,
            stockQty: row.quantity,
            stockValue: row.inventoryValue,
          }))
        );
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to load valuation.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const columns = [
    { id: "sku", header: "SKU", accessor: (r: (typeof valuationRows)[number]) => r.sku, sticky: true },
    { id: "name", header: "Product", accessor: (r: (typeof valuationRows)[number]) => r.productName },
    { id: "unitCost", header: "Unit cost", accessor: (r: (typeof valuationRows)[number]) => r.unitCost.toLocaleString() },
    { id: "stock", header: "Stock qty", accessor: (r: (typeof valuationRows)[number]) => r.stockQty.toLocaleString() },
    { id: "value", header: "Stock value", accessor: (r: (typeof valuationRows)[number]) => r.stockValue.toLocaleString() },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Inventory Valuation"
        description="Cost layers with landed and processing impact by SKU."
        breadcrumbs={[{ label: "Inventory", href: "/inventory/costing" }, { label: "Valuation" }]}
        sticky
        showCommandHint
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Valuation layers</CardTitle>
            <CardDescription>Latest persisted valuation from the backend costing snapshot.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable data={valuationRows} columns={columns} emptyMessage={loading ? "Loading valuation..." : "No valuation rows."} />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

