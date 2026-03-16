"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchFranchiseNetworkOutlets, createFranchiseOutletApi, type FranchiseNetworkOutletRow, type CreateFranchiseOutletPayload } from "@/lib/api/cool-catch";
import { useAuthStore } from "@/stores/auth-store";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const emptyForm: CreateFranchiseOutletPayload = {
  name: "",
  outletCode: "",
  adminEmail: "",
  initialPassword: "",
  territory: "",
  managerName: "",
};

export default function FranchiseOutletsPage() {
  const [outlets, setOutlets] = React.useState<FranchiseNetworkOutletRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [addOpen, setAddOpen] = React.useState(false);
  const [form, setForm] = React.useState<CreateFranchiseOutletPayload>(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const permissions = useAuthStore((s) => s.permissions);
  const canAdd = permissions.includes("franchise.network.write");

  const load = React.useCallback(() => {
    setLoading(true);
    fetchFranchiseNetworkOutlets()
      .then((data) => setOutlets(data))
      .catch(() => setOutlets([]))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    if (!form.name.trim() || !form.outletCode.trim() || !form.adminEmail.trim() || !form.initialPassword.trim()) {
      toast.error("Name, outlet code, admin email, and password are required.");
      return;
    }
    if (form.initialPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setSaving(true);
    try {
      const result = await createFranchiseOutletApi({
        name: form.name.trim(),
        outletCode: form.outletCode.trim(),
        adminEmail: form.adminEmail.trim().toLowerCase(),
        initialPassword: form.initialPassword,
        territory: form.territory?.trim() || undefined,
        managerName: form.managerName?.trim() || undefined,
      });
      setAddOpen(false);
      setForm(emptyForm);
      load();
      toast.success(
        `Franchisee created. They can log in with ${result.adminEmail} and the password you set. Ask them to change it on first sign-in.`
      );
      if (result.billingImpact?.invoiceId) {
        toast.info(
          result.billingImpact.lineItems?.length
            ? `Billing created: ${result.billingImpact.lineItems.map((line) => line.description).join(", ")}`
            : `Billing linked: invoice ${result.billingImpact.invoiceId.slice(0, 8)}…`
        );
      }
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "Failed to create franchisee";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Manage franchisees"
        description="Add franchisees (outlets) and give them login access. Each franchisee can sign in to their own outlet workspace."
        breadcrumbs={[{ label: "Franchise", href: "/franchise/overview" }, { label: "Manage franchisees" }]}
        sticky
        actions={
          canAdd ? (
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add franchisee
            </Button>
          ) : null
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Franchisees (outlets)</CardTitle>
          <CardDescription>Outlets that can log in to the ERP. Add a new franchisee to create an org and admin user for them.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Territory</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outlets.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.name}</TableCell>
                    <TableCell className="text-muted-foreground">{o.code ?? "—"}</TableCell>
                    <TableCell>{o.territory ?? "—"}</TableCell>
                    <TableCell>{o.isActive ? "Active" : "Inactive"}</TableCell>
                    <TableCell>KES {Number(o.revenue ?? 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/franchise/${o.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!loading && outlets.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No franchisees yet. {canAdd ? "Click “Add franchisee” to create one and give them login access." : "You need franchise.network.write permission to add franchisees."}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add franchisee</SheetTitle>
            <SheetDescription>
              Create a new outlet and admin user. They will be able to log in with the email and password you set.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            Each active franchise outlet is billed at $50/month and includes 2 users before additional-seat charges apply. Mid-month setup is prorated through month end.
          </div>
          <div className="grid gap-4 py-6">
            <div className="space-y-2">
              <Label htmlFor="name">Outlet / franchisee name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Westlands Outlet"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="outletCode">Outlet code</Label>
              <Input
                id="outletCode"
                value={form.outletCode}
                onChange={(e) => setForm((p) => ({ ...p, outletCode: e.target.value }))}
                placeholder="e.g. WL-01"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminEmail">Admin email (for login)</Label>
              <Input
                id="adminEmail"
                type="email"
                value={form.adminEmail}
                onChange={(e) => setForm((p) => ({ ...p, adminEmail: e.target.value }))}
                placeholder="franchisee@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="initialPassword">Temporary password</Label>
              <Input
                id="initialPassword"
                type="password"
                value={form.initialPassword}
                onChange={(e) => setForm((p) => ({ ...p, initialPassword: e.target.value }))}
                placeholder="Min 8 characters"
              />
              <p className="text-xs text-muted-foreground">They will be asked to change it on first sign-in.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="territory">Territory (optional)</Label>
              <Input
                id="territory"
                value={form.territory ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, territory: e.target.value }))}
                placeholder="e.g. Westlands"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="managerName">Manager name (optional)</Label>
              <Input
                id="managerName"
                value={form.managerName ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, managerName: e.target.value }))}
                placeholder="Outlet manager"
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleAdd()} disabled={saving}>{saving ? "Creating…" : "Add franchisee"}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
