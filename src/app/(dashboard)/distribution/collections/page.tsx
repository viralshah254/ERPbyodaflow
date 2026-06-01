"use client";

import * as React from "react";
import {
  LIST_PAGE_BODY_CLASS,
  LIST_PAGE_SHELL_CLASS,
  LIST_TABLE_SURFACE_CLASS,
  PageShell,
} from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
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
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title={`${collectionLabel}s`}
        description="Collections list and aging"
        sticky
        showCommandHint
        actions={
          <Button>
            <Icons.Plus className="mr-2 h-4 w-4" />
            Record collection
          </Button>
        }
      />
      <div className={LIST_PAGE_BODY_CLASS}>
        <div className={LIST_TABLE_SURFACE_CLASS}>
          <div className="shrink-0 border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Collections</h3>
          </div>
          <DataTable
            data={rows}
            columns={columns}
            emptyMessage={loading ? "Loading collections..." : "No collections."}
            scrollMode="fill"
            size="comfortable"
            className="min-h-0 flex-1 border-0"
          />
        </div>
      </div>
    </PageShell>
  );
}
