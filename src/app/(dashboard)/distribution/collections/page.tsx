"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import * as Icons from "lucide-react";

const MOCK = [
  { id: "1", party: "ABC Ltd", due: 45000, overdue: 0, aging: "Current" },
  { id: "2", party: "XYZ Co", due: 12000, overdue: 12000, aging: "30+" },
];

export default function DistributionCollectionsPage() {
  const terminology = useTerminology();
  const collectionLabel = t("collection", terminology);

  const columns = [
    { id: "party", header: "Party", accessor: (r: (typeof MOCK)[0]) => <span className="font-medium">{r.party}</span>, sticky: true },
    { id: "due", header: "Due", accessor: (r: (typeof MOCK)[0]) => `KES ${r.due.toLocaleString()}` },
    { id: "overdue", header: "Overdue", accessor: (r: (typeof MOCK)[0]) => `KES ${r.overdue.toLocaleString()}` },
    { id: "aging", header: "Aging", accessor: "aging" as keyof (typeof MOCK)[0] },
  ];

  return (
    <PageLayout
      title={`${collectionLabel}s`}
      description="Collections list and aging"
      actions={
        <Button>
          <Icons.Plus className="mr-2 h-4 w-4" />
          Record collection
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Collections</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable data={MOCK} columns={columns} emptyMessage="No collections." />
        </CardContent>
      </Card>
    </PageLayout>
  );
}
