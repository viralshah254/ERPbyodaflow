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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  addCrmTicketCommentApi,
  createCrmTicketApi,
  deleteCrmTicketApi,
  fetchCrmTicketHistoryApi,
  fetchCrmTicketsApi,
  updateCrmTicketApi,
  type CrmTicketCommentRow,
  type CrmTicketRow,
} from "@/lib/api/crm";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function CRMTicketsPage() {
  const [search, setSearch] = React.useState("");
  const [rows, setRows] = React.useState<CrmTicketRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CrmTicketRow | null>(null);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [historyComments, setHistoryComments] = React.useState<CrmTicketCommentRow[]>([]);
  const [newComment, setNewComment] = React.useState("");
  const [form, setForm] = React.useState({
    subject: "",
    accountId: "",
    status: "open",
    priority: "medium",
    description: "",
  });

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchCrmTicketsApi());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load tickets.");
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
    return rows.filter((row) => [row.subject, row.status ?? "", row.priority ?? ""].join(" ").toLowerCase().includes(q));
  }, [rows, search]);

  const openCreate = () => {
    setEditing(null);
    setForm({ subject: "", accountId: "", status: "open", priority: "medium", description: "" });
    setDrawerOpen(true);
  };

  const openEdit = (row: CrmTicketRow) => {
    setEditing(row);
    setForm({
      subject: row.subject,
      accountId: row.accountId ?? "",
      status: row.status ?? "open",
      priority: row.priority ?? "medium",
      description: row.description ?? "",
    });
    setDrawerOpen(true);
  };

  const openHistory = async (row: CrmTicketRow) => {
    try {
      const payload = await fetchCrmTicketHistoryApi(row.id);
      setEditing(row);
      setHistoryComments(payload.comments);
      setHistoryOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load ticket history.");
    }
  };

  const columns = React.useMemo(
    () => [
      { id: "subject", header: "Subject", accessor: (row: CrmTicketRow) => <span className="font-medium">{row.subject}</span> },
      { id: "status", header: "Status", accessor: (row: CrmTicketRow) => row.status ?? "open" },
      { id: "priority", header: "Priority", accessor: (row: CrmTicketRow) => row.priority ?? "medium" },
      {
        id: "actions",
        header: "Actions",
        accessor: (row: CrmTicketRow) => (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => openHistory(row)}>
              History
            </Button>
            <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={async () => {
                try {
                  await deleteCrmTicketApi(row.id);
                  toast.success("Ticket deleted.");
                  await refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to delete ticket.");
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
        title="Support / Tickets"
        description="Manage support tickets with status, priority, and history."
        breadcrumbs={[{ label: "CRM", href: "/crm" }, { label: "Tickets" }]}
        actions={
          <Button onClick={openCreate}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            Create Ticket
          </Button>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar searchPlaceholder="Search tickets..." searchValue={search} onSearchChange={setSearch} />
        <Card>
          <CardHeader>
            <CardTitle>Support Tickets</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading tickets...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState icon="Ticket" title="No tickets" description="Customer support tickets will appear here." action={{ label: "Create Ticket", onClick: openCreate }} />
              </div>
            ) : (
              <DataTable<CrmTicketRow> data={filtered} columns={columns} onRowClick={openEdit} emptyMessage="No tickets found." />
            )}
          </CardContent>
        </Card>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40">
          <div className="ml-auto h-full w-full max-w-md bg-background p-6 shadow-xl">
            <h2 className="text-lg font-semibold">{editing ? "Edit ticket" : "Create ticket"}</h2>
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input value={form.subject} onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((prev) => ({ ...prev, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm((prev) => ({ ...prev, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Account ID</Label>
                <Input value={form.accountId} onChange={(event) => setForm((prev) => ({ ...prev, accountId: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setDrawerOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!form.subject.trim()) {
                      toast.error("Ticket subject is required.");
                      return;
                    }
                    const payload = {
                      subject: form.subject.trim(),
                      status: form.status.trim() || "open",
                      priority: form.priority.trim() || "medium",
                      accountId: form.accountId.trim() || undefined,
                      description: form.description.trim() || undefined,
                    };
                    try {
                      if (editing) {
                        await updateCrmTicketApi(editing.id, payload);
                        toast.success("Ticket updated.");
                      } else {
                        await createCrmTicketApi(payload);
                        toast.success("Ticket created.");
                      }
                      setDrawerOpen(false);
                      await refresh();
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Failed to save ticket.");
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

      {historyOpen && editing ? (
        <div className="fixed inset-0 z-50 bg-black/40">
          <div className="ml-auto h-full w-full max-w-md bg-background p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Ticket history</h2>
            <p className="text-sm text-muted-foreground">{editing.subject}</p>
            <div className="mt-4 space-y-3">
              {historyComments.length === 0 ? <p className="text-sm text-muted-foreground">No comments yet.</p> : null}
              {historyComments.map((comment) => (
                <div key={comment.id} className="rounded-lg border p-3">
                  <p className="text-sm">{comment.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              <Label>Add comment</Label>
              <Input value={newComment} onChange={(event) => setNewComment(event.target.value)} placeholder="Investigation note..." />
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={() => setHistoryOpen(false)}>
                Close
              </Button>
              <Button
                onClick={async () => {
                  if (!newComment.trim()) return;
                  try {
                    await addCrmTicketCommentApi(editing.id, newComment.trim());
                    const payload = await fetchCrmTicketHistoryApi(editing.id);
                    setHistoryComments(payload.comments);
                    setNewComment("");
                    toast.success("Comment added.");
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Failed to add comment.");
                  }
                }}
              >
                Save comment
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
