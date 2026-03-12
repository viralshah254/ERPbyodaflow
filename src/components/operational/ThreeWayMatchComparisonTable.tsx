"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";

export interface ThreeWayMatchRow {
  id: string;
  reference: string;
  sku: string;
  poKg: number | null;
  paidKg: number | null;
  receivedKg: number | null;
  varianceKg: number | null;
  status: string;
}

export interface ThreeWayMatchComparisonTableProps {
  rows: ThreeWayMatchRow[];
  title?: string;
  description?: string;
}

export function ThreeWayMatchComparisonTable({
  rows,
  title = "Three-Way Match",
  description = "Compare PO quantity, paid quantity, and physically received quantity.",
}: ThreeWayMatchComparisonTableProps) {
  const columns = [
    { id: "reference", header: "Reference", accessor: (row: ThreeWayMatchRow) => row.reference, sticky: true },
    { id: "sku", header: "SKU", accessor: (row: ThreeWayMatchRow) => row.sku },
    { id: "poKg", header: "PO kg", accessor: (row: ThreeWayMatchRow) => row.poKg ?? "—" },
    { id: "paidKg", header: "Paid kg", accessor: (row: ThreeWayMatchRow) => row.paidKg ?? "—" },
    { id: "receivedKg", header: "Received kg", accessor: (row: ThreeWayMatchRow) => row.receivedKg ?? "—" },
    { id: "varianceKg", header: "Variance kg", accessor: (row: ThreeWayMatchRow) => row.varianceKg ?? "—" },
    {
      id: "status",
      header: "Status",
      accessor: (row: ThreeWayMatchRow) => (
        <Badge variant={row.status === "MATCHED" ? "outline" : "destructive"}>{row.status}</Badge>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <DataTable<ThreeWayMatchRow> data={rows} columns={columns} emptyMessage="No three-way match rows." />
      </CardContent>
    </Card>
  );
}

