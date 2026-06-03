"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LIST_PAGE_BODY_CLASS, LIST_PAGE_SHELL_CLASS, LIST_TABLE_PAGINATION_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { TablePagination } from "@/components/ui/table-pagination";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  fetchFranchiseNetworkOutletsPage,
  createFranchiseOutletApi,
  fetchNextOutletCodeApi,
  repairFranchiseeRegistryApi,
  patchOutletTargets,
  patchFranchiseNetworkOutletApi,
  deleteFranchiseNetworkOutletApi,
  type FranchiseNetworkOutletRow,
  type CreateFranchiseOutletPayload,
} from "@/lib/api/cool-catch";
import { assignOutletPricingZone } from "@/lib/api/franchise-pricing";
import { fetchPricingZones } from "@/lib/api/pricing-engine";
import { useAuthStore } from "@/stores/auth-store";
import { Loader2, Plus, Wrench, Target, CheckCircle2, Clock, AlertTriangle, Minus, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const emptyForm: CreateFranchiseOutletPayload = {
  name: "",
  outletCode: "",
  adminEmail: "",
  initialPassword: "",
  territory: "",
  managerName: "",
};

const SEARCH_DEBOUNCE_MS = 400;
const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

export default function FranchiseOutletsPage() {
  const router = useRouter();
  const [outlets, setOutlets] = React.useState<FranchiseNetworkOutletRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [tableBusy, setTableBusy] = React.useState(false);
  const [searchInput, setSearchInput] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [pageOffset, setPageOffset] = React.useState(0);
  const [pageSize, setPageSize] = React.useState<number>(25);
  const [hasMore, setHasMore] = React.useState(false);
  const [totalCount, setTotalCount] = React.useState(0);
  const hasLoadedOnce = React.useRef(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [form, setForm] = React.useState<CreateFranchiseOutletPayload>(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [outletCodeLoading, setOutletCodeLoading] = React.useState(false);
  const [repairing, setRepairing] = React.useState(false);
  const [managerPhone, setManagerPhone] = React.useState("");
  const [managerPhonePrefix, setManagerPhonePrefix] = React.useState("+254");
  // Target editing
  const [targetOutlet, setTargetOutlet] = React.useState<FranchiseNetworkOutletRow | null>(null);
  const [targetValueKes, setTargetValueKes] = React.useState("");
  const [targetKg, setTargetKg] = React.useState("");
  const [savingTargets, setSavingTargets] = React.useState(false);
  const [editOutlet, setEditOutlet] = React.useState<FranchiseNetworkOutletRow | null>(null);
  const [editForm, setEditForm] = React.useState({
    name: "",
    outletCode: "",
    territory: "",
    storeFormat: "",
    managerName: "",
 });
  const [savingEdit, setSavingEdit] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<FranchiseNetworkOutletRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [pricingZones, setPricingZones] = React.useState<Awaited<ReturnType<typeof fetchPricingZones>>>([]);
  const [zoneDraft, setZoneDraft] = React.useState<Record<string, string>>({});
  const [savingZoneFor, setSavingZoneFor] = React.useState<string | null>(null);
  const permissions = useAuthStore((s) => s.permissions);
  const canView =
    permissions.includes("franchise.network.read") ||
    permissions.includes("franchise.analytics.read") ||
    permissions.includes("admin.users");
  const canAdd = permissions.includes("franchise.network.write") || permissions.includes("admin.users");

  const load = React.useCallback(
    async (offset: number) => {
      const isFirstLoad = !hasLoadedOnce.current;
      if (isFirstLoad) setLoading(true);
      else setTableBusy(true);
      try {
        const page = await fetchFranchiseNetworkOutletsPage({
          limit: pageSize,
          offset,
          search: debouncedSearch || undefined,
        });
        setOutlets(page.items);
        setPageOffset(page.offset);
        setHasMore(page.hasMore);
        setTotalCount(page.total);
        hasLoadedOnce.current = true;
      } catch {
        setOutlets([]);
        setTotalCount(0);
        setHasMore(false);
      } finally {
        setLoading(false);
        setTableBusy(false);
      }
    },
    [pageSize, debouncedSearch],
  );

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  React.useEffect(() => {
    setPageOffset(0);
  }, [debouncedSearch, pageSize]);

  React.useEffect(() => {
    if (!canView) {
      setOutlets([]);
      setLoading(false);
      return;
    }
    void load(pageOffset);
  }, [canView, pageOffset, debouncedSearch, pageSize, load]);

  React.useEffect(() => {
    if (!canView) return;
    fetchPricingZones()
      .then(setPricingZones)
      .catch(() => setPricingZones([]));
  }, [canView]);

  React.useEffect(() => {
    const draft: Record<string, string> = {};
    for (const o of outlets) {
      if (o.zoneId) draft[o.id] = o.zoneId;
    }
    setZoneDraft(draft);
  }, [outlets]);

  const handleZoneSave = async (outletId: string) => {
    const zoneId = zoneDraft[outletId];
    if (!zoneId) {
      toast.error("Select a pricing zone.");
      return;
    }
    setSavingZoneFor(outletId);
    try {
      await assignOutletPricingZone(outletId, zoneId);
      toast.success("Pricing zone assigned");
      load(pageOffset);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not assign zone");
    } finally {
      setSavingZoneFor(null);
    }
  };

  // Auto-fetch next outlet code when the sheet opens
  React.useEffect(() => {
    if (!addOpen) return;
    setOutletCodeLoading(true);
    fetchNextOutletCodeApi()
      .then((code) => setForm((p) => ({ ...p, outletCode: code })))
      .catch(() => {/* non-fatal — user can type manually */})
      .finally(() => setOutletCodeLoading(false));
  }, [addOpen]);

  const handleAdd = async () => {
    if (!form.name.trim() || !form.adminEmail.trim() || !form.initialPassword.trim()) {
      toast.error("Name, admin email, and password are required.");
      return;
    }
    if (form.initialPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setSaving(true);
    try {
      await createFranchiseOutletApi({
        name: form.name.trim(),
        outletCode: form.outletCode.trim(),
        adminEmail: form.adminEmail.trim().toLowerCase(),
        initialPassword: form.initialPassword,
        territory: form.territory?.trim() || undefined,
        managerName: form.managerName?.trim() || undefined,
        managerPhone: managerPhone.trim() ? `${managerPhonePrefix}${managerPhone.trim()}` : undefined,
      });
      setAddOpen(false);
      setForm(emptyForm);
      setManagerPhone("");
      setManagerPhonePrefix("+254");
      toast.success("Franchise outlet staged for billing approval.");
      toast.info("Redirecting to Billing — confirm payment to activate the outlet.");
      router.push("/settings/billing");
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Failed to create franchisee";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const openTargetSheet = (o: FranchiseNetworkOutletRow) => {
    setTargetOutlet(o);
    setTargetValueKes(o.weeklySalesTargetValueKes != null ? String(o.weeklySalesTargetValueKes) : "");
    setTargetKg(o.weeklySalesTargetKg != null ? String(o.weeklySalesTargetKg) : "");
  };

  const handleSaveTargets = async () => {
    if (!targetOutlet) return;
    setSavingTargets(true);
    try {
      await patchOutletTargets(targetOutlet.id, {
        ...(targetValueKes.trim() ? { weeklySalesTargetValueKes: Number(targetValueKes) } : {}),
        ...(targetKg.trim() ? { weeklySalesTargetKg: Number(targetKg) } : {}),
      });
      toast.success("Targets updated.");
      setTargetOutlet(null);
      load(pageOffset);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save targets.");
    } finally {
      setSavingTargets(false);
    }
  };

  const handleRepairRegistry = async () => {
    setRepairing(true);
    try {
      const { items } = await repairFranchiseeRegistryApi();
      const linked = items.filter((i) => i.status === "linked").length;
      const skipped = items.filter((i) => i.status.startsWith("skipped")).length;
      const errors = items.filter((i) => i.status === "error").length;
      toast.success(`Registry repair: ${linked} linked, ${skipped} skipped, ${errors} errors.`);
      if (errors > 0 || items.some((i) => i.message)) {
        console.info("[repair-franchisee-registry]", items);
      }
      load(pageOffset);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Repair failed");
    } finally {
      setRepairing(false);
    }
  };

  const openEditOutlet = (o: FranchiseNetworkOutletRow) => {
    setEditOutlet(o);
    setEditForm({
      name: o.name ?? "",
      outletCode: o.code ?? "",
      territory: o.territory ?? "",
      storeFormat: o.storeFormat ?? "",
      managerName: o.managerName ?? "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editOutlet) return;
    if (!editForm.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    if (!editForm.outletCode.trim()) {
      toast.error("Outlet code is required.");
      return;
    }
    setSavingEdit(true);
    try {
      const res = await patchFranchiseNetworkOutletApi(editOutlet.id, {
        name: editForm.name.trim(),
        outletCode: editForm.outletCode.trim(),
        territory: editForm.territory.trim() || undefined,
        storeFormat: editForm.storeFormat.trim() || undefined,
        managerName: editForm.managerName.trim() || undefined,
      });
      if (res && typeof res === "object" && "deactivated" in res && res.deactivated) {
        toast.success("Outlet deactivated.");
      } else {
        toast.success("Franchise outlet updated.");
      }
      setEditOutlet(null);
      load(pageOffset);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update outlet.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDeleteOutlet = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteFranchiseNetworkOutletApi(deleteTarget.id);
      toast.success(`${deleteTarget.name} removed from the active network. Users can no longer sign in.`);
      setDeleteTarget(null);
      load(pageOffset);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove outlet.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Outlets"
        description="Add franchisees (outlets) and give them login access. New outlets also get an HQ customer party and franchisee registry row for royalty and commission. Use Repair if older outlets pre-date that automation."
        breadcrumbs={[{ label: "Franchise", href: "/franchise/network/overview" }, { label: "Outlets" }]}
        sticky
        actions={
          canView && canAdd ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={repairing} onClick={handleRepairRegistry}>
                {repairing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wrench className="mr-2 h-4 w-4" />}
                Repair commission registry
              </Button>
              <Button onClick={() => setAddOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add franchisee
              </Button>
            </div>
          ) : null
        }
      />
      <div className={LIST_PAGE_BODY_CLASS}>
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <CardHeader className="shrink-0 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Franchisees (outlets)</CardTitle>
                <CardDescription>
                  {totalCount > 0
                    ? `${totalCount} outlet${totalCount !== 1 ? "s" : ""} in this network.`
                    : "Outlets that can log in to the ERP."}{" "}
                  Each franchisee gets their own org and admin user on creation, plus HQ billing linkage.
                </CardDescription>
              </div>
              {canView ? (
                <Input
                  placeholder="Search outlets…"
                  className="w-full sm:w-56 shrink-0"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
            {!canView ? (
              <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                You do not have permission to view franchise network outlets.
              </div>
            ) : loading ? (
              <p className="px-6 py-8 text-sm text-muted-foreground">Loading…</p>
            ) : outlets.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                {debouncedSearch
                  ? "No outlets match your search."
                  : canAdd
                    ? "No franchisees yet. Click “Add franchisee” to create one and give them login access."
                    : "You need franchise.network.write permission to add franchisees."}
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t">
                <div
                  className={cn(
                    "min-h-0 flex-1 overflow-auto",
                    tableBusy && "pointer-events-none opacity-60",
                  )}
                >
                  <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Pricing zone</TableHead>
                  <TableHead>Price list</TableHead>
                  <TableHead>Security deposit</TableHead>
                  <TableHead>Territory</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Weekly targets</TableHead>
                  <TableHead>Stock take</TableHead>
                  <TableHead className="w-[56px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outlets.map((o) => (
                  <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.name}</TableCell>
                  <TableCell className="text-muted-foreground">{o.code ?? "—"}</TableCell>
                  <TableCell className="min-w-[200px]">
                    {canAdd ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Select
                          value={zoneDraft[o.id] || "__none__"}
                          onValueChange={(v) =>
                            setZoneDraft((prev) => ({
                              ...prev,
                              [o.id]: v === "__none__" ? "" : v,
                            }))
                          }
                        >
                          <SelectTrigger className="h-8 w-[160px] text-xs">
                            <SelectValue placeholder="Select zone…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— None —</SelectItem>
                            {pricingZones.map((z) => (
                              <SelectItem key={z.id} value={z.id}>
                                {z.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          disabled={savingZoneFor === o.id || !zoneDraft[o.id]}
                          onClick={() => void handleZoneSave(o.id)}
                        >
                          {savingZoneFor === o.id ? "Saving…" : "Save"}
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm">{o.zoneName ?? "—"}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs max-w-[140px] truncate" title={o.priceListName ?? undefined}>
                    {o.priceListName ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {o.securityDepositAmountKes != null && o.securityDepositAmountKes > 0 ? (
                      o.securityDepositPaidAt ? (
                        <span className="text-muted-foreground">
                          Paid {o.securityDepositPaidAt}
                          {o.securityDepositChargeDocumentId ? (
                            <>
                              {" · "}
                              <Link
                                className="underline"
                                href={`/docs/franchise-security-deposit/${o.securityDepositChargeDocumentId}`}
                              >
                                Document
                              </Link>
                            </>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-amber-700 dark:text-amber-500">
                          Due KES {Number(o.securityDepositAmountKes).toLocaleString()}
                          {o.securityDepositChargeDocumentId ? (
                            <>
                              {" · "}
                              <Link
                                className="underline"
                                href={`/docs/franchise-security-deposit/${o.securityDepositChargeDocumentId}`}
                              >
                                Open
                              </Link>
                            </>
                          ) : null}
                        </span>
                      )
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{o.territory ?? "—"}</TableCell>
                    <TableCell>{o.isActive ? "Active" : "Inactive"}</TableCell>
                    <TableCell>KES {Number(o.revenue ?? 0).toLocaleString()}</TableCell>
                    <TableCell>
                      {canAdd ? (
                        <button
                          type="button"
                          onClick={() => openTargetSheet(o)}
                          className="flex flex-col gap-0.5 text-left hover:opacity-70 transition-opacity"
                          title="Edit weekly targets"
                        >
                          {o.weeklySalesTargetValueKes ? (
                            <span className="text-xs font-medium tabular-nums">
                              KES {Number(o.weeklySalesTargetValueKes).toLocaleString()}
                            </span>
                          ) : null}
                          {o.weeklySalesTargetKg ? (
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {Number(o.weeklySalesTargetKg).toLocaleString()} kg
                            </span>
                          ) : null}
                          {!o.weeklySalesTargetValueKes && !o.weeklySalesTargetKg ? (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Target className="h-3 w-3" /> Set targets
                            </span>
                          ) : null}
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {o.weeklySalesTargetValueKes
                            ? `KES ${Number(o.weeklySalesTargetValueKes).toLocaleString()}`
                            : "—"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StockTakeBadge status={o.weeklyStockTakeStatus} submittedAt={o.lastStockTakeSubmittedAt} />
                    </TableCell>
                    <TableCell>
                      {canView ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              aria-label="Outlet actions"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem asChild>
                              <Link href={`/franchise/outlets/${o.id}`}>View</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/franchise/outlets/${o.id}?tab=pricing`}>Pricing</Link>
                            </DropdownMenuItem>
                            {canAdd ? (
                              <>
                                <DropdownMenuItem onClick={() => openEditOutlet(o)}>Edit details</DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleteTarget(o)}
                                >
                                  Remove from network…
                                </DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
                  </Table>
                </div>
                <TablePagination
                  className={LIST_TABLE_PAGINATION_CLASS}
                  pageOffset={pageOffset}
                  pageSize={pageSize}
                  itemCount={outlets.length}
                  hasMore={hasMore}
                  loading={loading}
                  busy={tableBusy}
                  onPrevious={() => setPageOffset((o) => Math.max(0, o - pageSize))}
                  onNext={() => setPageOffset((o) => o + pageSize)}
                  entityLabel="outlets"
                  pageSizeOptions={[...PAGE_SIZE_OPTIONS]}
                  onPageSizeChange={setPageSize}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet open={canView && addOpen} onOpenChange={setAddOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add franchisee</SheetTitle>
            <SheetDescription>
              Create a new outlet and admin user. The franchisee org is activated immediately — billing starts end of the current month.
            </SheetDescription>
          </SheetHeader>
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
              <div className="flex items-center gap-2">
                <Label htmlFor="outletCode">Outlet code</Label>
                {outletCodeLoading && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden />
                )}
              </div>
              <Input
                id="outletCode"
                value={form.outletCode}
                onChange={(e) => setForm((p) => ({ ...p, outletCode: e.target.value }))}
                placeholder={outletCodeLoading ? "Fetching next code…" : "e.g. F0001"}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Auto-assigned (F0001, F0002, …). You can override it before saving.
              </p>
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
            <div className="space-y-2">
              <Label htmlFor="managerPhone">Manager phone (optional)</Label>
              <div className="flex gap-1">
                <Input
                  className="w-20 shrink-0 font-mono text-sm"
                  value={managerPhonePrefix}
                  onChange={(e) => setManagerPhonePrefix(e.target.value)}
                  placeholder="+254"
                  aria-label="Country code"
                />
                <Input
                  id="managerPhone"
                  type="tel"
                  placeholder="712 345 678"
                  value={managerPhone}
                  onChange={(e) => setManagerPhone(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleAdd()} disabled={saving}>
              {saving ? "Creating…" : "Create franchisee"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Targets editing sheet */}
      <Sheet open={!!targetOutlet} onOpenChange={(open) => { if (!open) setTargetOutlet(null); }}>
        <SheetContent className="sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Weekly targets — {targetOutlet?.name}</SheetTitle>
            <SheetDescription>
              Set the outlet&apos;s weekly targets. These appear on the franchise mobile dashboard as progress cards.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-6">
            <div className="space-y-2">
              <Label htmlFor="tgt-value">Weekly sales target (KES)</Label>
              <Input
                id="tgt-value"
                type="number"
                min={0}
                placeholder="e.g. 100000"
                value={targetValueKes}
                onChange={(e) => setTargetValueKes(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tgt-kg">Weekly weight target (kg)</Label>
              <Input
                id="tgt-kg"
                type="number"
                min={0}
                placeholder="e.g. 500"
                value={targetKg}
                onChange={(e) => setTargetKg(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Only kg-UOM product lines count toward the weight actual on the app.
              </p>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setTargetOutlet(null)}>Cancel</Button>
            <Button onClick={() => void handleSaveTargets()} disabled={savingTargets}>
              {savingTargets ? "Saving…" : "Save targets"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={!!editOutlet} onOpenChange={(open) => { if (!open) setEditOutlet(null); }}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Edit franchisee</SheetTitle>
            <SheetDescription>
              Update outlet name, code, territory, format, and manager. HQ billing and commission registry stay linked.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-6">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Outlet / franchisee name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-code">Outlet code</Label>
              <Input
                id="edit-code"
                value={editForm.outletCode}
                onChange={(e) => setEditForm((p) => ({ ...p, outletCode: e.target.value }))}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-territory">Territory</Label>
              <Input
                id="edit-territory"
                value={editForm.territory}
                onChange={(e) => setEditForm((p) => ({ ...p, territory: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-format">Store format</Label>
              <Input
                id="edit-format"
                value={editForm.storeFormat}
                onChange={(e) => setEditForm((p) => ({ ...p, storeFormat: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-manager">Manager name</Label>
              <Input
                id="edit-manager"
                value={editForm.managerName}
                onChange={(e) => setEditForm((p) => ({ ...p, managerName: e.target.value }))}
                placeholder="Optional"
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setEditOutlet(null)}>Cancel</Button>
            <Button onClick={() => void handleSaveEdit()} disabled={savingEdit}>
              {savingEdit ? "Saving…" : "Save changes"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title={deleteTarget ? `Remove “${deleteTarget.name}” from the network?` : "Remove outlet?"}
        description="This does not erase their org or documents. The outlet drops from the active list, agreement is marked exited, and all users in that org are suspended. You can contact support if you need a full data purge."
        confirmLabel={deleting ? "Removing…" : "Remove from network"}
        variant="destructive"
        onConfirm={() => void handleConfirmDeleteOutlet()}
      />
    </PageShell>
  );
}

function StockTakeBadge({
  status,
  submittedAt,
}: {
  status?: "ok" | "due" | "overdue" | "none";
  submittedAt?: string | null;
}) {
  if (!status || status === "none") {
    return <span className="text-xs text-muted-foreground flex items-center gap-1"><Minus className="h-3 w-3" /> None</span>;
  }
  if (status === "ok") {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {submittedAt ? `Done ${submittedAt.slice(0, 10)}` : "This week"}
      </span>
    );
  }
  if (status === "due") {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
        <Clock className="h-3.5 w-3.5" /> Due
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
      <AlertTriangle className="h-3.5 w-3.5" /> Overdue
    </span>
  );
}
