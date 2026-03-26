"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  fetchExternalWorkCenters,
  fetchSubcontractOrders,
  fetchWIPBalances,
  receiveSubcontractOrder,
  dispatchSubcontractOrder,
  createExternalWorkCenter,
  createSubcontractOrder,
  fetchReverseBoms,
  type ExternalWorkCenterRow,
  type SubcontractOrderRow,
  type WIPBalanceRow,
} from "@/lib/api/cool-catch";
import { fetchGRNs } from "@/lib/api/grn";
import type { PurchasingDocRow } from "@/lib/types/purchasing";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { formatMoney } from "@/lib/money";

const SPECIES_OPTIONS = [
  { value: "TILAPIA", label: "Tilapia" },
  { value: "NILE_PERCH", label: "Nile Perch" },
] as const;

const PROCESS_OPTIONS = [
  { value: "FILLETING", label: "Filleting" },
  { value: "GUTTING", label: "Gutting" },
] as const;

type Species = "TILAPIA" | "NILE_PERCH";
type ProcessType = "FILLETING" | "GUTTING";

interface BomItem {
  productId: string;
  type: string;
  quantity: number;
  productName?: string;
}

interface ReverseBom {
  id: string;
  name: string;
  code: string;
  productId: string;
  direction: string;
  items: BomItem[];
}

interface PreviewLine {
  productId: string;
  productName: string;
  type: "INPUT" | "OUTPUT_PRIMARY" | "OUTPUT_SECONDARY" | "WASTE";
  quantity: number;
  processingFeePerUnit?: number;
  amount?: number;
}

interface ProcessingBatch {
  lineIndex: number;
  productId?: string;
  productName: string;
  sku: string;
  receivedWeightKg: number;
  species: Species | "";
  processType: ProcessType | "";
  workCenterId: string;
  bomId: string;
  enabled: boolean;
  alreadyProcessed: boolean;
  unavailableReason?: string;
  previewExpanded: boolean;
}

function detectSpecies(productName: string, sku: string): Species | "" {
  const s = (productName + " " + sku).toLowerCase();
  if (s.includes("nile perch") || s.includes("np-") || s.includes("np ")) return "NILE_PERCH";
  if (s.includes("tilapia") || s.includes("tp-") || s.includes("tp ")) return "TILAPIA";
  return "";
}

/**
 * Ranked BOM auto-selection:
 * 1. BOM whose productId matches the raw input product AND name hints match species/process.
 * 2. BOM matching species + process by name keywords only.
 * 3. No match → empty string (user must pick).
 */
function findBom(
  reverseBoms: ReverseBom[],
  species: Species | "",
  processType: ProcessType | "",
  inputProductId?: string
): string {
  if (!reverseBoms.length) return "";

  function nameMatchesSpecies(name: string, sp: Species | ""): boolean {
    if (!sp) return false;
    const n = name.toLowerCase();
    return sp === "TILAPIA"
      ? n.includes("tilapia") || n.includes("tp-") || n.includes("tp ")
      : n.includes("nile perch") || n.includes("nile_perch") || n.includes("np-") || n.includes("np ");
  }
  function nameMatchesProcess(name: string, pt: ProcessType | ""): boolean {
    if (!pt) return false;
    const n = name.toLowerCase();
    return pt === "FILLETING" ? n.includes("fillet") : n.includes("gutt");
  }

  // Priority 1: product ID match + process/species name match
  if (inputProductId && processType) {
    const p1 = reverseBoms.find(
      (b) =>
        b.productId === inputProductId &&
        (!species || nameMatchesSpecies(b.name, species)) &&
        nameMatchesProcess(b.name, processType)
    );
    if (p1) return p1.id;

    // Priority 1b: product ID match + process name match only (no species filter yet)
    const p1b = reverseBoms.find(
      (b) => b.productId === inputProductId && nameMatchesProcess(b.name, processType)
    );
    if (p1b) return p1b.id;

    // Priority 1c: product ID match only
    const p1c = reverseBoms.find((b) => b.productId === inputProductId);
    if (p1c) return p1c.id;
  }

  // Priority 2: species + process by name keywords
  if (species && processType) {
    const p2 = reverseBoms.find(
      (b) => nameMatchesSpecies(b.name, species) && nameMatchesProcess(b.name, processType)
    );
    if (p2) return p2.id;
  }

  // Priority 3: process only
  if (processType) {
    const p3 = reverseBoms.find((b) => nameMatchesProcess(b.name, processType));
    if (p3) return p3.id;
  }

  return "";
}

function getFeeRate(wc: ExternalWorkCenterRow | null | undefined, processType: ProcessType, species: Species): number {
  if (!wc?.feeRates?.length) return 0;
  const specific = wc.feeRates.find((r) => r.serviceType === processType && r.species === species);
  if (specific) return specific.ratePerKg;
  const generic = wc.feeRates.find((r) => r.serviceType === processType && !r.species);
  return generic?.ratePerKg ?? 0;
}

function buildPreviewLines(
  bom: ReverseBom | null,
  inputWeightKg: number,
  workCenter: ExternalWorkCenterRow | null | undefined,
  processType: ProcessType | "",
  species: Species | ""
): PreviewLine[] {
  if (!bom || !inputWeightKg || inputWeightKg <= 0) return [];
  const baseQty = 100;
  const scale = inputWeightKg / baseQty;
  const feeRate = processType && species ? getFeeRate(workCenter, processType, species) : 0;

  const inputLine: PreviewLine = {
    productId: bom.productId,
    productName: "Input (Round Fish)",
    type: "INPUT",
    quantity: inputWeightKg,
  };

  const rawOutputLines: PreviewLine[] = bom.items.map((item) => {
    const bomType = item.type;
    const lineType: PreviewLine["type"] =
      bomType === "PRIMARY" ? "OUTPUT_PRIMARY" : bomType === "SECONDARY" ? "OUTPUT_SECONDARY" : "WASTE";
    const qty = Math.round(item.quantity * scale * 100) / 100;
    const isPrimary = lineType === "OUTPUT_PRIMARY";
    const fee = isPrimary && feeRate > 0 ? feeRate : undefined;
    return {
      productId: item.productId,
      productName: item.productName ?? item.productId,
      type: lineType,
      quantity: qty,
      processingFeePerUnit: fee,
      amount: fee != null ? Math.round(fee * qty * 100) / 100 : undefined,
    };
  });

  // Merge output lines:
  // - PRIMARY: collapse ALL primary lines into one row (size/grade splits are internal BOM detail,
  //   not relevant to the subcontract preview — the user just needs total primary yield).
  // - SECONDARY / WASTE: merge only exact productId+type duplicates.
  const merged = new Map<string, PreviewLine>();
  for (const line of rawOutputLines) {
    const key = line.type === "OUTPUT_PRIMARY" ? "OUTPUT_PRIMARY" : `${line.productId}::${line.type}`;
    const existing = merged.get(key);
    if (existing) {
      existing.quantity = Math.round((existing.quantity + line.quantity) * 100) / 100;
      if (line.amount != null) {
        existing.amount = Math.round(((existing.amount ?? 0) + line.amount) * 100) / 100;
      }
    } else {
      merged.set(key, { ...line });
    }
  }

  return [inputLine, ...merged.values()];
}

export default function SubcontractingPage() {
  const [tab, setTab] = React.useState<"orders" | "wip" | "workcenters">("orders");
  const [orderStatusFilter, setOrderStatusFilter] = React.useState<string>("");
  const [workCenterFilter, setWorkCenterFilter] = React.useState<string>("");
  const [speciesFilter, setSpeciesFilter] = React.useState<string>("");
  const [workCenters, setWorkCenters] = React.useState<ExternalWorkCenterRow[]>([]);
  const [orders, setOrders] = React.useState<SubcontractOrderRow[]>([]);
  const [wip, setWip] = React.useState<WIPBalanceRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [receivingId, setReceivingId] = React.useState<string | null>(null);
  const [dispatchingId, setDispatchingId] = React.useState<string | null>(null);
  const [sendSheetOpen, setSendSheetOpen] = React.useState(false);
  const [workCenterSheetOpen, setWorkCenterSheetOpen] = React.useState(false);
  const [savingOrder, setSavingOrder] = React.useState(false);
  const [savingWorkCenter, setSavingWorkCenter] = React.useState(false);

  // GRN-driven multi-batch state
  const [orderGrnId, setOrderGrnId] = React.useState("");
  const [orderPoId, setOrderPoId] = React.useState("");
  const [poFromGrn, setPoFromGrn] = React.useState(false);
  const [processingBatches, setProcessingBatches] = React.useState<ProcessingBatch[]>([]);
  // Manual (no-GRN) single-batch state
  const [orderWorkCenterId, setOrderWorkCenterId] = React.useState("");
  const [orderSpecies, setOrderSpecies] = React.useState<Species | "">("");
  const [orderProcessType, setOrderProcessType] = React.useState<ProcessType | "">("");
  const [orderBomId, setOrderBomId] = React.useState<string>("");
  const [orderInputKg, setOrderInputKg] = React.useState<string>("");
  const [reverseBoms, setReverseBoms] = React.useState<ReverseBom[]>([]);
  const [bomsLoading, setBomsLoading] = React.useState(false);
  const [availableGrns, setAvailableGrns] = React.useState<PurchasingDocRow[]>([]);
  const [grnsLoading, setGrnsLoading] = React.useState(false);

  const updateBatch = (idx: number, patch: Partial<ProcessingBatch>) => {
    setProcessingBatches((prev) =>
      prev.map((b, i) => {
        if (i !== idx) return b;
        const updated = { ...b, ...patch };
        // Re-derive BOM when species, processType, or productId changes
        if (patch.species !== undefined || patch.processType !== undefined || patch.productId !== undefined) {
          updated.bomId = findBom(reverseBoms, updated.species, updated.processType, updated.productId);
        }
        return updated;
      })
    );
  };

  // New work center form
  const [wcCode, setWcCode] = React.useState("");
  const [wcName, setWcName] = React.useState("");
  const [wcType, setWcType] = React.useState<ExternalWorkCenterRow["type"]>("FACTORY");
  const [wcAddress, setWcAddress] = React.useState("");

  const load = React.useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchExternalWorkCenters().then(setWorkCenters),
      fetchSubcontractOrders({
        ...(orderStatusFilter ? { status: orderStatusFilter } : {}),
        ...(workCenterFilter ? { workCenterId: workCenterFilter } : {}),
        ...(speciesFilter ? { species: speciesFilter } : {}),
      }).then(setOrders),
      fetchWIPBalances(workCenterFilter || undefined).then(setWip),
    ])
      .then(() => setLoading(false))
      .catch((e) => {
        setLoading(false);
        toast.error(e?.message ?? "Failed to load data");
      });
  }, [orderStatusFilter, workCenterFilter, speciesFilter]);

  React.useEffect(() => {
    load();
  }, [load]);

  // Load reverse BOMs and GRNs when sheet opens
  React.useEffect(() => {
    if (!sendSheetOpen) return;
    setBomsLoading(true);
    fetchReverseBoms()
      .then(setReverseBoms)
      .catch(() => setReverseBoms([]))
      .finally(() => setBomsLoading(false));
    setGrnsLoading(true);
    fetchGRNs({ availableForProcessing: true })
      .then(setAvailableGrns)
      .catch(() => setAvailableGrns([]))
      .finally(() => setGrnsLoading(false));
  }, [sendSheetOpen]);

  // Auto-select BOM for manual (no-GRN) mode
  React.useEffect(() => {
    if (orderGrnId || !orderSpecies || !orderProcessType) return;
    setOrderBomId(findBom(reverseBoms, orderSpecies, orderProcessType));
  }, [orderGrnId, orderSpecies, orderProcessType, reverseBoms]);

  // Re-derive BOM IDs for all batches when reverseBoms loads
  React.useEffect(() => {
    if (!reverseBoms.length) return;
    setProcessingBatches((prev) =>
      prev.map((b) => ({ ...b, bomId: findBom(reverseBoms, b.species, b.processType, b.productId) }))
    );
  }, [reverseBoms]);

  const selectedWorkCenter = workCenters.find((w) => w.id === orderWorkCenterId) ?? null;
  const selectedBom = reverseBoms.find((b) => b.id === orderBomId) ?? null;
  const inputKg = Number(orderInputKg) || 0;

  const previewLines = React.useMemo(
    () => buildPreviewLines(selectedBom, inputKg, selectedWorkCenter, orderProcessType, orderSpecies),
    [selectedBom, inputKg, selectedWorkCenter, orderProcessType, orderSpecies]
  );

  const totalFee = previewLines.reduce((s, l) => s + (l.amount ?? 0), 0);
  const processLossKg =
    inputKg > 0
      ? inputKg -
        previewLines.filter((l) => l.type === "OUTPUT_PRIMARY" || l.type === "OUTPUT_SECONDARY").reduce((s, l) => s + l.quantity, 0)
      : 0;

  const handleDispatch = async (order: SubcontractOrderRow) => {
    if (order.status !== "SENT") return;
    setDispatchingId(order.id);
    try {
      await dispatchSubcontractOrder(order.id);
      toast.success("Order marked as In Processing (WIP).");
      await load();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Dispatch failed");
    } finally {
      setDispatchingId(null);
    }
  };

  const handleReceive = async (order: SubcontractOrderRow) => {
    if (order.status !== "WIP") return;
    setReceivingId(order.id);
    try {
      await receiveSubcontractOrder(order.id);
      toast.success("Order marked received. Processing fee posted to GL.");
      await load();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Receive failed");
    } finally {
      setReceivingId(null);
    }
  };

  const resetOrderForm = () => {
    setOrderGrnId("");
    setOrderPoId("");
    setPoFromGrn(false);
    setProcessingBatches([]);
    setOrderWorkCenterId("");
    setOrderSpecies("");
    setOrderProcessType("");
    setOrderBomId("");
    setOrderInputKg("");
  };

  const handleCreateOrders = async () => {
    if (orderGrnId) {
      // Multi-batch GRN mode — only enabled, available, positive-weight batches
      const toCreate = processingBatches.filter(
        (b) => b.enabled && !b.alreadyProcessed && b.receivedWeightKg > 0
      );
      if (!toCreate.length) {
        toast.error("No eligible batches selected. Enable at least one line with recorded received weight.");
        return;
      }
      const missing = toCreate.find((b) => !b.workCenterId || !b.processType);
      if (missing) {
        toast.error(`Set work center and process type for: ${missing.productName}`);
        return;
      }
      setSavingOrder(true);
      let created = 0;
      const errors: string[] = [];
      for (const batch of toCreate) {
        try {
          await createSubcontractOrder({
            workCenterId: batch.workCenterId,
            bomId: batch.bomId || null,
            species: batch.species || undefined,
            processType: batch.processType || undefined,
            purchaseOrderId: orderPoId.trim() || null,
            grnId: orderGrnId,
            grnLineIndex: batch.lineIndex,
            inputWeightKg: batch.receivedWeightKg,
          });
          created++;
        } catch (e) {
          errors.push(`${batch.productName}: ${(e as Error)?.message ?? "failed"}`);
        }
      }
      setSavingOrder(false);
      if (created) toast.success(`${created} subcontract order${created > 1 ? "s" : ""} created.`);
      if (errors.length) errors.forEach((msg) => toast.error(msg));
      if (created) { setSendSheetOpen(false); resetOrderForm(); await load(); setTab("orders"); }
    } else {
      // Manual single-batch mode
      if (!orderWorkCenterId) { toast.error("Select a work center."); return; }
      if (!orderSpecies) { toast.error("Select a fish species."); return; }
      if (!orderProcessType) { toast.error("Select a process type."); return; }
      if (!inputKg || inputKg <= 0) { toast.error("Enter the input weight (kg)."); return; }
      setSavingOrder(true);
      try {
        await createSubcontractOrder({
          workCenterId: orderWorkCenterId,
          bomId: orderBomId || null,
          species: orderSpecies,
          processType: orderProcessType,
          purchaseOrderId: orderPoId.trim() || null,
          inputWeightKg: inputKg,
        });
        toast.success("Subcontract order created.");
        setSendSheetOpen(false);
        resetOrderForm();
        await load();
        setTab("orders");
      } catch (e) {
        const msg = (e as Error)?.message ?? "Create failed";
        toast.error(msg === "STUB" ? "Configure API to create subcontract orders." : msg);
      } finally {
        setSavingOrder(false);
      }
    }
  };

  const handleCreateWorkCenter = async () => {
    if (!wcCode.trim() || !wcName.trim()) { toast.error("Code and name are required."); return; }
    setSavingWorkCenter(true);
    try {
      const created = await createExternalWorkCenter({ code: wcCode.trim(), name: wcName.trim(), type: wcType, address: wcAddress.trim() || undefined, isActive: true });
      toast.success("Work center created.");
      setWcCode(""); setWcName(""); setWcAddress(""); setWcType("FACTORY");
      setWorkCenterSheetOpen(false);
      await load();
      setWorkCenterFilter(created.id);
    } catch (e) {
      toast.error((e as Error)?.message ?? "Create failed");
    } finally {
      setSavingWorkCenter(false);
    }
  };

  const lineTypeBadge = (type: string) => {
    if (type === "INPUT") return <Badge variant="outline">Input</Badge>;
    if (type === "OUTPUT_PRIMARY") return <Badge variant="default">Primary</Badge>;
    if (type === "OUTPUT_SECONDARY") return <Badge variant="secondary">Secondary</Badge>;
    return <Badge variant="destructive">Waste</Badge>;
  };

  const orderColumns = [
    {
      id: "number", header: "Order",
      accessor: (r: SubcontractOrderRow) => (
        <Link href={`/manufacturing/subcontracting/orders/${r.id}`} className="font-medium hover:underline">{r.number}</Link>
      ),
      sticky: true,
    },
    { id: "workCenter", header: "Work center", accessor: (r: SubcontractOrderRow) => r.workCenterName },
    {
      id: "species", header: "Species / Process",
      accessor: (r: SubcontractOrderRow) =>
        r.species ? `${r.species === "TILAPIA" ? "Tilapia" : "Nile Perch"} · ${r.processType ?? "—"}` : "—",
    },
    { id: "bom", header: "BOM", accessor: (r: SubcontractOrderRow) => r.bomName ?? "—" },
    {
      id: "poGrn", header: "PO / GRN",
      accessor: (r: SubcontractOrderRow) => {
        if (!r.purchaseOrderId && !r.grnId) return "—";
        return (
          <div className="text-xs space-y-0.5">
            {r.purchaseOrderId && <div className="text-muted-foreground">PO: <span className="font-medium">{r.purchaseOrderId.slice(-8)}</span></div>}
            {r.grnId && <div className="text-muted-foreground">GRN: <span className="font-medium">{r.grnId.slice(-8)}</span></div>}
          </div>
        );
      },
    },
    {
      id: "status", header: "Status",
      accessor: (r: SubcontractOrderRow) => (
        <Badge variant={r.status === "RECEIVED" ? "default" : r.status === "WIP" ? "secondary" : "outline"}>{r.status}</Badge>
      ),
    },
    { id: "sentAt", header: "Sent", accessor: (r: SubcontractOrderRow) => r.sentAt ?? "—" },
    { id: "receivedAt", header: "Received", accessor: (r: SubcontractOrderRow) => r.receivedAt ?? "—" },
    {
      id: "actions", header: "",
      accessor: (r: SubcontractOrderRow) => (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" asChild>
            <Link href={`/manufacturing/subcontracting/orders/${r.id}`}>View</Link>
          </Button>
          {r.status === "SENT" && (
            <Button size="sm" variant="secondary" disabled={dispatchingId === r.id} onClick={() => handleDispatch(r)}>
              {dispatchingId === r.id ? "Dispatching…" : "Mark WIP"}
            </Button>
          )}
          {r.status === "WIP" && (
            <Button size="sm" variant="outline" disabled={receivingId === r.id} onClick={() => handleReceive(r)}>
              {receivingId === r.id ? "Receiving…" : "Receive"}
            </Button>
          )}
        </div>
      ),
    },
  ];

  const wipColumns = [
    { id: "workCenter", header: "Work center", accessor: (r: WIPBalanceRow) => <span className="font-medium">{r.workCenterName}</span>, sticky: true },
    { id: "sku", header: "SKU", accessor: (r: WIPBalanceRow) => r.sku },
    { id: "product", header: "Product", accessor: (r: WIPBalanceRow) => r.productName },
    { id: "quantity", header: "Quantity (kg)", accessor: (r: WIPBalanceRow) => `${r.quantity} ${r.uom}` },
    { id: "updated", header: "Last movement", accessor: (r: WIPBalanceRow) => new Date(r.lastMovementAt).toLocaleString() },
  ];

  const workCenterColumns = [
    { id: "code", header: "Code", accessor: (r: ExternalWorkCenterRow) => <span className="font-medium">{r.code}</span>, sticky: true },
    { id: "name", header: "Name", accessor: (r: ExternalWorkCenterRow) => r.name },
    { id: "type", header: "Type", accessor: (r: ExternalWorkCenterRow) => r.type },
    {
      id: "feeRates", header: "Fee rates",
      accessor: (r: ExternalWorkCenterRow) => {
        if (!r.feeRates?.length) return "—";
        return (
          <div className="text-xs space-y-0.5">
            {r.feeRates.map((fr, i) => (
              <div key={i}>{fr.species ? `${fr.species} ` : ""}{fr.serviceType}: {formatMoney(fr.ratePerKg, fr.currency)}/kg</div>
            ))}
          </div>
        );
      },
    },
    { id: "address", header: "Address", accessor: (r: ExternalWorkCenterRow) => r.address ?? "—" },
    { id: "active", header: "Active", accessor: (r: ExternalWorkCenterRow) => r.isActive ? "Yes" : "No" },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Subcontracting / Job Work"
        description="WIP at external work centers — factories and women's groups. Processing fees auto-post to GL on receive."
        breadcrumbs={[
          { label: "Manufacturing", href: "/manufacturing/boms" },
          { label: "Subcontracting" },
        ]}
        sticky
        showCommandHint
        actions={
          <Sheet open={sendSheetOpen} onOpenChange={(o) => { setSendSheetOpen(o); if (!o) resetOrderForm(); }}>
            <SheetTrigger asChild>
              <Button>
                <Icons.Plus className="mr-2 h-4 w-4" />
                Send to processor
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Send to processor</SheetTitle>
                <SheetDescription>
                  Select a GRN — each product line becomes its own processing batch with its own work center, process type, and BOM.
                  Or skip the GRN to enter manually.
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-5 py-6">

                {/* ── GRN selection ── */}
                <div className="space-y-2">
                  <Label>GRN</Label>
                  <Select
                    value={orderGrnId || "__none__"}
                    onValueChange={(val) => {
                      const resolved = val === "__none__" ? "" : val;
                      setOrderGrnId(resolved);
                      if (!resolved) {
                        setProcessingBatches([]);
                        setOrderPoId("");
                        setPoFromGrn(false);
                        return;
                      }
                      const grn = availableGrns.find((g) => g.id === resolved);
                      if (grn?.poRef) { setOrderPoId(grn.poRef); setPoFromGrn(true); }
                      // Build one batch per GRN line (all lines, not just available ones)
                      const lines = grn?.lineAvailability ?? [];
                      const batches: ProcessingBatch[] = lines.map((l) => {
                        const sp = detectSpecies(l.productName, l.sku);
                        return {
                          lineIndex: l.lineIndex,
                          productId: l.productId,
                          productName: l.productName,
                          sku: l.sku,
                          receivedWeightKg: l.receivedWeightKg,
                          species: sp,
                          processType: "",
                          workCenterId: "",
                          bomId: findBom(reverseBoms, sp, "", l.productId),
                          enabled: l.available,
                          alreadyProcessed: !l.available,
                          unavailableReason: l.unavailableReason,
                          previewExpanded: false,
                        };
                      });
                      setProcessingBatches(batches);
                    }}
                    disabled={grnsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={grnsLoading ? "Loading GRNs…" : "Select a GRN (optional)"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None (manual entry) —</SelectItem>
                      {availableGrns.map((grn) => {
                        const eligible = grn.eligibleLineCount ?? grn.lineAvailability?.filter((l) => l.available).length ?? 0;
                        const total = grn.lineAvailability?.length ?? 0;
                        return (
                          <SelectItem key={grn.id} value={grn.id}>
                            {grn.number}
                            {grn.poRef ? ` · PO: ${grn.poRef}` : ""}
                            {` · ${grn.status}`}
                            {total > 0 ? ` · ${eligible}/${total} lines` : ""}
                            {grn.receivedWeightKg ? ` · ${grn.receivedWeightKg.toLocaleString()} kg` : ""}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* ── PO reference (shared) ── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Purchase Order (optional)</Label>
                    {poFromGrn && <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">from GRN</span>}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. PO-001"
                      value={orderPoId}
                      onChange={(e) => { setOrderPoId(e.target.value); setPoFromGrn(false); }}
                      className="flex-1"
                    />
                    {poFromGrn && orderPoId && (
                      <Button type="button" variant="ghost" size="icon" className="shrink-0"
                        onClick={() => { setOrderPoId(""); setPoFromGrn(false); }}>
                        <Icons.X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <Separator />

                {/* ── GRN mode: per-batch cards ── */}
                {orderGrnId && processingBatches.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">
                      Processing batches
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        ({processingBatches.filter((b) => b.enabled && !b.alreadyProcessed).length} of {processingBatches.length} selected)
                      </span>
                    </p>
                    {processingBatches.map((batch, idx) => {
                      const batchWc = workCenters.find((w) => w.id === batch.workCenterId) ?? null;
                      const batchBom = reverseBoms.find((b) => b.id === batch.bomId) ?? null;
                      const batchPreview = buildPreviewLines(batchBom, batch.receivedWeightKg, batchWc, batch.processType, batch.species);
                      const batchFee = batchPreview.reduce((s, l) => s + (l.amount ?? 0), 0);
                      return (
                        <div
                          key={batch.lineIndex}
                          className={`border rounded-lg p-4 space-y-3 transition-opacity ${batch.alreadyProcessed ? "opacity-50" : !batch.enabled ? "opacity-60" : ""}`}
                        >
                          {/* Card header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <input
                                type="checkbox"
                                checked={batch.enabled && !batch.alreadyProcessed}
                                disabled={batch.alreadyProcessed}
                                onChange={(e) => updateBatch(idx, { enabled: e.target.checked })}
                                className="h-4 w-4 shrink-0 accent-primary"
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{batch.productName}</p>
                                <p className="text-xs text-muted-foreground">{batch.sku}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {batch.alreadyProcessed ? (
                                <Badge variant="secondary" className="text-xs">
                                  {batch.unavailableReason === "no_weight" ? "No weight recorded" : "Already processed"}
                                </Badge>
                              ) : (
                                <div className="flex items-center gap-1 text-sm font-semibold">
                                  <Icons.Weight className="h-3.5 w-3.5 text-muted-foreground" />
                                  {batch.receivedWeightKg.toLocaleString()} kg
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Config fields (only when enabled + not already processed) */}
                          {!batch.alreadyProcessed && batch.enabled && (
                            <div className="space-y-3 pt-1">
                              {/* Work center */}
                              <div className="space-y-1">
                                <Label className="text-xs">Work center *</Label>
                                <Select value={batch.workCenterId || ""} onValueChange={(v) => updateBatch(idx, { workCenterId: v })}>
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Select work center" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {workCenters.map((w) => (
                                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {batchWc?.feeRates?.length ? (
                                  <p className="text-xs text-muted-foreground">
                                    {batchWc.feeRates.map((fr) =>
                                      `${fr.species ? fr.species + " · " : ""}${fr.serviceType}: ${formatMoney(fr.ratePerKg, fr.currency)}/kg`
                                    ).join(" · ")}
                                  </p>
                                ) : null}
                              </div>

                              {/* Species + Process */}
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs">Species</Label>
                                  <Select value={batch.species || ""} onValueChange={(v) => updateBatch(idx, { species: v as Species })}>
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue placeholder="Species" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {SPECIES_OPTIONS.map((s) => (
                                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Process type *</Label>
                                  <Select value={batch.processType || ""} onValueChange={(v) => updateBatch(idx, { processType: v as ProcessType })}>
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue placeholder="Process" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {PROCESS_OPTIONS.map((p) => (
                                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              {/* BOM (auto-selected, show name) */}
                              {batchBom && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Icons.FileText className="h-3 w-3" />
                                  BOM: <span className="font-medium">{batchBom.name}</span>
                                </p>
                              )}

                              {/* Output preview toggle */}
                              {batchPreview.length > 0 && (
                                <div className="space-y-2">
                                  <button
                                    type="button"
                                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                    onClick={() => updateBatch(idx, { previewExpanded: !batch.previewExpanded })}
                                  >
                                    {batch.previewExpanded ? <Icons.ChevronDown className="h-3 w-3" /> : <Icons.ChevronRight className="h-3 w-3" />}
                                    Output preview
                                    {batchFee > 0 && <span className="ml-1 font-medium text-primary">· {formatMoney(batchFee, "KES")} fee</span>}
                                  </button>
                                  {batch.previewExpanded && (
                                    <div className="border rounded-md divide-y text-xs">
                                      {batchPreview.map((line, li) => (
                                        <div key={li} className="flex items-center justify-between px-3 py-1.5 gap-2">
                                          <div className="flex items-center gap-2 min-w-0">
                                            {lineTypeBadge(line.type)}
                                            <span className="truncate">{line.productName}</span>
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0 text-muted-foreground">
                                            <span className="font-medium text-foreground">{line.quantity.toFixed(2)} kg</span>
                                            {line.amount != null && line.amount > 0 && (
                                              <span className="text-primary font-medium">{formatMoney(line.amount, "KES")}</span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── Manual (no GRN) single-batch form ── */}
                {!orderGrnId && (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">No GRN selected — enter processing details manually.</p>

                    <div className="space-y-2">
                      <Label>Work center *</Label>
                      <Select value={orderWorkCenterId || ""} onValueChange={setOrderWorkCenterId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select work center" />
                        </SelectTrigger>
                        <SelectContent>
                          {workCenters.map((w) => (
                            <SelectItem key={w.id} value={w.id}>
                              {w.name} <span className="text-muted-foreground ml-1 text-xs">({w.type})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedWorkCenter?.feeRates?.length ? (
                        <div className="text-xs text-muted-foreground bg-muted rounded p-2 space-y-0.5">
                          {selectedWorkCenter.feeRates.map((fr, i) => (
                            <div key={i}>{fr.species ? `${fr.species} · ` : ""}{fr.serviceType}: <span className="font-medium">{formatMoney(fr.ratePerKg, fr.currency)}/kg</span></div>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Species *</Label>
                        <Select value={orderSpecies || ""} onValueChange={(v) => setOrderSpecies(v as Species)}>
                          <SelectTrigger><SelectValue placeholder="Species" /></SelectTrigger>
                          <SelectContent>
                            {SPECIES_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Process type *</Label>
                        <Select value={orderProcessType || ""} onValueChange={(v) => setOrderProcessType(v as ProcessType)}>
                          <SelectTrigger><SelectValue placeholder="Process" /></SelectTrigger>
                          <SelectContent>
                            {PROCESS_OPTIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Reverse BOM {bomsLoading ? "(loading…)" : ""}</Label>
                      <Select value={orderBomId || ""} onValueChange={setOrderBomId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select BOM (auto-selected by species + process)" />
                        </SelectTrigger>
                        <SelectContent>
                          {reverseBoms.map((b) => (
                            <SelectItem key={b.id} value={b.id}>{b.name} ({b.code})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Input weight (kg) *</Label>
                      <Input
                        type="number" min={0} step="0.01"
                        placeholder="Enter kg received at processing facility"
                        value={orderInputKg}
                        onChange={(e) => setOrderInputKg(e.target.value)}
                      />
                    </div>

                    {previewLines.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">Output preview (from BOM)</p>
                            {processLossKg > 0 && (
                              <span className="text-xs text-muted-foreground">
                                Process loss: <span className="font-medium text-destructive">{processLossKg.toFixed(2)} kg</span>
                              </span>
                            )}
                          </div>
                          <div className="border rounded-md divide-y text-sm">
                            {previewLines.map((line, i) => (
                              <div key={i} className="flex items-center justify-between px-3 py-2 gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  {lineTypeBadge(line.type)}
                                  <span className="truncate text-xs">{line.productName}</span>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 text-xs">
                                  <span className="font-medium">{line.quantity.toFixed(2)} kg</span>
                                  {line.processingFeePerUnit != null && (
                                    <span className="text-muted-foreground">{formatMoney(line.processingFeePerUnit, "KES")}/kg</span>
                                  )}
                                  {line.amount != null && line.amount > 0 && (
                                    <span className="text-primary font-medium">{formatMoney(line.amount, "KES")}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          {totalFee > 0 && (
                            <div className="flex justify-between text-sm font-medium px-1">
                              <span>Total processing fee</span>
                              <span>{formatMoney(totalFee, "KES")}</span>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Fee will auto-post to GL (Dr Inventory, Cr AP Processor) on receive.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <SheetFooter>
                <Button variant="outline" onClick={() => { setSendSheetOpen(false); resetOrderForm(); }} disabled={savingOrder}>
                  Cancel
                </Button>
                {(() => {
                  const eligibleCount = processingBatches.filter(
                    (b) => b.enabled && !b.alreadyProcessed && b.receivedWeightKg > 0
                  ).length;
                  return (
                    <Button
                      onClick={handleCreateOrders}
                      disabled={
                        savingOrder ||
                        (orderGrnId
                          ? eligibleCount === 0
                          : !orderWorkCenterId || !orderSpecies || !orderProcessType || !inputKg)
                      }
                    >
                      {savingOrder
                        ? "Creating…"
                        : orderGrnId
                          ? `Create ${eligibleCount} order${eligibleCount !== 1 ? "s" : ""}`
                          : "Create order"}
                    </Button>
                  );
                })()}
              </SheetFooter>
            </SheetContent>
          </Sheet>
        }
      />

      <div className="p-6 space-y-6">
        <div className="flex gap-2 border-b">
          {(["orders", "wip", "workcenters"] as const).map((t) => (
            <Button key={t} variant={tab === t ? "secondary" : "ghost"} size="sm" onClick={() => setTab(t)}>
              {t === "orders" ? "Subcontract orders" : t === "wip" ? "WIP at processors" : "External work centers"}
            </Button>
          ))}
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : (
          <>
            {tab === "orders" && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle>Subcontract orders</CardTitle>
                    <CardDescription>Send material to processor; receive finished goods with processing fee and yield.</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Select value={speciesFilter || "ALL"} onValueChange={(v) => setSpeciesFilter(v === "ALL" ? "" : v)}>
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder="Species" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All species</SelectItem>
                        <SelectItem value="TILAPIA">Tilapia</SelectItem>
                        <SelectItem value="NILE_PERCH">Nile Perch</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={workCenterFilter || "ALL"} onValueChange={(v) => setWorkCenterFilter(v === "ALL" ? "" : v)}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Work center" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All work centers</SelectItem>
                        {workCenters.map((w) => (
                          <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={orderStatusFilter || "ALL"} onValueChange={(v) => setOrderStatusFilter(v === "ALL" ? "" : v)}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All</SelectItem>
                        <SelectItem value="SENT">Sent</SelectItem>
                        <SelectItem value="WIP">WIP</SelectItem>
                        <SelectItem value="RECEIVED">Received</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={load} title="Refresh">
                      <Icons.RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <DataTable<SubcontractOrderRow>
                    data={orders}
                    columns={orderColumns}
                    onRowClick={(r) => window.location.assign(`/manufacturing/subcontracting/orders/${r.id}`)}
                    emptyMessage="No subcontract orders. Use 'Send to processor' to create one."
                  />
                </CardContent>
              </Card>
            )}

            {tab === "wip" && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>WIP at processors</CardTitle>
                    <CardDescription>Inventory on CoolCatch&apos;s books but physically at external work center.</CardDescription>
                  </div>
                  <Select value={workCenterFilter || "ALL"} onValueChange={(v) => setWorkCenterFilter(v === "ALL" ? "" : v)}>
                    <SelectTrigger className="w-52">
                      <SelectValue placeholder="Work center" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All work centers</SelectItem>
                      {workCenters.map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent className="p-0">
                  <DataTable<WIPBalanceRow & { id?: string }>
                    data={wip as (WIPBalanceRow & { id?: string })[]}
                    columns={wipColumns}
                    emptyMessage="No WIP balances."
                  />
                </CardContent>
              </Card>
            )}

            {tab === "workcenters" && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>External work centers</CardTitle>
                    <CardDescription>Factories and women&apos;s groups — fee rates are auto-applied when creating orders.</CardDescription>
                  </div>
                  <Sheet open={workCenterSheetOpen} onOpenChange={setWorkCenterSheetOpen}>
                    <SheetTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Icons.Plus className="mr-2 h-4 w-4" />
                        New work center
                      </Button>
                    </SheetTrigger>
                    <SheetContent>
                      <SheetHeader>
                        <SheetTitle>New external work center</SheetTitle>
                        <SheetDescription>Register a factory or women&apos;s group that receives stock for processing.</SheetDescription>
                      </SheetHeader>
                      <div className="grid gap-4 py-6">
                        <div className="grid gap-2">
                          <Label>Code</Label>
                          <Input value={wcCode} onChange={(e) => setWcCode(e.target.value)} placeholder="e.g. FACT-NAI" />
                        </div>
                        <div className="grid gap-2">
                          <Label>Name</Label>
                          <Input value={wcName} onChange={(e) => setWcName(e.target.value)} placeholder="e.g. Nairobi Industrial Factory" />
                        </div>
                        <div className="grid gap-2">
                          <Label>Type</Label>
                          <Select value={wcType} onValueChange={(v) => setWcType(v as ExternalWorkCenterRow["type"])}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FACTORY">Factory</SelectItem>
                              <SelectItem value="GROUP">Women&apos;s group</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label>Address (optional)</Label>
                          <Input value={wcAddress} onChange={(e) => setWcAddress(e.target.value)} placeholder="Address" />
                        </div>
                        <Button onClick={handleCreateWorkCenter} disabled={savingWorkCenter}>
                          {savingWorkCenter ? "Saving…" : "Create work center"}
                        </Button>
                      </div>
                    </SheetContent>
                  </Sheet>
                </CardHeader>
                <CardContent className="p-0">
                  <DataTable<ExternalWorkCenterRow>
                    data={workCenters}
                    columns={workCenterColumns}
                    emptyMessage="No work centers."
                    onRowClick={(row) => { setWorkCenterFilter(row.id); setTab("wip"); }}
                  />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
