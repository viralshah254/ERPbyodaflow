"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { Separator } from "@/components/ui/separator";
import { EntityDrawer } from "@/components/masters/EntityDrawer";
import { EmptyState } from "@/components/ui/empty-state";
import type { PartyRow, CustomerType, SupplierType } from "@/lib/types/masters";
import { createPartyApi, fetchPartiesApi, updatePartyApi, fetchPartyByIdApi } from "@/lib/api/parties";
import { fetchCustomerCategoriesApi } from "@/lib/api/customer-categories";
import { fetchPaymentTermsApi, type PaymentTermRow } from "@/lib/api/payment-terms";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function MasterPartiesPage() {
  const terminology = useTerminology();
  const customerLabel = t("customer", terminology);
  const supplierLabel = t("supplier", terminology);
  const franchiseeLabel = t("franchisee", terminology);

  const [tab, setTab] = React.useState<"customers" | "franchisees" | "suppliers">("customers");
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [customerType, setCustomerType] = React.useState<CustomerType | "">("");
  const [supplierType, setSupplierType] = React.useState<SupplierType | "">("");
  const [parties, setParties] = React.useState<PartyRow[]>([]);
  const [customerCategories, setCustomerCategories] = React.useState<Array<{ id: string; name: string }>>([]);
  const [paymentTerms, setPaymentTerms] = React.useState<PaymentTermRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [formName, setFormName] = React.useState("");
  const [formCode, setFormCode] = React.useState("");
  const [formEmail, setFormEmail] = React.useState("");
  const [formPhone, setFormPhone] = React.useState("");
  const [formCustomerType, setFormCustomerType] = React.useState<CustomerType>("RETAILER");
  const [formSupplierType, setFormSupplierType] = React.useState<SupplierType>("RAW_MATERIAL");
  const [formCustomerCategoryId, setFormCustomerCategoryId] = React.useState("");
  const [formPaymentTermsId, setFormPaymentTermsId] = React.useState("");
  const [formCreditControlMode, setFormCreditControlMode] = React.useState<"AMOUNT" | "DAYS" | "HYBRID" | "">("");
  const [formCreditLimitAmount, setFormCreditLimitAmount] = React.useState("");
  const [formMaxOutstandingAgeDays, setFormMaxOutstandingAgeDays] = React.useState("");
  const [formPerInvoiceDaysToPayCap, setFormPerInvoiceDaysToPayCap] = React.useState("");
  const [formCreditWarningThresholdPct, setFormCreditWarningThresholdPct] = React.useState("");
  const [creditFieldsLoading, setCreditFieldsLoading] = React.useState(false);

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const refreshParties = React.useCallback(async () => {
    setLoading(true);
    try {
      const role = tab === "customers" ? "customer" : tab === "franchisees" ? "franchisee" : "supplier";
      setParties(
        await fetchPartiesApi({
          role,
          customerType: tab === "customers" ? customerType : "",
          supplierType: tab === "suppliers" ? supplierType : "",
          search: debouncedSearch,
          status: "ACTIVE",
        })
      );
      const [categories, terms] = await Promise.all([
        fetchCustomerCategoriesApi(),
        fetchPaymentTermsApi(),
      ]);
      setCustomerCategories(categories.filter((item) => item.isActive).map((item) => ({ id: item.id, name: item.name })));
      setPaymentTerms(terms.filter((t) => t.isActive));
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [customerType, debouncedSearch, supplierType, tab]);

  React.useEffect(() => {
    void refreshParties();
  }, [refreshParties]);

  const filteredCustomers = React.useMemo(() => {
    return parties;
  }, [parties]);

  const filteredFranchisees = React.useMemo(() => {
    return parties;
  }, [parties]);

  const filteredSuppliers = React.useMemo(() => {
    return parties;
  }, [parties]);

  const columns = React.useMemo(
    () => [
      { id: "code", header: "Code", accessor: "code" as keyof PartyRow },
      {
        id: "name",
        header: "Name",
        accessor: (r: PartyRow) => {
          const chips: string[] = [];
          if (r.roles?.includes("franchisee") || r.customerType === "FRANCHISEE") {
            chips.push("Franchisee");
          }
          if (r.roles?.includes("customer")) {
            if (r.customerType) {
              const pretty =
                r.customerType === "END_CUSTOMER"
                  ? "End customer"
                  : r.customerType.charAt(0) + r.customerType.slice(1).toLowerCase();
              chips.push(pretty);
            } else {
              chips.push("Customer");
            }
          }
          if (r.roles?.includes("supplier")) {
            if (r.supplierType) {
              const pretty =
                r.supplierType === "RAW_MATERIAL"
                  ? "Raw material supplier"
                  : r.supplierType.charAt(0) + r.supplierType.slice(1).toLowerCase();
              chips.push(pretty);
            } else {
              chips.push("Supplier");
            }
          }
          return (
            <div className="space-y-1">
              <div className="font-medium">{r.name}</div>
              {chips.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {chips.map((chip) => (
                    <Badge key={chip} variant="outline" className="text-[10px] px-1.5 py-0">
                      {chip}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          );
        },
        sticky: true,
      },
      { id: "email", header: "Email", accessor: "email" as keyof PartyRow },
      { id: "phone", header: "Phone", accessor: "phone" as keyof PartyRow },
      {
        id: "status",
        header: "Status",
        accessor: (r: PartyRow) => <StatusBadge status={r.status} />,
      },
    ],
    []
  );

  const label =
    tab === "customers"
      ? customerLabel
      : tab === "franchisees"
      ? franchiseeLabel
      : supplierLabel;

  const resetCreditFields = () => {
    setFormPaymentTermsId("");
    setFormCreditControlMode("");
    setFormCreditLimitAmount("");
    setFormMaxOutstandingAgeDays("");
    setFormPerInvoiceDaysToPayCap("");
    setFormCreditWarningThresholdPct("");
  };

  const openCreateDrawer = () => {
    setEditingId(null);
    setFormName("");
    setFormCode("");
    setFormEmail("");
    setFormPhone("");
    setFormCustomerType(tab === "franchisees" ? "FRANCHISEE" : customerType || "RETAILER");
    setFormSupplierType(supplierType || "RAW_MATERIAL");
    setFormCustomerCategoryId("");
    resetCreditFields();
    setDrawerOpen(true);
  };

  const openEditDrawer = async (row: PartyRow) => {
    setEditingId(row.id);
    setFormName(row.name);
    setFormCode(row.code ?? "");
    setFormEmail(row.email ?? "");
    setFormPhone(row.phone ?? "");
    setFormCustomerType(row.customerType ?? "RETAILER");
    setFormSupplierType(row.supplierType ?? "RAW_MATERIAL");
    setFormCustomerCategoryId(row.customerCategoryId ?? "");
    resetCreditFields();
    setCreditFieldsLoading(true);
    setDrawerOpen(true);
    // Load full party details for credit fields — use a flag to avoid overwriting user edits
    // The flag is cleared once we've fetched once; after that the user owns the fields.
    try {
      const detail = await fetchPartyByIdApi(row.id);
      if (detail) {
        // Only populate if the user hasn't already started typing (values are still empty/default)
        setFormPaymentTermsId((prev) => prev || (detail.paymentTermsId ?? ""));
        setFormCreditControlMode((prev) => prev || (detail.creditControlMode ?? ""));
        setFormCreditLimitAmount((prev) => prev || (detail.creditLimitAmount != null ? String(detail.creditLimitAmount) : ""));
        setFormMaxOutstandingAgeDays((prev) => prev || (detail.maxOutstandingInvoiceAgeDays != null ? String(detail.maxOutstandingInvoiceAgeDays) : ""));
        setFormPerInvoiceDaysToPayCap((prev) => prev || (detail.perInvoiceDaysToPayCap != null ? String(detail.perInvoiceDaysToPayCap) : ""));
        setFormCreditWarningThresholdPct((prev) => prev || (detail.creditWarningThresholdPct != null ? String(detail.creditWarningThresholdPct) : ""));
      }
    } catch {
      // Non-critical — drawer is already open with basic fields
    } finally {
      setCreditFieldsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("Name is required.");
      return;
    }
    setSaving(true);
    try {
      const roles =
        tab === "suppliers"
          ? ["supplier"] as const
          : tab === "franchisees"
            ? (["customer", "franchisee"] as const)
            : (["customer"] as const);
      const isCustomerTab = tab !== "suppliers";
      const creditLimitAmountNum = formCreditLimitAmount ? parseFloat(formCreditLimitAmount) : undefined;
      const maxAgeDaysNum = formMaxOutstandingAgeDays ? parseInt(formMaxOutstandingAgeDays, 10) : undefined;
      const perInvoiceCapNum = formPerInvoiceDaysToPayCap ? parseInt(formPerInvoiceDaysToPayCap, 10) : undefined;
      const warningPctNum = formCreditWarningThresholdPct ? parseFloat(formCreditWarningThresholdPct) : undefined;
      const payload = {
        name: formName.trim(),
        code: formCode.trim() || undefined,
        email: formEmail.trim() || undefined,
        phone: formPhone.trim() || undefined,
        roles: [...roles],
        customerType: isCustomerTab ? formCustomerType : undefined,
        customerCategoryId: isCustomerTab ? formCustomerCategoryId || undefined : undefined,
        supplierType: tab === "suppliers" ? formSupplierType : undefined,
        paymentTermsId: formPaymentTermsId || undefined,
        creditControlMode: isCustomerTab && formCreditControlMode ? formCreditControlMode : undefined,
        creditLimitAmount: isCustomerTab && creditLimitAmountNum != null && !isNaN(creditLimitAmountNum) ? creditLimitAmountNum : undefined,
        maxOutstandingInvoiceAgeDays: isCustomerTab && maxAgeDaysNum != null && !isNaN(maxAgeDaysNum) ? maxAgeDaysNum : undefined,
        perInvoiceDaysToPayCap: isCustomerTab && perInvoiceCapNum != null && !isNaN(perInvoiceCapNum) ? perInvoiceCapNum : undefined,
        creditWarningThresholdPct: isCustomerTab && warningPctNum != null && !isNaN(warningPctNum) ? warningPctNum : undefined,
        status: "ACTIVE" as const,
      };
      if (editingId) {
        await updatePartyApi(editingId, payload);
        toast.success(`${label} updated.`);
      } else {
        await createPartyApi(payload);
        toast.success(`${label} created.`);
      }
      setDrawerOpen(false);
      await refreshParties();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Parties"
        description={`${customerLabel}s, ${franchiseeLabel}s and ${supplierLabel}s. One place to manage every external counterparty.`}
        breadcrumbs={[
          { label: "Masters", href: "/master" },
          { label: "Parties" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button
            onClick={openCreateDrawer}
          >
            <Icons.Plus className="mr-2 h-4 w-4" />
            Add {label}
          </Button>
        }
      />
      <div className="p-6 space-y-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "customers" | "franchisees" | "suppliers")}>
          <TabsList>
            <TabsTrigger value="customers">{customerLabel}s</TabsTrigger>
            <TabsTrigger value="franchisees">{franchiseeLabel}s</TabsTrigger>
            <TabsTrigger value="suppliers">{supplierLabel}s</TabsTrigger>
          </TabsList>
          <TabsContent value="customers" className="mt-4 space-y-4">
            <DataTableToolbar
              searchPlaceholder={`Search ${customerLabel.toLowerCase()}s...`}
              searchValue={search}
              onSearchChange={setSearch}
              filters={[
                {
                  id: "customerType",
                  label: "Customer type",
                  options: [
                    { label: "All", value: "" },
                    { label: "Distributor", value: "DISTRIBUTOR" },
                    { label: "Wholesaler", value: "WHOLESALER" },
                    { label: "Retailer", value: "RETAILER" },
                    { label: "Franchisee", value: "FRANCHISEE" },
                    { label: "End customer", value: "END_CUSTOMER" },
                  ],
                  value: customerType,
                  onChange: (v) => setCustomerType(v as CustomerType | ""),
                },
              ]}
              actions={
                <Link
                  href="/settings/customizer/fields"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Custom fields
                </Link>
              }
            />
            {loading ? (
              <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
                Loading {customerLabel.toLowerCase()}s...
              </div>
            ) : filteredCustomers.length === 0 ? (
              <EmptyState
                icon="Users"
                title={`No ${customerLabel.toLowerCase()}s`}
                description="Add your first customer."
                action={{
                  label: `Add ${customerLabel}`,
                  onClick: openCreateDrawer,
                }}
              />
            ) : (
              <DataTable<PartyRow>
                data={filteredCustomers}
                columns={columns}
                onRowClick={openEditDrawer}
                emptyMessage={`No ${customerLabel.toLowerCase()}s.`}
              />
            )}
          </TabsContent>
          <TabsContent value="suppliers" className="mt-4 space-y-4">
            <DataTableToolbar
              searchPlaceholder={`Search ${supplierLabel.toLowerCase()}s...`}
              searchValue={search}
              onSearchChange={setSearch}
              filters={[
                {
                  id: "supplierType",
                  label: "Supplier type",
                  options: [
                    { label: "All", value: "" },
                    { label: "Raw material", value: "RAW_MATERIAL" },
                    { label: "Service", value: "SERVICE" },
                    { label: "Logistics", value: "LOGISTICS" },
                    { label: "Other", value: "OTHER" },
                  ],
                  value: supplierType,
                  onChange: (v) => setSupplierType(v as SupplierType | ""),
                },
              ]}
              actions={
                <Link
                  href="/settings/customizer/fields"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Custom fields
                </Link>
              }
            />
            {loading ? (
              <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
                Loading {supplierLabel.toLowerCase()}s...
              </div>
            ) : filteredSuppliers.length === 0 ? (
              <EmptyState
                icon="Building2"
                title={`No ${supplierLabel.toLowerCase()}s`}
                description="Add your first supplier."
                action={{
                  label: `Add ${supplierLabel}`,
                  onClick: openCreateDrawer,
                }}
              />
            ) : (
              <DataTable<PartyRow>
                data={filteredSuppliers}
                columns={columns}
                onRowClick={openEditDrawer}
                emptyMessage={`No ${supplierLabel.toLowerCase()}s.`}
              />
            )}
          </TabsContent>
          <TabsContent value="franchisees" className="mt-4 space-y-4">
            <DataTableToolbar
              searchPlaceholder={`Search ${franchiseeLabel.toLowerCase()}s...`}
              searchValue={search}
              onSearchChange={setSearch}
              actions={
                <Link
                  href="/settings/customizer/fields"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Custom fields
                </Link>
              }
            />
            {loading ? (
              <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
                Loading {franchiseeLabel.toLowerCase()}s...
              </div>
            ) : filteredFranchisees.length === 0 ? (
              <EmptyState
                icon="Users"
                title={`No ${franchiseeLabel.toLowerCase()}s`}
                description="Add your first franchisee."
                action={{
                  label: `Add ${franchiseeLabel}`,
                  onClick: openCreateDrawer,
                }}
              />
            ) : (
              <DataTable<PartyRow>
                data={filteredFranchisees}
                columns={columns}
                onRowClick={openEditDrawer}
                emptyMessage={`No ${franchiseeLabel.toLowerCase()}s.`}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <EntityDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={editingId ? `Edit ${label}` : `New ${label}`}
        description={editingId ? `Update ${label.toLowerCase()} details.` : `Add a new ${label.toLowerCase()}.`}
        mode={editingId ? "edit" : "create"}
        footer={
          <>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save" : "Create"}
            </Button>
          </>
        }
      >
        <div className="space-y-4 pr-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input placeholder="Party name" value={formName} onChange={(e) => setFormName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Code</Label>
            <Input
              placeholder={editingId ? "Supplier code" : "Auto-generated if left blank"}
              value={formCode}
              onChange={(e) => setFormCode(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" placeholder="email@example.com" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input placeholder="Phone" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
          </div>
          {tab === "customers" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Customer type</Label>
                <Select
                  value={formCustomerType}
                  onValueChange={(v) => setFormCustomerType(v as CustomerType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DISTRIBUTOR">Distributor</SelectItem>
                    <SelectItem value="WHOLESALER">Wholesaler</SelectItem>
                    <SelectItem value="RETAILER">Retailer</SelectItem>
                    <SelectItem value="FRANCHISEE">Franchisee</SelectItem>
                    <SelectItem value="END_CUSTOMER">End customer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Customer category</Label>
                <Select
                  value={formCustomerCategoryId || "__none__"}
                  onValueChange={(v) => setFormCustomerCategoryId(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {customerCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          {tab === "franchisees" && (
            <div className="space-y-2">
              <Label>Franchisee type</Label>
              <Input placeholder="e.g. Exclusive, Non-exclusive" />
            </div>
          )}
          {tab === "suppliers" && (
            <div className="space-y-2">
              <Label>Supplier type</Label>
              <Select
                value={formSupplierType}
                onValueChange={(v) => setFormSupplierType(v as SupplierType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RAW_MATERIAL">Raw material</SelectItem>
                  <SelectItem value="SERVICE">Service</SelectItem>
                  <SelectItem value="LOGISTICS">Logistics</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {tab !== "suppliers" && (
            <>
              <Separator />
              <div className="space-y-1 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Credit &amp; Terms</p>
                  <p className="text-xs text-muted-foreground">Controls credit limits and payment terms applied to sales orders and invoices.</p>
                </div>
                {creditFieldsLoading && editingId && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Icons.Loader2 className="h-3 w-3 animate-spin" />
                    Loading...
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <Label>Payment terms</Label>
                <Select
                  value={formPaymentTermsId || "__none__"}
                  onValueChange={(v) => setFormPaymentTermsId(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment terms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {paymentTerms.map((term) => (
                      <SelectItem key={term.id} value={term.id}>
                        {term.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Credit control mode</Label>
                <Select
                  value={formCreditControlMode || "__none__"}
                  onValueChange={(v) => setFormCreditControlMode(v === "__none__" ? "" : v as "AMOUNT" | "DAYS" | "HYBRID")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No credit control" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No credit control</SelectItem>
                    <SelectItem value="AMOUNT">Amount limit</SelectItem>
                    <SelectItem value="DAYS">Outstanding age limit (days)</SelectItem>
                    <SelectItem value="HYBRID">Hybrid (amount + days)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(formCreditControlMode === "AMOUNT" || formCreditControlMode === "HYBRID") && (
                <div className="space-y-2">
                  <Label>Credit amount limit</Label>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    placeholder="e.g. 500000"
                    value={formCreditLimitAmount}
                    onChange={(e) => setFormCreditLimitAmount(e.target.value)}
                  />
                </div>
              )}
              {(formCreditControlMode === "DAYS" || formCreditControlMode === "HYBRID") && (
                <div className="space-y-2">
                  <Label>Max outstanding invoice age (days)</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="e.g. 60"
                    value={formMaxOutstandingAgeDays}
                    onChange={(e) => setFormMaxOutstandingAgeDays(e.target.value)}
                  />
                </div>
              )}
              {!!formCreditControlMode && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Per-invoice days-to-pay cap</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="e.g. 30"
                      value={formPerInvoiceDaysToPayCap}
                      onChange={(e) => setFormPerInvoiceDaysToPayCap(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Warning threshold (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="e.g. 80"
                      value={formCreditWarningThresholdPct}
                      onChange={(e) => setFormCreditWarningThresholdPct(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </EntityDrawer>
    </PageShell>
  );
}
