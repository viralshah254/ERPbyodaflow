"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
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
  assignCustomizerDashboardApi,
  createCustomizerDashboardApi,
  deleteCustomizerDashboardApi,
  fetchCustomizerDashboardsApi,
  publishCustomizerDashboardApi,
  updateCustomizerDashboardApi,
  type CustomizerDashboardRow,
} from "@/lib/api/customizer";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function CustomizerDashboardsPage() {
  const [search, setSearch] = React.useState("");
  const [rows, setRows] = React.useState<CustomizerDashboardRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CustomizerDashboardRow | null>(null);
  const [form, setForm] = React.useState({
    name: "",
    layout: '[{"type":"kpi","key":"revenue"},{"type":"table","key":"ap-aging"}]',
  });
  const [assign, setAssign] = React.useState({
    dashboardId: "",
    roleIds: "",
    branchIds: "",
  });

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchCustomizerDashboardsApi());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load dashboards.");
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
    return rows.filter((row) => row.name.toLowerCase().includes(q));
  }, [rows, search]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      layout: '[{"type":"kpi","key":"revenue"},{"type":"table","key":"ap-aging"}]',
    });
    setDrawerOpen(true);
  };

  const openEdit = (row: CustomizerDashboardRow) => {
    setEditing(row);
    setForm({
      name: row.name,
      layout: JSON.stringify(row.layout ?? [], null, 2),
    });
    setDrawerOpen(true);
  };

  const columns = React.useMemo(
    () => [
      { id: "name", header: "Dashboard", accessor: (row: CustomizerDashboardRow) => <span className="font-medium">{row.name}</span> },
      {
        id: "widgets",
        header: "Widgets",
        accessor: (row: CustomizerDashboardRow) => row.layout.length,
      },
      {
        id: "updatedAt",
        header: "Updated",
        accessor: (row: CustomizerDashboardRow) => (row.updatedAt ? new Date(row.updatedAt).toLocaleString() : "—"),
      },
      {
        id: "actions",
        header: "Actions",
        accessor: (row: CustomizerDashboardRow) => (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  await publishCustomizerDashboardApi(row.id);
                  toast.success("Dashboard published.");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to publish dashboard.");
                }
              }}
            >
              Publish
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setAssign({ dashboardId: row.id, roleIds: "", branchIds: "" });
                setAssignOpen(true);
              }}
            >
              Assign
            </Button>
            <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={async () => {
                try {
                  await deleteCustomizerDashboardApi(row.id);
                  toast.success("Dashboard deleted.");
                  await refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to delete dashboard.");
                }
              }}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [refresh]
  );

  return (
    <PageShell>
      <PageHeader
        title="Dashboards"
        description="Create, publish, and assign custom dashboards."
        breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Customizer", href: "/settings/customizer" }, { label: "Dashboards" }]}
        actions={
          <Button onClick={openCreate}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            Create Dashboard
          </Button>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar searchPlaceholder="Search dashboards..." searchValue={search} onSearchChange={setSearch} />
        <Card>
          <CardHeader>
            <CardTitle>Custom Dashboards</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading dashboards...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon="LayoutDashboard"
                  title="No custom dashboards"
                  description="Create role-based dashboards tailored to your teams."
                  action={{ label: "Create Dashboard", onClick: openCreate }}
                />
              </div>
            ) : (
              <DataTable<CustomizerDashboardRow> data={filtered} columns={columns} emptyMessage="No dashboards found." />
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit dashboard" : "Create dashboard"}</SheetTitle>
            <SheetDescription>Define a dashboard name and widget layout JSON.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="CFO dashboard" />
            </div>
            <div className="space-y-2">
              <Label>Layout JSON</Label>
              <textarea
                className="min-h-40 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                value={form.layout}
                onChange={(event) => setForm((prev) => ({ ...prev, layout: event.target.value }))}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setDrawerOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!form.name.trim()) {
                    toast.error("Dashboard name is required.");
                    return;
                  }
                  let parsedLayout: Record<string, unknown>[] = [];
                  try {
                    parsedLayout = JSON.parse(form.layout || "[]") as Record<string, unknown>[];
                    if (!Array.isArray(parsedLayout)) throw new Error("Layout must be an array.");
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Invalid layout JSON.");
                    return;
                  }
                  try {
                    if (editing) {
                      await updateCustomizerDashboardApi(editing.id, { name: form.name.trim(), layout: parsedLayout });
                      toast.success("Dashboard updated.");
                    } else {
                      await createCustomizerDashboardApi({ name: form.name.trim(), layout: parsedLayout });
                      toast.success("Dashboard created.");
                    }
                    setDrawerOpen(false);
                    await refresh();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Failed to save dashboard.");
                  }
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={assignOpen} onOpenChange={setAssignOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Assign dashboard</SheetTitle>
            <SheetDescription>Assign dashboard visibility to roles and branches.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Target dashboard</p>
                <Badge variant="secondary">{assign.dashboardId}</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Role IDs (comma-separated)</Label>
              <Input value={assign.roleIds} onChange={(event) => setAssign((prev) => ({ ...prev, roleIds: event.target.value }))} placeholder="role-admin,role-finance" />
            </div>
            <div className="space-y-2">
              <Label>Branch IDs (comma-separated)</Label>
              <Input value={assign.branchIds} onChange={(event) => setAssign((prev) => ({ ...prev, branchIds: event.target.value }))} placeholder="branch-hq,branch-west" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setAssignOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!assign.dashboardId) {
                    toast.error("No dashboard selected for assignment.");
                    return;
                  }
                  try {
                    await assignCustomizerDashboardApi(assign.dashboardId, {
                      roleIds: assign.roleIds.split(",").map((item) => item.trim()).filter(Boolean),
                      branchIds: assign.branchIds.split(",").map((item) => item.trim()).filter(Boolean),
                    });
                    toast.success("Dashboard assignment saved.");
                    setAssignOpen(false);
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Failed to assign dashboard.");
                  }
                }}
              >
                Save assignment
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
