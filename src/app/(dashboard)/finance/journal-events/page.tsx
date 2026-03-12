"use client";

import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";

const journalEventRows = [
  {
    trigger: "Commission run posted",
    linkedEntity: "COMM-2025-W03",
    debitAccount: "Commission Expense",
    creditAccount: "Commission Payable",
    amount: 145200,
    status: "Preview",
  },
  {
    trigger: "Top-up approved",
    linkedEntity: "TU-2025-001",
    debitAccount: "Franchise Support Expense",
    creditAccount: "Payables",
    amount: 3400,
    status: "Preview",
  },
];

export default function FinanceJournalEventsPage() {
  const columns = [
    { id: "trigger", header: "Operational trigger", accessor: (r: (typeof journalEventRows)[number]) => r.trigger, sticky: true },
    { id: "entity", header: "Linked entity", accessor: (r: (typeof journalEventRows)[number]) => r.linkedEntity },
    { id: "dr", header: "Debit", accessor: (r: (typeof journalEventRows)[number]) => r.debitAccount },
    { id: "cr", header: "Credit", accessor: (r: (typeof journalEventRows)[number]) => r.creditAccount },
    { id: "amount", header: "Amount", accessor: (r: (typeof journalEventRows)[number]) => r.amount.toLocaleString() },
    { id: "status", header: "Status", accessor: (r: (typeof journalEventRows)[number]) => r.status },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Journal Events"
        description="Preview conditional journal entries generated from operational events."
        breadcrumbs={[{ label: "Finance", href: "/finance/journals" }, { label: "Journal Events" }]}
        sticky
        showCommandHint
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Conditional journal preview</CardTitle>
            <CardDescription>Baseline view for finance controls; can be wired to backend event previews.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable data={journalEventRows} columns={columns} emptyMessage="No journal events." />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

