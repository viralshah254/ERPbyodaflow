"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMockICTransactions, type ICTransactionRow } from "@/lib/mock/intercompany/transactions";
import { formatMoney } from "@/lib/money";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function IntercompanyTransactionsPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");

  const rows = React.useMemo(() => getMockICTransactions(), []);
  const filtered = React.useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        r.number.toLowerCase().includes(q) ||
        r.fromEntityName.toLowerCase().includes(q) ||
        r.toEntityName.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const columns = React.useMemo(
    () => [
      { id: "number", header: "Number", accessor: (r: ICTransactionRow) => <span className="font-medium">{r.number}</span>, sticky: true },
      { id: "type", header: "Type", accessor: (r: ICTransactionRow) => r.type.replace("_", " ") },
      { id: "date", header: "Date", accessor: "date" as keyof ICTransactionRow },
      { id: "from", header: "From", accessor: "fromEntityName" as keyof ICTransactionRow },
      { id: "to", header: "To", accessor: "toEntityName" as keyof ICTransactionRow },
      { id: "amount", header: "Amount", accessor: (r: ICTransactionRow) => formatMoney(r.amount, r.currency) },
      { id: "status", header: "Status", accessor: (r: ICTransactionRow) => <Badge variant={r.status === "POSTED" ? "secondary" : "outline"}>{r.status}</Badge> },
    ],
    []
  );

  const handleElimination = () => {
    toast.info("Generate elimination journal (stub). Would create draft JE.");
    router.push("/docs/journal/new");
  };

  return (
    <PageShell>
      <PageHeader
        title="IC Transactions"
        description="IC invoice, IC bill. Generate elimination journal (stub)."
        breadcrumbs={[
          { label: "Intercompany", href: "/intercompany/overview" },
          { label: "Transactions" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex items-center gap-2">
            <ExplainThis prompt="Explain IC invoice/bill and elimination journal." label="Explain IC transactions" />
            <Button variant="outline" size="sm" onClick={() => toast.info("Create IC invoice (stub).")}>
              IC Invoice
            </Button>
            <Button variant="outline" size="sm" onClick={() => toast.info("Create IC bill (stub).")}>
              IC Bill
            </Button>
            <Button size="sm" onClick={handleElimination}>
              <Icons.FileEdit className="mr-2 h-4 w-4" />
              Generate elimination journal
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/intercompany/overview">Overview</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search by number, entity..."
          searchValue={search}
          onSearchChange={setSearch}
          onExport={() => toast.info("Export (stub)")}
        />
        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>Create IC invoice / IC bill (stub). Generate elimination journal → /docs/journal/new.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable<ICTransactionRow>
              data={filtered}
              columns={columns}
              emptyMessage="No IC transactions."
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Consolidation report (stub)</CardTitle>
            <CardDescription>Consolidated P&L mock. Link to full report.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Consolidated P&L aggregates entity results. Use &quot;Generate elimination journal&quot; for IC balances. 
              <Button variant="link" className="h-auto p-0 ml-1" onClick={() => toast.info("Open consolidation report (stub).")}>
                View report
              </Button>
            </p>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
