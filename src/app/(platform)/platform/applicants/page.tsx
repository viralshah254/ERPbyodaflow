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
  fetchOrgSignupApplicantsApi,
  rejectOrgSignupApplicantApi,
  type OrgSignupApplicantRow,
} from "@/lib/api/platform";
import { ApproveApplicantSheet } from "@/components/platform/ApproveApplicantSheet";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";

function formatDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function PlatformApplicantsPage() {
  const searchParams = useSearchParams();
  const [items, setItems] = React.useState<OrgSignupApplicantRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState(
    searchParams.get("status") ?? "PENDING"
  );
  const [selected, setSelected] = React.useState<OrgSignupApplicantRow | null>(null);
  const [approveOpen, setApproveOpen] = React.useState(false);
  const [rejectingId, setRejectingId] = React.useState<string | null>(null);
  const canOwnerManage = useAuthStore((s) => s.permissions.includes("platform.owner.manage"));

  const load = React.useCallback(() => {
    setLoading(true);
    fetchOrgSignupApplicantsApi(statusFilter || undefined)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleReject = async (item: OrgSignupApplicantRow) => {
    if (!window.confirm(`Reject application from ${item.orgName}?`)) return;
    setRejectingId(item.id);
    try {
      await rejectOrgSignupApplicantApi(item.id);
      toast.success("Application rejected.");
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setRejectingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Applicants</h1>
          <p className="text-muted-foreground">
            Review organisation signup requests. Approve to provision the tenant and email login credentials.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/platform/organizations">View all organisations</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Signup applications</CardTitle>
          <CardDescription>Pending, approved, and rejected organisation requests</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No applications match this filter.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="w-[180px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.orgName}</TableCell>
                    <TableCell>
                      <div>{item.firstName} {item.lastName}</div>
                      <div className="text-xs text-muted-foreground">{item.email}</div>
                    </TableCell>
                    <TableCell>
                      <div>{item.industryCategory}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.templateName ?? item.templateId}
                      </div>
                    </TableCell>
                    <TableCell>{item.status}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </TableCell>
                    <TableCell>
                      {item.status === "PENDING" && canOwnerManage ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelected(item);
                              setApproveOpen(true);
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={rejectingId === item.id}
                            onClick={() => handleReject(item)}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : item.status === "APPROVED" && item.provisionedTenantId ? (
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/platform/customers/${item.provisionedTenantId}`}>View tenant</Link>
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ApproveApplicantSheet
        applicant={selected}
        open={approveOpen}
        onOpenChange={setApproveOpen}
        onSuccess={() => load()}
      />
    </div>
  );
}
