"use client";

/**
 * Table-first management of customer → price tag (and supplier → cost list) assignments.
 */

import * as React from "react";
import Link from "next/link";
import {
  LIST_PAGE_BODY_CLASS,
  LIST_PAGE_SHELL_CLASS,
  PageShell,
} from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RowActions } from "@/components/ui/row-actions";
import { TopProgressBar } from "@/components/ui/top-progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AsyncSearchableSelect } from "@/components/ui/async-searchable-select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  clearCustomerDefaultPriceList,
  clearSupplierDefaultCostList,
  fetchCustomerDefaultPriceLists,
  fetchPriceListOptions,
  fetchSupplierDefaultCostLists,
  setCustomerDefaultPriceList,
  setSupplierDefaultCostList,
  type CustomerDefaultPriceListRow,
  type SupplierDefaultCostListRow,
} from "@/lib/api/pricing";
import { searchPartyLookupOptionsApi, type PartyLookupOption } from "@/lib/api/parties";
import type { PartyChannel } from "@/lib/types/masters";
import { channelLabel } from "@/lib/fmcg/sfa-customer";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";

type SheetMode = "assign" | "edit";

export function CustomerPriceTagsWorkspace({ fmcgOrg }: { fmcgOrg: boolean }) {
  const tagLabel = fmcgOrg ? "Price tag" : "Price list";
  const tagLabelPlural = fmcgOrg ? "Price tags" : "Price lists";

  const [tab, setTab] = React.useState<"customers" | "suppliers">("customers");

  const [customerSearch, setCustomerSearch] = React.useState("");
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = React.useState("");
  const [customerChannel, setCustomerChannel] = React.useState<"" | PartyChannel>("");
  const [customerRows, setCustomerRows] = React.useState<CustomerDefaultPriceListRow[]>([]);
  const [customersLoaded, setCustomersLoaded] = React.useState(false);
  const [customersSoftLoading, setCustomersSoftLoading] = React.useState(false);
  const customersLoadedRef = React.useRef(false);

  const [supplierSearch, setSupplierSearch] = React.useState("");
  const [debouncedSupplierSearch, setDebouncedSupplierSearch] = React.useState("");
  const [supplierRows, setSupplierRows] = React.useState<SupplierDefaultCostListRow[]>([]);
  const [suppliersLoaded, setSuppliersLoaded] = React.useState(false);
  const [suppliersSoftLoading, setSuppliersSoftLoading] = React.useState(false);
  const suppliersLoadedRef = React.useRef(false);

  const [priceListOptions, setPriceListOptions] = React.useState<Array<{ id: string; name: string }>>([]);

  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [sheetMode, setSheetMode] = React.useState<SheetMode>("assign");
  const [sheetKind, setSheetKind] = React.useState<"customer" | "supplier">("customer");
  const [sheetPortalHost, setSheetPortalHost] = React.useState<HTMLElement | null>(null);
  const [sheetCustomerChannel, setSheetCustomerChannel] = React.useState<"" | PartyChannel>("");
  const [partyId, setPartyId] = React.useState("");
  const [partyOption, setPartyOption] = React.useState<PartyLookupOption | null>(null);
  const [listId, setListId] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [removeCustomerId, setRemoveCustomerId] = React.useState<string | null>(null);
  const [removeSupplierId, setRemoveSupplierId] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchPriceListOptions()
      .then(setPriceListOptions)
      .catch(() => setPriceListOptions([]));
  }, []);

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedCustomerSearch(customerSearch), 250);
    return () => window.clearTimeout(id);
  }, [customerSearch]);

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSupplierSearch(supplierSearch), 250);
    return () => window.clearTimeout(id);
  }, [supplierSearch]);

  const loadCustomers = React.useCallback(async () => {
    if (customersLoadedRef.current) setCustomersSoftLoading(true);
    try {
      const items = await fetchCustomerDefaultPriceLists({
        search: debouncedCustomerSearch || undefined,
        channel: customerChannel || undefined,
      });
      setCustomerRows(items);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load customer assignments.");
      setCustomerRows([]);
    } finally {
      customersLoadedRef.current = true;
      setCustomersLoaded(true);
      setCustomersSoftLoading(false);
    }
  }, [debouncedCustomerSearch, customerChannel]);

  const loadSuppliers = React.useCallback(async () => {
    if (suppliersLoadedRef.current) setSuppliersSoftLoading(true);
    try {
      const items = await fetchSupplierDefaultCostLists({
        search: debouncedSupplierSearch || undefined,
      });
      setSupplierRows(items);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load supplier assignments.");
      setSupplierRows([]);
    } finally {
      suppliersLoadedRef.current = true;
      setSuppliersLoaded(true);
      setSuppliersSoftLoading(false);
    }
  }, [debouncedSupplierSearch]);

  React.useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  React.useEffect(() => {
    if (tab === "suppliers") void loadSuppliers();
  }, [tab, loadSuppliers]);

  const loadCustomerLookup = React.useCallback(
    (query: string) =>
      searchPartyLookupOptionsApi({
        role: "customer",
        status: "ACTIVE",
        search: query,
        limit: 25,
        ...(sheetCustomerChannel ? { channel: sheetCustomerChannel } : {}),
      }),
    [sheetCustomerChannel]
  );

  const setSheetCustomerChannelAndClear = React.useCallback((next: "" | PartyChannel) => {
    setSheetCustomerChannel(next);
    setPartyId("");
    setPartyOption(null);
  }, []);

  const loadSupplierLookup = React.useCallback(
    (query: string) =>
      searchPartyLookupOptionsApi({
        role: "supplier",
        status: "ACTIVE",
        search: query,
        limit: 25,
      }),
    []
  );

  const openAssignCustomer = () => {
    setSheetKind("customer");
    setSheetMode("assign");
    setSheetCustomerChannel("");
    setPartyId("");
    setPartyOption(null);
    setListId("");
    setSheetOpen(true);
  };

  const openEditCustomer = (row: CustomerDefaultPriceListRow) => {
    setSheetKind("customer");
    setSheetMode("edit");
    setPartyId(row.customerId);
    setPartyOption({
      id: row.customerId,
      label: row.customerName ?? row.customerId,
      description: row.customerCode,
    });
    setListId(row.priceListId ?? "");
    setSheetOpen(true);
  };

  const openAssignSupplier = () => {
    setSheetKind("supplier");
    setSheetMode("assign");
    setPartyId("");
    setPartyOption(null);
    setListId("");
    setSheetOpen(true);
  };

  const openEditSupplier = (row: SupplierDefaultCostListRow) => {
    setSheetKind("supplier");
    setSheetMode("edit");
    setPartyId(row.supplierId);
    setPartyOption({
      id: row.supplierId,
      label: row.supplierName ?? row.supplierId,
      description: row.supplierCode,
    });
    setListId(row.costListId ?? "");
    setSheetOpen(true);
  };

  const handleSaveSheet = async () => {
    if (!partyId.trim() || !listId) {
      toast.error(
        sheetKind === "customer"
          ? `Select a customer and ${tagLabel.toLowerCase()}.`
          : "Select a supplier and cost list."
      );
      return;
    }
    setSaving(true);
    try {
      if (sheetKind === "customer") {
        await setCustomerDefaultPriceList(partyId.trim(), listId);
        toast.success(`${tagLabel} assigned.`);
        setSheetOpen(false);
        await loadCustomers();
      } else {
        await setSupplierDefaultCostList(partyId.trim(), listId);
        toast.success("Cost list assigned.");
        setSheetOpen(false);
        await loadSuppliers();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCustomer = async () => {
    if (!removeCustomerId) return;
    setSaving(true);
    try {
      await clearCustomerDefaultPriceList(removeCustomerId);
      toast.success(`${tagLabel} removed from customer.`);
      setRemoveCustomerId(null);
      await loadCustomers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Remove failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSupplier = async () => {
    if (!removeSupplierId) return;
    setSaving(true);
    try {
      await clearSupplierDefaultCostList(removeSupplierId);
      toast.success("Cost list removed from supplier.");
      setRemoveSupplierId(null);
      await loadSuppliers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Remove failed.");
    } finally {
      setSaving(false);
    }
  };

  const customerColumns = React.useMemo(
    () => [
      {
        id: "customer",
        header: "Customer",
        sticky: true,
        accessor: (r: CustomerDefaultPriceListRow) => (
          <div className="min-w-0">
            <div className="font-medium truncate">{r.customerName ?? r.customerId}</div>
            {r.customerCode ? (
              <div className="text-xs text-muted-foreground font-mono">{r.customerCode}</div>
            ) : null}
          </div>
        ),
      },
      ...(fmcgOrg
        ? [
            {
              id: "channel",
              header: "Channel",
              accessor: (r: CustomerDefaultPriceListRow) =>
                r.channel ? (
                  <Badge variant="secondary" className="font-normal">
                    {channelLabel(r.channel as PartyChannel) || r.channel}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                ),
            },
          ]
        : []),
      {
        id: "tag",
        header: tagLabel,
        accessor: (r: CustomerDefaultPriceListRow) => (
          <span className="font-medium">{r.priceListName ?? r.priceListId ?? "—"}</span>
        ),
      },
      {
        id: "source",
        header: "Source",
        accessor: (r: CustomerDefaultPriceListRow) => (
          <Badge variant="outline" className="font-normal">
            {r.source === "category" ? "Category default" : "Customer"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "",
        className: "w-[50px]",
        accessor: (r: CustomerDefaultPriceListRow) => (
          <div onClick={(e) => e.stopPropagation()}>
            <RowActions
              actions={[
                {
                  label: "Edit",
                  icon: "Pencil",
                  onClick: () => openEditCustomer(r),
                },
                ...(r.source === "party"
                  ? [
                      {
                        label: "Remove tag",
                        icon: "Trash2" as const,
                        onClick: () => setRemoveCustomerId(r.customerId),
                        variant: "destructive" as const,
                      },
                    ]
                  : []),
              ]}
            />
          </div>
        ),
      },
    ],
    [fmcgOrg, tagLabel]
  );

  const supplierColumns = React.useMemo(
    () => [
      {
        id: "supplier",
        header: "Supplier",
        sticky: true,
        accessor: (r: SupplierDefaultCostListRow) => (
          <div className="min-w-0">
            <div className="font-medium truncate">{r.supplierName ?? r.supplierId}</div>
            {r.supplierCode ? (
              <div className="text-xs text-muted-foreground font-mono">{r.supplierCode}</div>
            ) : null}
          </div>
        ),
      },
      {
        id: "cost",
        header: "Cost list",
        accessor: (r: SupplierDefaultCostListRow) => (
          <span className="font-medium">{r.costListName ?? r.costListId ?? "—"}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        className: "w-[50px]",
        accessor: (r: SupplierDefaultCostListRow) => (
          <div onClick={(e) => e.stopPropagation()}>
            <RowActions
              actions={[
                {
                  label: "Edit",
                  icon: "Pencil",
                  onClick: () => openEditSupplier(r),
                },
                {
                  label: "Remove",
                  icon: "Trash2",
                  onClick: () => setRemoveSupplierId(r.supplierId),
                  variant: "destructive",
                },
              ]}
            />
          </div>
        ),
      },
    ],
    []
  );

  const removeCustomer = removeCustomerId
    ? customerRows.find((r) => r.customerId === removeCustomerId)
    : undefined;
  const removeSupplier = removeSupplierId
    ? supplierRows.find((r) => r.supplierId === removeSupplierId)
    : undefined;

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title={fmcgOrg ? "Customer price tags" : "Customer defaults"}
        description={
          fmcgOrg
            ? "Assign which price tag each customer uses on sales orders. Click a row to edit or remove."
            : "Assign a default price list per customer. Click a row to edit or remove."
        }
        breadcrumbs={[
          { label: "Pricing", href: "/pricing/workspace/overview" },
          { label: fmcgOrg ? "Customer tags" : "Defaults" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/pricing/workspace/lists">{tagLabelPlural}</Link>
            </Button>
            <Button
              size="sm"
              onClick={tab === "customers" ? openAssignCustomer : openAssignSupplier}
            >
              <Icons.Plus className="mr-2 h-4 w-4" />
              {tab === "customers" ? `Assign ${tagLabel.toLowerCase()}` : "Assign cost list"}
            </Button>
          </div>
        }
      />

      <div className={LIST_PAGE_BODY_CLASS}>
        <Tabs value={tab} onValueChange={(v) => setTab(v as "customers" | "suppliers")} className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mb-3 w-fit">
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          </TabsList>

          <TabsContent value="customers" className="mt-0 flex min-h-0 flex-1 flex-col gap-3 data-[state=inactive]:hidden">
            <DataTableToolbar
              searchPlaceholder="Search customers by name, code, phone…"
              searchValue={customerSearch}
              onSearchChange={setCustomerSearch}
              filters={
                fmcgOrg
                  ? [
                      {
                        id: "channel",
                        label: "Channel",
                        value: customerChannel,
                        onChange: (v) => setCustomerChannel((v as "" | PartyChannel) || ""),
                        options: [
                          { label: "All channels", value: "" },
                          { label: "Modern trade", value: "MODERN_TRADE" },
                          { label: "General trade", value: "GENERAL_TRADE" },
                        ],
                      },
                    ]
                  : undefined
              }
            />
            {!customersLoaded ? (
              <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border">
                <TopProgressBar active />
                <div className="space-y-2 p-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-10 animate-pulse rounded bg-muted/60" />
                  ))}
                </div>
              </div>
            ) : customerRows.length === 0 ? (
              <EmptyState
                icon="Tags"
                title={debouncedCustomerSearch || customerChannel ? "No matching assignments" : `No ${tagLabel.toLowerCase()} assignments`}
                description={
                  debouncedCustomerSearch || customerChannel
                    ? "Try another search or channel filter."
                    : `Assign a ${tagLabel.toLowerCase()} to customers that need one.`
                }
                action={{
                  label: `Assign ${tagLabel.toLowerCase()}`,
                  onClick: openAssignCustomer,
                }}
              />
            ) : (
              <div className="relative min-h-0 flex-1">
                <TopProgressBar active={customersSoftLoading} />
                <DataTable<CustomerDefaultPriceListRow>
                  data={customerRows}
                  columns={customerColumns}
                  onRowClick={openEditCustomer}
                  emptyMessage="No assignments."
                  scrollMode="fill"
                  size="comfortable"
                  className={cn(
                    "min-h-0 flex-1 border-0 transition-opacity duration-200",
                    customersSoftLoading && "opacity-60"
                  )}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="suppliers" className="mt-0 flex min-h-0 flex-1 flex-col gap-3 data-[state=inactive]:hidden">
            <DataTableToolbar
              searchPlaceholder="Search suppliers by name or code…"
              searchValue={supplierSearch}
              onSearchChange={setSupplierSearch}
            />
            {!suppliersLoaded ? (
              <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border">
                <TopProgressBar active />
                <div className="space-y-2 p-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-10 animate-pulse rounded bg-muted/60" />
                  ))}
                </div>
              </div>
            ) : supplierRows.length === 0 ? (
              <EmptyState
                icon="Truck"
                title={debouncedSupplierSearch ? "No matching assignments" : "No supplier cost lists"}
                description="Optional — assign a default cost list for purchase orders."
                action={{
                  label: "Assign cost list",
                  onClick: openAssignSupplier,
                }}
              />
            ) : (
              <div className="relative min-h-0 flex-1">
                <TopProgressBar active={suppliersSoftLoading} />
                <DataTable<SupplierDefaultCostListRow>
                  data={supplierRows}
                  columns={supplierColumns}
                  onRowClick={openEditSupplier}
                  emptyMessage="No assignments."
                  scrollMode="fill"
                  size="comfortable"
                  className={cn(
                    "min-h-0 flex-1 border-0 transition-opacity duration-200",
                    suppliersSoftLoading && "opacity-60"
                  )}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <div ref={setSheetPortalHost} className="flex flex-col gap-4">
            <SheetHeader>
              <SheetTitle>
                {sheetKind === "customer"
                  ? sheetMode === "edit"
                    ? `Edit ${tagLabel.toLowerCase()}`
                    : `Assign ${tagLabel.toLowerCase()}`
                  : sheetMode === "edit"
                    ? "Edit cost list"
                    : "Assign cost list"}
              </SheetTitle>
              <SheetDescription>
                {sheetKind === "customer"
                  ? fmcgOrg
                    ? "Orders use this tag’s piece prices; pack prices calculate from packaging."
                    : "Default price list for this customer on sales documents."
                  : "Default cost list for purchase orders from this supplier."}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 py-2">
              <div className="grid gap-2">
                <Label>{sheetKind === "customer" ? "Customer" : "Supplier"}</Label>
                {sheetMode === "edit" ? (
                  <div className="rounded-md border px-3 py-2 text-sm">
                    <div className="font-medium">{partyOption?.label}</div>
                    {partyOption?.description ? (
                      <div className="text-xs text-muted-foreground font-mono">{partyOption.description}</div>
                    ) : null}
                  </div>
                ) : (
                  <AsyncSearchableSelect
                    value={partyId}
                    onValueChange={(value) => {
                      setPartyId(value);
                      if (!value) setPartyOption(null);
                    }}
                    onOptionSelect={(option) => setPartyOption(option)}
                    loadOptions={sheetKind === "customer" ? loadCustomerLookup : loadSupplierLookup}
                    selectedOption={partyOption}
                    placeholder={sheetKind === "customer" ? "Select customer" : "Select supplier"}
                    searchPlaceholder="Type name, code, phone, or email"
                    emptyMessage={
                      sheetKind === "customer"
                        ? sheetCustomerChannel
                          ? "No customers in this channel. Try All or another filter."
                          : "No customers found."
                        : "No suppliers found."
                    }
                    portalContainer={sheetPortalHost}
                    reloadToken={
                      sheetKind === "customer" ? sheetCustomerChannel || "all" : "supplier"
                    }
                    listHeader={
                      fmcgOrg && sheetKind === "customer" ? (
                        <div
                          className="flex flex-wrap items-center gap-1.5"
                          role="group"
                          aria-label="Filter customers by channel"
                        >
                          <Icons.ListFilter
                            className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                            aria-hidden
                          />
                          <span className="mr-0.5 text-[11px] text-muted-foreground">
                            Narrow list
                          </span>
                          {(
                            [
                              { value: "" as const, label: "All" },
                              { value: "MODERN_TRADE" as const, label: "Modern trade" },
                              { value: "GENERAL_TRADE" as const, label: "General trade" },
                            ] as const
                          ).map((opt) => {
                            const active = sheetCustomerChannel === opt.value;
                            return (
                              <button
                                key={opt.label}
                                type="button"
                                aria-pressed={active}
                                className={cn(
                                  "rounded-md border px-2 py-0.5 text-[11px] transition-colors",
                                  active
                                    ? "border-primary/30 bg-primary/10 text-primary"
                                    : "border-transparent bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                                onPointerDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSheetCustomerChannelAndClear(opt.value);
                                }}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      ) : null
                    }
                  />
                )}
              </div>
              <div className="grid gap-2">
                <Label>{sheetKind === "customer" ? tagLabel : "Cost list"}</Label>
                <Select value={listId} onValueChange={setListId}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        sheetKind === "customer"
                          ? `Select ${tagLabel.toLowerCase()}`
                          : "Select cost list"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {priceListOptions.map((pl) => (
                      <SelectItem key={pl.id} value={pl.id}>
                        {pl.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <SheetFooter className="gap-2 sm:justify-between">
              {sheetMode === "edit" && sheetKind === "customer" ? (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={saving}
                  onClick={() => {
                    setSheetOpen(false);
                    setRemoveCustomerId(partyId);
                  }}
                >
                  Remove
                </Button>
              ) : sheetMode === "edit" && sheetKind === "supplier" ? (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={saving}
                  onClick={() => {
                    setSheetOpen(false);
                    setRemoveSupplierId(partyId);
                  }}
                >
                  Remove
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSheetOpen(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={() => void handleSaveSheet()} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!removeCustomerId}
        onOpenChange={(open) => {
          if (!open) setRemoveCustomerId(null);
        }}
        title={`Remove ${tagLabel.toLowerCase()}?`}
        description={
          removeCustomer
            ? `“${removeCustomer.customerName ?? removeCustomer.customerId}” will no longer use “${removeCustomer.priceListName ?? removeCustomer.priceListId}” as their default.`
            : `Clear this customer’s ${tagLabel.toLowerCase()}.`
        }
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => void handleRemoveCustomer()}
      />

      <ConfirmDialog
        open={!!removeSupplierId}
        onOpenChange={(open) => {
          if (!open) setRemoveSupplierId(null);
        }}
        title="Remove cost list?"
        description={
          removeSupplier
            ? `“${removeSupplier.supplierName ?? removeSupplier.supplierId}” will no longer use “${removeSupplier.costListName ?? removeSupplier.costListId}”.`
            : "Clear this supplier’s default cost list."
        }
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => void handleRemoveSupplier()}
      />
    </PageShell>
  );
}
