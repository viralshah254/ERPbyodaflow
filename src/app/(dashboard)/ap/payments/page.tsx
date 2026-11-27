"use client";

import * as React from "react";
import { LIST_PAGE_BODY_CLASS, LIST_PAGE_SHELL_CLASS, LIST_TABLE_SURFACE_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import type { APPaymentRow } from "@/lib/types/ap";
import { fetchApPaymentsApi } from "@/lib/api/payments";
import { fetchBankAccountsApi } from "@/lib/api/treasury-ops";
import { downloadCsv } from "@/lib/export/csv";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ReceiptCollectionGrid } from "@/components/finance/ReceiptCollectionGrid";
import { ApChequeBoxSheet } from "@/components/finance/ApChequeBoxSheet";

export default function APPaymentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = React.useState("");
  const [allRows, setAllRows] = React.useState<APPaymentRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [batchOpen, setBatchOpen] = React.useState(false);
  const [chequeOpen, setChequeOpen] = React.useState(false);
  const [bankAccountOptions, setBankAccountOptions] = React.useState<Array<{ id: string; name: string }>>([]);
  const [selectedPayment, setSelectedPayment] = React.useState<APPaymentRow | null>(null);

  const refreshPayments = React.useCallback(async () => {
    setAllRows(await fetchApPaymentsApi());
  }, []);

  React.useEffect(() => {
    if (searchParams.get("record") !== "1") return;
    const next = new URLSearchParams();
    for (const key of ["supplierId", "supplierName", "billNumber", "amount"]) {
      const value = searchParams.get(key);
      if (value) next.set(key, value);
    }
    const query = next.toString();
    router.replace(query ? `/ap/payments/pay?${query}` : "/ap/payments/pay");
  }, [router, searchParams]);

  React.useEffect(() => {
    setLoading(true);
    Promise.all([fetchApPaymentsApi(), fetchBankAccountsApi()])
      .then(([payments, bankAccounts]) => {
        setAllRows(payments);
        setBankAccountOptions(bankAccounts.map((item) => ({ id: item.id, name: item.name })));
      })
      .catch((error) => toast.error((error as Error).message || "Failed to load AP payments."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return allRows;
    const q = search.trim().toLowerCase();
    return allRows.filter(
      (r) =>
        r.number.toLowerCase().includes(q) ||
        r.party.toLowerCase().includes(q) ||
        (r.chequeNumber ?? "").toLowerCase().includes(q) ||
        (r.releasedBy ?? "").toLowerCase().includes(q)
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
      { id: "date", header: "Date", accessor: (r: APPaymentRow) => r.date.slice(0, 10) },
      { id: "chequeNumber", header: "Cheque", accessor: (r: APPaymentRow) => r.chequeNumber || "—" },
      { id: "chequeDate", header: "Cheque date", accessor: (r: APPaymentRow) => r.chequeDate || "—" },
      { id: "party", header: "Paid to", accessor: "party" as keyof APPaymentRow },
      {
        id: "settled",
        header: "Settled",
        accessor: (r: APPaymentRow) => {
          if (r.status === "CANCELLED") return "Cancelled";
          if (r.counterAccountName) return r.counterAccountName;
          const bills = (r.allocations ?? []).map((line) => line.documentNumber || line.documentId).filter(Boolean);
          return bills.length ? bills.join(", ") : "—";
        },
      },
      { id: "releasedBy", header: "Released by", accessor: (r: APPaymentRow) => r.releasedBy || "—" },
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
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/ap/bills">
                <Icons.FileText className="mr-2 h-4 w-4" />
                AP Bills
              </Link>
            </Button>
            <Button onClick={() => setBatchOpen(true)}>Batch payouts</Button>
            <Button variant="outline" onClick={() => setChequeOpen(true)}>
              Record cheques
            </Button>
            <Button asChild>
              <Link href="/ap/payments/pay">
                <Icons.Plus className="mr-2 h-4 w-4" />
                Pay suppliers
              </Link>
            </Button>
          </div>
        }
      />
      <div className={LIST_PAGE_BODY_CLASS}>
        <DataTableToolbar className="shrink-0"
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
        <div className={LIST_TABLE_SURFACE_CLASS}>
          <DataTable<APPaymentRow>
            data={filtered}
            columns={columns}
            emptyMessage="No payments yet."
            onRowClick={(row) => setSelectedPayment(row)}
            scrollMode="fill"
            size="comfortable"
            className="min-h-0 flex-1 border-0" searchable={false}
          />
        </div>
        {loading ? <p className="text-sm text-muted-foreground">Loading AP payments...</p> : null}
      </div>

      <Sheet open={batchOpen} onOpenChange={(open) => { setBatchOpen(open); if (!open) void refreshPayments(); }}>
        <SheetContent side="right" className="flex w-full flex-col sm:w-[1200px] sm:max-w-[95vw]">
          <SheetHeader><SheetTitle>Batch payouts</SheetTitle><SheetDescription>Enter multiple supplier payments and review the invoices each payment settles.</SheetDescription></SheetHeader>
          <ReceiptCollectionGrid payout />
        </SheetContent>
      </Sheet>

      <ApChequeBoxSheet
        open={chequeOpen}
        onOpenChange={setChequeOpen}
        bankAccounts={bankAccountOptions}
        onPosted={refreshPayments}
      />

      <Sheet open={!!selectedPayment} onOpenChange={(open) => !open && setSelectedPayment(null)}>
        <SheetContent side="right" className="w-full">
          {selectedPayment ? (
            <>
              <SheetHeader>
                <SheetTitle>{selectedPayment.number}</SheetTitle>
                <SheetDescription>
                  Supplier payment details and linked bills
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Date</p>
                    <p className="font-medium">{selectedPayment.date.slice(0, 10)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-medium">{selectedPayment.status}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Supplier</p>
                    <p className="font-medium">{selectedPayment.party}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Amount</p>
                    <p className="font-medium">{formatMoney(selectedPayment.amount, "KES")}</p>
                  </div>
                  {selectedPayment.paymentMethod ? (
                    <div>
                      <p className="text-muted-foreground">Method</p>
                      <p className="font-medium">{selectedPayment.paymentMethod.replace(/_/g, " ")}</p>
                    </div>
                  ) : null}
                  {selectedPayment.appliedAmount != null ? (
                    <div>
                      <p className="text-muted-foreground">Applied</p>
                      <p className="font-medium">{formatMoney(selectedPayment.appliedAmount, "KES")}</p>
                    </div>
                  ) : null}
                  {selectedPayment.openAmount != null ? (
                    <div>
                      <p className="text-muted-foreground">Open</p>
                      <p className="font-medium">{formatMoney(selectedPayment.openAmount, "KES")}</p>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label>Linked bills</Label>
                  <div className="rounded border divide-y">
                    {(selectedPayment.allocations ?? []).length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground">
                        No bill allocations recorded for this payment.
                      </div>
                    ) : (
                      (selectedPayment.allocations ?? []).map((allocation) => (
                        <div key={`${allocation.documentId}-${allocation.amount}`} className="flex items-center justify-between gap-3 p-3 text-sm">
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {allocation.documentNumber ?? allocation.documentId}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Allocated {formatMoney(allocation.amount, "KES")}
                            </p>
                          </div>
                          {allocation.documentType === "bill" || !allocation.documentType ? (
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/docs/bill/${allocation.documentId}`}>
                                <Icons.FileText className="mr-2 h-4 w-4" />
                                View bill
                              </Link>
                            </Button>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
