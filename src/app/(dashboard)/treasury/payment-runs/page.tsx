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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  type BillDueRow,
  type PaymentRunRow,
  type PaymentMethod,
} from "@/lib/types/treasury";
import {
  createPaymentRunApi,
  fetchBankAccountsApi,
  fetchBillsDueApi,
  fetchPaymentRunsApi,
} from "@/lib/api/treasury-ops";
import { formatMoney } from "@/lib/money";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { downloadCsv } from "@/lib/export/csv";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  BANK_TRANSFER: "Bank transfer",
  M_PESA: "M-Pesa",
  CHEQUE: "Cheque",
};

function statusVariant(s: string): "default" | "secondary" | "outline" {
  if (s === "APPROVED" || s === "PROCESSED") return "secondary";
  if (s === "DRAFT") return "outline";
  return "default";
}

function exportPaymentRunCSV(bills: BillDueRow[], method: PaymentMethod) {
  const headers = ["Supplier", "Bill", "Amount", "Currency", "Method"];
  const rows = bills.map((b) => [b.supplier, b.number, b.total, b.currency, METHOD_LABELS[method]].join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `payment-run-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PaymentRunsPage() {
  const router = useRouter();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [selectedBills, setSelectedBills] = React.useState<Set<string>>(new Set());
  const [method, setMethod] = React.useState<PaymentMethod>("BANK_TRANSFER");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [bankAccountId, setBankAccountId] = React.useState("");
  const [bankAccounts, setBankAccounts] = React.useState<Array<{ id: string; name: string; currency: string }>>([]);
  const [runs, setRuns] = React.useState<PaymentRunRow[]>([]);
  const [billsDue, setBillsDue] = React.useState<BillDueRow[]>([]);

  const refreshRuns = React.useCallback(async () => {
    const [nextRuns, nextBills, nextBanks] = await Promise.all([
      fetchPaymentRunsApi(),
      fetchBillsDueApi(),
      fetchBankAccountsApi(),
    ]);
    setRuns(nextRuns);
    setBillsDue(nextBills);
    setBankAccounts(nextBanks.map((account) => ({ id: account.id, name: account.name, currency: account.currency })));
    setBankAccountId((current) => current || nextBanks[0]?.id || "");
  }, []);

  React.useEffect(() => {
    setLoading(true);
    refreshRuns()
      .catch((error) => toast.error((error as Error).message || "Failed to load payment runs."))
      .finally(() => setLoading(false));
  }, [refreshRuns]);

  const toggleBill = (id: string) => {
    setSelectedBills((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedBillRows = billsDue.filter((b) => selectedBills.has(b.id));
  const totalSelected = selectedBillRows.reduce((s, b) => s + b.total, 0);

  const handleGenerateCSV = () => {
    if (selectedBillRows.length === 0) {
      toast.info("Select at least one bill.");
      return;
    }
    exportPaymentRunCSV(selectedBillRows, method);
  };

  const handleRequestApproval = async () => {
    if (!bankAccountId) {
      toast.error("Select a bank account.");
      return;
    }
    setSaving(true);
    try {
      await createPaymentRunApi({ bankAccountId, paymentMethod: method, bills: selectedBillRows });
      await refreshRuns();
      toast.success("Payment run submitted for approval.");
      setCreateOpen(false);
      setSelectedBills(new Set());
    } catch (error) {
      toast.error((error as Error).message || "Failed to create payment run.");
    } finally {
      setSaving(false);
    }
  };

  const columns = React.useMemo(
    () => [
      { id: "number", header: "Number", accessor: (r: PaymentRunRow) => <span className="font-medium">{r.number}</span>, sticky: true },
      { id: "date", header: "Date", accessor: "date" as keyof PaymentRunRow },
      {
        id: "total",
        header: "Total",
        accessor: (r: PaymentRunRow) => formatMoney(r.totalAmount, r.currency),
      },
      { id: "suppliers", header: "Suppliers", accessor: (r: PaymentRunRow) => r.supplierCount },
      { id: "bills", header: "Bills", accessor: (r: PaymentRunRow) => r.billCount },
      { id: "method", header: "Method", accessor: (r: PaymentRunRow) => METHOD_LABELS[r.paymentMethod] },
      {
        id: "status",
        header: "Status",
        accessor: (r: PaymentRunRow) => <Badge variant={statusVariant(r.status)}>{r.status.replace("_", " ")}</Badge>,
      },
    ],
    []
  );

  return (
    <PageShell>
      <PageHeader
        title="Payment runs"
        description="AP payment runs — select bills, generate files"
        breadcrumbs={[
          { label: "Treasury", href: "/treasury/overview" },
          { label: "Payment runs" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex items-center gap-2">
            <ExplainThis prompt="Explain payment runs, bank files, and approval flow." label="Explain payment runs" />
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              New payment run
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search runs..."
          onExport={() =>
            downloadCsv(
              `payment-runs-${new Date().toISOString().slice(0, 10)}.csv`,
              runs.map((row) => ({
                number: row.number,
                date: row.date,
                totalAmount: row.totalAmount,
                currency: row.currency,
                supplierCount: row.supplierCount,
                billCount: row.billCount,
                method: METHOD_LABELS[row.paymentMethod],
                status: row.status,
              }))
            )
          }
        />
        <Card>
          <CardHeader>
            <CardTitle>Runs</CardTitle>
            <CardDescription>Select bills, group by supplier/currency, choose method, and generate payment files.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable<PaymentRunRow>
              data={runs}
              columns={columns}
              onRowClick={(r) => router.push(`/treasury/payment-runs/${r.id}`)}
              emptyMessage="No payment runs."
            />
            {loading ? <p className="px-4 pb-4 text-sm text-muted-foreground">Loading payment runs...</p> : null}
          </CardContent>
        </Card>
      </div>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>New payment run</SheetTitle>
            <SheetDescription>Select supplier bills due. Group by supplier/currency. Choose method. Generate file.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <span className="text-sm font-medium">Bank account</span>
              <Select value={bankAccountId} onValueChange={setBankAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} · {account.currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium">Payment method</span>
              <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK_TRANSFER">{METHOD_LABELS.BANK_TRANSFER}</SelectItem>
                  <SelectItem value="M_PESA">{METHOD_LABELS.M_PESA}</SelectItem>
                  <SelectItem value="CHEQUE">{METHOD_LABELS.CHEQUE}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium">Bills due</span>
              <div className="rounded border divide-y max-h-48 overflow-auto">
                {billsDue.map((b) => (
                  <label
                    key={b.id}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selectedBills.has(b.id)}
                      onCheckedChange={() => toggleBill(b.id)}
                    />
                    <span className="flex-1 text-sm">{b.number} · {b.supplier}</span>
                    <span className="text-sm font-medium">{formatMoney(b.total, b.currency)}</span>
                  </label>
                ))}
              </div>
            </div>
            {selectedBillRows.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Total: {formatMoney(totalSelected, selectedBillRows[0]?.currency ?? "KES")} · {selectedBillRows.length} bill(s)
              </p>
            )}
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="outline" onClick={handleGenerateCSV} disabled={selectedBillRows.length === 0}>
              Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                exportPaymentRunCSV(selectedBillRows, method);
                toast.success("Bank-format export generated.");
              }}
              disabled={selectedBillRows.length === 0}
            >
              Bank format
            </Button>
            <Button onClick={() => void handleRequestApproval()} disabled={selectedBillRows.length === 0 || saving}>
              Request approval
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
