"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import {
  fetchFranchiseesApi,
  fetchRoyaltyChargesApi,
  runRoyaltiesMonthApi,
  patchFranchiseeApi,
  createFranchiseeApi,
  type FranchiseeRow,
  type RoyaltyChargeRow,
  type RoyaltyMonthRunResultRow,
} from "@/lib/api/cool-catch";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/stores/auth-store";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AsyncSearchableSelect } from "@/components/ui/async-searchable-select";
import { searchPartyLookupOptionsApi, type PartyLookupOption } from "@/lib/api/parties";

function summarizeRoyaltyRun(results: RoyaltyMonthRunResultRow[]) {
  let errors = 0;
  let skipped = 0;
  let invoiced = 0;
  for (const r of results) {
    if (r.error) {
      errors += 1;
      continue;
    }
    if (r.skipped) skipped += 1;
    else if (r.invoiceId || r.chargeId) invoiced += 1;
  }
  return { errors, skipped, invoiced, total: results.length };
}

export default function FranchiseRoyaltiesPage() {
  const permissions = useAuthStore((s) => s.permissions);
  const org = useAuthStore((s) => s.org);
  const canRead = permissions.includes("franchise.commission.read");
  const canWrite = permissions.includes("franchise.commission.write");
  const [franchisees, setFranchisees] = React.useState<FranchiseeRow[]>([]);
  const [charges, setCharges] = React.useState<RoyaltyChargeRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [running, setRunning] = React.useState(false);
  const [editId, setEditId] = React.useState<string>("");
  const [editAmount, setEditAmount] = React.useState("");
  const [lastRun, setLastRun] = React.useState<{
    year: number;
    month: number;
    results: RoyaltyMonthRunResultRow[];
  } | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [sheetPortalHost, setSheetPortalHost] = React.useState<HTMLElement | null>(null);
  const [createCustomerId, setCreateCustomerId] = React.useState("");
  const [createCustomerOption, setCreateCustomerOption] = React.useState<PartyLookupOption | null>(null);
  const [createCode, setCreateCode] = React.useState("");
  const [createName, setCreateName] = React.useState("");
  const [createOutletOrgId, setCreateOutletOrgId] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    Promise.all([fetchFranchiseesApi(), fetchRoyaltyChargesApi()])
      .then(([fi, ch]) => {
        setFranchisees(fi.filter((x) => x.isActive !== false));
        setCharges(ch);
      })
      .catch((e) => toast.error((e as Error)?.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const loadCustomerLookupOptions = React.useCallback(
    (query: string) =>
      searchPartyLookupOptionsApi({
        role: "customer",
        status: "ACTIVE",
        search: query,
        limit: 20,
      }),
    []
  );

  const saveFranchiseRoyalty = async () => {
    if (!editId) {
      toast.error("Select an outlet/franchisee.");
      return;
    }
    const n = Number(editAmount.replace(/,/g, "").trim());
    if (!Number.isFinite(n) || n < 0) {
      toast.error("Enter a non-negative amount.");
      return;
    }
    try {
      await patchFranchiseeApi(editId, { monthlyRoyaltyKes: n });
      toast.success("Royalty saved.");
      setEditAmount("");
      load();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Save failed");
    }
  };

  const handleRunPriorMonth = async () => {
    setRunning(true);
    try {
      const out = await runRoyaltiesMonthApi();
      setLastRun({ year: out.year, month: out.month, results: out.results ?? [] });
      const { errors, skipped, invoiced, total } = summarizeRoyaltyRun(out.results ?? []);
      const period = `${out.year}-${String(out.month).padStart(2, "0")}`;
      const detail = `${invoiced} invoiced, ${skipped} skipped, ${errors} errors (${total} franchisees).`;
      if (errors > 0) {
        toast.warning(`Royalty run ${period}: ${detail}`);
      } else {
        toast.success(`Royalty run ${period}: ${detail}`);
      }
      load();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Run failed");
    } finally {
      setRunning(false);
    }
  };

  const handleCreateFranchisee = async () => {
    if (!createCustomerId.trim()) {
      toast.error("Select a customer (invoice party).");
      return;
    }
    if (!createCode.trim() || !createName.trim()) {
      toast.error("Enter franchisee code and name.");
      return;
    }
    const outletRaw = createOutletOrgId.trim();
    setCreating(true);
    try {
      await createFranchiseeApi({
        customerId: createCustomerId.trim(),
        code: createCode.trim(),
        name: createName.trim(),
        ...(outletRaw ? { outletOrgId: outletRaw } : {}),
      });
      toast.success("Franchisee created.");
      setCreateOpen(false);
      setCreateCustomerId("");
      setCreateCustomerOption(null);
      setCreateCode("");
      setCreateName("");
      setCreateOutletOrgId("");
      load();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Create failed");
    } finally {
      setCreating(false);
    }
  };

  const feById = React.useMemo(
    () => new Map(franchisees.map((f) => [f.id, `${f.code} · ${f.name}`])),
    [franchisees]
  );

  const royaltyColumns = [
    {
      id: "period",
      header: "Period",
      accessor: (r: RoyaltyChargeRow) => `${r.periodYear}-${String(r.periodMonth).padStart(2, "0")}`,
    },
    {
      id: "fe",
      header: "Outlet",
      accessor: (r: RoyaltyChargeRow) => feById.get(r.franchiseeId) ?? r.franchiseeId.slice(0, 8),
    },
    {
      id: "amt",
      header: "Royalty",
      accessor: (r: RoyaltyChargeRow) => formatMoney(r.amountKes, "KES"),
    },
    {
      id: "inv",
      header: "Invoiced",
      accessor: (r: RoyaltyChargeRow) => (r.invoiceDocumentId ? "Yes" : "No"),
    },
    {
      id: "sett",
      header: "Settled from commission",
      accessor: (r: RoyaltyChargeRow) => formatMoney(r.settledKes ?? 0, "KES"),
    },
    { id: "st", header: "Status", accessor: (r: RoyaltyChargeRow) => r.status },
  ];

  const feColumns = [
    {
      id: "name",
      header: "Franchisee",
      accessor: (r: FranchiseeRow) => `${r.code} · ${r.name}`,
    },
    {
      id: "mr",
      header: "Royalty/month (KES)",
      accessor: (r: FranchiseeRow) =>
        r.monthlyRoyaltyKes == null ? "Default (see org franchise settings)" : String(r.monthlyRoyaltyKes),
    },
  ];

  const runResultColumns = [
    {
      id: "fe",
      header: "Franchisee",
      accessor: (r: RoyaltyMonthRunResultRow) => feById.get(r.franchiseeId) ?? r.franchiseeId,
    },
    {
      id: "outcome",
      header: "Outcome",
      accessor: (r: RoyaltyMonthRunResultRow) => {
        if (r.error) return r.error;
        if (r.skipped) return `Skipped: ${r.skipped}`;
        if (r.invoiceId) return `Invoiced (${r.invoiceId.slice(0, 8)}…)`;
        return "OK";
      },
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Royalty billing"
        description="Monthly franchise royalty invoicing (typically KSH 15,000) and netting against commission runs."
        breadcrumbs={[{ label: "Franchise", href: "/franchise/commission" }, { label: "Royalty billing" }]}
      />
      <div className="space-y-6 p-6">
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
          <p className="font-medium text-foreground">Session and permissions</p>
          <p className="mt-1 text-muted-foreground">
            Data is scoped to the <strong>current organisation</strong> only. Franchisee rows and charges belong to
            this org id — use your <strong>HQ</strong> login, not an outlet-only org, when managing the franchise
            registry.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">Org:</span>
            <span className="font-mono text-xs">{org?.name ?? "—"}</span>
            {org?.orgId ? (
              <Badge variant="outline" className="font-mono text-xs">
                {org.orgId}
              </Badge>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={canRead ? "secondary" : "destructive"}>franchise.commission.read {canRead ? "✓" : "✗"}</Badge>
            <Badge variant={canWrite ? "secondary" : "destructive"}>
              franchise.commission.write {canWrite ? "✓" : "✗"}
            </Badge>
          </div>
          {!canWrite ? (
            <p className="mt-2 text-amber-700 dark:text-amber-400">
              You need <code className="rounded bg-muted px-1">franchise.commission.write</code> to generate royalties
              or save overrides. Ask an admin to grant it on this org.
            </p>
          ) : null}
        </div>

        {!loading && franchisees.length === 0 ? (
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm">
            <p className="font-medium text-foreground">No franchisee registry rows yet</p>
            <p className="mt-1 text-muted-foreground">
              Royalty billing reads <code className="rounded bg-muted px-1">GET /api/franchise/franchisees</code> for this
              org. The list is empty, so the dropdown and charges will stay blank until you add at least one franchisee.
              Each row needs a HQ <strong>customer</strong> party id (for posted royalty invoices), plus a code and
              name. Optionally set <code className="rounded bg-muted px-1">outletOrgId</code> to link a network outlet
              for commission and VMI alignment.
            </p>
            <ul className="mt-2 list-inside list-disc text-muted-foreground">
              <li>
                Create or pick a customer under{" "}
                <Link href="/master/parties" className="text-primary underline underline-offset-2">
                  Masters → Parties
                </Link>
                .
              </li>
              <li>
                Use{" "}
                <Link href="/franchise/network/outlets" className="text-primary underline underline-offset-2">
                  Franchise network → Outlets
                </Link>{" "}
                to copy an outlet org id when linking.
              </li>
              <li>
                After registry rows exist, click <strong>Generate prior month royalties</strong> to create charge rows
                and posted invoices.
              </li>
            </ul>
            <div className="mt-3">
              <Button type="button" variant="default" disabled={!canWrite} onClick={() => setCreateOpen(true)}>
                Add franchisee
              </Button>
            </div>
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Manual month-end invoicing</CardTitle>
            <CardDescription>
              Creates royalty charges and POSTED invoices for each active franchise for the chosen calendar month. Defaults to the&nbsp;
              <strong>prior calendar month</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-3">
              <Button type="button" disabled={running || !canWrite} onClick={handleRunPriorMonth}>
                {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Generate prior month royalties
              </Button>
            </div>
            {lastRun && lastRun.results.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Last run: {lastRun.year}-{String(lastRun.month).padStart(2, "0")} ({lastRun.results.length} franchisees)
                </p>
                <div className="overflow-x-auto">
                  <DataTable data={lastRun.results} columns={runResultColumns} emptyMessage="No rows." />
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                After you run a month, per-franchisee outcomes (invoiced, skipped, errors) appear here. If the charges
                table stays empty but this shows errors, fix the message (often invalid customer for invoicing) and run
                again.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">Outlet royalty amount</CardTitle>
              <CardDescription>Override KES per outlet; leave empty in API to inherit org default (15,000).</CardDescription>
            </div>
            {franchisees.length > 0 && canWrite ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
                Add franchisee
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label>Franchisee</Label>
              <Select value={editId || ""} onValueChange={setEditId}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="Select outlet" />
                </SelectTrigger>
                <SelectContent>
                  {franchisees.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.code} · {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Monthly royalty (KES)</Label>
              <Input
                className="w-40"
                inputMode="numeric"
                placeholder="15000"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
              />
            </div>
            <Button type="button" disabled={!canWrite} variant="secondary" onClick={saveFranchiseRoyalty}>
              Save outlet override
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Charges</CardTitle>
            <CardDescription>Historical royalty assessments and withholding progress.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {loading ? (
              <p className="p-6 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </p>
            ) : (
              <DataTable data={charges} columns={royaltyColumns} emptyMessage="No royalty charges yet." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Franchisee registry (royalty overrides)</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {loading ? null : (
              <DataTable data={franchisees} columns={feColumns} emptyMessage="No franchisees." />
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="flex w-full flex-col overflow-hidden sm:max-w-md" side="right">
          <div ref={setSheetPortalHost} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
            <SheetHeader>
              <SheetTitle>Add franchisee</SheetTitle>
              <SheetDescription>
                Creates a registry row via <code className="text-xs">POST /api/franchise/franchisees</code>. The customer
                is the AR party for royalty invoices.
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-2">
              <Label>Customer (invoice party)</Label>
              <AsyncSearchableSelect
                value={createCustomerId}
                onValueChange={(value) => {
                  setCreateCustomerId(value);
                  if (!value) setCreateCustomerOption(null);
                }}
                onOptionSelect={(option) => setCreateCustomerOption(option)}
                loadOptions={loadCustomerLookupOptions}
                selectedOption={createCustomerOption}
                placeholder="Select customer"
                searchPlaceholder="Type name, code, phone, or email"
                emptyMessage="No customers found."
                recentStorageKey="lookup:royalties-franchisee-customer"
                disabled={!canWrite || creating}
                portalContainer={sheetPortalHost}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fe-code">Franchisee code</Label>
              <Input
                id="fe-code"
                value={createCode}
                onChange={(e) => setCreateCode(e.target.value)}
                placeholder="e.g. WALTER"
                disabled={!canWrite || creating}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fe-name">Display name</Label>
              <Input
                id="fe-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. Walter Franchise"
                disabled={!canWrite || creating}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fe-outlet">Outlet org id (optional)</Label>
              <Input
                id="fe-outlet"
                className="font-mono text-xs"
                value={createOutletOrgId}
                onChange={(e) => setCreateOutletOrgId(e.target.value)}
                placeholder="UUID of child outlet org"
                disabled={!canWrite || creating}
              />
              <p className="text-xs text-muted-foreground">
                Link to a network outlet for commission and VMI. Leave blank to set later via PATCH.
              </p>
            </div>
            <div className="mt-auto flex gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)} disabled={creating}>
                Cancel
              </Button>
              <Button type="button" onClick={handleCreateFranchisee} disabled={!canWrite || creating}>
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
