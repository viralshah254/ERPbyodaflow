"use client";

import {
  LIST_PAGE_BODY_CLASS,
  LIST_PAGE_SHELL_CLASS,
  LIST_TABLE_SURFACE_CLASS,
  PageShell,
} from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import { useCanWriteDistribution } from "@/lib/rbac/use-write-guard";
import * as Icons from "lucide-react";

const MOCK = [
  { id: "1", number: "DEL-001", route: "North", date: "2025-01-28", status: "In progress" },
  { id: "2", number: "DEL-002", route: "South", date: "2025-01-27", status: "Completed" },
];

export default function DistributionDeliveriesPage() {
  const terminology = useTerminology();
  const canWrite = useCanWriteDistribution();
  const deliveryLabel = t("delivery", terminology);

  const columns = [
    { id: "number", header: "Number", accessor: (r: (typeof MOCK)[0]) => <span className="font-medium">{r.number}</span>, sticky: true },
    { id: "route", header: "Route", accessor: "route" as keyof (typeof MOCK)[0] },
    { id: "date", header: "Date", accessor: "date" as keyof (typeof MOCK)[0] },
    { id: "status", header: "Status", accessor: (r: (typeof MOCK)[0]) => <StatusBadge status={r.status} /> },
  ];

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title={`${deliveryLabel}s`}
        description="Deliveries list and status"
        sticky
        showCommandHint
        actions={
          canWrite && <Button>
            <Icons.Plus className="mr-2 h-4 w-4" />
            New delivery
          </Button>
        }
      />
      <div className={LIST_PAGE_BODY_CLASS}>
        <div className={LIST_TABLE_SURFACE_CLASS}>
          <div className="shrink-0 border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Deliveries</h3>
          </div>
          <DataTable
            data={MOCK}
            columns={columns}
            emptyMessage="No deliveries."
            scrollMode="fill"
            size="comfortable"
            className="min-h-0 flex-1 border-0"
          />
        </div>
      </div>
    </PageShell>
  );
}
