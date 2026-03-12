"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import type { APPaymentRow } from "@/lib/mock/ap";
import { createApPayment, listApPayments } from "@/lib/data/ap-payments.repo";
import { downloadCsv } from "@/lib/export/csv";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function APPaymentsPage() {
  const [search, setSearch] = React.useState("");
  const [allRows, setAllRows] = React.useState<APPaymentRow[]>(() => listApPayments());

  const filtered = React.useMemo(() => {
    if (!search.trim()) return allRows;
    const q = search.trim().toLowerCase();
    return allRows.filter(
      (r) =>
        r.number.toLowerCase().includes(q) ||
        r.party.toLowerCase().includes(q)
    );
  }, [allRows, search]);

  const columns = React.useMemo(
    () => [
      {
        id: "number",
        header: "Number",
        accessor: (r: APPaymentRow) => <span className="font-medium">{r.number}</span>,
        sticky: true,
      },
      { id: "date", header: "Date", accessor: "date" as keyof APPaymentRow },
      { id: "party", header: "Supplier", accessor: "party" as keyof APPaymentRow },
      {
        id: "amount",
        header: "Amount",
        accessor: (r: APPaymentRow) => formatMoney(r.amount, "KES"),
      },
      {
        id: "status",
        header: "Status",
        accessor: (r: APPaymentRow) => (
          <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">
            {r.status}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <PageShell>
      <PageHeader
        title="AP Payments"
        description="Payments to suppliers"
        breadcrumbs={[
          { label: "Finance", href: "/finance" },
          { label: "AP Payments" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button
            onClick={() => {
              const created = createApPayment({ party: "Supplier settlement", amount: 0 });
              setAllRows(listApPayments());
              toast.success(`Supplier payment ${created.number} created.`);
            }}
          >
            <Icons.Plus className="mr-2 h-4 w-4" />
            Pay supplier
          </Button>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search by number, supplier..."
          searchValue={search}
          onSearchChange={setSearch}
          onExport={() =>
            downloadCsv(
              `ap-payments-${new Date().toISOString().slice(0, 10)}.csv`,
              filtered.map((row) => ({
                number: row.number,
                date: row.date,
                supplier: row.party,
                amount: row.amount,
                status: row.status,
              }))
            )
          }
        />
        <DataTable<APPaymentRow>
          data={filtered}
          columns={columns}
          emptyMessage="No payments yet."
        />
      </div>
    </PageShell>
  );
}
