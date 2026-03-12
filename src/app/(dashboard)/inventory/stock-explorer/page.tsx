"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { getMockStock, type StockRow } from "@/lib/mock/stock";

type ExplorerRow = StockRow & {
  ownership: "CoolCatch" | "Franchise";
  ageDays: number;
};

export default function InventoryStockExplorerPage() {
  const [rows] = React.useState<ExplorerRow[]>(
    getMockStock().map((r, idx) => ({
      ...r,
      ownership: idx % 3 === 0 ? "Franchise" : "CoolCatch",
      ageDays: 2 + ((idx * 3) % 12),
    }))
  );

  const columns = [
    { id: "sku", header: "SKU", accessor: (r: ExplorerRow) => r.sku, sticky: true },
    { id: "name", header: "Product", accessor: (r: ExplorerRow) => r.name },
    { id: "warehouse", header: "Location", accessor: (r: ExplorerRow) => `${r.warehouse}${r.location ? ` / ${r.location}` : ""}` },
    { id: "ownership", header: "Ownership", accessor: (r: ExplorerRow) => r.ownership },
    { id: "qty", header: "On hand", accessor: (r: ExplorerRow) => r.quantity },
    { id: "reserved", header: "Reserved", accessor: (r: ExplorerRow) => r.reserved },
    { id: "available", header: "Available", accessor: (r: ExplorerRow) => r.available },
    { id: "age", header: "Age (days)", accessor: (r: ExplorerRow) => r.ageDays },
    { id: "status", header: "Status", accessor: (r: ExplorerRow) => r.status },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Stock Explorer"
        description="Global stock view by SKU, location, ownership, reserved status, and age."
        breadcrumbs={[{ label: "Inventory", href: "/inventory/stock-levels" }, { label: "Stock Explorer" }]}
        sticky
        showCommandHint
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Global stock explorer</CardTitle>
            <CardDescription>Phase 1 baseline with mocked dimensions; can be switched to API-backed filters later.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable data={rows} columns={columns} emptyMessage="No stock rows." />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

