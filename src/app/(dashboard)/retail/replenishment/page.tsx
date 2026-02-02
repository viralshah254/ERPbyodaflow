"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import * as Icons from "lucide-react";

const MOCK = [
  { id: "1", sku: "SKU-001", store: "Store A", suggested: 50, approved: false },
  { id: "2", sku: "SKU-002", store: "Store B", suggested: 30, approved: false },
];

export default function RetailReplenishmentPage() {
  const terminology = useTerminology();
  const replLabel = t("replenishment", terminology);

  const columns = [
    { id: "sku", header: "SKU", accessor: (r: (typeof MOCK)[0]) => <span className="font-medium">{r.sku}</span>, sticky: true },
    { id: "store", header: "Store", accessor: "store" as keyof (typeof MOCK)[0] },
    { id: "suggested", header: "Suggested qty", accessor: "suggested" as keyof (typeof MOCK)[0] },
    { id: "actions", header: "", accessor: (r: (typeof MOCK)[0]) => <Button size="sm" variant="outline">Approve</Button> },
  ];

  return (
    <PageLayout
      title={replLabel}
      description="Replenishment suggestions — review and approve"
      actions={
        <Button>
          <Icons.Check className="mr-2 h-4 w-4" />
          Approve selected
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Suggestions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable data={MOCK} columns={columns} emptyMessage="No suggestions." />
        </CardContent>
      </Card>
    </PageLayout>
  );
}
