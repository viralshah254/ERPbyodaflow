"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchPlatformSupportRequestsApi,
  updatePlatformSupportRequestApi,
  type PlatformSupportRequestRow,
} from "@/lib/api/platform";
import { HeadphonesIcon } from "lucide-react";
import { toast } from "sonner";

export default function PlatformSupportPage() {
  const searchParams = useSearchParams();
  const tenantIdParam = searchParams.get("tenantId") ?? "";
  const [items, setItems] = React.useState<PlatformSupportRequestRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  const tenantId = tenantIdParam || undefined;

  React.useEffect(() => {
    let cancelled = false;
    fetchPlatformSupportRequestsApi(tenantId, statusFilter || undefined)
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId, statusFilter]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      await updatePlatformSupportRequestApi(id, { status: newStatus });
      setItems((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      );
      toast.success("Request updated.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Customer Service</h1>
        <p className="text-muted-foreground">Review customer needs and support requests.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Support requests</CardTitle>
          <CardDescription>Open and in-progress requests by tenant</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {tenantId && (
              <p className="text-sm text-muted-foreground">
                Filtering by tenant: <span className="font-mono">{tenantId}</span>
                <Button variant="ghost" size="sm" className="ml-2" asChild>
                  <Link href="/platform/support">Clear</Link>
                </Button>
              </p>
            )}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No support requests yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Requested by</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned to</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link href={`/platform/customers/${r.tenantId}`} className="font-medium hover:underline font-mono text-sm">
                        {r.tenantId.slice(0, 12)}…
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={r.subject}>{r.subject}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.requestedBy}</TableCell>
                    <TableCell>
                      <select
                        value={r.status}
                        onChange={(e) => handleStatusChange(r.id, e.target.value)}
                        disabled={updatingId === r.id}
                        className="h-8 rounded border bg-background px-2 text-sm"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.assignedTo ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.createdAt}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
