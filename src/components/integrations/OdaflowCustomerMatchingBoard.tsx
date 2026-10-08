"use client";

import * as React from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { KraTaxPinField } from "@/components/parties/KraTaxPinField";
import { TablePagination } from "@/components/ui/table-pagination";
import { TopProgressBar } from "@/components/ui/top-progress-bar";
import { cn } from "@/lib/utils";
import {
  confirmCustomerMatchLinkApi,
  createErpCustomerFromSfaMatchApi,
  fetchCustomerMatchingPreviewApi,
  pushErpCustomerToSfaMatchApi,
  type CreateFromSfaDraft,
  type CustomerMatchParty,
  type CustomerMatchRow,
  type CustomerMatchSegment,
  type CustomerMatchStatus,
} from "@/lib/api/odaflow-integration";

const PAGE_SIZE_OPTIONS = [20, 25, 30, 50];

const STATUS_LABEL: Record<CustomerMatchStatus, string> = {
  mapped: "Linked",
  suggested: "Suggested",
  ambiguous: "Ambiguous",
  unmatched_sfa: "Only in SFA",
  unmatched_erp: "Only in ERP",
  pending_approval: "Pending approval",
};

function statusVariant(
  status: CustomerMatchStatus
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "mapped") return "default";
  if (status === "suggested" || status === "pending_approval") return "secondary";
  if (status === "ambiguous") return "destructive";
  return "outline";
}

function needsAction(status: CustomerMatchStatus) {
  return status !== "mapped";
}

function matchesQuery(row: CustomerMatchRow, q: string) {
  if (!q) return true;
  const hay = [
    row.sfa?.name,
    row.sfa?.code,
    row.sfa?.taxId,
    row.sfa?.phone,
    row.erp?.name,
    row.erp?.code,
    row.erp?.taxId,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

function draftFromSfa(row: CustomerMatchRow): CreateFromSfaDraft {
  return {
    name: row.sfa?.name ?? "",
    tradingName: row.sfa?.tradingName ?? "",
    contactName: row.sfa?.contactName ?? "",
    phone: row.sfa?.phone ?? "",
    email: row.sfa?.email ?? "",
    taxId: row.sfa?.taxId ?? "",
    customerCode: row.sfa?.code ?? "",
    addressLine1: row.sfa?.address ?? "",
    city: "",
    region: "",
    country: "KE",
  };
}

export function OdaflowCustomerMatchingBoard({
  canSave,
  onChanged,
}: {
  canSave: boolean;
  onChanged?: () => void;
}) {
  const [rows, setRows] = React.useState<CustomerMatchRow[]>([]);
  const [erpDirect, setErpDirect] = React.useState<CustomerMatchParty[]>([]);
  const [erpMt, setErpMt] = React.useState<CustomerMatchParty[]>([]);
  const [counts, setCounts] = React.useState({
    needsAction: 0,
    directNeedsAction: 0,
    modernTradeNeedsAction: 0,
    mapped: 0,
    pendingApproval: 0,
  });
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [listBusy, setListBusy] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [segment, setSegment] = React.useState<"all" | CustomerMatchSegment>("all");
  const [showMapped, setShowMapped] = React.useState(false);
  const [pageSize, setPageSize] = React.useState(20);
  const [pageOffset, setPageOffset] = React.useState(0);
  const [pageRows, setPageRows] = React.useState<CustomerMatchRow[]>([]);
  const [picked, setPicked] = React.useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = React.useState<string | null>(null);
  const [createRow, setCreateRow] = React.useState<CustomerMatchRow | null>(null);
  const [createDraft, setCreateDraft] = React.useState<CreateFromSfaDraft | null>(null);
  const [creating, setCreating] = React.useState(false);
  const hasDataRef = React.useRef(false);

  const loadPreview = React.useCallback(async (opts?: { soft?: boolean }) => {
    const soft = Boolean(opts?.soft && hasDataRef.current);
    if (soft) {
      setRefreshing(true);
      setPageRows([]);
    } else {
      setLoading(true);
    }
    try {
      const data = await fetchCustomerMatchingPreviewApi();
      setRows(data.rows);
      setErpDirect(data.erpDirectParties);
      setErpMt(data.erpMultichainParties);
      setCounts(data.counts);
      const nextPicked: Record<string, string> = {};
      for (const row of data.rows) {
        if (row.sfa?.id && row.erp?.id) nextPicked[row.key] = row.erp.id;
      }
      setPicked(nextPicked);
      hasDataRef.current = true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load customer matching");
    } finally {
      if (soft) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQuery(query.trim().toLowerCase());
      setPageOffset(0);
    }, 250);
    return () => window.clearTimeout(t);
  }, [query]);

  React.useEffect(() => {
    setPageOffset(0);
  }, [segment, showMapped]);

  const filteredRows = React.useMemo(() => {
    return rows.filter((row) => {
      if (segment !== "all" && row.segment !== segment) return false;
      if (!showMapped && !needsAction(row.status)) return false;
      return matchesQuery(row, debouncedQuery);
    });
  }, [rows, segment, showMapped, debouncedQuery]);

  React.useEffect(() => {
    if (pageOffset > 0 && pageOffset >= filteredRows.length && filteredRows.length > 0) {
      setPageOffset(Math.max(0, Math.floor((filteredRows.length - 1) / pageSize) * pageSize));
      return;
    }
    setListBusy(true);
    setPageRows([]);
    const t = window.setTimeout(() => {
      setPageRows(filteredRows.slice(pageOffset, pageOffset + pageSize));
      setListBusy(false);
    }, 120);
    return () => window.clearTimeout(t);
  }, [filteredRows, pageOffset, pageSize]);

  const tableBusy = refreshing || listBusy;

  const partyOptionsFor = (row: CustomerMatchRow) => {
    if (row.candidates?.length) return row.candidates;
    return row.segment === "modern_trade" ? erpMt : erpDirect;
  };

  const handleConfirmLink = async (row: CustomerMatchRow) => {
    const sfaId = row.sfa?.id;
    if (!sfaId) return;
    const erpPartyId = picked[row.key] || row.erp?.id;
    if (!erpPartyId) {
      toast.error(
        row.segment === "modern_trade"
          ? "Choose an ERP supermarket (Multichain) party first."
          : "Choose an ERP customer first."
      );
      return;
    }
    setBusyKey(row.key);
    try {
      await confirmCustomerMatchLinkApi({
        segment: row.segment,
        sfaId,
        erpPartyId,
      });
      toast.success(
        row.segment === "modern_trade"
          ? `Linked ${row.sfa?.name ?? "supermarket"} to ERP.`
          : `Linked ${row.sfa?.name ?? "customer"} to ERP.`
      );
      await loadPreview();
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not confirm link");
    } finally {
      setBusyKey(null);
    }
  };

  const handlePushToSfa = async (row: CustomerMatchRow) => {
    const erpPartyId = row.erp?.id;
    if (!erpPartyId) return;
    setBusyKey(row.key);
    try {
      await pushErpCustomerToSfaMatchApi({ erpPartyId });
      toast.success(`${row.erp?.name ?? "Customer"} created in SFA as a direct customer.`);
      await loadPreview();
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create in SFA");
    } finally {
      setBusyKey(null);
    }
  };

  const openCreateSheet = (row: CustomerMatchRow) => {
    setCreateRow(row);
    setCreateDraft(draftFromSfa(row));
  };

  const handleCreateInErp = async () => {
    if (!createRow?.sfa?.id || !createDraft) return;
    const name = createDraft.name.trim();
    if (!name) {
      toast.error("Customer name is required.");
      return;
    }
    setCreating(true);
    try {
      const result = await createErpCustomerFromSfaMatchApi({
        sfaId: createRow.sfa.id,
        draft: {
          ...createDraft,
          name,
          tradingName: createDraft.tradingName?.trim() || undefined,
          contactName: createDraft.contactName?.trim() || undefined,
          phone: createDraft.phone?.trim() || undefined,
          email: createDraft.email?.trim() || undefined,
          taxId: createDraft.taxId?.trim() || undefined,
          customerCode: createDraft.customerCode?.trim() || undefined,
          addressLine1: createDraft.addressLine1?.trim() || undefined,
          city: createDraft.city?.trim() || undefined,
          region: createDraft.region?.trim() || undefined,
          country: createDraft.country?.trim() || undefined,
        },
        approveNow: true,
      });
      if (result.action === "pending_approval") {
        toast.success("Saved for approval. Finish in Pending approval when ready.");
      } else {
        toast.success(`${name} is now in the ERP customer master.`);
      }
      setCreateRow(null);
      setCreateDraft(null);
      await loadPreview();
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create customer in ERP");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
        <Icons.Loader2 className="h-4 w-4 animate-spin" />
        Loading customer matching…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ["needs", "Needs action", counts.needsAction, true],
              ["direct", "Direct", counts.directNeedsAction, false],
              ["mt", "Modern trade", counts.modernTradeNeedsAction, false],
            ] as const
          ).map(([id, label, value, emphasize]) => (
            <div
              key={id}
              className={cn(
                "inline-flex items-center gap-2 rounded-md border px-2.5 py-1",
                emphasize &&
                  "border-amber-300/70 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/30"
              )}
            >
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </span>
              <span className="text-sm font-semibold tabular-nums">{value}</span>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={tableBusy}
          onClick={() => void loadPreview({ soft: true })}
        >
          <Icons.RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Icons.Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search SFA or ERP customers, codes, KRA PIN…"
            className="h-9 pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", "All"],
              ["direct", "Direct"],
              ["modern_trade", "Modern trade"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSegment(id)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                segment === id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowMapped((v) => !v)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              showMapped
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {showMapped ? "Showing linked" : "Hide linked"}
          </button>
        </div>
      </div>

      {counts.pendingApproval > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-50">
          {counts.pendingApproval} customer
          {counts.pendingApproval === 1 ? "" : "s"} waiting for approval.{" "}
          <Link href="/sales/customer-approvals" className="font-medium underline underline-offset-2">
            Open pending approval
          </Link>
        </div>
      )}

      <div className="relative min-h-[22rem]">
        <TopProgressBar active={tableBusy} />
        {tableBusy ? (
          <p className="absolute right-2 top-2 z-20 text-[11px] text-muted-foreground">Loading…</p>
        ) : null}

        {pageRows.length === 0 && !tableBusy ? (
          <div className="rounded-xl border border-dashed px-6 py-10 text-center">
            <Icons.Link2 className="mx-auto h-7 w-7 text-muted-foreground/60" />
            <p className="mt-2 text-sm font-medium">Nothing to match here</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {debouncedQuery
                ? "Try a different search."
                : showMapped
                  ? "No customers in this filter."
                  : "All visible customers are linked. Turn on “Showing linked” to review them."}
            </p>
          </div>
        ) : (
          <div
            className={cn(
              "overflow-x-auto rounded-xl border transition-opacity duration-300 ease-out",
              tableBusy ? "opacity-0" : "opacity-100"
            )}
          >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Type</th>
                <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">SFA</th>
                <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">
                  ERP customer
                </th>
                <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => {
                const selected = picked[row.key] ?? row.erp?.id ?? "";
                const options = partyOptionsFor(row);
                const busy = busyKey === row.key;
                return (
                  <tr key={row.key} className="border-b align-top hover:bg-muted/20">
                    <td className="py-3 px-3">
                      <Badge variant="outline" className="font-normal">
                        {row.segment === "modern_trade" ? "Modern trade" : "Direct"}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 min-w-[14rem]">
                      {row.sfa ? (
                        <div className="space-y-0.5">
                          <div className="font-medium">{row.sfa.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {[
                              row.sfa.code,
                              row.sfa.taxId ? `PIN ${row.sfa.taxId}` : null,
                              row.segment === "modern_trade" && row.sfa.branchCount != null
                                ? `${row.sfa.branchCount} ${row.sfa.branchCount === 1 ? "branch" : "branches"}`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                          {row.sfa.phone || row.sfa.address ? (
                            <div className="text-xs text-muted-foreground">
                              {[row.sfa.phone, row.sfa.address].filter(Boolean).join(" · ")}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 min-w-[16rem]">
                      {row.status === "mapped" ||
                      (row.status === "unmatched_erp" && row.segment === "modern_trade") ? (
                        <div>
                          <div className="font-medium">{row.erp?.name ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">
                            {[row.erp?.code, row.erp?.taxId ? `PIN ${row.erp.taxId}` : null]
                              .filter(Boolean)
                              .join(" · ") || (row.status === "unmatched_erp" ? "No SFA supermarket match" : "—")}
                          </div>
                        </div>
                      ) : row.status === "unmatched_erp" && row.segment === "direct" ? (
                        <div>
                          <div className="font-medium">{row.erp?.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {[row.erp?.code, row.erp?.taxId ? `PIN ${row.erp.taxId}` : null]
                              .filter(Boolean)
                              .join(" · ") || "Not in SFA yet"}
                          </div>
                        </div>
                      ) : (
                        <select
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={selected}
                          disabled={!canSave || row.status === "pending_approval"}
                          onChange={(e) =>
                            setPicked((prev) => ({ ...prev, [row.key]: e.target.value }))
                          }
                        >
                          <option value="">Select ERP customer…</option>
                          {options.map((party) => (
                            <option key={party.id} value={party.id}>
                              {party.name}
                              {party.code ? ` (${party.code})` : ""}
                              {party.taxId ? ` · ${party.taxId}` : ""}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant={statusVariant(row.status)}>{STATUS_LABEL[row.status]}</Badge>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-col items-start gap-1.5">
                        {row.sfa &&
                        (row.status === "suggested" ||
                          row.status === "ambiguous" ||
                          row.status === "unmatched_sfa") ? (
                          <Button
                            type="button"
                            size="sm"
                            disabled={!canSave || busy}
                            onClick={() => void handleConfirmLink(row)}
                          >
                            {busy ? (
                              <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Icons.Link className="mr-2 h-4 w-4" />
                            )}
                            Link
                          </Button>
                        ) : null}

                        {row.segment === "direct" &&
                        row.sfa &&
                        (row.status === "unmatched_sfa" || row.status === "pending_approval") ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={!canSave || busy}
                            onClick={() => openCreateSheet(row)}
                          >
                            <Icons.UserPlus className="mr-2 h-4 w-4" />
                            {row.status === "pending_approval" ? "Review & create" : "Create in ERP"}
                          </Button>
                        ) : null}

                        {row.segment === "direct" && row.status === "unmatched_erp" ? (
                          <Button
                            type="button"
                            size="sm"
                            disabled={!canSave || busy}
                            onClick={() => void handlePushToSfa(row)}
                          >
                            {busy ? (
                              <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Icons.Upload className="mr-2 h-4 w-4" />
                            )}
                            Create in SFA
                          </Button>
                        ) : null}

                        {row.segment === "modern_trade" && row.status === "unmatched_erp" ? (
                          <span className="text-xs text-muted-foreground max-w-[12rem]">
                            Pick this HQ from an SFA supermarket row to link.
                          </span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {filteredRows.length > 0 || tableBusy ? (
        <TablePagination
          pageOffset={pageOffset}
          pageSize={pageSize}
          itemCount={pageRows.length}
          hasMore={pageOffset + pageRows.length < filteredRows.length}
          loading={tableBusy}
          totalCount={filteredRows.length}
          entityLabel="customers"
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPageOffset(0);
          }}
          onPrevious={() => setPageOffset((o) => Math.max(0, o - pageSize))}
          onNext={() => setPageOffset((o) => o + pageSize)}
        />
      ) : null}

      <Sheet
        open={!!createRow}
        onOpenChange={(open) => {
          if (!open) {
            setCreateRow(null);
            setCreateDraft(null);
          }
        }}
      >
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create ERP customer</SheetTitle>
            <SheetDescription>
              Review every detail from SFA before creating this direct customer in ERP. KRA PIN and
              contact fields carry through to the customer master.
            </SheetDescription>
          </SheetHeader>
          {createDraft ? (
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cm-name">Name</Label>
                <Input
                  id="cm-name"
                  value={createDraft.name}
                  onChange={(e) => setCreateDraft((d) => (d ? { ...d, name: e.target.value } : d))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cm-trading">Trading name</Label>
                <Input
                  id="cm-trading"
                  value={createDraft.tradingName ?? ""}
                  onChange={(e) =>
                    setCreateDraft((d) => (d ? { ...d, tradingName: e.target.value } : d))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cm-contact">Contact name</Label>
                <Input
                  id="cm-contact"
                  value={createDraft.contactName ?? ""}
                  onChange={(e) =>
                    setCreateDraft((d) => (d ? { ...d, contactName: e.target.value } : d))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="cm-phone">Phone</Label>
                  <Input
                    id="cm-phone"
                    value={createDraft.phone ?? ""}
                    onChange={(e) =>
                      setCreateDraft((d) => (d ? { ...d, phone: e.target.value } : d))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cm-email">Email</Label>
                  <Input
                    id="cm-email"
                    value={createDraft.email ?? ""}
                    onChange={(e) =>
                      setCreateDraft((d) => (d ? { ...d, email: e.target.value } : d))
                    }
                  />
                </div>
              </div>
              <KraTaxPinField
                label="KRA PIN"
                value={createDraft.taxId ?? ""}
                onChange={(taxId) => setCreateDraft((d) => (d ? { ...d, taxId } : d))}
              />
              <div className="space-y-2">
                <Label htmlFor="cm-code">Customer code</Label>
                <Input
                  id="cm-code"
                  value={createDraft.customerCode ?? ""}
                  onChange={(e) =>
                    setCreateDraft((d) => (d ? { ...d, customerCode: e.target.value } : d))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cm-addr">Address</Label>
                <Input
                  id="cm-addr"
                  value={createDraft.addressLine1 ?? ""}
                  onChange={(e) =>
                    setCreateDraft((d) => (d ? { ...d, addressLine1: e.target.value } : d))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="cm-city">City</Label>
                  <Input
                    id="cm-city"
                    value={createDraft.city ?? ""}
                    onChange={(e) =>
                      setCreateDraft((d) => (d ? { ...d, city: e.target.value } : d))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cm-region">Region</Label>
                  <Input
                    id="cm-region"
                    value={createDraft.region ?? ""}
                    onChange={(e) =>
                      setCreateDraft((d) => (d ? { ...d, region: e.target.value } : d))
                    }
                  />
                </div>
              </div>
            </div>
          ) : null}
          <SheetFooter className="mt-8 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCreateRow(null);
                setCreateDraft(null);
              }}
            >
              Cancel
            </Button>
            <Button type="button" disabled={!canSave || creating} onClick={() => void handleCreateInErp()}>
              {creating ? <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create in ERP
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
