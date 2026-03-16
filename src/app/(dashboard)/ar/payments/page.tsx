"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { AsyncSearchableSelect } from "@/components/ui/async-searchable-select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PaymentRow, OpenInvoiceRow } from "@/lib/types/ar";
import {
  allocateArPaymentApi,
  createArPaymentApi,
  fetchArPaymentsApi,
  fetchOpenInvoicesApi,
  searchArCustomerOptionsApi,
} from "@/lib/api/payments";
import type { PartyLookupOption } from "@/lib/api/parties";
import { fetchBankAccountsApi } from "@/lib/api/treasury-ops";
import { useCopilotStore } from "@/stores/copilot-store";
import { formatMoney } from "@/lib/money";
import { downloadCsv } from "@/lib/export/csv";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function ARPaymentsPage() {
  const openWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);
  const [search, setSearch] = React.useState("");
  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [step, setStep] = React.useState(1);
  const [customerId, setCustomerId] = React.useState("");
  const [allocations, setAllocations] = React.useState<Record<string, number>>({});
  const [selectedPaymentId, setSelectedPaymentId] = React.useState<string | null>(null);
  const [allocateSheetOpen, setAllocateSheetOpen] = React.useState(false);
  const [allocateAmounts, setAllocateAmounts] = React.useState<Record<string, number>>({});
  const [allocating, setAllocating] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [payments, setPayments] = React.useState<PaymentRow[]>([]);
  const [selectedCustomerOption, setSelectedCustomerOption] = React.useState<PartyLookupOption | null>(null);
  const [bankAccountOptions, setBankAccountOptions] = React.useState<Array<{ id: string; name: string }>>([]);
  const [bankAccountId, setBankAccountId] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState<"BANK_TRANSFER" | "CHEQUE" | "CASH" | "MPESA">("BANK_TRANSFER");
  const [mpesaTransactionNo, setMpesaTransactionNo] = React.useState("");
  const [openInvoices, setOpenInvoices] = React.useState<OpenInvoiceRow[]>([]);
  const [allocateInvoices, setAllocateInvoices] = React.useState<OpenInvoiceRow[]>([]);

  const refreshData = React.useCallback(async () => {
    setPayments(await fetchArPaymentsApi());
  }, []);

  React.useEffect(() => {
    setLoading(true);
    Promise.all([fetchArPaymentsApi(), fetchBankAccountsApi()])
      .then(([nextPayments, nextBankAccounts]) => {
        setPayments(nextPayments);
        setBankAccountOptions(nextBankAccounts.map((item) => ({ id: item.id, name: item.name })));
      })
      .catch((error) => toast.error((error as Error).message || "Failed to load AR payments."))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    fetchOpenInvoicesApi(customerId || undefined)
      .then(setOpenInvoices)
      .catch(() => setOpenInvoices([]));
  }, [customerId]);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return payments;
    const q = search.trim().toLowerCase();
    return payments.filter(
      (r) =>
        r.number.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q)
    );
  }, [payments, search]);

  const openAllocateRef = React.useRef<(payment: PaymentRow) => void>(() => {});
  openAllocateRef.current = (payment: PaymentRow) => {
    setSelectedPaymentId(payment.id);
    setAllocateAmounts({});
    setAllocateSheetOpen(true);
  };

  const columns = React.useMemo(
    () => [
      {
        id: "number",
        header: "Number",
        accessor: (r: PaymentRow) => <span className="font-medium">{r.number}</span>,
        sticky: true,
      },
      { id: "date", header: "Date", accessor: "date" as keyof PaymentRow },
      { id: "customerName", header: "Customer", accessor: "customerName" as keyof PaymentRow },
      {
        id: "amount",
        header: "Amount",
        accessor: (r: PaymentRow) => formatMoney(r.amount, "KES"),
      },
      {
        id: "status",
        header: "Status",
        accessor: (r: PaymentRow) => (
          <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">
            {r.status}
          </span>
        ),
      },
      {
        id: "paymentMethod",
        header: "Method",
        accessor: (r: PaymentRow) => r.paymentMethod ?? "—",
      },
      {
        id: "mpesaTransactionNo",
        header: "M-Pesa Txn",
        accessor: (r: PaymentRow) => r.mpesaTransactionNo ?? "—",
      },
      {
        id: "actions",
        header: "",
        accessor: (r: PaymentRow) => (
          <Button variant="ghost" size="sm" onClick={() => openAllocateRef.current(r as PaymentRow)}>
            Allocate
          </Button>
        ),
      },
    ],
    []
  );

  const handleReceivePayment = () => {
    setStep(1);
    setCustomerId("");
    setSelectedCustomerOption(null);
    setBankAccountId("");
    setPaymentMethod("BANK_TRANSFER");
    setMpesaTransactionNo("");
    setAllocations({});
    setWizardOpen(true);
  };

  const selectedPayment = selectedPaymentId ? payments.find((p) => p.id === selectedPaymentId) : null;

  React.useEffect(() => {
    if (!selectedPayment?.customerId) {
      setAllocateInvoices([]);
      return;
    }
    fetchOpenInvoicesApi(selectedPayment.customerId)
      .then(setAllocateInvoices)
      .catch(() => setAllocateInvoices([]));
  }, [selectedPayment?.customerId]);

  const handleWizardSubmit = async () => {
    const totalAmount = Object.values(allocations).reduce((sum, amount) => sum + amount, 0);
    if (!customerId || totalAmount <= 0) {
      toast.error("Select a customer and allocate at least one invoice amount.");
      return;
    }
    if (paymentMethod === "MPESA" && !mpesaTransactionNo.trim()) {
      toast.error("M-Pesa transaction number is required for M-Pesa receipts.");
      return;
    }
    try {
      const payment = await createArPaymentApi({
        customerId,
        amount: totalAmount,
        bankAccountId: bankAccountId || undefined,
        paymentMethod,
        mpesaTransactionNo: paymentMethod === "MPESA" ? mpesaTransactionNo.trim() : undefined,
      });
      const nextAllocations = Object.entries(allocations)
        .filter(([, amount]) => amount > 0)
        .map(([documentId, amount]) => ({ documentId, amount }));
      await allocateArPaymentApi(payment.id, nextAllocations);
      await refreshData();
      toast.success(`Payment ${payment.number} posted and allocated.`);
      setWizardOpen(false);
    } catch (error) {
      toast.error((error as Error).message || "Failed to create payment.");
    }
  };

  const handleAllocateSubmit = async () => {
    if (!selectedPaymentId) return;
    const invoiceIds = Object.keys(allocateAmounts).filter((k) => (allocateAmounts[k] ?? 0) > 0);
    const amounts = invoiceIds.map((k) => allocateAmounts[k] ?? 0);
    if (invoiceIds.length === 0) {
      toast.error("Enter at least one allocation amount.");
      return;
    }
    setAllocating(true);
    try {
      await allocateArPaymentApi(
        selectedPaymentId,
        invoiceIds.map((documentId, index) => ({ documentId, amount: amounts[index] ?? 0 }))
      );
      await refreshData();
      toast.success("Allocation saved.");
      setAllocateSheetOpen(false);
      setSelectedPaymentId(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAllocating(false);
    }
  };

  const handleDraftReminder = () => {
    const overdue = openInvoices.filter((i) => new Date(i.dueDate) < new Date());
    const total = overdue.reduce((s, i) => s + i.outstanding, 0);
    openWithPrompt(
      `Draft a payment reminder message for customer ${customerId || "selected"}. Overdue total: ${formatMoney(total, "KES")}. Include invoice numbers and amounts.`
    );
  };

  return (
    <PageShell>
      <PageHeader
        title="AR Payments"
        description="Receive payments and allocate to invoices"
        breadcrumbs={[
          { label: "Finance", href: "/finance" },
          { label: "AR Payments" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDraftReminder}>
              <Icons.Sparkles className="mr-2 h-4 w-4" />
              Draft payment reminder
            </Button>
            <Button onClick={handleReceivePayment}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              Receive Payment
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search by number, customer..."
          searchValue={search}
          onSearchChange={setSearch}
          onExport={() =>
            downloadCsv(
              `ar-payments-${new Date().toISOString().slice(0, 10)}.csv`,
              filtered.map((row) => ({
                number: row.number,
                date: row.date,
                customerName: row.customerName,
                amount: row.amount,
                status: row.status,
              }))
            )
          }
        />
        <DataTable<PaymentRow>
          data={filtered}
          columns={columns}
          emptyMessage="No payments yet."
        />
        {loading ? <p className="text-sm text-muted-foreground">Loading AR payments...</p> : null}
      </div>

      <Sheet open={wizardOpen} onOpenChange={setWizardOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Receive payment</SheetTitle>
            <SheetDescription>
              Customer → Open invoices → Allocate → Review and post receipt.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <AsyncSearchableSelect
                    value={customerId}
                    onValueChange={(value) => {
                      setCustomerId(value);
                      if (!value) setSelectedCustomerOption(null);
                    }}
                    onOptionSelect={(option) => setSelectedCustomerOption(option)}
                    loadOptions={searchArCustomerOptionsApi}
                    selectedOption={selectedCustomerOption}
                    placeholder="Select customer"
                    searchPlaceholder="Type name, code, phone, or email"
                    emptyMessage="No customers found."
                    recentStorageKey="lookup:recent-customers"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment method</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={(value) =>
                      setPaymentMethod(value as "BANK_TRANSFER" | "CHEQUE" | "CASH" | "MPESA")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BANK_TRANSFER">Bank transfer</SelectItem>
                      <SelectItem value="CHEQUE">Cheque</SelectItem>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="MPESA">M-Pesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {paymentMethod === "MPESA" && (
                  <div className="space-y-2">
                    <Label>M-Pesa transaction number</Label>
                    <Input
                      placeholder="e.g. SF94KX22Q"
                      value={mpesaTransactionNo}
                      onChange={(e) => setMpesaTransactionNo(e.target.value)}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Bank account</Label>
                  <SearchableSelect
                    value={bankAccountId}
                    onValueChange={setBankAccountId}
                    options={bankAccountOptions.map((account) => ({ id: account.id, label: account.name }))}
                    placeholder="Select bank account"
                    searchPlaceholder="Type to search bank account"
                  />
                </div>
                <Button onClick={() => setStep(2)}>Next</Button>
              </>
            )}
            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label>Open invoices</Label>
                  <div className="rounded border divide-y max-h-48 overflow-auto">
                    {openInvoices.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground">
                        No open invoices
                      </div>
                    ) : (
                      openInvoices.map((inv) => (
                        <div
                          key={inv.id}
                          className="flex items-center justify-between p-2 text-sm"
                        >
                          <span>{inv.number} · {formatMoney(inv.outstanding, "KES")}</span>
                          <Input
                            type="number"
                            className="w-24 h-8"
                            placeholder="Allocate"
                            value={allocations[inv.id] ?? ""}
                            onChange={(e) =>
                              setAllocations((a) => ({
                                ...a,
                                [inv.id]: parseFloat(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <Button onClick={() => setStep(3)}>Next</Button>
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <p className="text-sm text-muted-foreground">Review allocations and post the receipt to customer open items.</p>
                <SheetFooter>
                  <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                  <Button onClick={handleWizardSubmit}>Submit</Button>
                </SheetFooter>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={allocateSheetOpen} onOpenChange={setAllocateSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Allocate to invoices</SheetTitle>
            <SheetDescription>
              {selectedPayment ? `Payment ${selectedPayment.number} · ${formatMoney(selectedPayment.amount, "KES")}` : ""}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {allocateInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open invoices for this customer.</p>
            ) : (
              <div className="rounded border divide-y max-h-64 overflow-auto">
                {allocateInvoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-2 text-sm gap-2">
                    <span className="truncate">{inv.number} · {formatMoney(inv.outstanding, "KES")}</span>
                    <Input
                      type="number"
                      className="w-28 h-8 shrink-0"
                      placeholder="Amount"
                      value={allocateAmounts[inv.id] ?? ""}
                      onChange={(e) =>
                        setAllocateAmounts((a) => ({
                          ...a,
                          [inv.id]: parseFloat(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            )}
            <SheetFooter>
              <Button variant="outline" onClick={() => setAllocateSheetOpen(false)}>Cancel</Button>
              <Button disabled={allocating || allocateInvoices.length === 0} onClick={handleAllocateSubmit}>
                Submit allocation
              </Button>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
