"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddAssetSheet } from "@/components/assets/add-asset-sheet";
import { suggestNextFaCode } from "@/components/assets/asset-form-constants";
import { fetchAssetsApi } from "@/lib/api/assets";
import type { AssetRow, CustodyType } from "@/lib/types/assets";
import { fetchApSuppliersApi } from "@/lib/api/payments";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import * as Icons from "lucide-react";

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

export default function AssetRegisterPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [custodyFilter, setCustodyFilter] = React.useState("ALL");
  const [isLoading, setIsLoading] = React.useState(true);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AssetRow | null>(null);
  const [suppliers, setSuppliers] = React.useState<Array<{ id: string; name: string }>>([]);
  const [suggestedCode, setSuggestedCode] = React.useState("");
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
    setSuggestedCode(suggestNextFaCode(rows));
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

      <AddAssetSheet
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        editing={editing}
        suggestedCode={suggestedCode}
        compact={false}
        suppliers={suppliers}
        onSuccess={refresh}
      />
    </PageShell>
  );
}
