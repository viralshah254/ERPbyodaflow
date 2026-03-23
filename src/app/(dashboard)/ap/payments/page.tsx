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
          <Button
            onClick={() => setWizardOpen(true)}
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
        {loading ? <p className="text-sm text-muted-foreground">Loading AP payments...</p> : null}
      </div>

      <Sheet open={wizardOpen} onOpenChange={setWizardOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Pay supplier</SheetTitle>
            <SheetDescription>Select a supplier, review open bills, and allocate the payment.</SheetDescription>
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
              <div className="rounded border divide-y max-h-80 overflow-auto">
                {openBills.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">No open bills for this supplier.</div>
                ) : (
                  openBills.map((bill) => {
                    const hasLanded = (bill.landedAllocated ?? 0) > 0;
                    return (
                      <div key={bill.id} className="flex flex-col gap-1 p-2 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium truncate">{bill.number}</span>
                            <span className="text-xs text-muted-foreground">
                              Outstanding: {formatMoney(bill.outstanding, bill.currency ?? "KES")}
                            </span>
                            {(bill.grnNumber || bill.poRef) && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                {bill.grnNumber && (
                                  <Link
                                    href={`/inventory/receipts`}
                                    className="text-primary underline-offset-2 hover:underline"
                                    target="_blank"
                                  >
                                    GRN: {bill.grnNumber}
                                  </Link>
                                )}
                                {bill.poRef && <span>· PO: {bill.poRef}</span>}
                              </span>
                            )}
                          </div>
                          <Input
                            type="number"
                            className="w-28 h-8 shrink-0"
                            placeholder="Amount"
                            value={allocations[bill.id] ?? ""}
                            onChange={(e) =>
                              setAllocations((current) => ({
                                ...current,
                                [bill.id]: parseFloat(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                        {hasLanded && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1.5 rounded bg-amber-50 border border-amber-200 px-2 py-1 text-xs text-amber-800 cursor-default w-fit">
                                  <Icons.Package className="h-3 w-3" />
                                  +{formatMoney(bill.landedAllocated ?? 0, bill.currency ?? "KES")} landed
                                  <span className="text-amber-600">→ Economic: {formatMoney(bill.economicTotal ?? bill.total, bill.currency ?? "KES")}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs text-xs">
                                <p className="font-medium mb-1">Landed cost breakdown (on linked GRN)</p>
                                {(bill.landedBreakdown ?? []).map((b) => (
                                  <p key={b.label}>{b.label}: {formatMoney(b.amount, bill.currency ?? "KES")}</p>
                                ))}
                                <p className="mt-1 text-muted-foreground">This amount is already posted to inventory. Payment covers only the bill outstanding above.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
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
