"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listAssets, createAsset, updateAsset } from "@/lib/data/assets.repo";
import { type AssetRow, type DepreciationMethod } from "@/lib/mock/assets/register";
import { getMockAPSuppliers } from "@/lib/mock/ap";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const CATEGORIES = ["IT Equipment", "Machinery", "Furniture", "Vehicles", "Other"];

export default function AssetRegisterPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AssetRow | null>(null);
  const [form, setForm] = React.useState({
    code: "",
    name: "",
    category: "",
    acquisitionDate: "",
    cost: 0,
    salvage: 0,
    usefulLifeYears: 3,
    depreciationMethod: "STRAIGHT_LINE" as DepreciationMethod,
    linkedVendorId: "",
    linkedInvoiceId: "",
  });

  const [rows, setRows] = React.useState<AssetRow[]>(() => listAssets());
  const refresh = React.useCallback(() => setRows(listAssets()), []);
  const filtered = React.useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
    );
  }, [rows, search]);
  const suppliers = React.useMemo(() => getMockAPSuppliers(), []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      code: "",
      name: "",
      category: CATEGORIES[0] ?? "",
      acquisitionDate: new Date().toISOString().slice(0, 10),
      cost: 0,
      salvage: 0,
      usefulLifeYears: 3,
      depreciationMethod: "STRAIGHT_LINE",
      linkedVendorId: "",
      linkedInvoiceId: "",
    });
    setDrawerOpen(true);
  };

  const openEdit = (r: AssetRow) => {
    setEditing(r);
    setForm({
      code: r.code,
      name: r.name,
      category: r.category,
      acquisitionDate: r.acquisitionDate,
      cost: r.cost,
      salvage: r.salvage,
      usefulLifeYears: r.usefulLifeYears,
      depreciationMethod: r.depreciationMethod,
      linkedVendorId: r.linkedVendorId ?? "",
      linkedInvoiceId: r.linkedInvoiceId ?? "",
    });
    setDrawerOpen(true);
  };

  const columns = React.useMemo(
    () => [
      { id: "code", header: "Code", accessor: (r: AssetRow) => <span className="font-medium">{r.code}</span>, sticky: true },
      { id: "name", header: "Name", accessor: "name" as keyof AssetRow },
      { id: "category", header: "Category", accessor: "category" as keyof AssetRow },
      { id: "acquisitionDate", header: "Acquired", accessor: "acquisitionDate" as keyof AssetRow },
      { id: "cost", header: "Cost", accessor: (r: AssetRow) => formatMoney(r.cost, "KES") },
      { id: "status", header: "Status", accessor: (r: AssetRow) => r.status },
    ],
    []
  );

  return (
    <PageShell>
      <PageHeader
        title="Asset register"
        description="Create/edit assets, depreciation method, linked vendor/invoice"
        breadcrumbs={[
          { label: "Assets", href: "/assets/overview" },
          { label: "Register" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex items-center gap-2">
            <ExplainThis prompt="Explain asset register, depreciation methods, and linked vendor/invoice." label="Explain register" />
            <Button size="sm" onClick={openCreate}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              Add asset
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search by code, name, category..."
          searchValue={search}
          onSearchChange={setSearch}
          onExport={() => toast.info("Export (stub)")}
        />
        <Card>
          <CardHeader>
            <CardTitle>Assets</CardTitle>
            <CardDescription>Code, name, category, acquisition date, cost, salvage, useful life. Straight-line (mock).</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable<AssetRow>
              data={filtered}
              columns={columns}
              onRowClick={(row) => router.push(`/assets/register/${row.id}`)}
              emptyMessage="No assets."
            />
          </CardContent>
        </Card>
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit asset" : "Add asset"}</SheetTitle>
            <SheetDescription>Saved to browser storage. API pending.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} placeholder="FA-001" />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Asset name" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Acquisition date</Label>
              <Input type="date" value={form.acquisitionDate} onChange={(e) => setForm((p) => ({ ...p, acquisitionDate: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cost</Label>
                <Input type="number" value={form.cost || ""} onChange={(e) => setForm((p) => ({ ...p, cost: Number(e.target.value) || 0 }))} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Salvage</Label>
                <Input type="number" value={form.salvage || ""} onChange={(e) => setForm((p) => ({ ...p, salvage: Number(e.target.value) || 0 }))} placeholder="0" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Useful life (years)</Label>
              <Input type="number" value={form.usefulLifeYears || ""} onChange={(e) => setForm((p) => ({ ...p, usefulLifeYears: Number(e.target.value) || 0 }))} placeholder="3" />
            </div>
            <div className="space-y-2">
              <Label>Depreciation method</Label>
              <Select value={form.depreciationMethod} onValueChange={(v) => setForm((p) => ({ ...p, depreciationMethod: v as DepreciationMethod }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STRAIGHT_LINE">Straight-line</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Linked vendor (stub)</Label>
              <Select value={form.linkedVendorId} onValueChange={(v) => setForm((p) => ({ ...p, linkedVendorId: v }))}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Linked invoice (stub)</Label>
              <Input value={form.linkedInvoiceId} onChange={(e) => setForm((p) => ({ ...p, linkedInvoiceId: e.target.value }))} placeholder="Optional" />
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (editing) {
                  updateAsset(editing.id, {
                    code: form.code,
                    name: form.name,
                    category: form.category,
                    acquisitionDate: form.acquisitionDate,
                    cost: form.cost,
                    salvage: form.salvage,
                    usefulLifeYears: form.usefulLifeYears,
                    depreciationMethod: form.depreciationMethod,
                    linkedVendorId: form.linkedVendorId || undefined,
                    linkedInvoiceId: form.linkedInvoiceId || undefined,
                  });
                  toast.success("Asset updated.");
                } else {
                  createAsset({
                    code: form.code,
                    name: form.name,
                    category: form.category,
                    acquisitionDate: form.acquisitionDate,
                    cost: form.cost,
                    salvage: form.salvage,
                    usefulLifeYears: form.usefulLifeYears,
                    depreciationMethod: form.depreciationMethod,
                    linkedVendorId: form.linkedVendorId || undefined,
                    linkedInvoiceId: form.linkedInvoiceId || undefined,
                    status: "ACTIVE",
                  });
                  toast.success("Asset created.");
                }
                setDrawerOpen(false);
                refresh();
              }}
            >
              {editing ? "Save" : "Create"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
