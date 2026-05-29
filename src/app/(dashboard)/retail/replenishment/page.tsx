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
    { id: "actions", header: "", accessor: () => <Button size="sm" variant="outline">Approve</Button> },
  ];

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title={replLabel}
        description="Replenishment suggestions — review and approve"
        sticky
        showCommandHint
        actions={
          <Button>
            <Icons.Check className="mr-2 h-4 w-4" />
            Approve selected
          </Button>
        }
      />
      <div className={LIST_PAGE_BODY_CLASS}>
        <div className={LIST_TABLE_SURFACE_CLASS}>
          <div className="shrink-0 border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Suggestions</h3>
          </div>
          <DataTable
            data={MOCK}
            columns={columns}
            emptyMessage="No suggestions."
            scrollMode="fill"
            size="comfortable"
            className="min-h-0 flex-1 border-0"
          />
        </div>
      </div>
    </PageShell>
  );
}
