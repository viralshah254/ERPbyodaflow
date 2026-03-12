"use client";

import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";

const valuationRows = [
  { sku: "FILLET-001", costPerKg: 480, landedCostPerKg: 55, processingCostPerKg: 38, totalCostPerKg: 573, stockKg: 620 },
  { sku: "GUTTED-001", costPerKg: 360, landedCostPerKg: 48, processingCostPerKg: 24, totalCostPerKg: 432, stockKg: 410 },
  { sku: "BONES-001", costPerKg: 80, landedCostPerKg: 10, processingCostPerKg: 6, totalCostPerKg: 96, stockKg: 150 },
];

export default function InventoryValuationPage() {
  const columns = [
    { id: "sku", header: "SKU", accessor: (r: (typeof valuationRows)[number]) => r.sku, sticky: true },
    { id: "base", header: "Base cost/kg", accessor: (r: (typeof valuationRows)[number]) => r.costPerKg.toLocaleString() },
    { id: "landed", header: "Landed/kg", accessor: (r: (typeof valuationRows)[number]) => r.landedCostPerKg.toLocaleString() },
    { id: "processing", header: "Processing/kg", accessor: (r: (typeof valuationRows)[number]) => r.processingCostPerKg.toLocaleString() },
    { id: "total", header: "Total/kg", accessor: (r: (typeof valuationRows)[number]) => r.totalCostPerKg.toLocaleString() },
    { id: "stock", header: "Stock kg", accessor: (r: (typeof valuationRows)[number]) => r.stockKg.toLocaleString() },
    { id: "value", header: "Stock value", accessor: (r: (typeof valuationRows)[number]) => (r.totalCostPerKg * r.stockKg).toLocaleString() },
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
            <CardDescription>Current page uses static demo rows until costing APIs are wired end-to-end.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable data={valuationRows} columns={columns} emptyMessage="No valuation rows." />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

