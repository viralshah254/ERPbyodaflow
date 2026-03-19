"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  approveLeaveRequestApi,
  cancelLeaveRequestApi,
  createLeaveRequestApi,
  fetchEmployeesApi,
  fetchLeavePoliciesApi,
  fetchLeaveRequestsApi,
  rejectLeaveRequestApi,
} from "@/lib/api/payroll";
import type { Employee, LeavePolicy, LeaveRequest, LeaveRequestStatus, LeaveType } from "@/lib/payroll/types";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  ANNUAL: "Annual",
  SICK: "Sick",
  MATERNITY: "Maternity",
  PATERNITY: "Paternity",
  PAID_EXTRA: "Paid extra",
  UNPAID: "Unpaid",
};

function statusVariant(s: LeaveRequestStatus): "default" | "secondary" | "outline" | "destructive" {
  if (s === "APPROVED") return "secondary";
  if (s === "PENDING") return "outline";
  if (s === "REJECTED" || s === "CANCELLED") return "destructive";
  return "default";
}

export default function LeaveRequestsPage() {
  const permissions = useAuthStore((s) => s.permissions);
  const canApprove = permissions.includes("finance.approve");

  const [requests, setRequests] = React.useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [policies, setPolicies] = React.useState<LeavePolicy[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [rejectId, setRejectId] = React.useState<string | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState("ALL");

  // Create form
  const [empId, setEmpId] = React.useState("");
  const [leaveType, setLeaveType] = React.useState<LeaveType>("ANNUAL");
  const [extraLabel, setExtraLabel] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const empMap = React.useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const [reqs, emps, pols] = await Promise.all([
        fetchLeaveRequestsApi(),
        fetchEmployeesApi(),
        fetchLeavePoliciesApi(),
      ]);
      setRequests(reqs);
      setEmployees(emps);
      setPolicies(pols);
    } catch (e) { toast.error((e as Error).message); } finally { setLoading(false); }
  }, []);

  React.useEffect(() => { void refresh(); }, [refresh]);

  const filtered = React.useMemo(() => {
    if (statusFilter === "ALL") return requests;
    return requests.filter((r) => r.status === statusFilter);
  }, [requests, statusFilter]);

  const selectedEmpCountry = empMap.get(empId)?.taxCountry ?? "KE";
  const relevantPolicy = policies.find((p) => p.country === selectedEmpCountry);
  const extraLeaveOptions = relevantPolicy?.extraLeaveTypes ?? [];

  const handleCreate = async () => {
    if (!empId || !startDate || !endDate) { toast.error("Employee, start date, and end date are required"); return; }
    setSaving(true);
    try {
      await createLeaveRequestApi({ employeeId: empId, type: leaveType, extraLabel: leaveType === "PAID_EXTRA" ? extraLabel : undefined, startDate, endDate, notes: notes || undefined });
      setCreateOpen(false);
      setEmpId(""); setLeaveType("ANNUAL"); setStartDate(""); setEndDate(""); setNotes("");
      await refresh();
      toast.success("Leave request created.");
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveLeaveRequestApi(id);
      await refresh();
      toast.success("Leave approved.");
    } catch (e) { toast.error((e as Error).message); }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    try {
      await rejectLeaveRequestApi(rejectId, rejectReason || undefined);
      setRejectOpen(false); setRejectId(null); setRejectReason("");
      await refresh();
      toast.success("Leave rejected.");
    } catch (e) { toast.error((e as Error).message); }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelLeaveRequestApi(id);
      await refresh();
      toast.success("Leave cancelled.");
    } catch (e) { toast.error((e as Error).message); }
  };

  const columns = React.useMemo(
    () => [
      {
        id: "employee",
        header: "Employee",
        accessor: (r: LeaveRequest) => empMap.get(r.employeeId)?.name ?? r.employeeId,
      },
      {
        id: "type",
        header: "Type",
        accessor: (r: LeaveRequest) => (
          <span className="text-sm">{LEAVE_TYPE_LABELS[r.type]}{r.extraLabel ? ` — ${r.extraLabel}` : ""}</span>
        ),
      },
      {
        id: "dates",
        header: "Dates",
        accessor: (r: LeaveRequest) => (
          <span className="text-sm">
            {new Date(r.startDate).toLocaleDateString()} – {new Date(r.endDate).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: "days",
        header: "Days",
        accessor: (r: LeaveRequest) => (
          <span className="font-medium">{r.days}</span>
        ),
      },
      {
        id: "paid",
        header: "Paid",
        accessor: (r: LeaveRequest) => (
          <Badge variant={r.isPaid ? "secondary" : "outline"} className="text-xs">
            {r.isPaid ? "Paid" : "Unpaid"}
          </Badge>
        ),
      },
      {
        id: "status",
        header: "Status",
        accessor: (r: LeaveRequest) => (
          <Badge variant={statusVariant(r.status)} className="text-xs">{r.status}</Badge>
        ),
      },
      {
        id: "actions",
        header: "",
        accessor: (r: LeaveRequest) => (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {canApprove && r.status === "PENDING" && (
              <>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-green-600" onClick={() => handleApprove(r.id)}>
                  <Icons.Check className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-red-500" onClick={() => { setRejectId(r.id); setRejectOpen(true); }}>
                  <Icons.X className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            {(r.status === "PENDING" || r.status === "APPROVED") && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground" onClick={() => handleCancel(r.id)}>
                <Icons.Ban className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ),
        className: "w-[100px]",
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [empMap, canApprove]
  );

  return (
    <PageShell>
      <PageHeader
        title="Leave requests"
        description="Manage employee leave applications — approve, reject, or cancel."
        breadcrumbs={[
          { label: "Payroll", href: "/payroll/overview" },
          { label: "Leave requests" },
        ]}
        sticky
        actions={
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              New request
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/payroll/leave/balances">Balances</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/payroll/leave/calendar">Calendar</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/payroll/leave/policies">Policies</Link>
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-4">
        <div className="flex gap-2">
          {["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED"].map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              onClick={() => setStatusFilter(s)}
              className="text-xs"
            >
              {s}
            </Button>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Requests</CardTitle>
            <CardDescription>
              {filtered.length} request(s). Approved leaves auto-update employee balances.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable<LeaveRequest>
              data={filtered}
              columns={columns}
              emptyMessage={loading ? "Loading requests..." : "No leave requests."}
            />
          </CardContent>
        </Card>
      </div>

      {/* Create request sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New leave request</SheetTitle>
            <SheetDescription>Submit a leave application for an employee.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Select value={empId} onValueChange={setEmpId}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Leave type</Label>
              <Select value={leaveType} onValueChange={(v) => setLeaveType(v as LeaveType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(LEAVE_TYPE_LABELS) as [LeaveType, string][]).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {leaveType === "PAID_EXTRA" && extraLeaveOptions.length > 0 && (
              <div className="space-y-1.5">
                <Label>Extra leave type</Label>
                <Select value={extraLabel} onValueChange={setExtraLabel}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {extraLeaveOptions.map((e) => (
                      <SelectItem key={e.label} value={e.label}>{e.label} ({e.days}d)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>End date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional details…" rows={3} />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit request
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Reject dialog */}
      <Sheet open={rejectOpen} onOpenChange={(o) => { setRejectOpen(o); if (!o) { setRejectId(null); setRejectReason(""); } }}>
        <SheetContent side="right" className="w-full sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Reject leave request</SheetTitle>
            <SheetDescription>Provide an optional reason for rejection.</SheetDescription>
          </SheetHeader>
          <div className="py-4">
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)"
              rows={4}
            />
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject}>Reject</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
