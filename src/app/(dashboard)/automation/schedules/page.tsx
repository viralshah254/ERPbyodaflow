"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  createAutomationScheduleApi,
  deleteAutomationScheduleApi,
  fetchAutomationScheduleRunsApi,
  fetchAutomationSchedulesApi,
  runAutomationScheduleNowApi,
  updateAutomationScheduleApi,
  type AutomationScheduleRow,
  type AutomationScheduleRunRow,
} from "@/lib/api/automation-schedules";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function ScheduledJobsPage() {
  const [search, setSearch] = React.useState("");
  const [rows, setRows] = React.useState<AutomationScheduleRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AutomationScheduleRow | null>(null);
  const [runsOpen, setRunsOpen] = React.useState(false);
  const [runs, setRuns] = React.useState<AutomationScheduleRunRow[]>([]);
  const [form, setForm] = React.useState({ name: "", cron: "0 7 * * *", taskType: "overdue-alert-sync", enabled: true });

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchAutomationSchedulesApi());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load schedules.");
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
    return rows.filter((row) => row.name.toLowerCase().includes(q) || (row.taskType ?? "").toLowerCase().includes(q));
  }, [rows, search]);

  const resetForm = React.useCallback(() => {
    setEditing(null);
    setForm({ name: "", cron: "0 7 * * *", taskType: "overdue-alert-sync", enabled: true });
  }, []);

  const openCreate = () => {
    resetForm();
    setDrawerOpen(true);
  };

  const openEdit = (row: AutomationScheduleRow) => {
    setEditing(row);
    setForm({
      name: row.name,
      cron: row.cron ?? "",
      taskType: row.taskType ?? "generic",
      enabled: row.enabled,
    });
    setDrawerOpen(true);
  };

  const loadRuns = async (id: string) => {
    try {
      const items = await fetchAutomationScheduleRunsApi(id);
      setRuns(items);
      setRunsOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load schedule runs.");
    }
  };

  const columns = React.useMemo(
    () => [
      { id: "name", header: "Name", accessor: (row: AutomationScheduleRow) => <span className="font-medium">{row.name}</span> },
      { id: "cron", header: "Cron", accessor: (row: AutomationScheduleRow) => row.cron || "—" },
      { id: "taskType", header: "Task type", accessor: (row: AutomationScheduleRow) => row.taskType || "generic" },
      {
        id: "status",
        header: "Status",
        accessor: (row: AutomationScheduleRow) => <Badge variant={row.enabled ? "default" : "secondary"}>{row.enabled ? "Enabled" : "Disabled"}</Badge>,
      },
      {
        id: "lastRunAt",
        header: "Last run",
        accessor: (row: AutomationScheduleRow) => (row.lastRunAt ? new Date(row.lastRunAt).toLocaleString() : "Never"),
      },
      {
        id: "actions",
        header: "Actions",
        accessor: (row: AutomationScheduleRow) => (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => void loadRuns(row.id)}>
              Runs
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  const result = await runAutomationScheduleNowApi(row.id);
                  toast.success(result.run.message || "Schedule executed.");
                  await refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to run schedule.");
                }
              }}
            >
              Run now
            </Button>
            <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={async () => {
                try {
                  await deleteAutomationScheduleApi(row.id);
                  toast.success("Schedule deleted.");
                  await refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to delete schedule.");
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
        title="Scheduled Jobs"
        description="Manage automated tasks and report jobs."
        breadcrumbs={[{ label: "Automation", href: "/automation" }, { label: "Schedules" }]}
        actions={
          <Button onClick={openCreate}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            Create Schedule
          </Button>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar searchPlaceholder="Search schedules..." searchValue={search} onSearchChange={setSearch} />
        <Card>
          <CardHeader>
            <CardTitle>Scheduled Jobs</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading schedules...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon="Calendar"
                  title="No scheduled jobs"
                  description="Create schedules for automated reports and tasks."
                  action={{ label: "Create Schedule", onClick: openCreate }}
                />
              </div>
            ) : (
              <DataTable<AutomationScheduleRow> data={filtered} columns={columns} emptyMessage="No schedules found." />
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) resetForm();
        }}
      >
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit schedule" : "Create schedule"}</SheetTitle>
            <SheetDescription>Define cron, task type, and activation status.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Daily overdue alert sync" />
            </div>
            <div className="space-y-2">
              <Label>Cron expression</Label>
              <Input value={form.cron} onChange={(event) => setForm((prev) => ({ ...prev, cron: event.target.value }))} placeholder="0 7 * * *" />
            </div>
            <div className="space-y-2">
              <Label>Task type</Label>
              <Input
                value={form.taskType}
                onChange={(event) => setForm((prev) => ({ ...prev, taskType: event.target.value }))}
                placeholder="overdue-alert-sync | generic"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="schedule-enabled"
                type="checkbox"
                checked={form.enabled}
                onChange={(event) => setForm((prev) => ({ ...prev, enabled: event.target.checked }))}
              />
              <Label htmlFor="schedule-enabled">Enabled</Label>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setDrawerOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!form.name.trim()) {
                    toast.error("Name is required.");
                    return;
                  }
                  try {
                    if (editing) {
                      await updateAutomationScheduleApi(editing.id, {
                        name: form.name.trim(),
                        cron: form.cron.trim(),
                        taskType: form.taskType.trim(),
                        enabled: form.enabled,
                      });
                      toast.success("Schedule updated.");
                    } else {
                      await createAutomationScheduleApi({
                        name: form.name.trim(),
                        cron: form.cron.trim(),
                        taskType: form.taskType.trim(),
                        enabled: form.enabled,
                      });
                      toast.success("Schedule created.");
                    }
                    setDrawerOpen(false);
                    await refresh();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Failed to save schedule.");
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
            <SheetTitle>Schedule runs</SheetTitle>
            <SheetDescription>Recent execution history for this schedule.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-3">
            {runs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No runs yet.</p>
            ) : (
              runs.map((run) => (
                <div key={run.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{new Date(run.startedAt).toLocaleString()}</p>
                    <Badge variant={run.status === "SUCCESS" ? "default" : "destructive"}>{run.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{run.message || "Execution finished."}</p>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
