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
  createCrmActivityApi,
  deleteCrmActivityApi,
  fetchCrmActivitiesApi,
  completeCrmActivityApi,
  fetchCrmAccountsApi,
  type CrmActivityRow,
  type CrmAccountRow,
} from "@/lib/api/crm";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function CRMActivitiesPage() {
  const [search, setSearch] = React.useState("");
  const [rows, setRows] = React.useState<CrmActivityRow[]>([]);
  const [accounts, setAccounts] = React.useState<CrmAccountRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    subject: "",
    type: "task",
    accountId: "",
    dueDate: "",
    notes: "",
  });

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const [activities, accountRows] = await Promise.all([fetchCrmActivitiesApi(), fetchCrmAccountsApi()]);
      setRows(activities);
      setAccounts(accountRows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load activities.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const accountNameById = React.useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts]);
  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.subject, row.type ?? "", row.status ?? "", accountNameById.get(row.accountId ?? "") ?? ""].join(" ").toLowerCase().includes(q)
    );
  }, [rows, search, accountNameById]);

  const columns = React.useMemo(
    () => [
      { id: "subject", header: "Subject", accessor: (row: CrmActivityRow) => <span className="font-medium">{row.subject}</span> },
      { id: "type", header: "Type", accessor: (row: CrmActivityRow) => row.type ?? "task" },
      { id: "account", header: "Account", accessor: (row: CrmActivityRow) => accountNameById.get(row.accountId ?? "") ?? "—" },
      { id: "status", header: "Status", accessor: (row: CrmActivityRow) => (row.completedAt ? "Completed" : row.status ?? "Open") },
      {
        id: "actions",
        header: "Actions",
        accessor: (row: CrmActivityRow) => (
          <div className="flex items-center gap-2">
            {!row.completedAt ? (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    await completeCrmActivityApi(row.id);
                    toast.success("Activity completed.");
                    await refresh();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Failed to complete activity.");
                  }
                }}
              >
                Complete
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="destructive"
              onClick={async () => {
                try {
                  await deleteCrmActivityApi(row.id);
                  toast.success("Activity deleted.");
                  await refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to delete activity.");
                }
              }}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [accountNameById, refresh]
  );

  return (
    <PageShell>
      <PageHeader
        title="Activities / Notes"
        description="Track customer interactions, calls, and follow-up tasks."
        breadcrumbs={[{ label: "CRM", href: "/crm" }, { label: "Activities" }]}
        actions={
          <Button onClick={() => setDrawerOpen(true)}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            Add Activity
          </Button>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar searchPlaceholder="Search activities..." searchValue={search} onSearchChange={setSearch} />
        <Card>
          <CardHeader>
            <CardTitle>Activities</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading activities...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState icon="StickyNote" title="No activities" description="Record customer interactions and notes here." action={{ label: "Add Activity", onClick: () => setDrawerOpen(true) }} />
              </div>
            ) : (
              <DataTable<CrmActivityRow> data={filtered} columns={columns} emptyMessage="No activities found." />
            )}
          </CardContent>
        </Card>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40">
          <div className="ml-auto h-full w-full max-w-md bg-background p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Create activity</h2>
            <p className="text-sm text-muted-foreground">Create calls, notes, tasks, and reminders for CRM operations.</p>
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input value={form.subject} onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Input value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Due date</Label>
                  <Input type="date" value={form.dueDate} onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Account ID</Label>
                <Input value={form.accountId} onChange={(event) => setForm((prev) => ({ ...prev, accountId: event.target.value }))} placeholder={accounts[0]?.id ?? "account-id"} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setDrawerOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!form.subject.trim()) {
                      toast.error("Subject is required.");
                      return;
                    }
                    try {
                      await createCrmActivityApi({
                        subject: form.subject.trim(),
                        type: form.type.trim() || "task",
                        accountId: form.accountId.trim() || undefined,
                        dueDate: form.dueDate || undefined,
                        notes: form.notes.trim() || undefined,
                      });
                      toast.success("Activity created.");
                      setDrawerOpen(false);
                      setForm({ subject: "", type: "task", accountId: "", dueDate: "", notes: "" });
                      await refresh();
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Failed to create activity.");
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
