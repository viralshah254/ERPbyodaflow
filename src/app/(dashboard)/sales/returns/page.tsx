"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AsyncSearchableSelect } from "@/components/ui/async-searchable-select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { bulkDocumentActionApi, createDocumentApi, fetchDocumentListApi } from "@/lib/api/documents";
import { searchArCustomerOptionsApi } from "@/lib/api/payments";
import { fetchWarehouseOptions } from "@/lib/api/lookups";
import { fetchProductsApi } from "@/lib/api/products";
import type { DocListRow } from "@/lib/types/documents";
import type { PartyLookupOption } from "@/lib/api/parties";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function SalesReturnsPage() {
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
  const [saving, setSaving] = React.useState(false);
  const [products, setProducts] = React.useState<Array<{ id: string; name: string; sku: string }>>([]);
  const [productId, setProductId] = React.useState("");

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
    void Promise.all([fetchWarehouseOptions(), fetchProductsApi()]).then(([warehouseItems, productItems]) => {
      setWarehouses(warehouseItems);
      setProducts(productItems.map((item) => ({ id: item.id, name: item.name, sku: item.sku })));
    });
  }, [refresh]);

  const columns = React.useMemo(
    () => [
      { id: "number", header: "Number", accessor: (r: DocListRow) => <span className="font-medium">{r.number}</span>, sticky: true },
      { id: "date", header: "Date", accessor: "date" as keyof DocListRow },
      { id: "party", header: "Customer", accessor: "party" as keyof DocListRow },
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
                await bulkDocumentActionApi("credit-note", "post", [r.id]);
                toast.success("Credit note posted.");
                await refresh();
              }}
            >
              Post
            </Button>
          ) : null,
      },
    ],
    [refresh]
  );

  return (
    <PageShell>
      <PageHeader
        title="Returns / Credit Notes"
        description="Sales returns now create and post real credit notes with AR reversal and stock receipt."
        breadcrumbs={[
          { label: "Sales", href: "/sales/overview" },
          { label: "Returns / Credit Notes" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button onClick={() => setSheetOpen(true)}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            Create Return
          </Button>
        }
      />
      <div className="space-y-4 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Returns</CardTitle>
            <CardDescription>Open a row to review the generic document detail page.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable<DocListRow>
              data={rows}
              columns={columns}
              onRowClick={(row) => router.push(`/docs/credit-note/${row.id}`)}
              emptyMessage={loading ? "Loading returns..." : "No sales returns yet."}
            />
          </CardContent>
        </Card>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
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
              />
            </div>
            <div className="space-y-2">
              <Label>Warehouse</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.sku} - {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
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
                setSaving(true);
                try {
                  const created = await createDocumentApi("credit-note", {
                    date: new Date().toISOString().slice(0, 10),
                    partyId: customerId,
                    warehouseId: warehouseId || undefined,
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
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
