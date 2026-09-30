"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import {
  approveSfaCustomerApi,
  fetchSfaCustomerApprovalsApi,
  rejectSfaCustomerApi,
  type SfaCustomerApproval,
} from "@/lib/api/sfa-customer-approvals";

function locationLabel(row: SfaCustomerApproval): string {
  const address = [row.address?.line1, row.address?.city, row.address?.region]
    .filter((part) => part && part.trim())
    .join(", ");
  if (address) return address;
  if (row.latitude != null && row.longitude != null) {
    return `${row.latitude.toFixed(5)}, ${row.longitude.toFixed(5)}`;
  }
  return "";
}

function namesLabel(row: SfaCustomerApproval): string {
  const parts = [row.name, row.tradingName, row.contactName].filter(
    (part, index, all) => part && part.trim() && all.indexOf(part) === index
  );
  return parts.join(" · ");
}

export function SfaCustomerApprovalPanel({ onApproved }: { onApproved?: () => void }) {
  const [enabled, setEnabled] = React.useState(false);
  const [pendingCount, setPendingCount] = React.useState(0);
  const [items, setItems] = React.useState<SfaCustomerApproval[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const result = await fetchSfaCustomerApprovalsApi();
      setEnabled(result.enabled);
      setPendingCount(result.pendingCount ?? result.items?.length ?? 0);
      setItems(result.items ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load customers waiting for approval");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function approve(row: SfaCustomerApproval) {
    setBusyId(row._id);
    try {
      await approveSfaCustomerApi(row._id);
      toast.success(`${row.name} is now on the customer list.`);
      setItems((prev) => prev.filter((item) => item._id !== row._id));
      setPendingCount((count) => Math.max(0, count - 1));
      onApproved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not approve customer");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(row: SfaCustomerApproval) {
    const reason = window.prompt(`Reject ${row.name}? You can add a short reason.`, "") ?? null;
    if (reason === null) return;
    setBusyId(row._id);
    try {
      await rejectSfaCustomerApi(row._id, reason);
      toast.success(`${row.name} was rejected and stays off the customer list.`);
      setItems((prev) => prev.filter((item) => item._id !== row._id));
      setPendingCount((count) => Math.max(0, count - 1));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reject customer");
    } finally {
      setBusyId(null);
    }
  }

  if (loading || !enabled) return null;

  return (
    <section className="mb-6 rounded-lg border bg-card">
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Waiting for approval</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            New customers from Odaflow SFA stay here until you approve them. They are not on the
            customer list yet.
          </p>
        </div>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          {pendingCount}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">
          No new SFA customers are waiting for approval.
        </p>
      ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Names</TableHead>
            <TableHead>KRA PIN</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Created by</TableHead>
            <TableHead className="text-right">Decision</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((row) => {
            const busy = busyId === row._id;
            const place = locationLabel(row);
            return (
              <TableRow key={row._id}>
                <TableCell>
                  <div className="font-medium">{namesLabel(row)}</div>
                  {row.customerCode ? (
                    <div className="text-xs text-muted-foreground">{row.customerCode}</div>
                  ) : null}
                  {row.email ? <div className="text-xs text-muted-foreground">{row.email}</div> : null}
                </TableCell>
                <TableCell className="font-mono text-xs">{row.taxId || "—"}</TableCell>
                <TableCell>{row.phone || "—"}</TableCell>
                <TableCell className="max-w-[16rem]">
                  <span className="line-clamp-2">{place || "—"}</span>
                </TableCell>
                <TableCell>
                  <div>{row.createdByName || "—"}</div>
                  {row.createdByPhone ? (
                    <div className="text-xs text-muted-foreground">{row.createdByPhone}</div>
                  ) : null}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void reject(row)}
                    >
                      Reject
                    </Button>
                    <Button size="sm" disabled={busy} onClick={() => void approve(row)}>
                      {busy ? <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Approve
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      )}
    </section>
  );
}
