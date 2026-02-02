"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import * as Icons from "lucide-react";

const MOCK = [
  { id: "1", number: "DEL-001", route: "North", date: "2025-01-28", status: "In progress" },
  { id: "2", number: "DEL-002", route: "South", date: "2025-01-27", status: "Completed" },
];

export default function DistributionDeliveriesPage() {
  const terminology = useTerminology();
  const deliveryLabel = t("delivery", terminology);

  const columns = [
    { id: "number", header: "Number", accessor: (r: (typeof MOCK)[0]) => <span className="font-medium">{r.number}</span>, sticky: true },
    { id: "route", header: "Route", accessor: "route" as keyof (typeof MOCK)[0] },
    { id: "date", header: "Date", accessor: "date" as keyof (typeof MOCK)[0] },
    { id: "status", header: "Status", accessor: (r: (typeof MOCK)[0]) => <StatusBadge status={r.status} /> },
  ];

  return (
    <PageLayout
      title={`${deliveryLabel}s`}
      description="Deliveries list and status"
      actions={
        <Button>
          <Icons.Plus className="mr-2 h-4 w-4" />
          New delivery
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Deliveries</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable data={MOCK} columns={columns} emptyMessage="No deliveries." />
        </CardContent>
      </Card>
    </PageLayout>
  );
}
