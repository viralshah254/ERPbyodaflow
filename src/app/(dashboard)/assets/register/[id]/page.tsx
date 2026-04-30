"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  assignAssetCustodyApi,
  fetchAssetAssignmentsApi,
  fetchAssetByIdApi,
} from "@/lib/api/assets";
import type { AssetAssignmentRow, AssetRow, CustodyType } from "@/lib/types/assets";
import { fetchFranchiseNetworkOutlets } from "@/lib/api/cool-catch";
import { fetchEmployeesApi } from "@/lib/api/payroll";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const CUSTODY_OPTIONS: Array<{ value: CustodyType; label: string }> = [
  { value: "ORG_STOCK", label: "HQ / organization stock" },
  { value: "FRANCHISE_OUTLET", label: "Franchise outlet" },
  { value: "EMPLOYEE", label: "Employee" },
  { value: "IN_TRANSIT", label: "In transit" },
];

export default function AssetDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [asset, setAsset] = React.useState<AssetRow | null>(null);
  const [assignments, setAssignments] = React.useState<AssetAssignmentRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [outlets, setOutlets] = React.useState<Array<{ id: string; name: string }>>([]);
  const [employees, setEmployees] = React.useState<Array<{ id: string; name: string }>>([]);
  const [assignForm, setAssignForm] = React.useState({
    custodyType: "ORG_STOCK" as CustodyType,
    custodianOutletId: "",
    custodianEmployeeId: "",
    effectiveFrom: new Date().toISOString().slice(0, 10),
    monthlyEquipmentFee: "",
    securityDepositAmount: "",
    notes: "",
  });

  const load = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [item, history] = await Promise.all([fetchAssetByIdApi(id), fetchAssetAssignmentsApi(id)]);
      setAsset(item);
      setAssignments(history);
    } catch (error) {
      toast.error((error as Error).message);
      setAsset(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    let active = true;
    void fetchFranchiseNetworkOutlets()
      .then((rows) => {
        if (!active) return;
        setOutlets(rows.map((r) => ({ id: r.id, name: r.name })));
      })
      .catch(() => {});
    void fetchEmployeesApi()
      .then((emps) => {
        if (!active) return;
        setEmployees(emps.map((e) => ({ id: e.id, name: e.name })));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const nbv =
    asset != null
      ? Math.max(0, asset.cost - (asset.accumulatedDepreciation ?? 0) - (asset.salvage ?? 0))
      : 0;

  if (!asset && !isLoading) {
    return (
      <PageShell>
        <PageHeader title="Not found" breadcrumbs={[{ label: "Assets", href: "/assets/overview" }, { label: "Register", href: "/assets/register" }, { label: id }]} />
        <div className="p-6">
          <p className="text-muted-foreground">Asset not found.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/assets/register">Back to list</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title={asset ? `${asset.code} — ${asset.name}` : "Loading asset..."}
        description={asset ? `${asset.category} · ${asset.status.replace(/_/g, " ")}` : "Fetching live asset details"}
        breadcrumbs={[
          { label: "Assets", href: "/assets/overview" },
          { label: "Register", href: "/assets/register" },
          { label: asset?.code ?? id },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            {asset && asset.status !== "DISPOSED" && (
              <>
                <Button size="sm" variant="secondary" onClick={() => setAssignOpen(true)}>
                  <Icons.ArrowRightLeft className="mr-2 h-4 w-4" />
                  Transfer custody
                </Button>
                <Button size="sm" asChild>
                  <Link href="/assets/disposals">Dispose</Link>
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/assets/register">Back to list</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        {!asset ? (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">Loading live asset details...</CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Details</CardTitle>
                <CardDescription>Financial master — cost, life, depreciation, identifiers.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p><span className="text-muted-foreground">Category:</span> {asset.category}</p>
                {asset.branchId && <p><span className="text-muted-foreground">Branch:</span> {asset.branchId}</p>}
                {(asset.serialNumber || asset.assetTag || asset.model) && (
                  <p>
                    <span className="text-muted-foreground">Identifiers:</span>{" "}
                    {[asset.assetTag, asset.serialNumber, asset.model].filter(Boolean).join(" · ")}
                  </p>
                )}
                {asset.inServiceDate && (
                  <p><span className="text-muted-foreground">In-service:</span> {asset.inServiceDate}</p>
                )}
                <p><span className="text-muted-foreground">Acquisition date:</span> {asset.acquisitionDate}</p>
                <p><span className="text-muted-foreground">Cost:</span> {formatMoney(asset.cost, "KES")}</p>
                <p><span className="text-muted-foreground">Salvage:</span> {formatMoney(asset.salvage, "KES")}</p>
                <p>
                  <span className="text-muted-foreground">Accumulated depreciation:</span>{" "}
                  {formatMoney(asset.accumulatedDepreciation ?? 0, "KES")}
                </p>
                <p><span className="text-muted-foreground">Net book (incl. salvage floor):</span> {formatMoney(nbv, "KES")}</p>
                <p><span className="text-muted-foreground">Useful life:</span> {asset.usefulLifeYears} years</p>
                {asset.usefulLifeMonths != null && (
                  <p><span className="text-muted-foreground">Useful life months:</span> {asset.usefulLifeMonths}</p>
                )}
                <p>
                  <span className="text-muted-foreground">Depreciation:</span>{" "}
                  {asset.depreciationMethod.replace(/_/g, " ")}
                  {asset.depreciationMethod === "REDUCING_BALANCE" && asset.depreciationRatePct != null
                    ? ` (${asset.depreciationRatePct}% p.a.)`
                    : ""}
                </p>
                <p>
                  <span className="text-muted-foreground">Current custody:</span>{" "}
                  {asset.currentCustodyType?.replace(/_/g, " ") ?? "—"}
                  {asset.custodySince ? ` since ${asset.custodySince}` : ""}
                </p>
                {asset.custodianOutletName && (
                  <p><span className="text-muted-foreground">Outlet:</span> {asset.custodianOutletName}</p>
                )}
                {asset.custodianEmployeeName && (
                  <p><span className="text-muted-foreground">Employee:</span> {asset.custodianEmployeeName}</p>
                )}
                {asset.linkedVendorId && <p><span className="text-muted-foreground">Linked vendor:</span> {asset.linkedVendorId}</p>}
                {asset.linkedInvoiceId && <p><span className="text-muted-foreground">Linked invoice:</span> {asset.linkedInvoiceId}</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Custody timeline</CardTitle>
                <CardDescription>Append-only assignment history (who held the asset, and franchise commercial terms per handover).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {assignments.length === 0 ? (
                  <p className="text-muted-foreground">No assignments recorded.</p>
                ) : (
                  <ul className="space-y-3">
                    {assignments.map((row) => (
                      <li key={row.id} className="rounded-lg border p-3">
                        <div className="flex flex-wrap justify-between gap-2">
                          <span className="font-medium">{row.custodyType.replace(/_/g, " ")}</span>
                          <span className="text-xs text-muted-foreground">
                            {row.effectiveFrom}
                            {row.effectiveTo ? ` → ${row.effectiveTo}` : " → open"}
                          </span>
                        </div>
                        {(row.monthlyEquipmentFee != null || row.securityDepositAmount != null) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {row.monthlyEquipmentFee != null && <>Fee {formatMoney(row.monthlyEquipmentFee, row.currency ?? "KES")}/mo · </>}
                            {row.securityDepositAmount != null && <>Deposit {formatMoney(row.securityDepositAmount, row.currency ?? "KES")}</>}
                          </p>
                        )}
                        {row.notes && <p className="text-xs mt-1">{row.notes}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Sheet open={assignOpen} onOpenChange={setAssignOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Transfer custody</SheetTitle>
            <SheetDescription>Creates a new assignment and closes the previous open period.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Custody type</Label>
              <Select
                value={assignForm.custodyType}
                onValueChange={(v) => setAssignForm((p) => ({ ...p, custodyType: v as CustodyType }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CUSTODY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {assignForm.custodyType === "FRANCHISE_OUTLET" && (
              <div className="space-y-2">
                <Label>Outlet</Label>
                <Select
                  value={assignForm.custodianOutletId || "__none__"}
                  onValueChange={(v) =>
                    setAssignForm((p) => ({ ...p, custodianOutletId: v === "__none__" ? "" : v }))
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Select outlet" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select…</SelectItem>
                    {outlets.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {assignForm.custodyType === "EMPLOYEE" && (
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select
                  value={assignForm.custodianEmployeeId || "__none__"}
                  onValueChange={(v) =>
                    setAssignForm((p) => ({ ...p, custodianEmployeeId: v === "__none__" ? "" : v }))
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select…</SelectItem>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Effective from</Label>
              <Input
                type="date"
                value={assignForm.effectiveFrom}
                onChange={(e) => setAssignForm((p) => ({ ...p, effectiveFrom: e.target.value }))}
              />
            </div>
            {assignForm.custodyType === "FRANCHISE_OUTLET" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Monthly equipment fee</Label>
                  <Input
                    type="number"
                    value={assignForm.monthlyEquipmentFee}
                    onChange={(e) => setAssignForm((p) => ({ ...p, monthlyEquipmentFee: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Security deposit</Label>
                  <Input
                    type="number"
                    value={assignForm.securityDepositAmount}
                    onChange={(e) => setAssignForm((p) => ({ ...p, securityDepositAmount: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={assignForm.notes}
                onChange={(e) => setAssignForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Optional"
              />
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!asset) return;
                try {
                  await assignAssetCustodyApi(asset.id, {
                    custodyType: assignForm.custodyType,
                    effectiveFrom: assignForm.effectiveFrom,
                    custodianOutletId: assignForm.custodianOutletId || undefined,
                    custodianEmployeeId: assignForm.custodianEmployeeId || undefined,
                    monthlyEquipmentFee: assignForm.monthlyEquipmentFee
                      ? Number(assignForm.monthlyEquipmentFee)
                      : undefined,
                    securityDepositAmount: assignForm.securityDepositAmount
                      ? Number(assignForm.securityDepositAmount)
                      : undefined,
                    currency: "KES",
                    notes: assignForm.notes || undefined,
                  });
                  toast.success("Custody updated.");
                  setAssignOpen(false);
                  await load();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Assignment failed");
                }
              }}
            >
              Save transfer
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
