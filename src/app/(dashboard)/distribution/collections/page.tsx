"use client";

import * as React from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { fetchCollectionsApi } from "@/lib/api/treasury-ops";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function DistributionCollectionsPage() {
  const terminology = useTerminology();
  const collectionLabel = t("collection", terminology);
  const [rows, setRows] = React.useState<Array<{ id: string; party: string; due: number; overdue: number; aging: string }>>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchCollectionsApi()
      .then((items) => {
        if (cancelled) return;
        setRows(items.map((item) => ({
          id: item.id,
          party: item.customerName,
          due: item.total,
          overdue: item.outstanding,
          aging: `${item.daysOverdue}+`,
        })));
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to load collections.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const columns = [
    { id: "party", header: "Party", accessor: (r: (typeof rows)[number]) => <span className="font-medium">{r.party}</span>, sticky: true },
    { id: "due", header: "Due", accessor: (r: (typeof rows)[number]) => `KES ${r.due.toLocaleString()}` },
    { id: "overdue", header: "Overdue", accessor: (r: (typeof rows)[number]) => `KES ${r.overdue.toLocaleString()}` },
    { id: "aging", header: "Aging", accessor: "aging" as keyof (typeof rows)[number] },
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
          <DataTable data={rows} columns={columns} emptyMessage={loading ? "Loading collections..." : "No collections."} />
        </CardContent>
      </Card>
    </PageLayout>
  );
}
