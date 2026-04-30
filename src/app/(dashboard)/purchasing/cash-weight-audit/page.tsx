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
  downloadCashDisbursementInvoice,
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
import { fetchGRNById } from "@/lib/api/grn";
import { searchPurchaseOrderLookupApi } from "@/lib/api/documents";
import { AsyncSearchableSelect } from "@/components/ui/async-searchable-select";
import type { AsyncSearchableSelectOption } from "@/components/ui/async-searchable-select";
import type { CashWeightAuditLineRow, CashDisbursementRow } from "@/lib/mock/purchasing/cash-weight-audit";
import type { GrnDetailRow, ReceivedTotals } from "@/lib/types/purchasing";
import { formatMoney } from "@/lib/money";
import { parseDecimalString } from "@/lib/decimal-input";
import { fetchLiveExchangeRate } from "@/lib/fx/live-rates";
import { fetchLandedCostAllocation } from "@/lib/api/landed-cost";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { Permissions } from "@/lib/permissions";

type NotesMode = "investigate" | "resolve";

const DISB_GRN_NONE = "__none__";

const DISB_PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "MPESA", label: "M-Pesa" },
  { value: "MOBILE_MONEY", label: "Mobile money" },
  { value: "OTHER", label: "Other" },
] as const;

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read file."));
        return;
      }
      const [, base64 = ""] = result.split(",", 2);
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

// ── Per-PO aggregated audit row ──────────────────────────────────────────────
interface PoAuditRow {
  poId: string;
  poNumber: string;
  totalPaidKg: number;
  totalReceivedKg: number;
  totalVarianceKg: number | null;
  totalOrderedQty: number;
  status: "MATCHED" | "VARIANCE" | "PENDING";
  openExceptionCount: number;
  lines: CashWeightAuditLineRow[];
  disbursements: CashDisbursementRow[];
  exceptions: CashWeightAuditLineRow[];
}

function groupAuditLinesByPo(
  lines: CashWeightAuditLineRow[],
  disbursements: CashDisbursementRow[],
  exceptions: CashWeightAuditLineRow[]
): PoAuditRow[] {
  const map = new Map<string, PoAuditRow>();

  for (const line of lines) {
    if (!map.has(line.poId)) {
      map.set(line.poId, {
        poId: line.poId,
        poNumber: line.poNumber ?? line.poId,
        totalPaidKg: 0,
        totalReceivedKg: 0,
        totalVarianceKg: null,
        totalOrderedQty: 0,
        status: "PENDING",
        openExceptionCount: 0,
        lines: [],
        disbursements: [],
        exceptions: [],
      });
    }
    const row = map.get(line.poId)!;
    row.lines.push(line);
    row.totalOrderedQty += Number(line.orderedQty) || 0;
    if (line.paidWeightKg != null) row.totalPaidKg += line.paidWeightKg;
    if (line.receivedWeightKg != null) row.totalReceivedKg += line.receivedWeightKg;
  }

  for (const d of disbursements) {
    if (map.has(d.poId)) map.get(d.poId)!.disbursements.push(d);
  }

  for (const ex of exceptions) {
    if (map.has(ex.poId)) {
      const row = map.get(ex.poId)!;
      // Only add if not already present via audit lines
      if (!row.exceptions.find((e) => e.id === ex.id)) {
        row.exceptions.push(ex);
      }
      if (ex.exceptionStatus === "OPEN" || ex.exceptionStatus === "INVESTIGATING") {
        row.openExceptionCount++;
      }
    }
  }

  for (const row of map.values()) {
    const hasVariance = row.lines.some((l) => l.status === "VARIANCE");
    const allMatched = row.lines.length > 0 && row.lines.every((l) => l.status === "MATCHED");
    row.status = hasVariance ? "VARIANCE" : allMatched ? "MATCHED" : "PENDING";
    if (row.totalPaidKg > 0 || row.totalReceivedKg > 0) {
      row.totalVarianceKg = row.totalReceivedKg - row.totalPaidKg;
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    // Sort: VARIANCE first, then PENDING, then MATCHED
    const order = { VARIANCE: 0, PENDING: 1, MATCHED: 2 };
    return order[a.status] - order[b.status];
  });
}

export default function CashWeightAuditPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const permissions = useAuthStore((s) => s.permissions);
  const isPlatformOperator = useAuthStore((s) => s.isPlatformOperator);
  const canOverride =
    isPlatformOperator ||
    permissions.includes(Permissions.PURCHASING_AUDIT_OVERRIDE) ||
    permissions.includes("*");

  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [auditLines, setAuditLines] = React.useState<CashWeightAuditLineRow[]>([]);
  const [exceptions, setExceptions] = React.useState<CashWeightAuditLineRow[]>([]);
  const [disbursements, setDisbursements] = React.useState<CashDisbursementRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [landedCostPerGrn, setLandedCostPerGrn] = React.useState<Map<string, number>>(new Map());
  const [reconcilingId, setReconcilingId] = React.useState<string | null>(null);

  // Per-PO detail sheet
  const [selectedPoRow, setSelectedPoRow] = React.useState<PoAuditRow | null>(null);

  // Correct-weights sheet state
  const [correctLine, setCorrectLine] = React.useState<CashWeightAuditLineRow | null>(null);
  const [correctPaid, setCorrectPaid] = React.useState("");
  const [correctReceived, setCorrectReceived] = React.useState("");
  const [correctReason, setCorrectReason] = React.useState("");
  const [savingCorrection, setSavingCorrection] = React.useState(false);

  // Disbursement form state
  const [disbursementOpen, setDisbursementOpen] = React.useState(false);
  const [disbPoId, setDisbPoId] = React.useState("");
  const [disbGrnId, setDisbGrnId] = React.useState<string>(DISB_GRN_NONE);
  const [disbAmount, setDisbAmount] = React.useState("");
  const [disbCurrency, setDisbCurrency] = React.useState("KES");
  const [disbPaidAt, setDisbPaidAt] = React.useState("");
  const [disbPaidWeightKg, setDisbPaidWeightKg] = React.useState("");
  const [disbLineWeights, setDisbLineWeights] = React.useState<Record<string, string>>({});
  const [poLines, setPoLines] = React.useState<
    Array<{ poLineId: string; sku: string; productName: string; qty: number; uom: string; rate: number; total: number }>
  >([]);
  const [poDetail, setPoDetail] = React.useState<{
    number: string;
    supplier: string;
    total: number;
    currency: string;
    fxRate: number;
    status?: string;
  } | null>(null);
  const [poLinkedGrns, setPoLinkedGrns] = React.useState<Array<{ id: string; number: string; status: string; receivedWeightKg?: number }>>([]);
  const [savingDisb, setSavingDisb] = React.useState(false);
  const [selectedPoOption, setSelectedPoOption] = React.useState<AsyncSearchableSelectOption | null>(null);
  const [disbKesPreview, setDisbKesPreview] = React.useState<number | null>(null);
  const [disbPaymentMethod, setDisbPaymentMethod] = React.useState<string>("CASH");
  const [disbInvoiceFile, setDisbInvoiceFile] = React.useState<File | null>(null);
  const [disbGrnDetail, setDisbGrnDetail] = React.useState<GrnDetailRow | null>(null);
  const [poReceivedTotals, setPoReceivedTotals] = React.useState<ReceivedTotals | null>(null);
  const [poReferenceOpen, setPoReferenceOpen] = React.useState(false);

  const receivedWeightForPo = React.useMemo(() => {
    if (!disbPoId.trim()) return null;
    const matching = auditLines.filter((l) => l.poId === disbPoId.trim());
    if (!matching.length) return null;
    return matching.reduce((a, l) => a + (l.receivedWeightKg ?? 0), 0);
  }, [disbPoId, auditLines]);

  // Notes sheet state
  const [notesSheetOpen, setNotesSheetOpen] = React.useState(false);
  const [notesTarget, setNotesTarget] = React.useState<{
    lineId: string;
    mode: NotesMode;
    current: string;
  } | null>(null);
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

  React.useEffect(() => {
    if (disbursementOpen) {
      setDisbPaidAt(new Date().toISOString().slice(0, 10));
    }
  }, [disbursementOpen]);

  React.useEffect(() => {
    if (!disbGrnId || disbGrnId === DISB_GRN_NONE) {
      setDisbGrnDetail(null);
      return;
    }
    let cancelled = false;
    void fetchGRNById(disbGrnId).then((g) => {
      if (!cancelled) setDisbGrnDetail(g);
    });
    return () => {
      cancelled = true;
    };
  }, [disbGrnId]);

  /** Total receipt value for disbursement UI (matches GRN card footer). */
  const grnReceiptTotal = React.useCallback((g: GrnDetailRow | null): number | null => {
    if (!g?.lines?.length) return null;
    const sum =
      g.total ?? g.totalAmount ?? g.lines.reduce((s, l) => s + (l.value ?? 0), 0);
    if (!Number.isFinite(sum) || sum <= 0) return null;
    return Math.round(sum * 100) / 100;
  }, []);

  React.useEffect(() => {
    if (!disbGrnId || disbGrnId === DISB_GRN_NONE || !disbGrnDetail || disbGrnDetail.id !== disbGrnId) {
      return;
    }
    const total = grnReceiptTotal(disbGrnDetail);
    if (total == null) return;
    setDisbAmount(total % 1 === 0 ? String(total) : total.toFixed(2));
  }, [disbGrnId, disbGrnDetail, grnReceiptTotal]);

  // Batch-load landed cost allocations for all GRN IDs
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
    if (open === "1") setDisbursementOpen(true);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("openDisbursement");
    router.replace(
      `/purchasing/cash-weight-audit${next.toString() ? `?${next.toString()}` : ""}`,
      { scroll: false }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPoOptions = React.useCallback(
    (query: string) =>
      searchPurchaseOrderLookupApi(query, {
        status: "APPROVED,RECEIVED",
        excludeWithCashDisbursement: true,
      }).then((items) =>
        items.map((item) => ({
          id: item.id,
          label: item.label,
          description: item.description,
          badges: [{ label: item.status, variant: "secondary" as const }],
        }))
      ),
    []
  );

  React.useEffect(() => {
    if (!disbPoId.trim()) {
      setPoLines([]);
      setPoDetail(null);
      setDisbLineWeights({});
      setPoLinkedGrns([]);
      setDisbGrnId(DISB_GRN_NONE);
      setPoReceivedTotals(null);
      setPoReferenceOpen(false);
      return;
    }
    let cancelled = false;
    setPoReferenceOpen(false);
    fetchPurchaseOrderById(disbPoId.trim())
      .then((po) => {
        if (cancelled || !po) return;
        if (po.currency) setDisbCurrency(po.currency);
        setPoDetail({
          number: po.number,
          supplier: po.supplier,
          total: po.total ?? 0,
          currency: po.currency,
          fxRate: po.fxRate,
          status: po.status,
        });
        const grns = (po.linkedGrns ?? []).map((g) => ({
          id: g.id,
          number: g.number,
          status: g.status,
          receivedWeightKg: g.receivedWeightKg,
        }));
        setPoLinkedGrns(grns);
        if (grns.length > 0) setDisbGrnId(grns[0].id);
        setPoReceivedTotals(po.receivedTotals ?? null);
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
        if (!cancelled) {
          setPoLines([]);
          setPoDetail(null);
          setPoLinkedGrns([]);
          setPoReceivedTotals(null);
        }
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
    void fetchLiveExchangeRate(disbCurrency, "KES")
      .then((result) => {
        if (!cancelled && result.rate) setDisbKesPreview(amount * result.rate);
      })
      .catch(() => {
        if (!cancelled) setDisbKesPreview(null);
      });
    return () => {
      cancelled = true;
    };
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
    if (newPaid != null && Number.isNaN(newPaid)) {
      toast.error("Invalid paid weight.");
      return;
    }
    if (newReceived != null && Number.isNaN(newReceived)) {
      toast.error("Invalid received weight.");
      return;
    }
    if (newPaid == null && newReceived == null) {
      toast.error("Enter at least one weight to correct.");
      return;
    }
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
        if (!correctReason.trim()) {
          toast.error("A reason is required to request an override.");
          setSavingCorrection(false);
          return;
        }
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
    if (!["APPROVED", "RECEIVED"].includes(poDetail.status.trim().toUpperCase())) return false;
    // When GRNs exist, a GRN must be selected
    if (poLinkedGrns.length > 0 && (!disbGrnId || disbGrnId === DISB_GRN_NONE)) return false;
    return true;
  }, [poDetail?.status, poLinkedGrns.length, disbGrnId]);

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
              return kg != null && !Number.isNaN(kg) && kg > 0
                ? { poLineId: l.poLineId, paidWeightKg: kg }
                : null;
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
      let invoiceAttachment: { fileName: string; contentType: string; content: string } | undefined;
      if (disbInvoiceFile) {
        try {
          const content = await readFileAsBase64(disbInvoiceFile);
          invoiceAttachment = {
            fileName: disbInvoiceFile.name,
            contentType: disbInvoiceFile.type || "application/octet-stream",
            content,
          };
        } catch {
          toast.error("Could not read the supplier invoice file.");
          setSavingDisb(false);
          return;
        }
      }
      const grnIds = disbGrnId && disbGrnId !== DISB_GRN_NONE ? [disbGrnId] : undefined;
      const disbResult = await createCashDisbursement({
        poId: disbPoId.trim(),
        ...(disbGrnId && disbGrnId !== DISB_GRN_NONE ? { grnId: disbGrnId, grnIds } : {}),
        amount,
        currency: disbCurrency,
        paidAt: disbPaidAt,
        paidWeightKg,
        lines,
        paymentMethod: disbPaymentMethod,
        ...(invoiceAttachment ? { invoiceAttachment } : {}),
      });
      const receiptLabel = disbResult.reference ? ` Receipt: ${disbResult.reference}.` : "";
      if (disbResult.warnings?.length) {
        toast.warning(
          `Weight data check: ${disbResult.warnings.join("; ")}. Audit lines will still be created.`
        );
      }
      try {
        const built = await buildCashWeightAudit({ poId: disbPoId.trim() });
        if (built.built > 0) {
          toast.success(
            `Disbursement recorded.${receiptLabel} ${built.built} audit line(s) created automatically.`
          );
        } else {
          toast.success(
            `Disbursement recorded.${receiptLabel} Audit lines will appear once a GRN is linked.`
          );
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
      setPoLinkedGrns([]);
      setDisbGrnId(DISB_GRN_NONE);
      setDisbPaymentMethod("CASH");
      setDisbInvoiceFile(null);
      setDisbGrnDetail(null);
      setPoReceivedTotals(null);
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

  // ── Derived data ─────────────────────────────────────────────────────────────
  const poRows = React.useMemo(
    () => groupAuditLinesByPo(auditLines, disbursements, exceptions),
    [auditLines, disbursements, exceptions]
  );

  const filteredPoRows = React.useMemo(() => {
    let rows = poRows;
    if (statusFilter) rows = rows.filter((r) => r.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter((r) => r.poNumber.toLowerCase().includes(q));
    }
    return rows;
  }, [poRows, statusFilter, searchQuery]);

  const totalVariancePOs = poRows.filter((r) => r.status === "VARIANCE").length;
  const totalMatchedPOs = poRows.filter((r) => r.status === "MATCHED").length;
  const totalPendingPOs = poRows.filter((r) => r.status === "PENDING").length;

  // ── PO master table columns ──────────────────────────────────────────────────
  const poColumns = [
    {
      id: "po",
      header: "Purchase Order",
      accessor: (r: PoAuditRow) => (
        <div>
          <p className="font-medium">{r.poNumber}</p>
          <p className="text-xs text-muted-foreground">
            {r.lines.length} product{r.lines.length !== 1 ? "s" : ""}
          </p>
        </div>
      ),
    },
    {
      id: "disbursements",
      header: "Disbursements",
      accessor: (r: PoAuditRow) =>
        r.disbursements.length > 0 ? (
          <div className="space-y-0.5">
            {r.disbursements.map((d) => (
              <p key={d.id} className="font-mono text-xs text-muted-foreground">
                {d.reference ?? d.id}
              </p>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      id: "paid",
      header: "Paid (kg)",
      accessor: (r: PoAuditRow) =>
        r.totalPaidKg > 0 ? (
          <span className="tabular-nums font-medium">{r.totalPaidKg.toLocaleString()}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "received",
      header: "Received (kg)",
      accessor: (r: PoAuditRow) =>
        r.totalReceivedKg > 0 ? (
          <span className="tabular-nums font-medium">{r.totalReceivedKg.toLocaleString()}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "variance",
      header: "Variance (kg)",
      accessor: (r: PoAuditRow) => {
        if (r.totalVarianceKg == null)
          return <span className="text-muted-foreground">—</span>;
        const isNeg = r.totalVarianceKg < 0;
        const isPos = r.totalVarianceKg > 0;
        return (
          <span
            className={`tabular-nums font-medium ${
              isNeg
                ? "text-destructive"
                : isPos
                ? "text-green-600 dark:text-green-400"
                : "text-muted-foreground"
            }`}
          >
            {r.totalVarianceKg >= 0 ? "+" : ""}
            {r.totalVarianceKg.toFixed(2)}
          </span>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      accessor: (r: PoAuditRow) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge
            variant={
              r.status === "MATCHED"
                ? "default"
                : r.status === "VARIANCE"
                ? "destructive"
                : "secondary"
            }
          >
            {r.status === "MATCHED" ? "Matched" : r.status === "VARIANCE" ? "Variance" : "Pending"}
          </Badge>
          {r.openExceptionCount > 0 && (
            <Badge
              variant="outline"
              className="border-orange-500/50 text-orange-600 dark:text-orange-400 text-[10px]"
            >
              {r.openExceptionCount} exception{r.openExceptionCount !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      accessor: (r: PoAuditRow) => (
        <Button size="sm" variant="outline" onClick={() => setSelectedPoRow(r)}>
          <Icons.ArrowRight className="h-3.5 w-3.5 mr-1.5" />
          View audit
        </Button>
      ),
    },
  ];

  // ── Per-line columns (inside detail sheet) ───────────────────────────────────
  const detailLineColumns = [
    {
      id: "sku",
      header: "SKU",
      accessor: (r: CashWeightAuditLineRow) => (
        <span className="font-mono text-xs">{r.sku ?? "—"}</span>
      ),
    },
    {
      id: "product",
      header: "Product",
      accessor: (r: CashWeightAuditLineRow) => (
        <span className="text-sm">{r.productName ?? "—"}</span>
      ),
    },
    {
      id: "paidKg",
      header: "Paid (kg)",
      accessor: (r: CashWeightAuditLineRow) =>
        r.paidWeightKg != null ? (
          <span className="tabular-nums">{r.paidWeightKg}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "receivedKg",
      header: "Received (kg)",
      accessor: (r: CashWeightAuditLineRow) =>
        r.receivedWeightKg != null ? (
          <span className="tabular-nums">{r.receivedWeightKg}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "landedCostPerKg",
      header: "Landed KES/kg",
      accessor: (r: CashWeightAuditLineRow) => {
        if (!r.grnId) return <span className="text-muted-foreground">—</span>;
        const cpk = landedCostPerGrn.get(r.grnId);
        if (cpk == null)
          return <span className="text-muted-foreground text-xs">Pending</span>;
        return <span className="tabular-nums">{formatMoney(cpk, "KES")}</span>;
      },
    },
    {
      id: "variance",
      header: "Variance (kg)",
      accessor: (r: CashWeightAuditLineRow) =>
        r.varianceKg != null ? (
          <span
            className={`tabular-nums ${
              r.varianceKg < 0 ? "text-destructive" : r.varianceKg > 0 ? "text-green-600 dark:text-green-400" : ""
            }`}
          >
            {r.varianceKg >= 0 ? `+${r.varianceKg}` : r.varianceKg}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "status",
      header: "Status",
      accessor: (r: CashWeightAuditLineRow) => (
        <Badge
          variant={
            r.status === "MATCHED"
              ? "default"
              : r.status === "VARIANCE"
              ? "destructive"
              : "secondary"
          }
        >
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
            <Button size="sm" variant="ghost" asChild title="Open GRN">
              <Link href={`/inventory/receipts/${r.grnId}`}>
                <Icons.ExternalLink className="h-3 w-3" />
              </Link>
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => openCorrectDialog(r)} title="Correct weights">
            <Icons.Pencil className="h-3 w-3" />
          </Button>
          {r.status !== "MATCHED" && (
            <Button
              size="sm"
              variant="ghost"
              disabled={reconcilingId === r.id}
              onClick={() => handleReconcile(r)}
            >
              {reconcilingId === r.id ? "…" : "Reconcile"}
            </Button>
          )}
        </div>
      ),
    },
  ];

  // ── Exception columns (inside detail sheet) ──────────────────────────────────
  const detailExceptionColumns = [
    {
      id: "sku",
      header: "SKU",
      accessor: (r: CashWeightAuditLineRow) => (
        <span className="font-mono text-xs">{r.sku ?? "—"}</span>
      ),
    },
    {
      id: "variance",
      header: "Variance (kg)",
      accessor: (r: CashWeightAuditLineRow) => (
        <span className="tabular-nums">{r.varianceKg ?? "—"}</span>
      ),
    },
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
      header: "SLA",
      accessor: (r: CashWeightAuditLineRow) => (
        <span
          className={
            r.slaOverdue
              ? "text-destructive font-medium text-xs"
              : "text-muted-foreground text-xs"
          }
        >
          {r.slaAgeHours ?? 0}h{r.slaOverdue ? " overdue" : ""}
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

  return (
    <PageShell>
      <PageHeader
        title="Cash-to-Weight Audit"
        description="Track every farm-gate procurement — compare what was paid vs what was received."
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
                    Select PO and GRN. Farm-gate payment and amount checks use the <strong>GRN receipt</strong> (received
                    weight and line values), not the PO total. The PO section below is reference only—expand it to see
                    ordered lines. On save, the backend posts to the GL (GR/NI clearing debit, farm-gate cash credit) in
                    base currency when FX is available.
                  </SheetDescription>
                </SheetHeader>
                <div className="grid gap-4 py-6">
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
                      Approved or received POs are shown (you can record farm-gate payment while the
                      order is open or after receipt).
                    </p>
                  </div>

                  {poLinkedGrns.length > 0 && (
                    <div className="grid gap-2">
                      <Label>
                        GRN <span className="text-destructive">*</span>
                        <span className="font-normal text-muted-foreground"> — receipt for this payment</span>
                      </Label>
                      <Select
                        value={disbGrnId || DISB_GRN_NONE}
                        onValueChange={setDisbGrnId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a GRN…" />
                        </SelectTrigger>
                        <SelectContent>
                          {poLinkedGrns.map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.number}
                              {g.receivedWeightKg != null && (
                                <span className="text-muted-foreground ml-1 text-xs">
                                  · {g.receivedWeightKg.toFixed(2)} kg received
                                </span>
                              )}
                              <span className="text-muted-foreground ml-1 uppercase text-xs">
                                ({g.status})
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {(!disbGrnId || disbGrnId === DISB_GRN_NONE) ? (
                        <p className="text-xs text-amber-600 flex items-center gap-1">
                          <Icons.AlertTriangle className="h-3 w-3 shrink-0" />
                          Select the GRN to see goods received and to validate payment against this receipt.
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Payment is based on received weight and line values for this GRN.
                        </p>
                      )}
                    </div>
                  )}

                  {disbGrnDetail &&
                    disbGrnId &&
                    disbGrnId !== DISB_GRN_NONE &&
                    (disbGrnDetail.lines?.length ?? 0) > 0 && (
                      <div className="rounded-md border border-primary/30 bg-primary/5 text-sm overflow-hidden">
                        <div className="px-3 py-2 border-b border-primary/20 bg-primary/10">
                          <p className="font-semibold flex items-center gap-2">
                            <Icons.Truck className="h-4 w-4 text-primary shrink-0" />
                            Receipt to pay against — GRN {disbGrnDetail.number}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Goods received and line values below. System caps amount vs this receipt (+10%).
                          </p>
                        </div>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b text-muted-foreground">
                              <th className="px-3 py-1.5 text-left font-medium">Product</th>
                              <th className="px-2 py-1.5 text-right font-medium">Recv. kg</th>
                              <th className="px-3 py-1.5 text-right font-medium">Line value</th>
                              <th className="px-3 py-1.5 text-right font-medium">/kg</th>
                            </tr>
                          </thead>
                          <tbody>
                            {disbGrnDetail.lines.map((l) => {
                              const kg = l.receivedWeightKg ?? 0;
                              const val = l.value ?? 0;
                              const perKg = kg > 0 ? val / kg : null;
                              return (
                                <tr key={l.id} className="border-b last:border-0">
                                  <td className="px-3 py-1.5">
                                    <p className="font-medium truncate max-w-[140px]">{l.productName}</p>
                                    <p className="text-muted-foreground">{l.sku}</p>
                                  </td>
                                  <td className="px-2 py-1.5 text-right tabular-nums">
                                    {kg > 0 ? kg.toLocaleString("en-KE", { maximumFractionDigits: 2 }) : "—"}
                                  </td>
                                  <td className="px-3 py-1.5 text-right tabular-nums">
                                    {formatMoney(val, poDetail?.currency ?? disbCurrency)}
                                  </td>
                                  <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                                    {perKg != null
                                      ? formatMoney(perKg, poDetail?.currency ?? disbCurrency)
                                      : "—"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        <div className="px-3 py-2 text-xs border-t border-primary/15 bg-primary/5 flex flex-wrap gap-x-4 gap-y-1 justify-end">
                          <span>
                            Total weight:{" "}
                            <strong className="tabular-nums">
                              {disbGrnDetail.lines
                                .reduce((s, l) => s + (l.receivedWeightKg ?? 0), 0)
                                .toLocaleString("en-KE", { maximumFractionDigits: 2 })}{" "}
                              kg
                            </strong>
                          </span>
                          <span>
                            Total receipt value:{" "}
                            <strong className="tabular-nums">
                              {formatMoney(
                                disbGrnDetail.total ??
                                  disbGrnDetail.lines.reduce((s, l) => s + (l.value ?? 0), 0),
                                poDetail?.currency ?? disbCurrency
                              )}
                            </strong>
                          </span>
                        </div>
                      </div>
                    )}

                  {poDetail && (
                    <div className="rounded-md border bg-muted/40 text-sm overflow-hidden">
                      <button
                        type="button"
                        aria-expanded={poReferenceOpen}
                        onClick={() => setPoReferenceOpen((open) => !open)}
                        className="flex w-full items-start justify-between gap-2 px-3 py-2.5 text-left hover:bg-muted/60"
                      >
                        <span className="min-w-0 flex-1 space-y-1">
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm">
                            <Icons.FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="font-medium">{poDetail.number}</span>
                            {poDetail.status && (
                              <Badge variant="outline" className="text-[10px] font-normal uppercase">
                                {poDetail.status}
                              </Badge>
                            )}
                            <span className="text-muted-foreground">·</span>
                            <span className="truncate max-w-[200px] text-muted-foreground">
                              {poDetail.supplier || "—"}
                            </span>
                            <span className="text-muted-foreground">·</span>
                            <span className="tabular-nums text-muted-foreground">
                              {formatMoney(poDetail.total, poDetail.currency)}
                            </span>
                          </span>
                          <span className="block text-[11px] font-normal text-muted-foreground">
                            PO details (reference) — expand for ordered lines and PO-wide received totals
                          </span>
                        </span>
                        <Icons.ChevronDown
                          className={`mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${poReferenceOpen ? "rotate-180" : ""}`}
                          aria-hidden
                        />
                      </button>
                      {poReferenceOpen ? (
                        <div className="border-t bg-muted/30">
                          <div className="px-3 py-2 space-y-1 border-b bg-muted/50">
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">Supplier</span> (from PO):{" "}
                              {poDetail.supplier || "—"}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              PO order value{" "}
                              <span className="tabular-nums">{formatMoney(poDetail.total, poDetail.currency)}</span> is for
                              reference only. Pay and audit against the GRN receipt above.
                            </p>
                          </div>
                          {poLines.length > 0 && (
                            <div className="border-b bg-background/50">
                              <p className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                Ordered on PO (reference)
                              </p>
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
                                        {formatMoney(l.rate, poDetail.currency)}
                                      </td>
                                      <td className="px-3 py-1.5 text-right tabular-nums">
                                        {formatMoney(l.total, poDetail.currency)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                          {poReceivedTotals && poReceivedTotals.weightKg > 0 && (
                            <div className="rounded-none border-t border-primary/20 bg-primary/5 px-3 py-2 text-xs">
                              <p className="font-medium text-foreground flex items-center gap-1.5">
                                <Icons.Scale className="h-3.5 w-3.5" />
                                Received to date (all GRNs on this PO)
                              </p>
                              <p className="mt-1 text-muted-foreground">
                                <span className="font-semibold text-foreground tabular-nums">
                                  {poReceivedTotals.weightKg.toLocaleString("en-KE", { maximumFractionDigits: 2 })} kg
                                </span>
                                {poReceivedTotals.value > 0 && (
                                  <>
                                    {" "}
                                    · value{" "}
                                    <span className="tabular-nums font-medium text-foreground">
                                      {formatMoney(poReceivedTotals.value, poDetail.currency)}
                                    </span>
                                  </>
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}

                  {poDetail?.status &&
                    !["APPROVED", "RECEIVED"].includes(poDetail.status.trim().toUpperCase()) && (
                      <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        This PO is <strong>{poDetail.status}</strong>. Cash disbursements can only
                        be saved when the purchase order is <strong>APPROVED</strong> or{" "}
                        <strong>RECEIVED</strong>. Submit or approve the PO first.
                      </div>
                    )}

                  {(() => {
                    const selectedGrn = disbGrnId && disbGrnId !== DISB_GRN_NONE
                      ? poLinkedGrns.find((g) => g.id === disbGrnId)
                      : null;
                    const displayWeight = selectedGrn?.receivedWeightKg ?? receivedWeightForPo;
                    if (displayWeight !== null && displayWeight !== undefined) {
                      return (
                        <div className="rounded-md bg-muted px-3 py-2 text-sm flex items-center gap-2">
                          <Icons.Package className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span>
                            Received at facility:{" "}
                            <span className="font-semibold">{displayWeight.toFixed ? displayWeight.toFixed(2) : displayWeight} kg</span>
                            {disbPaidWeightKg && Number(disbPaidWeightKg) > 0 && (
                              <span className="ml-2 text-muted-foreground text-xs">
                                (paying for {disbPaidWeightKg} kg at farm gate)
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    }
                    if (disbPoId.trim() && poLinkedGrns.length === 0) {
                      return (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Icons.Info className="h-3 w-3" />
                          No GRN linked yet — received weight will show once goods are receipted.
                        </p>
                      );
                    }
                    return null;
                  })()}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="disbAmount">Amount paid</Label>
                      <FormattedDecimalInput
                        id="disbAmount"
                        value={disbAmount}
                        onValueChange={setDisbAmount}
                        placeholder="0.00"
                      />
                      <p className="text-xs text-muted-foreground">
                        Prefilled from the selected GRN total receipt value when available. You can change it before
                        saving.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="disbCurrency">Currency</Label>
                      <Select value={disbCurrency} onValueChange={setDisbCurrency}>
                        <SelectTrigger id="disbCurrency">
                          <SelectValue />
                        </SelectTrigger>
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
                      <Icons.ArrowRight className="h-3 w-3 text-primary" />≈{" "}
                      <span className="font-medium text-foreground">
                        {formatMoney(disbKesPreview, "KES")}
                      </span>{" "}
                      at current rate
                    </p>
                  )}

                  <div className="grid gap-2">
                    <Label htmlFor="disbPaymentMethod">How paid</Label>
                    <Select value={disbPaymentMethod} onValueChange={setDisbPaymentMethod}>
                      <SelectTrigger id="disbPaymentMethod">
                        <SelectValue placeholder="Payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        {DISB_PAYMENT_METHODS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="disbPaidAt">Date paid</Label>
                    <Input
                      id="disbPaidAt"
                      type="date"
                      value={disbPaidAt}
                      onChange={(e) => setDisbPaidAt(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="disbInvoice">Supplier invoice or receipt (optional)</Label>
                    <Input
                      id="disbInvoice"
                      type="file"
                      accept=".pdf,image/jpeg,image/png,image/webp"
                      className="cursor-pointer"
                      onChange={(e) => setDisbInvoiceFile(e.target.files?.[0] ?? null)}
                    />
                    {disbInvoiceFile ? (
                      <p className="text-xs text-muted-foreground truncate">{disbInvoiceFile.name}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">PDF or image, max 5 MB.</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 rounded-md bg-muted/50 border px-3 py-2 text-xs text-muted-foreground">
                    <Icons.Hash className="h-3.5 w-3.5 shrink-0" />
                    <span>A receipt number is assigned automatically when you save.</span>
                  </div>

                  {poLines.length <= 1 ? (
                    <div className="grid gap-2">
                      <Label htmlFor="disbPaidWeightKg">
                        Paid weight (kg){" "}
                        <span className="font-normal text-muted-foreground">
                          — what you weighed at farm gate
                        </span>
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
                      <p className="text-xs text-muted-foreground">
                        Enter the weight you paid for at farm gate for each line.
                      </p>
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
                  <Button
                    variant="outline"
                    onClick={() => setDisbursementOpen(false)}
                    disabled={savingDisb}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleRecordDisbursement}
                    disabled={savingDisb || !canSaveDisbursement}
                  >
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

      <div className="p-6 space-y-5">
        {/* ── Stat chips ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Total procurements
            </p>
            <p className="text-2xl font-bold mt-1">{loading ? "—" : poRows.length}</p>
          </Card>
          <Card className={`p-4 ${totalVariancePOs > 0 ? "border-destructive/50" : ""}`}>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Have variance</p>
            <p
              className={`text-2xl font-bold mt-1 ${
                totalVariancePOs > 0 ? "text-destructive" : ""
              }`}
            >
              {loading ? "—" : totalVariancePOs}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Fully matched</p>
            <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">
              {loading ? "—" : totalMatchedPOs}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending GRN</p>
            <p className="text-2xl font-bold mt-1 text-muted-foreground">
              {loading ? "—" : totalPendingPOs}
            </p>
          </Card>
        </div>

        {/* ── How it works (collapsible toggle) ──────────────────────────────── */}
        <div>
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setHelpOpen((o) => !o)}
          >
            <Icons.HelpCircle className="h-3.5 w-3.5" />
            How does the CoD procurement flow work?
            <Icons.ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${helpOpen ? "rotate-180" : ""}`}
            />
          </button>
          {helpOpen && (
            <Card className="mt-2">
              <CardContent className="pt-4 pb-4">
                <ol className="grid gap-3 sm:grid-cols-5">
                  {[
                    {
                      step: "1",
                      label: "Create Purchase Order",
                      detail: "Purchasing → Purchase Order → New",
                      href: "/purchasing/orders",
                    },
                    {
                      step: "2",
                      label: "Pay at farm gate",
                      detail: "Record disbursement → select PO → enter amount & paid weight (kg)",
                      action: true,
                    },
                    {
                      step: "3",
                      label: "Receive stock → create GRN",
                      detail:
                        "Inventory → Goods Receipts → create from PO, enter received weight (kg)",
                      href: "/inventory/receipts",
                    },
                    {
                      step: "4",
                      label: "Audit lines auto-built",
                      detail:
                        "PO quantity vs paid weight vs received weight compared automatically",
                    },
                    {
                      step: "5",
                      label: "Reconcile variances",
                      detail:
                        "Click View audit on any PO row below → exceptions → assign → investigate → resolve",
                    },
                  ].map(({ step, label, detail, href, action }) => (
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
                            type="button"
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
          )}
        </div>

        {/* ── Master PO table ─────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
            <div>
              <CardTitle>Procurement Audits</CardTitle>
              <CardDescription>
                One row per purchase order. Click &ldquo;View audit&rdquo; to inspect weight
                details and resolve exceptions.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => exportCashWeightAuditCsv(undefined, (msg) => toast.error(msg))}
            >
              <Icons.Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </CardHeader>

          <div className="px-6 pb-3 flex items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <Icons.Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by PO number…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <Select
              value={statusFilter || "ALL"}
              onValueChange={(v) => setStatusFilter(v === "ALL" ? "" : v)}
            >
              <SelectTrigger className="w-36 h-8 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="MATCHED">Matched</SelectItem>
                <SelectItem value="VARIANCE">Variance</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <CardContent className="p-0">
            {loading ? (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                Loading procurement audits…
              </div>
            ) : (
              <DataTable
                data={filteredPoRows}
                columns={poColumns}
                emptyMessage="No procurements found. Record a disbursement and create a GRN to start auditing."
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Per-PO detail sheet ───────────────────────────────────────────────── */}
      <Sheet
        open={!!selectedPoRow}
        onOpenChange={(open) => {
          if (!open) setSelectedPoRow(null);
        }}
      >
        <SheetContent className="overflow-y-auto sm:max-w-2xl w-full">
          {selectedPoRow && (
            <>
              <SheetHeader className="pb-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <SheetTitle>{selectedPoRow.poNumber}</SheetTitle>
                  <Badge
                    variant={
                      selectedPoRow.status === "MATCHED"
                        ? "default"
                        : selectedPoRow.status === "VARIANCE"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {selectedPoRow.status}
                  </Badge>
                  {selectedPoRow.openExceptionCount > 0 && (
                    <Badge
                      variant="outline"
                      className="border-orange-500/50 text-orange-600 dark:text-orange-400"
                    >
                      {selectedPoRow.openExceptionCount} open exception
                      {selectedPoRow.openExceptionCount !== 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
                <SheetDescription>
                  Weight audit detail: paid vs received for each product, disbursements, and
                  exception workflow.
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-5 pt-2">
                {/* Variance panel scoped to this PO */}
                <ProcurementVariancePanel
                  poWeightKg={selectedPoRow.totalOrderedQty}
                  paidWeightKg={selectedPoRow.totalPaidKg}
                  receivedWeightKg={selectedPoRow.totalReceivedKg}
                />

                {/* Disbursements */}
                {selectedPoRow.disbursements.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Icons.Banknote className="h-3.5 w-3.5 text-muted-foreground" />
                      Cash disbursements
                    </h3>
                    <div className="rounded-md border divide-y text-sm">
                      {selectedPoRow.disbursements.map((d) => (
                        <div
                          key={d.id}
                          className="px-3 py-2.5 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="font-medium font-mono text-xs">
                              {d.reference ?? d.id}
                            </p>
                            <p className="text-xs text-muted-foreground">{d.paidAt}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Paid via{" "}
                              {DISB_PAYMENT_METHODS.find(
                                (m) => m.value === (d.paymentMethod ?? "CASH")
                              )?.label ?? d.paymentMethod}
                            </p>
                            {d.hasSupplierInvoice ? (
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="text-[10px]">
                                  Invoice on file
                                  {d.supplierInvoiceFileName
                                    ? `: ${d.supplierInvoiceFileName}`
                                    : ""}
                                </Badge>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-[10px]"
                                  onClick={() =>
                                    void downloadCashDisbursementInvoice(d.id, (msg) =>
                                      toast.error(msg)
                                    )
                                  }
                                >
                                  <Icons.Download className="h-3 w-3 mr-1" />
                                  Download
                                </Button>
                              </div>
                            ) : null}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-semibold">{formatMoney(d.amount, d.currency)}</p>
                            <Badge
                              variant={d.status === "RECONCILED" ? "default" : "secondary"}
                              className="text-[10px] mt-0.5"
                            >
                              {d.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedPoRow.disbursements.length === 0 && (
                  <div className="flex items-center gap-2 rounded-md border border-dashed px-3 py-2.5 text-sm text-muted-foreground">
                    <Icons.Info className="h-4 w-4 shrink-0" />
                    No disbursement recorded yet.{" "}
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => {
                        setSelectedPoRow(null);
                        setDisbPoId(selectedPoRow.poId);
                        setDisbursementOpen(true);
                      }}
                    >
                      Record one now
                    </button>
                  </div>
                )}

                {/* Product audit lines */}
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Icons.Scale className="h-3.5 w-3.5 text-muted-foreground" />
                    Product lines — weight audit
                  </h3>
                  <div className="rounded-md border overflow-hidden">
                    <DataTable
                      data={selectedPoRow.lines}
                      columns={detailLineColumns}
                      emptyMessage="No audit lines yet. Link a GRN to this PO to generate them."
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Received weight comes from the GRN. Variance = received − paid. Use{" "}
                    <Icons.Pencil className="h-3 w-3 inline" /> to correct weights or{" "}
                    <Icons.ExternalLink className="h-3 w-3 inline" /> to open the source GRN.
                  </p>
                </div>

                {/* Exceptions */}
                {selectedPoRow.exceptions.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Icons.AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                      Exceptions
                      <span className="text-xs font-normal text-muted-foreground">
                        — assign an investigator, add notes, then approve and resolve
                      </span>
                    </h3>
                    <div className="rounded-md border overflow-hidden">
                      <DataTable
                        data={selectedPoRow.exceptions}
                        columns={detailExceptionColumns}
                        emptyMessage="No exceptions."
                      />
                    </div>
                  </div>
                )}

                {/* All good */}
                {selectedPoRow.status === "MATCHED" &&
                  selectedPoRow.exceptions.length === 0 && (
                    <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2.5 text-sm text-green-700 dark:text-green-400">
                      <Icons.CheckCircle2 className="h-4 w-4 shrink-0" />
                      All product lines match. No exceptions outstanding.
                    </div>
                  )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Notes sheet */}
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
            <Button
              onClick={handleSubmitNotes}
              disabled={savingNotes || !notesValue.trim()}
            >
              {savingNotes
                ? "Saving…"
                : notesTarget?.mode === "investigate"
                ? "Save notes"
                : "Mark resolved"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Correct weights sheet */}
      <Sheet
        open={!!correctLine}
        onOpenChange={(open) => {
          if (!open) setCorrectLine(null);
        }}
      >
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
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs space-y-0.5">
                <p className="font-medium text-foreground">
                  {correctLine.poNumber} · {correctLine.sku}
                </p>
                <p className="text-muted-foreground">
                  Current: paid {correctLine.paidWeightKg ?? "—"} kg · received{" "}
                  {correctLine.receivedWeightKg ?? "—"} kg
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
                  placeholder={
                    correctLine.paidWeightKg != null
                      ? String(correctLine.paidWeightKg)
                      : "No change"
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to keep the current value.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="correctReceived">Received weight (kg)</Label>
                <Input
                  id="correctReceived"
                  type="number"
                  step="0.01"
                  value={correctReceived}
                  onChange={(e) => setCorrectReceived(e.target.value)}
                  placeholder={
                    correctLine.receivedWeightKg != null
                      ? String(correctLine.receivedWeightKg)
                      : "No change"
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Primary source: enter received weight on the GRN. Use this only for manual
                  corrections.
                </p>
              </div>

              {!canOverride && (
                <div className="grid gap-2">
                  <Label htmlFor="correctReason">
                    Reason for correction <span className="text-destructive">*</span>
                  </Label>
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
                  <span>
                    Your request will be sent to an admin for approval before weights change.
                  </span>
                </div>
              )}
            </div>
          )}
          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => setCorrectLine(null)}
              disabled={savingCorrection}
            >
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
