"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PaymentRow, OpenInvoiceRow } from "@/lib/mock/ar";
import { createArPayment, listArPayments, listOpenInvoices } from "@/lib/data/ar.repo";
import { useCopilotStore } from "@/stores/copilot-store";
import { formatMoney } from "@/lib/money";
import { arAllocate } from "@/lib/api/stub-endpoints";
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

  const [payments, setPayments] = React.useState<PaymentRow[]>(() => listArPayments());
  const openInvoices = React.useMemo(() => listOpenInvoices(customerId || undefined), [customerId, payments]);

  const refreshData = React.useCallback(() => {
    setPayments(listArPayments());
  }, []);

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
    setAllocations({});
    setWizardOpen(true);
  };

  const selectedPayment = selectedPaymentId ? payments.find((p) => p.id === selectedPaymentId) : null;
  const allocateInvoices = React.useMemo(
    () => listOpenInvoices(selectedPayment?.customerId),
    [selectedPayment?.customerId, payments]
  );

  const handleWizardSubmit = async () => {
    const customerName = openInvoices[0]?.customerName ?? customerId;
    const totalAmount = Object.values(allocations).reduce((sum, amount) => sum + amount, 0);
    if (!customerId || totalAmount <= 0) {
      toast.error("Select a customer and allocate at least one invoice amount.");
      return;
    }
    const payment = createArPayment({ customerId, customerName, amount: totalAmount });
    const invoiceIds = Object.keys(allocations).filter((invoiceId) => (allocations[invoiceId] ?? 0) > 0);
    await arAllocate(payment.id, {
      invoiceIds,
      amounts: invoiceIds.map((invoiceId) => allocations[invoiceId] ?? 0),
    });
    refreshData();
    toast.success(`Payment ${payment.number} posted and allocated.`);
    setWizardOpen(false);
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
      await arAllocate(selectedPaymentId, { invoiceIds, amounts });
      refreshData();
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
          columns={[
            ...columns,
            {
              id: "actions",
              header: "",
              accessor: (r: PaymentRow) => (
                <Button variant="ghost" size="sm" onClick={() => openAllocateRef.current(r)}>
                  Allocate
                </Button>
              ),
            },
          ]}
          emptyMessage="No payments yet."
        />
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
                  <Input
                    placeholder="Search or select customer"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                  />
                </div>
                <Button onClick={() => setStep(2)}>Next</Button>
              </>
            )}
            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label>Open invoices (mock)</Label>
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
