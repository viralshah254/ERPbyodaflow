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
import { createAssetApi, fetchAssetsApi, updateAssetApi } from "@/lib/api/assets";
import type { AssetRow, CustodyType, DepreciationMethod } from "@/lib/types/assets";
import { fetchApSuppliersApi } from "@/lib/api/payments";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const CATEGORIES = ["IT Equipment", "Machinery", "Furniture", "Vehicles", "Other"];

const VEHICLES_CATEGORY = "Vehicles";

/** Annual reducing-balance rates: motor vehicles 25%; equipment & everything else 10%. */
function defaultAnnualDepreciationRatePct(category: string): number {
  return category === VEHICLES_CATEGORY ? 25 : 10;
}

function suggestNextFaCode(rows: AssetRow[]): string {
  let max = 0;
  for (const r of rows) {
    const m = /^FA-(\d+)$/i.exec(String(r.code).trim());
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `FA-${String(max + 1).padStart(3, "0")}`;
}

const CUSTODY_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "ALL", label: "All custody" },
  { value: "ORG_STOCK", label: "HQ / stock" },
  { value: "FRANCHISE_OUTLET", label: "With franchise outlet" },
  { value: "EMPLOYEE", label: "With employee" },
  { value: "IN_TRANSIT", label: "In transit" },
];

function custodyLabel(r: AssetRow): string {
  if (r.custodianOutletName) return r.custodianOutletName;
  if (r.custodianEmployeeName) return r.custodianEmployeeName;
  return r.currentCustodyType?.replace(/_/g, " ") ?? "—";
}

type AssetForm = {
  code: string;
  name: string;
  category: string;
  branchId: string;
  serialNumber: string;
  assetTag: string;
  model: string;
  inServiceDate: string;
  acquisitionDate: string;
  cost: number;
  salvage: number;
  usefulLifeYears: number;
  usefulLifeMonths: string;
  depreciationMethod: DepreciationMethod;
  depreciationRatePct: string;
  linkedVendorId: string;
  linkedInvoiceId: string;
};

function emptyForm(): AssetForm {
  const defaultCat = CATEGORIES[0] ?? "Other";
  return {
    code: "",
    name: "",
    category: defaultCat,
    branchId: "",
    serialNumber: "",
    assetTag: "",
    model: "",
    inServiceDate: "",
    acquisitionDate: new Date().toISOString().slice(0, 10),
    cost: 0,
    salvage: 0,
    usefulLifeYears: 3,
    usefulLifeMonths: "",
    depreciationMethod: "REDUCING_BALANCE",
    depreciationRatePct: String(defaultAnnualDepreciationRatePct(defaultCat)),
    linkedVendorId: "",
    linkedInvoiceId: "",
  };
}

function formFromRow(r: AssetRow): AssetForm {
  return {
    code: r.code,
    name: r.name,
    category: r.category,
    branchId: r.branchId ?? "",
    serialNumber: r.serialNumber ?? "",
    assetTag: r.assetTag ?? "",
    model: r.model ?? "",
    inServiceDate: r.inServiceDate ?? "",
    acquisitionDate: r.acquisitionDate,
    cost: r.cost,
    salvage: r.salvage,
    usefulLifeYears: r.usefulLifeYears,
    usefulLifeMonths: r.usefulLifeMonths != null ? String(r.usefulLifeMonths) : "",
    depreciationMethod: r.depreciationMethod,
    depreciationRatePct: r.depreciationRatePct != null ? String(r.depreciationRatePct) : "",
    linkedVendorId: r.linkedVendorId ?? "",
    linkedInvoiceId: r.linkedInvoiceId ?? "",
  };
}

export default function AssetRegisterPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [custodyFilter, setCustodyFilter] = React.useState("ALL");
  const [isLoading, setIsLoading] = React.useState(true);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AssetRow | null>(null);
  const [suppliers, setSuppliers] = React.useState<Array<{ id: string; name: string }>>([]);
  const [form, setForm] = React.useState<AssetForm>(() => emptyForm());

  const [rows, setRows] = React.useState<AssetRow[]>([]);
  const refresh = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [assets, supplierOptions] = await Promise.all([
        fetchAssetsApi(
          custodyFilter === "ALL" ? undefined : { custodyType: custodyFilter as CustodyType }
        ),
        fetchApSuppliersApi(),
      ]);
      setRows(assets);
      setSuppliers(supplierOptions);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [custodyFilter]);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        (r.assetTag?.toLowerCase().includes(q) ?? false) ||
        (r.serialNumber?.toLowerCase().includes(q) ?? false) ||
        (r.custodianOutletName?.toLowerCase().includes(q) ?? false) ||
        (r.custodianEmployeeName?.toLowerCase().includes(q) ?? false)
    );
  }, [rows, search]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const openCreate = () => {
    setEditing(null);
    const base = emptyForm();
    setForm({ ...base, code: suggestNextFaCode(rows) });
    setDrawerOpen(true);
  };

  const openEdit = (r: AssetRow) => {
    setEditing(r);
    setForm(formFromRow(r));
    setDrawerOpen(true);
  };

  const columns = React.useMemo(
    () => [
      { id: "code", header: "Code", accessor: (r: AssetRow) => <span className="font-medium">{r.code}</span>, sticky: true },
      { id: "name", header: "Name", accessor: "name" as keyof AssetRow },
      { id: "category", header: "Category", accessor: "category" as keyof AssetRow },
      {
        id: "assigned",
        header: "Assigned to",
        accessor: (r: AssetRow) => <span className="text-sm text-muted-foreground">{custodyLabel(r)}</span>,
      },
      {
        id: "tag",
        header: "Tag / serial",
        accessor: (r: AssetRow) => (
          <span className="text-xs text-muted-foreground font-mono">
            {[r.assetTag, r.serialNumber].filter(Boolean).join(" · ") || "—"}
          </span>
        ),
      },
      { id: "acquisitionDate", header: "Acquired", accessor: "acquisitionDate" as keyof AssetRow },
      { id: "cost", header: "Cost", accessor: (r: AssetRow) => formatMoney(r.cost, "KES") },
      { id: "status", header: "Status", accessor: (r: AssetRow) => r.status.replace(/_/g, " ") },
    ],
    []
  );

  const parseOptionalInt = (v: string): number | undefined => {
    const n = Number(v);
    return v.trim() !== "" && Number.isFinite(n) ? Math.round(n) : undefined;
  };

  const parseOptionalRate = (v: string): number | undefined => {
    const n = Number(v);
    return v.trim() !== "" && Number.isFinite(n) ? n : undefined;
  };

  return (
    <PageShell>
      <PageHeader
        title="Asset register"
        description="Custody (outlets & staff), depreciation, and linked source documents."
        breadcrumbs={[
          { label: "Assets", href: "/assets/overview" },
          { label: "Register" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex items-center gap-2">
            <ExplainThis prompt="Explain asset register, custody vs ownership, and depreciation methods." label="Explain register" />
            <Button size="sm" onClick={openCreate}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              Add asset
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <DataTableToolbar
            searchPlaceholder="Search code, name, tag, assignee…"
            searchValue={search}
            onSearchChange={setSearch}
            className="flex-1 min-w-[200px]"
          />
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Custody</Label>
            <Select value={custodyFilter} onValueChange={setCustodyFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CUSTODY_FILTER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Assets</CardTitle>
            <CardDescription>Legal register lives here; custody can move to franchisees or staff without changing book cost.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable<AssetRow>
              data={filtered}
              columns={columns}
              onRowClick={(row) => router.push(`/assets/register/${row.id}`)}
              emptyMessage={isLoading ? "Loading assets..." : "No assets."}
            />
          </CardContent>
        </Card>
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit asset" : "Add asset"}</SheetTitle>
            <SheetDescription>Financial master record — use the asset detail page to transfer custody.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Code</Label>
              {!editing && (
                <p className="text-xs text-muted-foreground">
                  Next available code ({form.code}). Editable after the asset exists.
                </p>
              )}
              <Input
                readOnly={!editing}
                className={!editing ? "bg-muted/50" : undefined}
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                placeholder="FA-001"
              />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Asset name" />
            </div>
            <div className="space-y-2">
              <Label>Branch ID (optional)</Label>
              <Input
                value={form.branchId}
                onChange={(e) => setForm((p) => ({ ...p, branchId: e.target.value }))}
                placeholder="Branch document id"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Serial</Label>
                <Input value={form.serialNumber} onChange={(e) => setForm((p) => ({ ...p, serialNumber: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Asset tag</Label>
                <Input value={form.assetTag} onChange={(e) => setForm((p) => ({ ...p, assetTag: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Input value={form.model} onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    category: v,
                    depreciationRatePct: String(defaultAnnualDepreciationRatePct(v)),
                  }))
                }
              >
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Default reducing-balance depreciation: Vehicles 25% per year; IT Equipment, Machinery, Furniture,
                and Other 10% per year.
              </p>
            </div>
            <div className="space-y-2">
              <Label>In-service date (optional)</Label>
              <Input
                type="date"
                value={form.inServiceDate}
                onChange={(e) => setForm((p) => ({ ...p, inServiceDate: e.target.value }))}
              />
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
              <Input
                type="number"
                value={form.usefulLifeYears || ""}
                onChange={(e) => setForm((p) => ({ ...p, usefulLifeYears: Number(e.target.value) || 0 }))}
                placeholder="3"
              />
            </div>
            <div className="space-y-2">
              <Label>Useful life (months override, optional)</Label>
              <Input
                type="number"
                value={form.usefulLifeMonths}
                onChange={(e) => setForm((p) => ({ ...p, usefulLifeMonths: e.target.value }))}
                placeholder="e.g. 36 — else years × 12"
              />
            </div>
            <div className="space-y-2">
              <Label>Depreciation method</Label>
              <Select value={form.depreciationMethod} onValueChange={(v) => setForm((p) => ({ ...p, depreciationMethod: v as DepreciationMethod }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STRAIGHT_LINE">Straight-line</SelectItem>
                  <SelectItem value="REDUCING_BALANCE">Reducing balance</SelectItem>
                </SelectContent>
              </Select>
              {form.depreciationMethod === "STRAIGHT_LINE" && (
                <p className="text-xs text-muted-foreground">
                  Straight-line uses cost, salvage value, and useful life only (annual % below is ignored).
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Annual depreciation % (for reducing balance)</Label>
              <Input
                type="number"
                disabled={form.depreciationMethod !== "REDUCING_BALANCE"}
                value={form.depreciationRatePct}
                onChange={(e) => setForm((p) => ({ ...p, depreciationRatePct: e.target.value }))}
                placeholder="e.g. 25"
              />
              {form.depreciationMethod === "REDUCING_BALANCE" && (
                <p className="text-xs text-muted-foreground">
                  Adjust if needed — category changes above reset to Vehicles 25% or 10% for all other categories.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Linked vendor</Label>
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
              <Label>Linked invoice</Label>
              <Input value={form.linkedInvoiceId} onChange={(e) => setForm((p) => ({ ...p, linkedInvoiceId: e.target.value }))} placeholder="Optional" />
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                try {
                  if (form.depreciationMethod === "REDUCING_BALANCE") {
                    const rr = parseOptionalRate(form.depreciationRatePct);
                    if (rr == null || rr <= 0) {
                      toast.error("Enter a positive annual depreciation % when using reducing balance.");
                      return;
                    }
                  }
                  const usefulLifeMonths = parseOptionalInt(form.usefulLifeMonths);
                  const depreciationRatePct = parseOptionalRate(form.depreciationRatePct);
                  const patchBody = {
                    code: form.code,
                    name: form.name,
                    category: form.category,
                    branchId: form.branchId || undefined,
                    serialNumber: form.serialNumber || undefined,
                    assetTag: form.assetTag || undefined,
                    model: form.model || undefined,
                    inServiceDate: form.inServiceDate || undefined,
                    acquisitionDate: form.acquisitionDate,
                    cost: form.cost,
                    salvage: form.salvage,
                    usefulLifeYears: form.usefulLifeYears,
                    usefulLifeMonths,
                    depreciationMethod: form.depreciationMethod,
                    depreciationRatePct:
                      form.depreciationMethod === "REDUCING_BALANCE" ? depreciationRatePct : undefined,
                    linkedVendorId: form.linkedVendorId || undefined,
                    linkedInvoiceId: form.linkedInvoiceId || undefined,
                  };
                  if (editing) {
                    await updateAssetApi(editing.id, patchBody);
                    toast.success("Asset updated.");
                  } else {
                    await createAssetApi({
                      ...patchBody,
                      status: "ACTIVE",
                    });
                    toast.success("Asset created.");
                  }
                  setDrawerOpen(false);
                  await refresh();
                } catch (error) {
                  toast.error((error as Error).message);
                }
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
