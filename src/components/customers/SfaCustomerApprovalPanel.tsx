"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { LIST_TABLE_STATIC_CLASS } from "@/components/layout/page-shell";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import { formatDocumentCreatedLabel } from "@/lib/format/nairobi-datetime";
import {
  approveSfaCustomerApi,
  fetchSfaCustomerApprovalsApi,
  rejectSfaCustomerApi,
  type SfaCustomerApproval,
} from "@/lib/api/sfa-customer-approvals";

const PAGE_SIZE_OPTIONS = [10, 20, 25, 50] as const;
const DEFAULT_PAGE_SIZE = 20;

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

function kindLabel(row: SfaCustomerApproval): string {
  if (row.sfaEntityType === "supermarket") return "Supermarket";
  if (row.sfaEntityType === "branch") return "Branch";
  return "Customer";
}

function namesLabel(row: SfaCustomerApproval): string {
  const parts = [row.name, row.tradingName, row.contactName].filter(
    (part, index, all) => part && part.trim() && all.indexOf(part) === index
  );
  return parts.join(" · ");
}

export function SfaCustomerApprovalPanel({
  onApproved,
  onPendingCount,
}: {
  onApproved?: () => void;
  onPendingCount?: (count: number) => void;
}) {
  const [enabled, setEnabled] = React.useState(false);
  const [pendingCount, setPendingCount] = React.useState(0);
  const [totalCount, setTotalCount] = React.useState(0);
  const [items, setItems] = React.useState<SfaCustomerApproval[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [pageOffset, setPageOffset] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);
  const [hasMore, setHasMore] = React.useState(false);
  const [reloadToken, setReloadToken] = React.useState(0);

  const onPendingCountRef = React.useRef(onPendingCount);
  onPendingCountRef.current = onPendingCount;

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(id);
  }, [search]);

  React.useEffect(() => {
    setPageOffset(0);
  }, [debouncedSearch, pageSize]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchSfaCustomerApprovalsApi({
      q: debouncedSearch.trim() || undefined,
      limit: pageSize,
      offset: pageOffset,
    })
      .then((result) => {
        if (cancelled) return;
        const count = result.pendingCount ?? 0;
        setEnabled(result.enabled);
        setPendingCount(count);
        setTotalCount(result.totalCount ?? result.items?.length ?? 0);
        setItems(result.items ?? []);
        setHasMore(Boolean(result.hasMore));
        onPendingCountRef.current?.(count);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err instanceof Error ? err.message : "Could not load customers waiting for approval");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, pageOffset, pageSize, reloadToken]);

  function refresh() {
    setReloadToken((token) => token + 1);
  }

  async function approve(row: SfaCustomerApproval) {
    setBusyId(row._id);
    try {
      await approveSfaCustomerApi(row._id);
      toast.success(`${row.name} is now on the customer list.`);
      onApproved?.();
      if (items.length <= 1 && pageOffset > 0) {
        setPageOffset(Math.max(0, pageOffset - pageSize));
      } else {
        refresh();
      }
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
      if (items.length <= 1 && pageOffset > 0) {
        setPageOffset(Math.max(0, pageOffset - pageSize));
      } else {
        refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reject customer");
    } finally {
      setBusyId(null);
    }
  }

  if (!loading && !enabled) {
    return (
      <p className="text-sm text-muted-foreground">
        This organisation does not hold new SFA customers for approval.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-md flex-1 space-y-1">
          <Label htmlFor="sfa-customer-approval-search">Search</Label>
          <Input
            id="sfa-customer-approval-search"
            placeholder="Customer name, phone, or creator…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            {pendingCount} pending
          </span>
          <Button variant="secondary" size="sm" onClick={refresh} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      <section className={LIST_TABLE_STATIC_CLASS}>
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Pending approval</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Direct customers created in Odaflow SFA stay here until you approve them. They join
            the customer list after you approve them.
          </p>
        </div>
        {loading ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            Loading customers waiting for approval…
          </p>
        ) : items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            {debouncedSearch.trim()
              ? "No pending customers match that search."
              : "No direct SFA customers are waiting for approval."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Names</TableHead>
                <TableHead>Created</TableHead>
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
                      <div className="text-xs text-muted-foreground">{kindLabel(row)}</div>
                      {row.customerCode ? (
                        <div className="text-xs text-muted-foreground">{row.customerCode}</div>
                      ) : null}
                      {row.email ? (
                        <div className="text-xs text-muted-foreground">{row.email}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDocumentCreatedLabel(row.createdAt) || "—"}
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

      <TablePagination
        pageOffset={pageOffset}
        pageSize={pageSize}
        itemCount={loading ? 0 : items.length}
        hasMore={hasMore}
        loading={loading}
        totalCount={totalCount}
        onPrevious={() => setPageOffset((offset) => Math.max(0, offset - pageSize))}
        onNext={() => setPageOffset((offset) => offset + pageSize)}
        entityLabel="pending customers"
        pageSizeOptions={[...PAGE_SIZE_OPTIONS]}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPageOffset(0);
        }}
      />
    </div>
  );
}
