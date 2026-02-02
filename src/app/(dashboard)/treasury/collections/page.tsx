"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getMockOverdueInvoices, type OverdueInvoiceRow } from "@/lib/mock/treasury/collections";
import { formatMoney } from "@/lib/money";
import { useCopilotStore } from "@/stores/copilot-store";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import Link from "next/link";
import * as Icons from "lucide-react";

export default function CollectionsPage() {
  const openWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);
  const [search, setSearch] = React.useState("");

  const rows = React.useMemo(() => getMockOverdueInvoices(), []);
  const filtered = React.useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        r.number.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const columns = React.useMemo(
    () => [
      { id: "number", header: "Invoice", accessor: (r: OverdueInvoiceRow) => <span className="font-medium">{r.number}</span>, sticky: true },
      { id: "customerName", header: "Customer", accessor: "customerName" as keyof OverdueInvoiceRow },
      {
        id: "outstanding",
        header: "Outstanding",
        accessor: (r: OverdueInvoiceRow) => formatMoney(r.outstanding, r.currency),
      },
      { id: "dueDate", header: "Due date", accessor: "dueDate" as keyof OverdueInvoiceRow },
      { id: "daysOverdue", header: "Days overdue", accessor: (r: OverdueInvoiceRow) => r.daysOverdue },
    ],
    []
  );

  return (
    <PageShell>
      <PageHeader
        title="Collections"
        description="Overdue invoices — reminders, record receipt"
        breadcrumbs={[
          { label: "Treasury", href: "/treasury/overview" },
          { label: "Collections" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex items-center gap-2">
            <ExplainThis prompt="Suggest collection actions and prioritization." label="Explain collections" />
            <Button variant="outline" size="sm" onClick={() => openWithPrompt("Send reminder for overdue invoice. Draft email.")}>
              <Icons.Mail className="mr-2 h-4 w-4" />
              Send reminder (Copilot)
            </Button>
            <Button size="sm" asChild>
              <Link href="/ar/payments">
                <Icons.CreditCard className="mr-2 h-4 w-4" />
                Record receipt
              </Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search by invoice, customer..."
          searchValue={search}
          onSearchChange={setSearch}
          onExport={() => window.alert("Export (stub)")}
        />
        <Card>
          <CardHeader>
            <CardTitle>Overdue invoices</CardTitle>
            <CardDescription>Send reminder (Copilot prefill). Record receipt → AR payments.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable<OverdueInvoiceRow>
              data={filtered}
              columns={columns}
              emptyMessage="No overdue invoices."
            />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
