"use client";

import * as React from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import {
  createManufacturingWorkOrder,
  fetchManufacturingBoms,
  fetchManufacturingWorkOrders,
  runManufacturingWorkOrderAction,
  type ManufacturingBom,
  type ManufacturingWorkOrder,
} from "@/lib/api/manufacturing";
import { listProducts } from "@/lib/data/products.repo";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function WorkOrdersPage() {
  const terminology = useTerminology();
  const woLabel = t("workOrder", terminology);
  const products = React.useMemo(() => listProducts(), []);
  const [rows, setRows] = React.useState<ManufacturingWorkOrder[]>([]);
  const [boms, setBoms] = React.useState<ManufacturingBom[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [bomId, setBomId] = React.useState("");
  const [productId, setProductId] = React.useState("");
  const [quantity, setQuantity] = React.useState("1");
  const [dueDate, setDueDate] = React.useState("");

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const [nextRows, nextBoms] = await Promise.all([
        fetchManufacturingWorkOrders(),
        fetchManufacturingBoms(),
      ]);
      setRows(nextRows);
      setBoms(nextBoms);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load work orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const columns = [
    { id: "number", header: "Number", accessor: (r: ManufacturingWorkOrder) => <span className="font-medium">{r.number}</span>, sticky: true },
    {
      id: "product",
      header: "Product",
      accessor: (r: ManufacturingWorkOrder) => r.productSku ? `${r.productSku} - ${r.productName}` : r.productName ?? r.productId,
    },
    { id: "bom", header: "BOM", accessor: (r: ManufacturingWorkOrder) => r.bomName ?? "—" },
    { id: "qty", header: "Planned qty", accessor: (r: ManufacturingWorkOrder) => r.plannedQuantity },
    { id: "produced", header: "Produced", accessor: (r: ManufacturingWorkOrder) => r.producedQuantity },
    { id: "open", header: "Open", accessor: (r: ManufacturingWorkOrder) => r.openQuantity },
    { id: "dueDate", header: "Due date", accessor: (r: ManufacturingWorkOrder) => r.dueDate?.slice(0, 10) ?? "—" },
    { id: "status", header: "Status", accessor: (r: ManufacturingWorkOrder) => <StatusBadge status={r.status} /> },
    {
      id: "actions",
      header: "",
      accessor: (r: ManufacturingWorkOrder) => (
        <div className="flex gap-2">
          {r.status === "DRAFT" && (
            <Button size="sm" variant="ghost" onClick={async () => {
              await runManufacturingWorkOrderAction(r.id, { action: "release" });
              await refresh();
            }}>
              Release
            </Button>
          )}
          {r.status === "RELEASED" && (
            <Button size="sm" variant="ghost" onClick={async () => {
              await runManufacturingWorkOrderAction(r.id, { action: "start" });
              await refresh();
            }}>
              Start
            </Button>
          )}
          {r.status === "IN_PROGRESS" && (
            <Button size="sm" variant="ghost" onClick={async () => {
              await runManufacturingWorkOrderAction(r.id, {
                action: "complete",
                producedQuantity: r.openQuantity > 0 ? r.quantity : r.producedQuantity,
              });
              await refresh();
            }}>
              Complete
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageLayout
      title={woLabel}
      description="Create, issue, and receive work orders"
      actions={
        <Button onClick={() => setSheetOpen(true)}>
          <Icons.Plus className="mr-2 h-4 w-4" />
          New work order
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Work orders</CardTitle>
          <CardDescription>Live production orders with release, start, and completion progress.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable data={rows} columns={columns} emptyMessage={loading ? "Loading work orders..." : "No work orders."} />
        </CardContent>
      </Card>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>New work order</SheetTitle>
            <SheetDescription>Create a production order from a BOM or directly from a finished good.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>BOM</Label>
              <Select value={bomId || "__none__"} onValueChange={(value) => {
                const nextBomId = value === "__none__" ? "" : value;
                setBomId(nextBomId);
                const bom = boms.find((item) => item.id === nextBomId);
                if (bom) setProductId(bom.finishedProductId);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional BOM" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No BOM</SelectItem>
                  {boms.map((bom) => (
                    <SelectItem key={bom.id} value={bom.id}>
                      {bom.code} - {bom.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Finished product</Label>
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
              <Label>Quantity</Label>
              <Input type="number" min="0.001" step="0.001" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Due date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button
              disabled={saving || !productId}
              onClick={async () => {
                setSaving(true);
                try {
                  await createManufacturingWorkOrder({
                    productId,
                    bomId: bomId || undefined,
                    quantity: Number(quantity) || 0,
                    dueDate: dueDate || undefined,
                  });
                  toast.success("Work order created.");
                  setSheetOpen(false);
                  setBomId("");
                  setProductId("");
                  setQuantity("1");
                  setDueDate("");
                  await refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to create work order.");
                } finally {
                  setSaving(false);
                }
              }}
            >
              Create work order
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageLayout>
  );
}
