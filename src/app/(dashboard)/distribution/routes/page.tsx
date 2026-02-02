"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import * as Icons from "lucide-react";

const MOCK = [
  { id: "1", name: "Route North", schedule: "Mon/Wed/Fri", outlets: 12, status: "Active" },
  { id: "2", name: "Route South", schedule: "Tue/Thu", outlets: 8, status: "Active" },
];

export default function DistributionRoutesPage() {
  const terminology = useTerminology();
  const routeLabel = t("route", terminology);

  const columns = [
    { id: "name", header: "Name", accessor: (r: (typeof MOCK)[0]) => <span className="font-medium">{r.name}</span>, sticky: true },
    { id: "schedule", header: "Schedule", accessor: "schedule" as keyof (typeof MOCK)[0] },
    { id: "outlets", header: "Outlets", accessor: "outlets" as keyof (typeof MOCK)[0] },
    { id: "status", header: "Status", accessor: "status" as keyof (typeof MOCK)[0] },
  ];

  return (
    <PageLayout
      title={`${routeLabel}s`}
      description="Route list and schedule"
      actions={
        <Button>
          <Icons.Plus className="mr-2 h-4 w-4" />
          New route
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Routes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable data={MOCK} columns={columns} emptyMessage="No routes." />
        </CardContent>
      </Card>
    </PageLayout>
  );
}
