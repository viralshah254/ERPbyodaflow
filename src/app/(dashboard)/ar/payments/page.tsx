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
import { getMockPayments, getMockOpenInvoices, type PaymentRow, type OpenInvoiceRow } from "@/lib/mock/ar";
import { useCopilotStore } from "@/stores/copilot-store";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function ARPaymentsPage() {
  const openWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);
  const [search, setSearch] = React.useState("");
  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [step, setStep] = React.useState(1);
  const [customerId, setCustomerId] = React.useState("");
  const [allocations, setAllocations] = React.useState<Record<string, number>>({});

  const payments = React.useMemo(() => getMockPayments(), []);
  const openInvoices = React.useMemo(
    () => getMockOpenInvoices(customerId || undefined),
    [customerId]
  );

  const filtered = React.useMemo(() => {
    if (!search.trim()) return payments;
    const q = search.trim().toLowerCase();
    return payments.filter(
      (r) =>
        r.number.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q)
    );
  }, [payments, search]);

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
    ],
    []
  );

  const handleReceivePayment = () => {
    setStep(1);
    setCustomerId("");
    setAllocations({});
    setWizardOpen(true);
  };

  const handleWizardSubmit = () => {
    toast.info("Submit payment: API pending.");
    setWizardOpen(false);
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
          onExport={() => toast.info("Export (stub)")}
        />
        <DataTable<PaymentRow>
          data={filtered}
          columns={columns}
          emptyMessage="No payments yet."
        />
      </div>

      <Sheet open={wizardOpen} onOpenChange={setWizardOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Receive payment</SheetTitle>
            <SheetDescription>
              Customer → Open invoices → Allocate → Review. API pending.
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
                <p className="text-sm text-muted-foreground">Review &amp; submit (stub).</p>
                <SheetFooter>
                  <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                  <Button onClick={handleWizardSubmit}>Submit</Button>
                </SheetFooter>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
