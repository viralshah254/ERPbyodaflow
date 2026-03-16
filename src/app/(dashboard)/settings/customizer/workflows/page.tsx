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
  createCustomizerWorkflowApi,
  deleteCustomizerWorkflowApi,
  executeCustomizerWorkflowApi,
  fetchCustomizerWorkflowRunsApi,
  fetchCustomizerWorkflowsApi,
  updateCustomizerWorkflowApi,
  type CustomizerWorkflowRow,
  type CustomizerWorkflowRunRow,
} from "@/lib/api/customizer";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function CustomizerWorkflowsPage() {
  const [search, setSearch] = React.useState("");
  const [rows, setRows] = React.useState<CustomizerWorkflowRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CustomizerWorkflowRow | null>(null);
  const [runsOpen, setRunsOpen] = React.useState(false);
  const [runs, setRuns] = React.useState<CustomizerWorkflowRunRow[]>([]);
  const [form, setForm] = React.useState({
    name: "",
    entityType: "document",
    states: "DRAFT,REVIEW,APPROVED",
    transitions: "DRAFT->REVIEW,REVIEW->APPROVED",
  });

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchCustomizerWorkflowsApi());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load workflows.");
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
    return rows.filter((row) => row.name.toLowerCase().includes(q) || row.entityType.toLowerCase().includes(q));
  }, [rows, search]);

  const parseStates = (value: string): string[] =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const parseTransitions = (value: string): Array<{ from: string; to: string }> =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const [from, to] = item.split("->").map((part) => part.trim());
        return { from: from || "", to: to || "" };
      })
      .filter((item) => item.from && item.to);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      entityType: "document",
      states: "DRAFT,REVIEW,APPROVED",
      transitions: "DRAFT->REVIEW,REVIEW->APPROVED",
    });
    setDrawerOpen(true);
  };

  const openEdit = (row: CustomizerWorkflowRow) => {
    setEditing(row);
    setForm({
      name: row.name,
      entityType: row.entityType,
      states: row.states.join(","),
      transitions: row.transitions.map((t) => `${t.from}->${t.to}`).join(","),
    });
    setDrawerOpen(true);
  };

  const columns = React.useMemo(
    () => [
      { id: "name", header: "Workflow", accessor: (row: CustomizerWorkflowRow) => <span className="font-medium">{row.name}</span> },
      { id: "entityType", header: "Entity", accessor: "entityType" as keyof CustomizerWorkflowRow },
      { id: "states", header: "States", accessor: (row: CustomizerWorkflowRow) => row.states.length || 0 },
      { id: "transitions", header: "Transitions", accessor: (row: CustomizerWorkflowRow) => row.transitions.length || 0 },
      {
        id: "actions",
        header: "Actions",
        accessor: (row: CustomizerWorkflowRow) => (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  await executeCustomizerWorkflowApi(row.id);
                  toast.success("Workflow executed.");
                  setRuns(await fetchCustomizerWorkflowRunsApi(row.id));
                  setRunsOpen(true);
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to execute workflow.");
                }
              }}
            >
              Execute
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  setRuns(await fetchCustomizerWorkflowRunsApi(row.id));
                  setRunsOpen(true);
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to load workflow runs.");
                }
              }}
            >
              Runs
            </Button>
            <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={async () => {
                try {
                  await deleteCustomizerWorkflowApi(row.id);
                  toast.success("Workflow deleted.");
                  await refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to delete workflow.");
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
        title="Workflows"
        description="Configure advanced custom workflow state machines."
        breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Customizer", href: "/settings/customizer" }, { label: "Workflows" }]}
        actions={
          <Button onClick={openCreate}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            Create Workflow
          </Button>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar searchPlaceholder="Search workflows..." searchValue={search} onSearchChange={setSearch} />
        <Card>
          <CardHeader>
            <CardTitle>Custom Workflows</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading workflows...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon="Workflow"
                  title="No workflows"
                  description="Create custom workflows to automate business processes."
                  action={{ label: "Create Workflow", onClick: openCreate }}
                />
              </div>
            ) : (
              <DataTable<CustomizerWorkflowRow> data={filtered} columns={columns} emptyMessage="No workflows found." />
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit workflow" : "Create workflow"}</SheetTitle>
            <SheetDescription>Define entity type, states, and transitions.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="PO approval workflow" />
            </div>
            <div className="space-y-2">
              <Label>Entity type</Label>
              <Input value={form.entityType} onChange={(event) => setForm((prev) => ({ ...prev, entityType: event.target.value }))} placeholder="purchase-order" />
            </div>
            <div className="space-y-2">
              <Label>States (comma-separated)</Label>
              <Input value={form.states} onChange={(event) => setForm((prev) => ({ ...prev, states: event.target.value }))} placeholder="DRAFT,REVIEW,APPROVED" />
            </div>
            <div className="space-y-2">
              <Label>Transitions (comma-separated FROM-&gt;TO)</Label>
              <Input
                value={form.transitions}
                onChange={(event) => setForm((prev) => ({ ...prev, transitions: event.target.value }))}
                placeholder="DRAFT->REVIEW,REVIEW->APPROVED"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setDrawerOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!form.name.trim()) {
                    toast.error("Workflow name is required.");
                    return;
                  }
                  const payload = {
                    name: form.name.trim(),
                    entityType: form.entityType.trim() || "document",
                    states: parseStates(form.states),
                    transitions: parseTransitions(form.transitions),
                  };
                  try {
                    if (editing) {
                      await updateCustomizerWorkflowApi(editing.id, payload);
                      toast.success("Workflow updated.");
                    } else {
                      await createCustomizerWorkflowApi(payload);
                      toast.success("Workflow created.");
                    }
                    setDrawerOpen(false);
                    await refresh();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Failed to save workflow.");
                  }
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={runsOpen} onOpenChange={setRunsOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Workflow runs</SheetTitle>
            <SheetDescription>Recent executions and outcomes.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-3">
            {runs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No runs yet.</p>
            ) : (
              runs.map((run) => (
                <div key={run.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{run.workflowName || "Workflow run"}</p>
                    <Badge variant={run.status === "SUCCESS" ? "default" : "destructive"}>{run.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(run.startedAt).toLocaleString()}</p>
                  {run.message ? <p className="mt-1 text-xs">{run.message}</p> : null}
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
