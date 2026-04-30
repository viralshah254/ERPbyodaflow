"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  approveLeaveRequestApi,
  createLeavePolicyApi,
  createLeaveRequestApi,
  fetchEmployeesApi,
  fetchLeaveBalancesApi,
  fetchLeavePoliciesApi,
  fetchLeaveRequestsApi,
  initLeaveBalanceApi,
  rejectLeaveRequestApi,
} from "@/lib/api/payroll";
import type { Employee, LeaveBalance, LeavePolicy, LeaveRequest, LeaveType } from "@/lib/payroll/types";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  ANNUAL: "Annual",
  SICK: "Sick",
  MATERNITY: "Maternity",
  PATERNITY: "Paternity",
  PAID_EXTRA: "Extra (paid)",
  UNPAID: "Unpaid",
};

export default function PayrollLeavePage() {
  const [policies, setPolicies] = React.useState<LeavePolicy[]>([]);
  const [balances, setBalances] = React.useState<LeaveBalance[]>([]);
  const [requests, setRequests] = React.useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [year, setYear] = React.useState(new Date().getFullYear());
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const [policyForm, setPolicyForm] = React.useState({
    policyName: "Kenya default",
    country: "KE" as "KE" | "UG",
    annualLeaveDays: 21,
    sickLeaveDays: 14,
    maternityLeaveDays: 90,
    paternityLeaveDays: 14,
  });

  const [reqForm, setReqForm] = React.useState({
    employeeId: "",
    type: "ANNUAL" as LeaveType,
    startDate: "",
    endDate: "",
    extraLabel: "",
    notes: "",
  });

  const [balanceInit, setBalanceInit] = React.useState({ employeeId: "", annualEntitled: "21" });

  const employeeName = React.useCallback(
    (id: string) => employees.find((e) => e.id === id)?.name ?? id,
    [employees]
  );

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const [pol, bal, req, emp] = await Promise.all([
        fetchLeavePoliciesApi(),
        fetchLeaveBalancesApi({ year }),
        fetchLeaveRequestsApi({ year }),
        fetchEmployeesApi(),
      ]);
      setPolicies(pol);
      setBalances(bal);
      setRequests(req);
      setEmployees(emp);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [year]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreatePolicy = async () => {
    setSaving(true);
    try {
      await createLeavePolicyApi({
        country: policyForm.country,
        policyName: policyForm.policyName.trim(),
        annualLeaveDays: policyForm.annualLeaveDays,
        sickLeaveDays: policyForm.sickLeaveDays,
        maternityLeaveDays: policyForm.maternityLeaveDays,
        paternityLeaveDays: policyForm.paternityLeaveDays,
        extraLeaveTypes: [],
      });
      toast.success("Leave policy created.");
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleInitBalance = async () => {
    if (!balanceInit.employeeId.trim()) {
      toast.info("Select an employee.");
      return;
    }
    const entitled = parseFloat(balanceInit.annualEntitled);
    if (!Number.isFinite(entitled) || entitled < 21) {
      toast.info("Annual entitled must be at least 21.");
      return;
    }
    setSaving(true);
    try {
      await initLeaveBalanceApi({
        employeeId: balanceInit.employeeId,
        year,
        annualEntitled: entitled,
      });
      toast.success("Balance record ready.");
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRequest = async () => {
    if (!reqForm.employeeId || !reqForm.startDate || !reqForm.endDate) {
      toast.info("Employee and dates are required.");
      return;
    }
    setSaving(true);
    try {
      await createLeaveRequestApi({
        employeeId: reqForm.employeeId,
        type: reqForm.type,
        startDate: reqForm.startDate,
        endDate: reqForm.endDate,
        extraLabel: reqForm.type === "PAID_EXTRA" ? reqForm.extraLabel.trim() || undefined : undefined,
        notes: reqForm.notes.trim() || undefined,
      });
      toast.success("Leave request submitted.");
      setReqForm((p) => ({ ...p, notes: "", extraLabel: "" }));
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Leave"
        description="Policies, balances, and requests. Unpaid leave approved here feeds pay-run calculations when auto-unpaid is enabled."
        breadcrumbs={[
          { label: "Payroll", href: "/payroll/overview" },
          { label: "Leave" },
        ]}
        sticky
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/payroll/pay-runs">Pay runs</Link>
          </Button>
        }
      />
      <div className="p-6">
        <Tabs defaultValue="requests">
          <TabsList>
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="balances">Balances</TabsTrigger>
            <TabsTrigger value="policies">Policies</TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>New request</CardTitle>
                <CardDescription>Submit for approval. Paid leave does not reduce gross pay; unpaid does in payroll.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 max-w-3xl">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Employee</Label>
                  <Select value={reqForm.employeeId} onValueChange={(v) => setReqForm((p) => ({ ...p, employeeId: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={reqForm.type} onValueChange={(v) => setReqForm((p) => ({ ...p, type: v as LeaveType }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(LEAVE_TYPE_LABELS) as LeaveType[]).map((t) => (
                        <SelectItem key={t} value={t}>
                          {LEAVE_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {reqForm.type === "PAID_EXTRA" && (
                  <div className="space-y-2">
                    <Label>Extra label</Label>
                    <Input
                      value={reqForm.extraLabel}
                      onChange={(e) => setReqForm((p) => ({ ...p, extraLabel: e.target.value }))}
                      placeholder="Must match policy extra type"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Start</Label>
                  <Input type="date" value={reqForm.startDate} onChange={(e) => setReqForm((p) => ({ ...p, startDate: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>End</Label>
                  <Input type="date" value={reqForm.endDate} onChange={(e) => setReqForm((p) => ({ ...p, endDate: e.target.value }))} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Notes</Label>
                  <Textarea value={reqForm.notes} onChange={(e) => setReqForm((p) => ({ ...p, notes: e.target.value }))} rows={2} />
                </div>
                <div>
                  <Button onClick={() => void handleCreateRequest()} disabled={saving}>
                    {saving ? <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Submit request
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>All requests ({year})</CardTitle>
                <CardDescription>Approve or reject pending requests (requires finance.approve).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : requests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No requests for this year.</p>
                ) : (
                  requests.map((r) => (
                    <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm">
                      <span className="font-medium">{employeeName(r.employeeId)}</span>
                      <Badge variant="outline">{LEAVE_TYPE_LABELS[r.type]}</Badge>
                      <Badge variant={r.status === "APPROVED" ? "secondary" : "outline"}>{r.status}</Badge>
                      <span className="text-muted-foreground">
                        {r.startDate} → {r.endDate} · {r.days} d
                      </span>
                      {r.status === "PENDING" && (
                        <div className="ml-auto flex gap-1">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              void approveLeaveRequestApi(r.id)
                                .then(() => {
                                  toast.success("Approved.");
                                  return refresh();
                                })
                                .catch((e) => toast.error((e as Error).message));
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              void rejectLeaveRequestApi(r.id)
                                .then(() => {
                                  toast.success("Rejected.");
                                  return refresh();
                                })
                                .catch((e) => toast.error((e as Error).message));
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="balances" className="mt-4 space-y-4">
            <div className="flex items-center gap-3">
              <Label>Year</Label>
              <Input
                type="number"
                className="w-28"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10) || year)}
              />
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Initialize balance</CardTitle>
                <CardDescription>Creates the per-year balance row if missing (annual days entitled, min 21).</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-end gap-3 max-w-xl">
                <div className="space-y-2 flex-1 min-w-[200px]">
                  <Label>Employee</Label>
                  <Select value={balanceInit.employeeId} onValueChange={(v) => setBalanceInit((p) => ({ ...p, employeeId: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 w-28">
                  <Label>Annual days</Label>
                  <Input
                    value={balanceInit.annualEntitled}
                    onChange={(e) => setBalanceInit((p) => ({ ...p, annualEntitled: e.target.value }))}
                  />
                </div>
                <Button onClick={() => void handleInitBalance()} disabled={saving}>
                  Init
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Balances</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-4">Employee</th>
                      <th className="py-2 pr-4">Annual rem.</th>
                      <th className="py-2 pr-4">Sick used</th>
                      <th className="py-2 pr-4">Mat.</th>
                      <th className="py-2 pr-4">Pat.</th>
                      <th className="py-2">Unpaid used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balances.map((b) => (
                      <tr key={b.id} className="border-b border-border/60">
                        <td className="py-2 pr-4">{employeeName(b.employeeId)}</td>
                        <td className="py-2 pr-4">{b.annualRemaining}</td>
                        <td className="py-2 pr-4">{b.sickUsed}</td>
                        <td className="py-2 pr-4">{b.maternityUsed}</td>
                        <td className="py-2 pr-4">{b.paternityUsed}</td>
                        <td className="py-2">{b.unpaidUsed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!loading && balances.length === 0 && (
                  <p className="text-sm text-muted-foreground pt-2">No balances for {year}. Initialize per employee.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="policies" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Create policy</CardTitle>
                <CardDescription>Kenya defaults: 21 annual, 14 sick, 90 maternity, 14 paternity.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 max-w-2xl">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Name</Label>
                  <Input value={policyForm.policyName} onChange={(e) => setPolicyForm((p) => ({ ...p, policyName: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select value={policyForm.country} onValueChange={(v) => setPolicyForm((p) => ({ ...p, country: v as "KE" | "UG" }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KE">Kenya</SelectItem>
                      <SelectItem value="UG">Uganda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Annual days (min 21)</Label>
                  <Input
                    type="number"
                    min={21}
                    value={policyForm.annualLeaveDays}
                    onChange={(e) => setPolicyForm((p) => ({ ...p, annualLeaveDays: parseInt(e.target.value, 10) || 21 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sick</Label>
                  <Input
                    type="number"
                    min={0}
                    value={policyForm.sickLeaveDays}
                    onChange={(e) => setPolicyForm((p) => ({ ...p, sickLeaveDays: parseInt(e.target.value, 10) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Maternity</Label>
                  <Input
                    type="number"
                    min={0}
                    value={policyForm.maternityLeaveDays}
                    onChange={(e) => setPolicyForm((p) => ({ ...p, maternityLeaveDays: parseInt(e.target.value, 10) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Paternity</Label>
                  <Input
                    type="number"
                    min={0}
                    value={policyForm.paternityLeaveDays}
                    onChange={(e) => setPolicyForm((p) => ({ ...p, paternityLeaveDays: parseInt(e.target.value, 10) || 0 }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Button onClick={() => void handleCreatePolicy()} disabled={saving}>
                    Create policy
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Existing policies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {policies.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No policies yet.</p>
                ) : (
                  policies.map((p) => (
                    <div key={p.id} className="rounded-md border p-3 text-sm">
                      <div className="font-medium">{p.policyName}</div>
                      <div className="text-muted-foreground">
                        {p.country} · annual {p.annualLeaveDays}, sick {p.sickLeaveDays}, mat {p.maternityLeaveDays}, pat{" "}
                        {p.paternityLeaveDays}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}
