"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  claimWorkQueueTaskApi,
  completeWorkQueueTaskApi,
  createWorkQueueTaskApi,
  fetchWorkQueueApi,
  fetchWorkQueueTasksApi,
  type WorkQueueTaskRow,
} from "@/lib/api/work-queue";
import type { WorkQueueItem } from "@/lib/types/work-queue";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function TasksPage() {
  const [search, setSearch] = React.useState("");
  const [tasks, setTasks] = React.useState<WorkQueueTaskRow[]>([]);
  const [queue, setQueue] = React.useState<WorkQueueItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    title: "",
    category: "task",
    description: "",
    severity: "medium" as "low" | "medium" | "high" | "critical",
    dueDate: "",
  });

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const [taskItems, queueItems] = await Promise.all([fetchWorkQueueTasksApi(), fetchWorkQueueApi()]);
      setTasks(taskItems);
      setQueue(queueItems);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load work queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((task) => [task.title, task.category, task.status, task.description ?? ""].join(" ").toLowerCase().includes(q));
  }, [tasks, search]);

  const columns = React.useMemo(
    () => [
      { id: "title", header: "Task", accessor: (row: WorkQueueTaskRow) => <span className="font-medium">{row.title}</span> },
      { id: "category", header: "Category", accessor: "category" as keyof WorkQueueTaskRow },
      { id: "severity", header: "Severity", accessor: "severity" as keyof WorkQueueTaskRow },
      { id: "status", header: "Status", accessor: "status" as keyof WorkQueueTaskRow },
      {
        id: "actions",
        header: "Actions",
        accessor: (row: WorkQueueTaskRow) => (
          <div className="flex items-center gap-2">
            {row.status === "OPEN" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    await claimWorkQueueTaskApi(row.id);
                    toast.success("Task claimed.");
                    await refresh();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Failed to claim task.");
                  }
                }}
              >
                Claim
              </Button>
            ) : null}
            {row.status !== "DONE" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    await completeWorkQueueTaskApi(row.id);
                    toast.success("Task completed.");
                    await refresh();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Failed to complete task.");
                  }
                }}
              >
                Complete
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [refresh]
  );

  return (
    <PageShell>
      <PageHeader
        title="Tasks / Work Queue"
        description="Unified queue for manual tasks, approvals, and operational exceptions."
        breadcrumbs={[{ label: "Core", href: "/dashboard" }, { label: "Tasks" }]}
        actions={
          <Button onClick={() => setDrawerOpen(true)}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            Create Task
          </Button>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar searchPlaceholder="Search tasks..." searchValue={search} onSearchChange={setSearch} />
        <Card>
          <CardHeader>
            <CardTitle>My Tasks</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading tasks...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState icon="CheckSquare" title="No tasks" description="Tasks assigned to you will appear here." action={{ label: "Create Task", onClick: () => setDrawerOpen(true) }} />
              </div>
            ) : (
              <DataTable<WorkQueueTaskRow> data={filtered} columns={columns} emptyMessage="No tasks found." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Global Queue Signals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {queue.length === 0 ? (
              <p className="text-sm text-muted-foreground">No queue signals.</p>
            ) : (
              queue.slice(0, 8).map((item) => (
                <div key={item.id} className="rounded-lg border p-3">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40">
          <div className="ml-auto h-full w-full max-w-md bg-background p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Create task</h2>
            <p className="text-sm text-muted-foreground">Add a task to the shared work queue.</p>
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Severity</Label>
                  <Input value={form.severity} onChange={(event) => setForm((prev) => ({ ...prev, severity: event.target.value as typeof prev.severity }))} />
                </div>
                <div className="space-y-2">
                  <Label>Due date</Label>
                  <Input type="date" value={form.dueDate} onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setDrawerOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!form.title.trim()) {
                      toast.error("Task title is required.");
                      return;
                    }
                    try {
                      await createWorkQueueTaskApi({
                        title: form.title.trim(),
                        category: form.category.trim() || "task",
                        description: form.description.trim() || undefined,
                        severity: form.severity,
                        dueDate: form.dueDate || undefined,
                      });
                      toast.success("Task created.");
                      setDrawerOpen(false);
                      setForm({ title: "", category: "task", description: "", severity: "medium", dueDate: "" });
                      await refresh();
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Failed to create task.");
                    }
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
