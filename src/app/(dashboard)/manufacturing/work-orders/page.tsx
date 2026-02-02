"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import * as Icons from "lucide-react";

const MOCK_WO = [
  { id: "1", number: "WO-001", bom: "Widget A", qty: 100, status: "Released", dueDate: "2025-02-01" },
  { id: "2", number: "WO-002", bom: "Widget B", qty: 50, status: "Draft", dueDate: "2025-02-05" },
];

export default function WorkOrdersPage() {
  const terminology = useTerminology();
  const woLabel = t("workOrder", terminology);

  const columns = [
    { id: "number", header: "Number", accessor: (r: (typeof MOCK_WO)[0]) => <span className="font-medium">{r.number}</span>, sticky: true },
    { id: "bom", header: "BOM", accessor: "bom" as keyof (typeof MOCK_WO)[0] },
    { id: "qty", header: "Qty", accessor: "qty" as keyof (typeof MOCK_WO)[0] },
    { id: "dueDate", header: "Due date", accessor: "dueDate" as keyof (typeof MOCK_WO)[0] },
    { id: "status", header: "Status", accessor: (r: (typeof MOCK_WO)[0]) => <StatusBadge status={r.status} /> },
  ];

  return (
    <PageLayout
      title={woLabel}
      description="Create, issue, and receive work orders"
      actions={
        <Button>
          <Icons.Plus className="mr-2 h-4 w-4" />
          New work order
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Work orders</CardTitle>
          <CardDescription>Wizard: Create → Issue → Receive (UI stubs)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable data={MOCK_WO} columns={columns} emptyMessage="No work orders." />
        </CardContent>
      </Card>
    </PageLayout>
  );
}
