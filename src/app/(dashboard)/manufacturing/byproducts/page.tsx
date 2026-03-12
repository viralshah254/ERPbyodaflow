"use client";

import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { MassBalanceChart } from "@/components/operational/MassBalanceChart";
import { YieldBreakdownCard } from "@/components/operational/YieldBreakdownCard";

const byproductRows = [
  { sku: "SKIN-001", productName: "Fish Skin", qtyKg: 180, valuationPerKg: 95, reservedKg: 40, destination: "Feed Processor" },
  { sku: "BONES-001", productName: "Fish Bones", qtyKg: 150, valuationPerKg: 80, reservedKg: 15, destination: "Byproduct Sales" },
  { sku: "WASTE-001", productName: "Fish Waste", qtyKg: 210, valuationPerKg: 25, reservedKg: 0, destination: "Rendering" },
];

export default function ManufacturingByproductsPage() {
  const columns = [
    { id: "sku", header: "SKU", accessor: (r: (typeof byproductRows)[number]) => r.sku, sticky: true },
    { id: "product", header: "Product", accessor: (r: (typeof byproductRows)[number]) => r.productName },
    { id: "qty", header: "Qty (kg)", accessor: (r: (typeof byproductRows)[number]) => r.qtyKg },
    { id: "reserved", header: "Reserved (kg)", accessor: (r: (typeof byproductRows)[number]) => r.reservedKg },
    { id: "valuation", header: "Valuation/kg", accessor: (r: (typeof byproductRows)[number]) => r.valuationPerKg.toLocaleString() },
    { id: "destination", header: "Destination", accessor: (r: (typeof byproductRows)[number]) => r.destination },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Byproducts"
        description="Track byproduct stock, valuation, reservation, and destination channel."
        breadcrumbs={[{ label: "Manufacturing", href: "/manufacturing/yield" }, { label: "Byproducts" }]}
        sticky
        showCommandHint
      />
      <div className="p-6">
        <div className="mb-6 grid gap-6 xl:grid-cols-2">
          <YieldBreakdownCard
            inputKg={720}
            primaryKg={530}
            secondaryKg={110}
            lossKg={80}
            serviceFeeTotal={56000}
          />
          <MassBalanceChart
            inputKg={720}
            outputKg={530}
            byproductKg={110}
            wasteKg={80}
            title="Byproduct Mass Balance"
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Byproduct inventory</CardTitle>
            <CardDescription>Reverse BOM outputs and salvage lines for operations and finance visibility.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable<(typeof byproductRows)[number]> data={byproductRows} columns={columns} emptyMessage="No byproduct rows." />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

