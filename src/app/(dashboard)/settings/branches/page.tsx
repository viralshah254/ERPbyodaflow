"use client";

import * as React from "react";
import { LIST_PAGE_BODY_CLASS, LIST_PAGE_SHELL_CLASS, LIST_TABLE_SURFACE_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  createBranchApi,
  fetchBranchesApi,
  setDefaultBranchApi,
  updateBranchApi,
  type BranchRow,
} from "@/lib/api/branches";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function BranchesPage() {
  const [search, setSearch] = React.useState("");
  const [rows, setRows] = React.useState<BranchRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<BranchRow | null>(null);
  const [form, setForm] = React.useState({
    name: "",
    code: "",
    line1: "",
    city: "",
    region: "",
    country: "",
    latitude: "",
    longitude: "",
  });

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchBranchesApi());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load branches.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => row.name.toLowerCase().includes(q) || (row.code ?? "").toLowerCase().includes(q));
  }, [rows, search]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", code: "", line1: "", city: "", region: "", country: "", latitude: "", longitude: "" });
    setDrawerOpen(true);
  };

  const openEdit = (row: BranchRow) => {
    setEditing(row);
    setForm({
      name: row.name,
      code: row.code ?? "",
      line1: row.address?.line1 ?? "",
      city: row.address?.city ?? "",
      region: row.address?.region ?? "",
      country: row.address?.country ?? "",
      latitude: row.latitude != null ? String(row.latitude) : "",
      longitude: row.longitude != null ? String(row.longitude) : "",
    });
    setDrawerOpen(true);
  };

  const columns = React.useMemo(
    () => [
      { id: "code", header: "Code", accessor: (row: BranchRow) => row.code || "—" },
      { id: "name", header: "Name", accessor: (row: BranchRow) => <span className="font-medium">{row.name}</span> },
      { id: "city", header: "City", accessor: (row: BranchRow) => row.address?.city || "—" },
      {
        id: "gps",
        header: "GPS",
        accessor: (row: BranchRow) =>
          row.latitude != null && row.longitude != null ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Icons.MapPin className="h-3 w-3 text-green-600" />
              {row.latitude.toFixed(4)}, {row.longitude.toFixed(4)}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        id: "default",
        header: "Default",
        accessor: (row: BranchRow) => (row.isDefault ? <Badge>Default</Badge> : <Badge variant="secondary">No</Badge>),
      },
      {
        id: "actions",
        header: "Actions",
        accessor: (row: BranchRow) => (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  await setDefaultBranchApi(row.id);
                  toast.success("Default branch updated.");
                  await refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to set default branch.");
                }
              }}
            >
              Set default
            </Button>
          </div>
        ),
      },
    ],
    [refresh]
  );

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Branches"
        description="Manage organization branches and default operational branch."
        breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Branches" }]}
        actions={
          <Button onClick={openCreate}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            Add Branch
          </Button>
        }
      />
      <div className={LIST_PAGE_BODY_CLASS}>
        <DataTableToolbar className="shrink-0" searchPlaceholder="Search branches..." searchValue={search} onSearchChange={setSearch} />
        <div className={LIST_TABLE_SURFACE_CLASS}>
          <div className="shrink-0 border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Branches</h3>
          </div>
          {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading branches...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon="MapPin"
                  title="No branches"
                  description="Add branches to organize operations by location."
                  action={{ label: "Add Branch", onClick: openCreate }}
                />
              </div>
            ) : (
              <DataTable<BranchRow> data={filtered} columns={columns} emptyMessage="No branches found."
            scrollMode="fill"
            size="comfortable"
            className="min-h-0 flex-1 border-0"
            />
            )}
        </div>
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit branch" : "Create branch"}</SheetTitle>
            <SheetDescription>Configure branch identity and location details.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Nairobi HQ" />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} placeholder="HQ-KE" />
            </div>
            <div className="space-y-2">
              <Label>Address line</Label>
              <Input value={form.line1} onChange={(event) => setForm((prev) => ({ ...prev, line1: event.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={form.city} onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Region</Label>
                <Input value={form.region} onChange={(event) => setForm((prev) => ({ ...prev, region: event.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input value={form.country} onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))} placeholder="Kenya" />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Icons.MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                GPS coordinates
                <span className="text-xs text-muted-foreground font-normal">(for WhatsApp nearest-outlet routing)</span>
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Latitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={form.latitude}
                    onChange={(event) => setForm((prev) => ({ ...prev, latitude: event.target.value }))}
                    placeholder="-1.286389"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Longitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={form.longitude}
                    onChange={(event) => setForm((prev) => ({ ...prev, longitude: event.target.value }))}
                    placeholder="36.817223"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setDrawerOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!form.name.trim()) {
                    toast.error("Branch name is required.");
                    return;
                  }
                  const latVal = form.latitude.trim();
                  const lngVal = form.longitude.trim();
                  const parsedLat = latVal !== "" ? parseFloat(latVal) : null;
                  const parsedLng = lngVal !== "" ? parseFloat(lngVal) : null;
                  if (parsedLat !== null && (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90)) {
                    toast.error("Latitude must be between -90 and 90.");
                    return;
                  }
                  if (parsedLng !== null && (isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180)) {
                    toast.error("Longitude must be between -180 and 180.");
                    return;
                  }
                  const payload = {
                    name: form.name.trim(),
                    code: form.code.trim() || undefined,
                    address: {
                      line1: form.line1.trim() || undefined,
                      city: form.city.trim() || undefined,
                      region: form.region.trim() || undefined,
                      country: form.country.trim() || undefined,
                    },
                    latitude: parsedLat,
                    longitude: parsedLng,
                  };
                  try {
                    if (editing) {
                      await updateBranchApi(editing.id, payload);
                      toast.success("Branch updated.");
                    } else {
                      await createBranchApi(payload);
                      toast.success("Branch created.");
                    }
                    setDrawerOpen(false);
                    await refresh();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Failed to save branch.");
                  }
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
