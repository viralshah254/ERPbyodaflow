"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { PostingBatchSheet } from "@/components/finance/PostingBatchSheet";
import { StatusBadge } from "@/components/ui/status-badge";
import { format } from "date-fns";
import { downloadCsv } from "@/lib/export/csv";
import { formatMoney } from "@/lib/money";
import { useBaseCurrency } from "@/lib/org/useBaseCurrency";
import { fetchDocumentListApi } from "@/lib/api/documents";
import { toast } from "sonner";
import * as Icons from "lucide-react";

interface JournalEntry {
  id: string;
  journalNumber: string;
  date: string;
  memo?: string;
  reference?: string;
  totalDebit: number;
  totalCredit: number;
  status: string;
  postedBy?: string;
}

export default function JournalEntriesPage() {
  const baseCurrency = useBaseCurrency();
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<JournalEntry[]>([]);
  const [postingSource, setPostingSource] = React.useState<{ sourceType: string; sourceId: string } | null>(null);

  const refresh = React.useCallback(async () => {
    const docs = await fetchDocumentListApi("journal");
    setRows(
      docs.map((doc) => ({
        id: doc.id,
        journalNumber: doc.number,
        date: doc.date,
        memo: doc.reference,
        reference: doc.reference,
        totalDebit: doc.total ?? 0,
        totalCredit: doc.total ?? 0,
        status: doc.status,
      }))
    );
  }, []);

  React.useEffect(() => {
    setLoading(true);
    refresh()
      .catch((error) => toast.error((error as Error).message || "Failed to load journals."))
      .finally(() => setLoading(false));
  }, [refresh]);

  const filtered = React.useMemo(() => {
    let out = rows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter(
        (j) =>
          j.journalNumber.toLowerCase().includes(q) ||
          (j.memo ?? "").toLowerCase().includes(q) ||
          (j.reference ?? "").toLowerCase().includes(q)
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
        accessor: (row: JournalEntry) => format(new Date(row.date), "MMM dd, yyyy"),
      },
      { id: "memo", header: "Memo", accessor: (row: JournalEntry) => row.memo || "—" },
      {
        id: "debit",
        header: "Debit",
        accessor: (row: JournalEntry) => (
          <span className="font-medium">
            {formatMoney(row.totalDebit, baseCurrency)}
          </span>
        ),
      },
      {
        id: "credit",
        header: "Credit",
        accessor: (row: JournalEntry) => (
          <span className="font-medium">
            {formatMoney(row.totalCredit, baseCurrency)}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        accessor: (row: JournalEntry) => <StatusBadge status={row.status} />,
      },
      {
        id: "posting",
        header: "",
        accessor: (row: JournalEntry) => (
          <Button variant="ghost" size="sm" onClick={(event) => {
            event.stopPropagation();
            setPostingSource({ sourceType: "journal", sourceId: row.id });
          }}>
            Posting
          </Button>
        ),
      },
    ],
    [baseCurrency]
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
          onExport={() =>
            downloadCsv(
              `journal-entries-${new Date().toISOString().slice(0, 10)}.csv`,
              filtered.map((row) => ({
                journalNumber: row.journalNumber,
                date: row.date,
                memo: row.memo,
                reference: row.reference,
                totalDebit: row.totalDebit,
                totalCredit: row.totalCredit,
                status: row.status,
              }))
            )
          }
        />
        {loading ? (
          <div className="rounded border p-6 text-sm text-muted-foreground">Loading journal entries...</div>
        ) : (
          <DataTable<JournalEntry>
            data={filtered}
            columns={columns}
            onRowClick={(row) => router.push(`/docs/journal/${row.id}`)}
            emptyMessage="No journal entries. Create one to get started."
          />
        )}
      </div>
      <PostingBatchSheet
        open={!!postingSource}
        onOpenChange={(open) => {
          if (!open) setPostingSource(null);
        }}
        sourceType={postingSource?.sourceType}
        sourceId={postingSource?.sourceId}
      />
    </PageShell>
  );
}
