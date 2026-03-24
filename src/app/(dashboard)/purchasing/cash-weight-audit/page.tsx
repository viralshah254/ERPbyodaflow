"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { ProcurementVariancePanel } from "@/components/operational/ProcurementVariancePanel";
import { LiveCurrencyConverterCard } from "@/components/operational/LiveCurrencyConverterCard";
import { Input } from "@/components/ui/input";
import { FormattedDecimalInput } from "@/components/ui/formatted-decimal-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchCashWeightAuditLines,
  fetchCashWeightExceptions,
  fetchCashDisbursements,
  createCashDisbursement,
  reconcileCashWeightAudit,
  requestAuditWeightOverride,
  buildCashWeightAudit,
  exportCashWeightAuditCsv,
  assignCashWeightException,
  investigateCashWeightException,
  approveCashWeightException,
  resolveCashWeightException,
} from "@/lib/api/cool-catch";
import { fetchPurchaseOrderById } from "@/lib/api/purchasing";
import { searchPurchaseOrderLookupApi } from "@/lib/api/documents";
import { AsyncSearchableSelect } from "@/components/ui/async-searchable-select";
import type { AsyncSearchableSelectOption } from "@/components/ui/async-searchable-select";
import type { CashWeightAuditLineRow, CashDisbursementRow } from "@/lib/mock/purchasing/cash-weight-audit";
import { formatMoney } from "@/lib/money";
import { parseDecimalString } from "@/lib/decimal-input";
import { fetchLiveExchangeRate } from "@/lib/fx/live-rates";
import { fetchLandedCostAllocation } from "@/lib/api/landed-cost";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { Permissions } from "@/lib/permissions";

type NotesMode = "investigate" | "resolve";

const WORKFLOW_STEPS = [
  { step: "1", label: "Create Purchase Order", detail: "Purchasing → Purchase Order → New", href: "/purchasing/orders" },
  { step: "2", label: "Pay at farm gate", detail: "Record disbursement → select PO → enter amount & paid weight (kg)", action: true },
  { step: "3", label: "Receive stock → create GRN", detail: "Inventory → Goods Receipts → create from PO, enter received weight (kg)", href: "/inventory/receipts" },
  { step: "4", label: "Audit lines auto-built", detail: "PO quantity vs paid weight vs received weight compared automatically" },
  { step: "5", label: "Reconcile any variances", detail: "Exception queue below → Assign → Investigate → Approve → Resolve" },
];

export default function CashWeightAuditPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const permissions = useAuthStore((s) => s.permissions);
  const isPlatformOperator = useAuthStore((s) => s.isPlatformOperator);
  const canOverride = isPlatformOperator || permissions.includes(Permissions.PURCHASING_AUDIT_OVERRIDE) || permissions.includes("*");

  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [view, setView] = React.useState<"audit" | "disbursements">("audit");
  const [auditLines, setAuditLines] = React.useState<CashWeightAuditLineRow[]>([]);
  const [exceptions, setExceptions] = React.useState<CashWeightAuditLineRow[]>([]);
  const [disbursements, setDisbursements] = React.useState<CashDisbursementRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [landedCostPerGrn, setLandedCostPerGrn] = React.useState<Map<string, number>>(new Map());
  const [reconcilingId, setReconcilingId] = React.useState<string | null>(null);

  // Correct-weights dialog state
  const [correctLine, setCorrectLine] = React.useState<CashWeightAuditLineRow | null>(null);
  const [correctPaid, setCorrectPaid] = React.useState("");
  const [correctReceived, setCorrectReceived] = React.useState("");
  const [correctReason, setCorrectReason] = React.useState("");
  const [savingCorrection, setSavingCorrection] = React.useState(false);

  // Disbursement form state
  const [disbursementOpen, setDisbursementOpen] = React.useState(false);
  const [disbPoId, setDisbPoId] = React.useState("");
  // Received weight at facility for the selected PO (from audit lines already loaded)
  const receivedWeightForPo = React.useMemo(() => {
    if (!disbPoId.trim()) return null;
    const matching = auditLines.filter((l) => l.poId === disbPoId.trim());
    if (!matching.length) return null;
    const sum = matching.reduce((a, l) => a + (l.receivedWeightKg ?? 0), 0);
    return sum;
  }, [disbPoId, auditLines]);
  const [disbAmount, setDisbAmount] = React.useState("");
  const [disbCurrency, setDisbCurrency] = React.useState("KES");
  const [disbPaidAt, setDisbPaidAt] = React.useState("");
  const [disbPaidWeightKg, setDisbPaidWeightKg] = React.useState("");
  const [disbLineWeights, setDisbLineWeights] = React.useState<Record<string, string>>({});
  const [poLines, setPoLines] = React.useState<Array<{ poLineId: string; sku: string; productName: string; qty: number; uom: string; rate: number; total: number }>>([]);
  const [poDetail, setPoDetail] = React.useState<{
    number: string;
    supplier: string;
    total: number;
    currency: string;
    fxRate: number;
    status?: string;
  } | null>(null);
  const [savingDisb, setSavingDisb] = React.useState(false);
  const [selectedPoOption, setSelectedPoOption] = React.useState<AsyncSearchableSelectOption | null>(null);
  const [disbKesPreview, setDisbKesPreview] = React.useState<number | null>(null);

  // Notes sheet state (replaces window.prompt)
  const [notesSheetOpen, setNotesSheetOpen] = React.useState(false);
  const [notesTarget, setNotesTarget] = React.useState<{ lineId: string; mode: NotesMode; current: string } | null>(null);
  const [notesValue, setNotesValue] = React.useState("");
  const [savingNotes, setSavingNotes] = React.useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchCashWeightAuditLines(statusFilter ? { status: statusFilter } : undefined).then(setAuditLines),
      fetchCashDisbursements().then(setDisbursements),
      fetchCashWeightExceptions().then(setExceptions),
    ])
      .then(() => setLoading(false))
      .catch((e) => {
        setLoading(false);
        toast.error(e?.message ?? "Failed to load data");
      });
  }, [statusFilter]);

  React.useEffect(() => {
    load();
  }, [load]);

  // Batch-load landed cost allocations for all unique GRN IDs in the audit lines
  React.useEffect(() => {
    const grnIds = [...new Set(auditLines.map((l) => l.grnId).filter(Boolean))] as string[];
    if (!grnIds.length) return;
    void Promise.all(
      grnIds.map((gid) =>
        fetchLandedCostAllocation(gid).then((alloc) => {
          if (!alloc) return null;
          const totalBase = alloc.totalLandedCostBase ?? 0;
          const totalWeight = (alloc.impactLines ?? []).reduce((s, l) => s + (l.basisValue ?? 0), 0);
          const cpk = totalBase > 0 && totalWeight > 0 ? totalBase / totalWeight : null;
          return { gid, cpk };
        })
      )
    ).then((results) => {
      const m = new Map<string, number>();
      for (const r of results) {
        if (r?.cpk != null) m.set(r.gid, r.cpk);
      }
      setLandedCostPerGrn(m);
    });
  }, [auditLines]);

  // Hydrate from query params: ?poId=xxx&openDisbursement=1
  React.useEffect(() => {
    const poId = searchParams.get("poId");
    const open = searchParams.get("openDisbursement");
    if (!poId) return;
    setDisbPoId(poId);
    if (open === "1") {
      setDisbursementOpen(true);
    }
    // Clean up URL so a page-refresh doesn't re-open the sheet unexpectedly
    const next = new URLSearchParams(searchParams.toString());
    next.delete("openDisbursement");
    router.replace(`/purchasing/cash-weight-audit${next.toString() ? `?${next.toString()}` : ""}`, { scroll: false });
  // Only run once on mount — searchParams and router are stable refs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPoOptions = React.useCallback(
    (query: string) =>
      searchPurchaseOrderLookupApi(query, { status: "APPROVED,RECEIVED", excludeWithCashDisbursement: true }).then((items) =>
        items.map((item) => ({
          id: item.id,
          label: item.label,
          description: item.description,
          badges: [{ label: item.status, variant: "secondary" as const }],
        }))
      ),
    []
  );

  // When a PO is selected, fetch its lines for per-line weight entry and PO summary display
  React.useEffect(() => {
    if (!disbPoId.trim()) {
      setPoLines([]);
      setPoDetail(null);
      setDisbLineWeights({});
      return;
    }
    let cancelled = false;
    fetchPurchaseOrderById(disbPoId.trim())
      .then((po) => {
        if (cancelled || !po) return;
        // Auto-populate currency from PO so UGX/USD POs immediately show KES preview
        if (po.currency) setDisbCurrency(po.currency);
        setPoDetail({
          number: po.number,
          supplier: po.supplier,
          total: po.total ?? 0,
          currency: po.currency,
          fxRate: po.fxRate,
          status: po.status,
        });
        if (!po.lines?.length) return;
        const lines = po.lines.map((l, i) => ({
          poLineId: `${po.id}:${i}`,
          sku: l.sku ?? `LINE-${i + 1}`,
          productName: l.productName ?? `Line ${i + 1}`,
          qty: l.qty,
          uom: l.uom,
          rate: l.rate,
          total: l.total,
        }));
        setPoLines(lines);
        setDisbLineWeights((prev) => {
          const next = { ...prev };
          lines.forEach((l) => {
            if (next[l.poLineId] === undefined) next[l.poLineId] = "";
          });
          return next;
        });
      })
      .catch(() => {
        if (!cancelled) { setPoLines([]); setPoDetail(null); }
      });
    return () => {
      cancelled = true;
    };
  }, [disbPoId]);

  React.useEffect(() => {
    const amount = parseDecimalString(disbAmount);
    if (disbCurrency === "KES" || !disbAmount.trim() || Number.isNaN(amount) || amount <= 0) {
      setDisbKesPreview(null);
      return;
    }
    let cancelled = false;
    void fetchLiveExchangeRate(disbCurrency, "KES").then((result) => {
      if (!cancelled && result.rate) setDisbKesPreview(amount * result.rate);
    }).catch(() => {
      if (!cancelled) setDisbKesPreview(null);
    });
    return () => { cancelled = true; };
  }, [disbAmount, disbCurrency]);

  const handleReconcile = async (line: CashWeightAuditLineRow) => {
    if (line.status === "MATCHED") return;
    setReconcilingId(line.id);
    try {
      await reconcileCashWeightAudit({
        auditLineId: line.id,
        paidWeightKg: line.paidWeightKg ?? undefined,
        receivedWeightKg: line.receivedWeightKg ?? undefined,
      });
      toast.success("Reconciled.");
      await load();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Reconcile failed");
    } finally {
      setReconcilingId(null);
    }
  };

  const openCorrectDialog = (line: CashWeightAuditLineRow) => {
    setCorrectLine(line);
    setCorrectPaid(line.paidWeightKg != null ? String(line.paidWeightKg) : "");
    setCorrectReceived(line.receivedWeightKg != null ? String(line.receivedWeightKg) : "");
    setCorrectReason("");
  };

  const handleCorrectWeights = async () => {
    if (!correctLine) return;
    const newPaid = correctPaid ? parseFloat(correctPaid) : undefined;
    const newReceived = correctReceived ? parseFloat(correctReceived) : undefined;
    if (newPaid != null && Number.isNaN(newPaid)) { toast.error("Invalid paid weight."); return; }
    if (newReceived != null && Number.isNaN(newReceived)) { toast.error("Invalid received weight."); return; }
    if (newPaid == null && newReceived == null) { toast.error("Enter at least one weight to correct."); return; }
    setSavingCorrection(true);
    try {
      if (canOverride) {
        await reconcileCashWeightAudit({
          auditLineId: correctLine.id,
          paidWeightKg: newPaid,
          receivedWeightKg: newReceived,
        });
        toast.success("Weights corrected.");
      } else {
        if (!correctReason.trim()) { toast.error("A reason is required to request an override."); setSavingCorrection(false); return; }
        await requestAuditWeightOverride({
          auditLineId: correctLine.id,
          paidWeightKg: newPaid,
          receivedWeightKg: newReceived,
          reason: correctReason.trim(),
        });
        toast.success("Override request submitted — pending admin approval.");
      }
      setCorrectLine(null);
      await load();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Correction failed");
    } finally {
      setSavingCorrection(false);
    }
  };

  const canSaveDisbursement = React.useMemo(() => {
    if (!poDetail?.status) return true;
    return ["APPROVED", "RECEIVED"].includes(poDetail.status.trim().toUpperCase());
  }, [poDetail?.status]);

  const handleRecordDisbursement = async () => {
    if (!disbPoId.trim() || !disbAmount.trim() || !disbPaidAt) {
      toast.error("Purchase order, amount and paid date are required.");
      return;
    }
    const amount = parseDecimalString(disbAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    const lines =
      poLines.length > 1
        ? poLines
            .map((l) => {
              const w = disbLineWeights[l.poLineId];
              const kg = w?.trim() ? parseDecimalString(w) : undefined;
              return kg != null && !Number.isNaN(kg) && kg > 0 ? { poLineId: l.poLineId, paidWeightKg: kg } : null;
            })
            .filter((x): x is { poLineId: string; paidWeightKg: number } => x != null)
        : undefined;
    let paidWeightKg: number | undefined;
    if (poLines.length <= 1) {
      const w = disbPaidWeightKg.trim() ? parseDecimalString(disbPaidWeightKg) : NaN;
      if (Number.isNaN(w) || w <= 0) {
        toast.error("Enter a valid paid weight (kg).");
        return;
      }
      paidWeightKg = w;
    }
    if (poLines.length > 1 && (!lines?.length || lines.length < poLines.length)) {
      toast.error("Enter paid weight (kg) for each product line.");
      return;
    }
    setSavingDisb(true);
    try {
      const disbResult = await createCashDisbursement({
        poId: disbPoId.trim(),
        amount,
        currency: disbCurrency,
        paidAt: disbPaidAt,
        paidWeightKg,
        lines,
      });
      const receiptLabel = disbResult.reference ? ` Receipt: ${disbResult.reference}.` : "";
      if (disbResult.warnings?.length) {
        toast.warning(`Weight data check: ${disbResult.warnings.join("; ")}. Audit lines will still be created.`);
      }
      // Auto-build audit lines for this PO so the user never has to do it manually
      try {
        const built = await buildCashWeightAudit({ poId: disbPoId.trim() });
        if (built.built > 0) {
          toast.success(`Disbursement recorded.${receiptLabel} ${built.built} audit line(s) created automatically.`);
        } else {
          toast.success(`Disbursement recorded.${receiptLabel} Audit lines will appear once a GRN is linked.`);
        }
      } catch {
        toast.success(`Disbursement recorded.${receiptLabel}`);
      }
      setDisbursementOpen(false);
      setDisbPoId("");
      setSelectedPoOption(null);
      setDisbAmount("");
      setDisbCurrency("KES");
      setDisbKesPreview(null);
      setDisbPaidAt("");
      setDisbPaidWeightKg("");
      setDisbLineWeights({});
      setPoLines([]);
      await load();
    } catch (e) {
      const msg = (e as Error)?.message ?? "Record failed";
      toast.error(msg === "STUB" ? "Configure API to record disbursements." : msg);
    } finally {
      setSavingDisb(false);
    }
  };

  const openNotesSheet = (lineId: string, mode: NotesMode, current: string) => {
    setNotesTarget({ lineId, mode, current });
    setNotesValue(current);
    setNotesSheetOpen(true);
  };

  const handleSubmitNotes = async () => {
    if (!notesTarget) return;
    setSavingNotes(true);
    try {
      if (notesTarget.mode === "investigate") {
        await investigateCashWeightException(notesTarget.lineId, notesValue);
        toast.success("Investigation notes saved.");
      } else {
        await resolveCashWeightException(notesTarget.lineId, notesValue);
        toast.success("Exception resolved.");
      }
      setNotesSheetOpen(false);
      setNotesTarget(null);
      setNotesValue("");
      await load();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  };


  const auditColumns = [
    { id: "po", header: "PO", accessor: (r: CashWeightAuditLineRow) => <span className="font-medium">{r.poNumber ?? "—"}</span>, sticky: true },
    {
      id: "receipt",
      header: "Receipt",
      accessor: (r: CashWeightAuditLineRow) =>
        r.disbursementReference ? (
          <span className="font-mono text-xs">{r.disbursementReference}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { id: "sku", header: "SKU", accessor: (r: CashWeightAuditLineRow) => r.sku ?? "—" },
    { id: "product", header: "Product", accessor: (r: CashWeightAuditLineRow) => r.productName ?? "—" },
    { id: "ordered", header: "Ordered qty", accessor: (r: CashWeightAuditLineRow) => r.orderedQty ?? "—" },
    { id: "paidKg", header: "Paid weight (kg)", accessor: (r: CashWeightAuditLineRow) => r.paidWeightKg ?? "—" },
    { id: "receivedKg", header: "Received weight (kg)", accessor: (r: CashWeightAuditLineRow) => r.receivedWeightKg ?? "—" },
    {
      id: "landedCostPerKg",
      header: "Landed KES/kg",
      accessor: (r: CashWeightAuditLineRow) => {
        if (!r.grnId) return <span className="text-muted-foreground">—</span>;
        const cpk = landedCostPerGrn.get(r.grnId);
        if (cpk == null) return <span className="text-muted-foreground text-xs">Pending</span>;
        return <span className="font-medium tabular-nums">{formatMoney(cpk, "KES")}</span>;
      },
    },
    {
      id: "variance",
      header: "Variance (kg)",
      accessor: (r: CashWeightAuditLineRow) =>
        r.varianceKg != null ? (r.varianceKg >= 0 ? `+${r.varianceKg}` : r.varianceKg) : "—",
    },
    {
      id: "status",
      header: "Status",
      accessor: (r: CashWeightAuditLineRow) => (
        <Badge variant={r.status === "MATCHED" ? "default" : r.status === "VARIANCE" ? "destructive" : "secondary"}>
          {r.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      accessor: (r: CashWeightAuditLineRow) => (
        <div className="flex items-center gap-1">
          {r.grnId && (
            <Button size="sm" variant="ghost" asChild>
              <Link href={`/inventory/receipts/${r.grnId}`}>
                <Icons.ExternalLink className="h-3 w-3 mr-1" />
                GRN
              </Link>
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => openCorrectDialog(r)}>
            <Icons.Pencil className="h-3 w-3 mr-1" />
            Correct
          </Button>
          {r.status !== "MATCHED" && (
            <Button size="sm" variant="ghost" disabled={reconcilingId === r.id} onClick={() => handleReconcile(r)}>
              {reconcilingId === r.id ? "…" : "Reconcile"}
            </Button>
          )}
        </div>
      ),
    },
  ];

  const exceptionColumns = [
    { id: "po", header: "PO", accessor: (r: CashWeightAuditLineRow) => r.poNumber ?? "—", sticky: true },
    { id: "sku", header: "SKU", accessor: (r: CashWeightAuditLineRow) => r.sku ?? "—" },
    { id: "variance", header: "Variance (kg)", accessor: (r: CashWeightAuditLineRow) => r.varianceKg ?? "—" },
    { id: "assignee", header: "Assigned to", accessor: (r: CashWeightAuditLineRow) => r.assignedToUserId ?? "Unassigned" },
    {
      id: "status",
      header: "Status",
      accessor: (r: CashWeightAuditLineRow) => (
        <Badge
          variant={
            r.exceptionStatus === "OPEN"
              ? "destructive"
              : r.exceptionStatus === "RESOLVED"
              ? "default"
              : "secondary"
          }
        >
          {r.exceptionStatus ?? "OPEN"}
        </Badge>
      ),
    },
    {
      id: "sla",
      header: "SLA age",
      accessor: (r: CashWeightAuditLineRow) => (
        <span className={r.slaOverdue ? "text-red-600 font-medium" : ""}>
          {r.slaAgeHours ?? 0}h{r.slaOverdue ? " (overdue)" : ""}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      accessor: (r: CashWeightAuditLineRow) => (
        <div className="flex items-center gap-1 flex-wrap">
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              await assignCashWeightException(r.id);
              await load();
            }}
          >
            Assign
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => openNotesSheet(r.id, "investigate", r.investigationNotes ?? "")}
          >
            Investigate
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              await approveCashWeightException(r.id);
              await load();
            }}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => openNotesSheet(r.id, "resolve", r.resolutionNotes ?? "")}
          >
            Resolve
          </Button>
        </div>
      ),
    },
  ];

  const disbursementColumns = [
    {
      id: "reference",
      header: "Reference",
      accessor: (r: CashDisbursementRow) => <span className="font-medium">{r.reference ?? "—"}</span>,
      sticky: true,
    },
    { id: "po", header: "PO", accessor: (r: CashDisbursementRow) => r.poNumber ?? "—" },
    { id: "amount", header: "Amount", accessor: (r: CashDisbursementRow) => formatMoney(r.amount, r.currency) },
    { id: "paidAt", header: "Paid at", accessor: (r: CashDisbursementRow) => r.paidAt ?? "—" },
    {
      id: "status",
      header: "Status",
      accessor: (r: CashDisbursementRow) => (
        <Badge variant={r.status === "RECONCILED" ? "default" : "secondary"}>{r.status}</Badge>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Cash-to-Weight Audit"
        description="Three-way match: Purchase Order → Cash disbursement → Actual weight received"
        breadcrumbs={[
          { label: "Purchasing", href: "/purchasing/orders" },
          { label: "Cash-to-Weight Audit" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Sheet open={disbursementOpen} onOpenChange={setDisbursementOpen}>
              <SheetTrigger asChild>
                <Button size="sm">
                  <Icons.Plus className="mr-2 h-4 w-4" />
                  Record disbursement
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Record cash disbursement</SheetTitle>
                  <SheetDescription>
                    Farm-gate CoD payment. Select the PO, enter what you paid and the weight paid for. Audit lines are created automatically.
                  </SheetDescription>
                </SheetHeader>
                <div className="grid gap-4 py-6">
                  {/* PO picker — APPROVED orders only, searchable */}
                  <div className="grid gap-2">
                    <Label>Purchase order</Label>
                    <AsyncSearchableSelect
                      value={disbPoId}
                      onValueChange={setDisbPoId}
                      onOptionSelect={(opt) => setSelectedPoOption(opt)}
                      loadOptions={loadPoOptions}
                      selectedOption={selectedPoOption}
                      placeholder="Search approved or received purchase orders…"
                      searchPlaceholder="Type PO number or supplier…"
                      emptyMessage="No approved or received purchase orders found."
                      allowClear
                      recentStorageKey="disb-po-picker"
                    />
                    <p className="text-xs text-muted-foreground">
                      Approved or received POs are shown (you can record farm-gate payment while the order is open or after receipt).
                    </p>
                  </div>

                  {/* PO summary card — shown once a PO is selected */}
                  {poDetail && (
                    <div className="rounded-md border bg-muted/40 text-sm overflow-hidden">
                      <div className="px-3 py-2 flex items-center justify-between gap-2 border-b bg-muted/60">
                        <div className="flex items-center gap-2 font-medium flex-wrap">
                          <Icons.FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>{poDetail.number}</span>
                          {poDetail.status && (
                            <Badge variant="outline" className="text-[10px] font-normal uppercase">
                              {poDetail.status}
                            </Badge>
                          )}
                          {poDetail.supplier && (
                            <span className="text-muted-foreground font-normal">· {poDetail.supplier}</span>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold">{formatMoney(poDetail.total, poDetail.currency)}</p>
                          {poDetail.currency !== "KES" && poDetail.fxRate > 0 && (
                            <p className="text-xs text-muted-foreground">
                              ≈ {formatMoney(poDetail.total * poDetail.fxRate, "KES")}
                            </p>
                          )}
                        </div>
                      </div>
                      {poLines.length > 0 && (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b text-muted-foreground">
                              <th className="px-3 py-1.5 text-left font-medium">Product</th>
                              <th className="px-2 py-1.5 text-right font-medium">Qty</th>
                              <th className="px-2 py-1.5 text-left font-medium">UOM</th>
                              <th className="px-2 py-1.5 text-right font-medium">Rate</th>
                              <th className="px-3 py-1.5 text-right font-medium">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {poLines.map((l) => (
                              <tr key={l.poLineId} className="border-b last:border-0">
                                <td className="px-3 py-1.5">
                                  <p className="truncate max-w-[120px]">{l.productName}</p>
                                  <p className="text-muted-foreground">{l.sku}</p>
                                </td>
                                <td className="px-2 py-1.5 text-right tabular-nums">{l.qty}</td>
                                <td className="px-2 py-1.5 text-muted-foreground">{l.uom}</td>
                                <td className="px-2 py-1.5 text-right tabular-nums">
                                  <p>{formatMoney(l.rate, poDetail.currency)}</p>
                                  {poDetail.currency !== "KES" && poDetail.fxRate > 0 && (
                                    <p className="text-muted-foreground">≈ {formatMoney(l.rate * poDetail.fxRate, "KES")}</p>
                                  )}
                                </td>
                                <td className="px-3 py-1.5 text-right tabular-nums">
                                  <p className="font-medium">{formatMoney(l.total, poDetail.currency)}</p>
                                  {poDetail.currency !== "KES" && poDetail.fxRate > 0 && (
                                    <p className="text-muted-foreground">≈ {formatMoney(l.total * poDetail.fxRate, "KES")}</p>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {poDetail?.status &&
                    !["APPROVED", "RECEIVED"].includes(poDetail.status.trim().toUpperCase()) && (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      This PO is <strong>{poDetail.status}</strong>. Cash disbursements can only be saved when the purchase
                      order is <strong>APPROVED</strong> or <strong>RECEIVED</strong>. Submit or approve the PO first, or
                      open a PO that is already approved.
                    </div>
                  )}

                  {receivedWeightForPo !== null && (
                    <div className="rounded-md bg-muted px-3 py-2 text-sm flex items-center gap-2">
                      <Icons.Package className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>
                        Received at facility:{" "}
                        <span className="font-semibold">{receivedWeightForPo} kg</span>
                        {disbPaidWeightKg && Number(disbPaidWeightKg) > 0 && (
                          <span className="ml-2 text-muted-foreground text-xs">
                            (paying for {disbPaidWeightKg} kg at farm gate)
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {disbPoId.trim() && receivedWeightForPo === null && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Icons.Info className="h-3 w-3" />
                      No GRN linked yet — received weight will show once goods are receipted.
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="disbAmount">Amount paid</Label>
                      <FormattedDecimalInput
                        id="disbAmount"
                        value={disbAmount}
                        onValueChange={setDisbAmount}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="disbCurrency">Currency</Label>
                      <Select value={disbCurrency} onValueChange={setDisbCurrency}>
                        <SelectTrigger id="disbCurrency"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="KES">KES</SelectItem>
                          <SelectItem value="UGX">UGX</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {disbKesPreview !== null && disbCurrency !== "KES" && (
                    <p className="text-xs text-muted-foreground -mt-1 flex items-center gap-1">
                      <Icons.ArrowRight className="h-3 w-3 text-primary" />
                      ≈{" "}
                      <span className="font-medium text-foreground">{formatMoney(disbKesPreview, "KES")}</span>
                      {" "}at current rate
                    </p>
                  )}

                  <div className="grid gap-2">
                    <Label htmlFor="disbPaidAt">Date paid</Label>
                    <Input
                      id="disbPaidAt"
                      type="date"
                      value={disbPaidAt}
                      onChange={(e) => setDisbPaidAt(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-2 rounded-md bg-muted/50 border px-3 py-2 text-xs text-muted-foreground">
                    <Icons.Hash className="h-3.5 w-3.5 shrink-0" />
                    <span>A receipt number is assigned automatically when you save.</span>
                  </div>

                  {/* Weight entry: single field for single-line POs, per-line for multi-line */}
                  {poLines.length <= 1 ? (
                    <div className="grid gap-2">
                      <Label htmlFor="disbPaidWeightKg">
                        Paid weight (kg){" "}
                        <span className="font-normal text-muted-foreground">— what you weighed at farm gate</span>
                      </Label>
                      <FormattedDecimalInput
                        id="disbPaidWeightKg"
                        value={disbPaidWeightKg}
                        onValueChange={setDisbPaidWeightKg}
                        placeholder="e.g. 1,200.5"
                      />
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      <Label>Paid weight per product (kg)</Label>
                      <p className="text-xs text-muted-foreground">Enter the weight you paid for at farm gate for each line.</p>
                      {poLines.map((l) => (
                        <div key={l.poLineId} className="flex items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{l.productName}</p>
                            <p className="text-xs text-muted-foreground">{l.sku}</p>
                          </div>
                          <FormattedDecimalInput
                            placeholder="kg"
                            className="w-28"
                            value={disbLineWeights[l.poLineId] ?? ""}
                            onValueChange={(value) =>
                              setDisbLineWeights((prev) => ({ ...prev, [l.poLineId]: value }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <SheetFooter>
                  <Button variant="outline" onClick={() => setDisbursementOpen(false)} disabled={savingDisb}>
                    Cancel
                  </Button>
                  <Button onClick={handleRecordDisbursement} disabled={savingDisb || !canSaveDisbursement}>
                    {savingDisb ? "Saving…" : "Save disbursement"}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
            <Button variant="outline" size="sm" asChild>
              <Link href="/ap/three-way-match">Standard 3-way match</Link>
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">

        {/* Workflow guide — replaces vague banner */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">How it works — CoD procurement flow</CardTitle>
            <CardDescription>Follow these 5 steps every time you source from a farm gate supplier.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-3 sm:grid-cols-5">
              {WORKFLOW_STEPS.map(({ step, label, detail, href, action }) => (
                <li key={step} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {step}
                    </span>
                    {href ? (
                      <Link href={href} className="text-sm font-medium hover:underline">
                        {label}
                      </Link>
                    ) : action ? (
                      <button
                        className="text-sm font-medium hover:underline text-left"
                        onClick={() => setDisbursementOpen(true)}
                      >
                        {label}
                      </button>
                    ) : (
                      <span className="text-sm font-medium">{label}</span>
                    )}
                  </div>
                  <p className="pl-8 text-xs text-muted-foreground">{detail}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <ProcurementVariancePanel
            poWeightKg={auditLines.reduce((a, r) => a + (Number(r.orderedQty) || 0), 0)}
            paidWeightKg={auditLines.reduce((a, r) => a + (r.paidWeightKg ?? 0), 0)}
            receivedWeightKg={auditLines.reduce((a, r) => a + (r.receivedWeightKg ?? 0), 0)}
          />
          <LiveCurrencyConverterCard />
        </div>

        {/* Exception queue */}
        <Card>
          <CardHeader>
            <CardTitle>Exception queue — step 5</CardTitle>
            <CardDescription>
              Variances flagged here. Assign to an investigator, add notes, approve, then resolve.
              Each step is tracked with SLA aging.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable data={exceptions} columns={exceptionColumns} emptyMessage="No open exceptions — all matched." />
          </CardContent>
        </Card>

        <div className="flex gap-2 border-b">
          <Button variant={view === "audit" ? "secondary" : "ghost"} size="sm" onClick={() => setView("audit")}>
            Audit lines
          </Button>
          <Button variant={view === "disbursements" ? "secondary" : "ghost"} size="sm" onClick={() => setView("disbursements")}>
            Cash disbursements
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : (
          <>
            {view === "audit" && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Procurement audit trail</CardTitle>
                    <CardDescription>
                      PO line → Cash disbursement → GRN received weight. Variances indicate transit shrinkage or grading differences.
                    </CardDescription>
                    {/* Info callout: where each field comes from */}
                    <div className="mt-3 rounded-md border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground space-y-1 max-w-xl">
                      <p className="font-medium text-foreground">Where do these numbers come from?</p>
                      <p><span className="font-medium text-foreground">Received weight</span> — entered on the GRN (Inventory → Goods Receipts). Click <span className="font-medium">GRN</span> on any row to open it.</p>
                      <p><span className="font-medium text-foreground">Landed KES/kg</span> — calculated from landed cost allocations tied to the GRN (Inventory → Costing).</p>
                      <p><span className="font-medium text-foreground">Variance</span> — computed automatically as received − paid. Corrections require admin override or an approved request.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportCashWeightAuditCsv(undefined, (msg) => toast.error(msg))}
                    >
                      <Icons.Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </Button>
                    <Select value={statusFilter || "ALL"} onValueChange={(v) => setStatusFilter(v === "ALL" ? "" : v)}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All</SelectItem>
                        <SelectItem value="MATCHED">Matched</SelectItem>
                        <SelectItem value="VARIANCE">Variance</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <DataTable data={auditLines} columns={auditColumns} emptyMessage="No audit lines yet. Record a disbursement and create a GRN to start." />
                </CardContent>
              </Card>
            )}

            {view === "disbursements" && (
              <Card>
                <CardHeader>
                  <CardTitle>Cash disbursements</CardTitle>
                  <CardDescription>Farm-gate CoD payments linked to POs. Audit lines are created automatically when a GRN is linked.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <DataTable data={disbursements} columns={disbursementColumns} emptyMessage="No disbursements yet." />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Notes sheet — used for both Investigate and Resolve actions */}
      <Sheet open={notesSheetOpen} onOpenChange={setNotesSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {notesTarget?.mode === "investigate" ? "Investigation notes" : "Resolution notes"}
            </SheetTitle>
            <SheetDescription>
              {notesTarget?.mode === "investigate"
                ? "Describe what was found during investigation (e.g. driver error, transit damage, grading issue)."
                : "Describe how this variance was resolved and whether it was approved for write-off."}
            </SheetDescription>
          </SheetHeader>
          <div className="py-6">
            <Textarea
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              placeholder="Add notes…"
              rows={6}
            />
          </div>
          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNotesSheetOpen(false);
                setNotesTarget(null);
                setNotesValue("");
              }}
              disabled={savingNotes}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitNotes} disabled={savingNotes || !notesValue.trim()}>
              {savingNotes ? "Saving…" : notesTarget?.mode === "investigate" ? "Save notes" : "Mark resolved"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Correct weights dialog */}
      <Sheet open={!!correctLine} onOpenChange={(open) => { if (!open) setCorrectLine(null); }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Correct weights</SheetTitle>
            <SheetDescription>
              {canOverride
                ? "Admin override: weights will be updated immediately."
                : "Corrections require admin approval. Your request will appear in the approvals inbox."}
            </SheetDescription>
          </SheetHeader>
          {correctLine && (
            <div className="grid gap-4 py-6">
              {/* Context — current values */}
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs space-y-0.5">
                <p className="font-medium text-foreground">{correctLine.poNumber} · {correctLine.sku}</p>
                <p className="text-muted-foreground">
                  Current: paid {correctLine.paidWeightKg ?? "—"} kg · received {correctLine.receivedWeightKg ?? "—"} kg
                </p>
                {correctLine.grnId && (
                  <Link
                    href={`/inventory/receipts/${correctLine.grnId}`}
                    className="inline-flex items-center gap-1 text-primary hover:underline mt-0.5"
                  >
                    <Icons.ExternalLink className="h-3 w-3" />
                    Open source GRN to update received weight
                  </Link>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="correctPaid">Paid weight (kg)</Label>
                <Input
                  id="correctPaid"
                  type="number"
                  step="0.01"
                  value={correctPaid}
                  onChange={(e) => setCorrectPaid(e.target.value)}
                  placeholder={correctLine.paidWeightKg != null ? String(correctLine.paidWeightKg) : "No change"}
                />
                <p className="text-xs text-muted-foreground">Leave blank to keep the current value.</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="correctReceived">Received weight (kg)</Label>
                <Input
                  id="correctReceived"
                  type="number"
                  step="0.01"
                  value={correctReceived}
                  onChange={(e) => setCorrectReceived(e.target.value)}
                  placeholder={correctLine.receivedWeightKg != null ? String(correctLine.receivedWeightKg) : "No change"}
                />
                <p className="text-xs text-muted-foreground">
                  Primary source: enter received weight on the GRN. Use this only for manual corrections.
                </p>
              </div>

              {!canOverride && (
                <div className="grid gap-2">
                  <Label htmlFor="correctReason">Reason for correction <span className="text-destructive">*</span></Label>
                  <Textarea
                    id="correctReason"
                    value={correctReason}
                    onChange={(e) => setCorrectReason(e.target.value)}
                    placeholder="e.g. Typo on original farm-gate entry — driver confirmed actual weight was 480 kg."
                    rows={3}
                  />
                </div>
              )}

              {!canOverride && (
                <div className="flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-700 dark:text-yellow-400">
                  <Icons.Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>Your request will be sent to an admin for approval before weights change.</span>
                </div>
              )}
            </div>
          )}
          <SheetFooter>
            <Button variant="outline" onClick={() => setCorrectLine(null)} disabled={savingCorrection}>
              Cancel
            </Button>
            <Button onClick={handleCorrectWeights} disabled={savingCorrection}>
              {savingCorrection
                ? "Saving…"
                : canOverride
                ? "Apply correction"
                : "Submit override request"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
