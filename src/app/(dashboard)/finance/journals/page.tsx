"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { format } from "date-fns";
import * as Icons from "lucide-react";

interface JournalEntry {
  id: string;
  journalNumber: string;
  date: string;
  memo: string;
  reference: string;
  totalDebit: number;
  totalCredit: number;
  status: string;
  postedBy?: string;
}

const JOURNALS: JournalEntry[] = [
  { id: "1", journalNumber: "JE-2024-001", date: "2024-01-20", memo: "Monthly depreciation", reference: "DEP-2024-01", totalDebit: 50000, totalCredit: 50000, status: "POSTED", postedBy: "Admin User" },
  { id: "2", journalNumber: "JE-2024-002", date: "2024-01-19", memo: "Bank charges", reference: "BANK-001", totalDebit: 2500, totalCredit: 2500, status: "POSTED", postedBy: "Admin User" },
  { id: "3", journalNumber: "JE-2024-003", date: "2024-01-18", memo: "Accrued expenses", reference: "ACC-001", totalDebit: 15000, totalCredit: 15000, status: "DRAFT" },
];

export default function JournalEntriesPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");

  const filtered = React.useMemo(() => {
    let out = JOURNALS;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter(
        (j) =>
          j.journalNumber.toLowerCase().includes(q) ||
          j.memo.toLowerCase().includes(q) ||
          j.reference.toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      out = out.filter((j) => j.status === statusFilter);
    }
    return out;
  }, [search, statusFilter]);

  const columns = React.useMemo(
    () => [
      {
        id: "journalNumber",
        header: "Number",
        accessor: (row: JournalEntry) => (
          <div>
            <span className="font-medium">{row.journalNumber}</span>
            <div className="text-xs text-muted-foreground">{row.reference}</div>
          </div>
        ),
        sticky: true,
      },
      {
        id: "date",
        header: "Date",
        accessor: (row: JournalEntry) =>
          format(new Date(row.date), "MMM dd, yyyy"),
      },
      { id: "memo", header: "Memo", accessor: "memo" as keyof JournalEntry },
      {
        id: "debit",
        header: "Debit",
        accessor: (row: JournalEntry) => (
          <span className="font-medium">
            KES {row.totalDebit.toLocaleString()}
          </span>
        ),
      },
      {
        id: "credit",
        header: "Credit",
        accessor: (row: JournalEntry) => (
          <span className="font-medium">
            KES {row.totalCredit.toLocaleString()}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        accessor: (row: JournalEntry) => <StatusBadge status={row.status} />,
      },
    ],
    []
  );

  return (
    <PageShell>
      <PageHeader
        title="Journal Entries"
        description="Create and manage journal entries"
        breadcrumbs={[
          { label: "Finance", href: "/finance" },
          { label: "Journal Entries" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button asChild>
            <Link href="/docs/journal/new">
              <Icons.Plus className="mr-2 h-4 w-4" />
              Create Journal
            </Link>
          </Button>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search by number, memo, reference..."
          searchValue={search}
          onSearchChange={setSearch}
          filters={[
            {
              id: "status",
              label: "Status",
              options: [
                { label: "All", value: "" },
                { label: "Draft", value: "DRAFT" },
                { label: "Posted", value: "POSTED" },
              ],
              value: statusFilter,
              onChange: (v) => setStatusFilter(v),
            },
          ]}
          onExport={() => window.alert("Export (stub)")}
        />
        <DataTable<JournalEntry>
          data={filtered}
          columns={columns}
          onRowClick={(row) => router.push(`/docs/journal/${row.id}`)}
          emptyMessage="No journal entries. Create one to get started."
        />
      </div>
    </PageShell>
  );
}
