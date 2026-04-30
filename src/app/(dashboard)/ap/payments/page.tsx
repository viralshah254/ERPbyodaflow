"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { APPaymentRow } from "@/lib/types/ap";
import {
  allocateApPaymentApi,
  createApPaymentApi,
  fetchApPaymentsApi,
  fetchApSuppliersApi,
  fetchOpenBillsApi,
  type OpenBillRow,
} from "@/lib/api/payments";
import { fetchBankAccountsApi } from "@/lib/api/treasury-ops";
import { downloadCsv } from "@/lib/export/csv";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function supplierLabelForBill(
  bill: OpenBillRow,
  supplierId: string,
  supplierOptions: Array<{ id: string; name: string }>
): string {
  const fromBill = bill.supplierName?.trim();
  if (fromBill) return fromBill;
  const fromSelect = supplierOptions.find((s) => s.id === supplierId)?.name?.trim();
  if (fromSelect) return fromSelect;
  return "—";
}

export default function APPaymentsPage() {
  const [search, setSearch] = React.useState("");
  const [allRows, setAllRows] = React.useState<APPaymentRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [supplierId, setSupplierId] = React.useState("");
  const [supplierOptions, setSupplierOptions] = React.useState<Array<{ id: string; name: string }>>([]);
  const [bankAccountOptions, setBankAccountOptions] = React.useState<Array<{ id: string; name: string }>>([]);
  const [bankAccountId, setBankAccountId] = React.useState("");
  const [openBills, setOpenBills] = React.useState<OpenBillRow[]>([]);
  const [allocations, setAllocations] = React.useState<Record<string, number>>({});
  const [saving, setSaving] = React.useState(false);

  const refreshPayments = React.useCallback(async () => {
    setAllRows(await fetchApPaymentsApi());
  }, []);

  React.useEffect(() => {
    setLoading(true);
    Promise.all([fetchApPaymentsApi(), fetchApSuppliersApi(), fetchBankAccountsApi()])
      .then(([payments, suppliers, bankAccounts]) => {
        setAllRows(payments);
        setSupplierOptions(suppliers);
        setBankAccountOptions(bankAccounts.map((item) => ({ id: item.id, name: item.name })));
      })
      .catch((error) => toast.error((error as Error).message || "Failed to load AP payments."))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    fetchOpenBillsApi(supplierId || undefined)
      .then(setOpenBills)
      .catch(() => setOpenBills([]));
  }, [supplierId]);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return allRows;
    const q = search.trim().toLowerCase();
    return allRows.filter(
      (r) =>
        r.number.toLowerCase().includes(q) ||
        r.party.toLowerCase().includes(q)
    );
  }, [allRows, search]);

  const payingSupplierName = React.useMemo(
    () => supplierOptions.find((s) => s.id === supplierId)?.name?.trim() ?? "",
    [supplierId, supplierOptions]
  );

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

  const handleCreatePayment = async () => {
    const nextAllocations = Object.entries(allocations)
      .filter(([, amount]) => amount > 0)
      .map(([documentId, amount]) => ({ documentId, amount }));
    const totalAmount = nextAllocations.reduce((sum, allocation) => sum + allocation.amount, 0);
    if (!supplierId || totalAmount <= 0) {
      toast.error("Select a supplier and allocate at least one bill.");
      return;
    }
    setSaving(true);
    try {
      const created = await createApPaymentApi({ supplierId, amount: totalAmount, bankAccountId: bankAccountId || undefined });
      await allocateApPaymentApi(created.id, nextAllocations);
      await refreshPayments();
      toast.success(`Supplier payment ${created.number} created.`);
      setWizardOpen(false);
      setSupplierId("");
      setBankAccountId("");
      setAllocations({});
    } catch (error) {
      toast.error((error as Error).message || "Failed to create supplier payment.");
    } finally {
      setSaving(false);
    }
  };

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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/ap/bills">
                <Icons.FileText className="mr-2 h-4 w-4" />
                AP Bills
              </Link>
            </Button>
            <Button
              onClick={() => setWizardOpen(true)}
            >
              <Icons.Plus className="mr-2 h-4 w-4" />
              Pay supplier
            </Button>
          </div>
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
        {loading ? <p className="text-sm text-muted-foreground">Loading AP payments...</p> : null}
      </div>

      <Sheet open={wizardOpen} onOpenChange={setWizardOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Pay supplier</SheetTitle>
            <SheetDescription>
              {supplierId && payingSupplierName ? (
                <>
                  Paying <span className="font-medium text-foreground">{payingSupplierName}</span>. Allocate only to each
                  supplier bill balance below; GRN-linked logistics and other inbound costs are separate postings and are not
                  added to these balances.
                </>
              ) : (
                "Select a supplier, review open bills, and allocate the payment."
              )}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {supplierOptions.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bank account</Label>
              <Select value={bankAccountId} onValueChange={setBankAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccountOptions.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Open bills</Label>
              <TooltipProvider delayDuration={200}>
                <div className="rounded border divide-y max-h-80 overflow-auto">
                  {openBills.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">No open bills for this supplier.</div>
                  ) : (
                    openBills.map((bill) => {
                      const hasLanded = (bill.landedAllocated ?? 0) > 0;
                      const supplierLine = supplierLabelForBill(bill, supplierId, supplierOptions);
                      return (
                        <div key={bill.id} className="flex flex-col gap-1.5 p-3 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium truncate">{bill.number}</span>
                              <span className="text-xs text-muted-foreground truncate">
                                Supplier: <span className="text-foreground">{supplierLine}</span>
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Amount due on this bill:{" "}
                                <span className="font-medium text-foreground">
                                  {formatMoney(bill.outstanding, bill.currency ?? "KES")}
                                </span>
                              </span>
                              {(bill.grnNumber || bill.poRef) && (
                                <span className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-1 gap-y-0.5">
                                  <span className="text-muted-foreground/80">Linked for reference:</span>
                                  {bill.grnNumber && (
                                    <Link
                                      href={`/inventory/receipts`}
                                      className="text-primary underline-offset-2 hover:underline"
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      GRN {bill.grnNumber}
                                    </Link>
                                  )}
                                  {bill.poRef && <span>· PO {bill.poRef}</span>}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-0.5 shrink-0">
                              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Allocate</span>
                              <Input
                                type="number"
                                className="w-28 h-8 shrink-0"
                                placeholder="0"
                                aria-label={`Payment amount for bill ${bill.number}`}
                                value={allocations[bill.id] ?? ""}
                                onChange={(e) =>
                                  setAllocations((current) => ({
                                    ...current,
                                    [bill.id]: parseFloat(e.target.value) || 0,
                                  }))
                                }
                              />
                            </div>
                          </div>
                          {hasLanded ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="flex w-full flex-col gap-0.5 rounded-md border border-border bg-muted/40 px-2 py-1.5 text-left text-xs text-muted-foreground"
                                >
                                  <span className="flex items-center gap-1.5 font-medium text-foreground/90">
                                    <Icons.Package className="h-3 w-3 shrink-0" aria-hidden />
                                    GRN-linked costs (reference only)
                                  </span>
                                  <span>
                                    <span className="tabular-nums">
                                      {formatMoney(bill.landedAllocated ?? 0, bill.currency ?? "KES")}
                                    </span>
                                    <span className="text-muted-foreground">
                                      {" "}
                                      posted separately (landed allocations / related documents) — not part of this bill
                                      balance.
                                    </span>
                                  </span>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-sm text-xs">
                                <p className="font-medium mb-1">Breakdown (linked GRN)</p>
                                {(bill.landedBreakdown ?? []).length ? (
                                  (bill.landedBreakdown ?? []).map((b) => (
                                    <p key={b.label}>
                                      {b.label}: {formatMoney(b.amount, bill.currency ?? "KES")}
                                    </p>
                                  ))
                                ) : (
                                  <p className="text-muted-foreground">No line detail available.</p>
                                )}
                                <p className="mt-2 border-t pt-2 text-muted-foreground">
                                  These amounts are not added to the supplier invoice line above. Use allocation only against
                                  “Amount due on this bill.” Inventory costing may combine bill and GRN-linked costs; this
                                  payment settles the supplier bill only.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
              </TooltipProvider>
            </div>
            <SheetFooter>
              <Button variant="outline" onClick={() => setWizardOpen(false)}>Cancel</Button>
              <Button disabled={saving} onClick={handleCreatePayment}>
                {saving ? "Saving..." : "Create payment"}
              </Button>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
