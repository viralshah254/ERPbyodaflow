"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LIST_PAGE_BODY_CLASS, LIST_PAGE_SHELL_CLASS, LIST_TABLE_SURFACE_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AsyncSearchableSelect, type AsyncSearchableSelectOption } from "@/components/ui/async-searchable-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { bulkDocumentActionApi, createDocumentApi, fetchDocumentListApi } from "@/lib/api/documents";
import { searchArCustomerOptionsApi } from "@/lib/api/payments";
import { fetchWarehouseOptions } from "@/lib/api/lookups";
import { fetchProductsPageApi } from "@/lib/api/products";
import { searchDocumentOptions } from "@/lib/lookups/named-options";
import type { DocListRow } from "@/lib/types/documents";
import { CustomerLink } from "@/components/customers/CustomerLink";
import type { PartyLookupOption } from "@/lib/api/parties";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { useCanWriteSales } from "@/lib/rbac/use-write-guard";
import { listedCuNumber } from "@/lib/kra/kra-signing";

export default function SalesReturnsPage() {
  const canWrite = useCanWriteSales();
  const router = useRouter();
  const [rows, setRows] = React.useState<DocListRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [selectedCustomerOption, setSelectedCustomerOption] = React.useState<PartyLookupOption | null>(null);
  const [warehouses, setWarehouses] = React.useState<Array<{ id: string; label: string }>>([]);
  const [customerId, setCustomerId] = React.useState("");
  const [warehouseId, setWarehouseId] = React.useState("");
  const [description, setDescription] = React.useState("Returned goods");
  const [quantity, setQuantity] = React.useState("1");
  const [amount, setAmount] = React.useState("0");
  const [sourceDocumentId, setSourceDocumentId] = React.useState("");
  const [ambiguousAccepted, setAmbiguousAccepted] = React.useState(false);
  const [returnReason, setReturnReason] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [productId, setProductId] = React.useState("");
  const [productOption, setProductOption] = React.useState<AsyncSearchableSelectOption | null>(null);
  const [sourceDocumentOption, setSourceDocumentOption] = React.useState<AsyncSearchableSelectOption | null>(null);
  const [sheetPortalHost, setSheetPortalHost] = React.useState<HTMLElement | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchDocumentListApi("credit-note");
      setRows(items);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load sales returns.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
    void fetchWarehouseOptions().then(setWarehouses).catch(() => setWarehouses([]));
  }, [refresh]);

  const columns = React.useMemo(
    () => [
      { id: "number", header: "Number", accessor: (r: DocListRow) => <span className="font-medium">{r.number}</span>, sticky: true },
      {
        id: "cuInvoiceNumber",
        header: "CU number",
        accessor: (r: DocListRow) => {
          const cu = listedCuNumber(r);
          return cu ? <span className="font-mono text-xs">{cu}</span> : <span className="text-muted-foreground">—</span>;
        },
      },
      { id: "date", header: "Date", accessor: "date" as keyof DocListRow },
      {
        id: "party",
        header: "Customer",
        accessor: (r: DocListRow) => <CustomerLink id={r.partyId} name={r.party} />,
      },
      { id: "warehouse", header: "Warehouse", accessor: "warehouse" as keyof DocListRow },
      { id: "total", header: "Total", accessor: (r: DocListRow) => r.total?.toLocaleString() ?? "—" },
      { id: "status", header: "Status", accessor: "status" as keyof DocListRow },
      {
        id: "actions",
        header: "",
        accessor: (r: DocListRow) =>
          r.status === "DRAFT" ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={async (event) => {
                event.stopPropagation();
                try {
                  await bulkDocumentActionApi("credit-note", "post", [r.id]);
                  toast.success("Credit note signed and posted.");
                  await refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Sign and post failed.");
                }
              }}
            >
              Sign and post
            </Button>
          ) : null,
      },
    ],
    [refresh]
  );

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Returns / Credit Notes"
        description="Sales returns now create and post real credit notes with AR reversal and stock receipt."
        breadcrumbs={[
          { label: "Sales", href: "/sales/overview" },
          { label: "Returns / Credit Notes" },
        ]}
        sticky
        showCommandHint
        actions={canWrite ? (
          <Button onClick={() => setSheetOpen(true)}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            Create Return
          </Button>
        ) : undefined}
      />
      <div className={LIST_PAGE_BODY_CLASS}>
        <div className={LIST_TABLE_SURFACE_CLASS}>
          <div className="shrink-0 border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Returns</h3>
            <p className="text-xs text-muted-foreground">Open a row to review the generic document detail page.</p>
          </div>
          <DataTable<DocListRow>
              data={rows}
              columns={columns}
              onRowClick={(row) => router.push(`/docs/credit-note/${row.id}`)}
              emptyMessage={loading ? "Loading returns..." : "No sales returns yet."}
              scrollMode="fill"
              size="comfortable"
              className="min-h-0 flex-1 border-0"
              />
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <div ref={setSheetPortalHost}>
          <SheetHeader>
            <SheetTitle>Create sales return</SheetTitle>
            <SheetDescription>Create a credit note and capture warehouse return quantity for stock reversal.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
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
                portalContainer={sheetPortalHost}
              />
            </div>
            <div className="space-y-2">
              <Label>Warehouse</Label>
              <SearchableSelect
                value={warehouseId}
                onValueChange={setWarehouseId}
                options={warehouses.map((warehouse) => ({ id: warehouse.id, label: warehouse.label }))}
                placeholder="Search warehouses"
                searchPlaceholder="Warehouse name"
                emptyMessage="No warehouses."
              />
            </div>
            <div className="space-y-2">
              <Label>Product</Label>
              <AsyncSearchableSelect
                value={productId}
                onValueChange={(value) => {
                  setProductId(value);
                  if (!value) setProductOption(null);
                }}
                onOptionSelect={setProductOption}
                loadOptions={async (query) => {
                  const page = await fetchProductsPageApi({ search: query, limit: 20, sellable: true });
                  return page.items.map((item) => ({
                    id: item.id,
                    label: [item.sku, item.name].filter(Boolean).join(" · "),
                  }));
                }}
                selectedOption={productOption}
                portalContainer={sheetPortalHost}
                placeholder="Search products"
                searchPlaceholder="Name or SKU"
                emptyMessage="No product matches."
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Original invoice or delivery</Label>
              <AsyncSearchableSelect
                value={sourceDocumentId}
                onValueChange={(value) => {
                  setSourceDocumentId(value);
                  if (!value) setSourceDocumentOption(null);
                }}
                onOptionSelect={setSourceDocumentOption}
                loadOptions={(query) => searchDocumentOptions(["invoice", "delivery-note"], query)}
                selectedOption={sourceDocumentOption}
                portalContainer={sheetPortalHost}
                allowClear
                placeholder="Search the original sale"
                searchPlaceholder="Number or customer"
                emptyMessage="No invoice or delivery note matches."
                wrapLabels
                showSelectedDescription
                minDropdownWidth={520}
              />
            </div>
            {!sourceDocumentId.trim() ? (
              <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={ambiguousAccepted}
                    onChange={(e) => setAmbiguousAccepted(e.target.checked)}
                  />
                  <span>I confirm the original sale is ambiguous and cannot be linked.</span>
                </label>
                <Input
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Required reason and evidence reference"
                />
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button
              disabled={saving}
              onClick={async () => {
                if (!customerId || !productId) {
                  toast.error("Select a customer and product.");
                  return;
                }
                if (!sourceDocumentId.trim() && (!ambiguousAccepted || !returnReason.trim())) {
                  toast.error("Link the original document or explicitly record why the return is ambiguous.");
                  return;
                }
                setSaving(true);
                try {
                  const created = await createDocumentApi("credit-note", {
                    date: new Date().toISOString().slice(0, 10),
                    partyId: customerId,
                    warehouseId: warehouseId || undefined,
                    sourceDocumentId: sourceDocumentId.trim() || undefined,
                    sourceDocumentType: sourceDocumentId.trim() ? "invoice" : undefined,
                    returnResolution: sourceDocumentId.trim() ? "LINKED_SOURCE" : "AMBIGUOUS_ACCEPTED",
                    returnReason: returnReason.trim() || undefined,
                    lines: [
                      {
                        productId,
                        description,
                        quantity: Number(quantity) || 1,
                        amount: Number(amount) || 0,
                      },
                    ],
                    total: Number(amount) || 0,
                  });
                  toast.success("Sales return created.");
                  setSheetOpen(false);
                  router.push(`/docs/credit-note/${created.id}`);
                  await refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to create return.");
                } finally {
                  setSaving(false);
                }
              }}
            >
              Create return
            </Button>
          </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
