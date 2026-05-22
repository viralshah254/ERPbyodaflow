"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { SkeletonDataTable } from "@/components/ui/skeleton";
import { TableLinearProgress } from "@/components/ui/table-linear-progress";
import { TablePagination } from "@/components/ui/table-pagination";
import { DocumentNumber } from "@/components/docs/document-number";
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
import type { FilterChip } from "@/components/ui/filter-chips";
import { cn } from "@/lib/utils";
import {
  fetchExternalWorkCenters,
  fetchExternalWorkCentersPage,
  fetchSubcontractOrdersPage,
  fetchWIPBalancesPage,
  fetchWorkCenterFilterOptions,
  type WorkCenterFilterOption,
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
import { manufacturingAreaLabel } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";

const SPECIES_OPTIONS = [
  { value: "TILAPIA", label: "Tilapia" },
  { value: "NILE_PERCH", label: "Nile Perch" },
] as const;

const PROCESS_OPTIONS = [
  { value: "FILLETING", label: "Filleting" },
  { value: "GUTTING", label: "Gutting" },
] as const;

const SEARCH_DEBOUNCE_MS = 400;
const ORDERS_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const DEFAULT_ORDERS_PAGE_SIZE = 25;
const LIST_PAGE_SIZE = 25;

const WC_TYPE_OPTIONS = [
  { label: "All types", value: "" },
  { label: "Factory", value: "FACTORY" },
  { label: "Women's group", value: "GROUP" },
];

const ORDER_STATUS_OPTIONS = [
  { label: "All statuses", value: "" },
  { label: "Sent", value: "SENT" },
  { label: "WIP", value: "WIP" },
  { label: "Received", value: "RECEIVED" },
];

const SPECIES_FILTER_OPTIONS = [
  { label: "All species", value: "" },
  { label: "Tilapia", value: "TILAPIA" },
  { label: "Nile Perch", value: "NILE_PERCH" },
];

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
  isActive: boolean;
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
  batchUid: string;
  lineIndex: number;
  productId?: string;
  productName: string;
  sku: string;
  /** Physical weight recorded on GRN receipt line */
  lineTotalWeightKg: number;
  /** Unallocated subcontract weight on server (opening this dialog) — shared by duplicate rows split from same line */
  remainingWeightKg: number;
  /** Weight to send with this subcontract order — same session splits share one line's remainder */
  inputWeightKg: number;
  species: Species | "";
  processType: ProcessType | "";
  workCenterId: string;
  bomId: string;
  /** Receipt line still eligible for a new subcontract order (from GRN API) */
  available: boolean;
  enabled: boolean;
  alreadyProcessed: boolean;
  unavailableReason?: string;
  previewExpanded: boolean;
}

function maxInputKgForBatch(batches: ProcessingBatch[], batchIdx: number): number {
  const b = batches[batchIdx];
  if (!b || b.alreadyProcessed) return 0;
  const others = batches
    .filter(
      (x, i) => i !== batchIdx && x.lineIndex === b.lineIndex && x.enabled && !x.alreadyProcessed
    )
    .reduce((s, x) => s + x.inputWeightKg, 0);
  return Math.max(0, Math.round((b.remainingWeightKg - others) * 1000) / 1000);
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
 *
 * Tie-break rule: when multiple BOMs satisfy the same tier, prefer workbook-backed reverse
 * BOMs — those whose code starts with "RBOM-" (case-insensitive) or whose name contains
 * "(Reverse BOM)". This ensures the full-output disassembly BOM wins over legacy short BOMs.
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

  /** Among a set of candidates, prefer RBOM-* codes then "(Reverse BOM)" names. */
  function preferRbom(candidates: ReverseBom[]): ReverseBom | undefined {
    if (candidates.length === 0) return undefined;
    if (candidates.length === 1) return candidates[0];
    const rbom = candidates.find((b) => /^rbom-/i.test(b.code));
    if (rbom) return rbom;
    const byName = candidates.find((b) => b.name.toLowerCase().includes("(reverse bom)"));
    return byName ?? candidates[0];
  }

  // Priority 1: product ID match + species + process name match
  if (inputProductId && processType) {
    const p1 = preferRbom(
      reverseBoms.filter(
        (b) =>
          b.productId === inputProductId &&
          (!species || nameMatchesSpecies(b.name, species)) &&
          nameMatchesProcess(b.name, processType)
      )
    );
    if (p1) return p1.id;

    // Priority 1b: product ID + process keyword only (no species filter)
    const p1b = preferRbom(
      reverseBoms.filter((b) => b.productId === inputProductId && nameMatchesProcess(b.name, processType))
    );
    if (p1b) return p1b.id;

    // Priority 1c: product ID match only
    const p1c = preferRbom(reverseBoms.filter((b) => b.productId === inputProductId));
    if (p1c) return p1c.id;
  }

  // Priority 2: species + process by name keywords
  if (species && processType) {
    const p2 = preferRbom(
      reverseBoms.filter((b) => nameMatchesSpecies(b.name, species) && nameMatchesProcess(b.name, processType))
    );
    if (p2) return p2.id;
  }

  // Priority 3: process only
  if (processType) {
    const p3 = preferRbom(reverseBoms.filter((b) => nameMatchesProcess(b.name, processType)));
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
  const terminology = useTerminology();
  const areaLabel = manufacturingAreaLabel(terminology);
  const [tab, setTab] = React.useState<"orders" | "wip" | "workcenters">("orders");
  const [orderSearch, setOrderSearch] = React.useState("");
  const [debouncedOrderSearch, setDebouncedOrderSearch] = React.useState("");
  const [orderStatusFilter, setOrderStatusFilter] = React.useState<string>("");
  const [workCenterFilter, setWorkCenterFilter] = React.useState<string>("");
  const [speciesFilter, setSpeciesFilter] = React.useState<string>("");
  const [workCenterOptions, setWorkCenterOptions] = React.useState<WorkCenterFilterOption[]>([]);
  const [workCenterRows, setWorkCenterRows] = React.useState<ExternalWorkCenterRow[]>([]);
  const [wcSearch, setWcSearch] = React.useState("");
  const [debouncedWcSearch, setDebouncedWcSearch] = React.useState("");
  const [wcTypeFilter, setWcTypeFilter] = React.useState("");
  const [wcInitialLoading, setWcInitialLoading] = React.useState(false);
  const [wcFetching, setWcFetching] = React.useState(false);
  const [wcPageOffset, setWcPageOffset] = React.useState(0);
  const [wcHasMore, setWcHasMore] = React.useState(false);
  const wcLoadedOnce = React.useRef(false);
  const [sendSheetWorkCenters, setSendSheetWorkCenters] = React.useState<ExternalWorkCenterRow[]>([]);
  const [orders, setOrders] = React.useState<SubcontractOrderRow[]>([]);
  const [ordersInitialLoading, setOrdersInitialLoading] = React.useState(true);
  const [ordersFetching, setOrdersFetching] = React.useState(false);
  const [ordersPageSize, setOrdersPageSize] = React.useState(DEFAULT_ORDERS_PAGE_SIZE);
  const [ordersPageOffset, setOrdersPageOffset] = React.useState(0);
  const [ordersHasMore, setOrdersHasMore] = React.useState(false);
  const ordersLoadedOnce = React.useRef(false);
  const [wip, setWip] = React.useState<WIPBalanceRow[]>([]);
  const [wipSearch, setWipSearch] = React.useState("");
  const [debouncedWipSearch, setDebouncedWipSearch] = React.useState("");
  const [wipInitialLoading, setWipInitialLoading] = React.useState(false);
  const [wipFetching, setWipFetching] = React.useState(false);
  const [wipPageOffset, setWipPageOffset] = React.useState(0);
  const [wipHasMore, setWipHasMore] = React.useState(false);
  const wipLoadedOnce = React.useRef(false);
  const [receivingId, setReceivingId] = React.useState<string | null>(null);
  const [dispatchingId, setDispatchingId] = React.useState<string | null>(null);
  const [sendSheetOpen, setSendSheetOpen] = React.useState(false);
  const [workCenterSheetOpen, setWorkCenterSheetOpen] = React.useState(false);
  const [savingOrder, setSavingOrder] = React.useState(false);
  const [savingWorkCenter, setSavingWorkCenter] = React.useState(false);

  // GRN-driven multi-batch state
  const [orderGrnId, setOrderGrnId] = React.useState("");
  const [processingBatches, setProcessingBatches] = React.useState<ProcessingBatch[]>([]);
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

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedOrderSearch(orderSearch), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [orderSearch]);

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedWipSearch(wipSearch), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [wipSearch]);

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedWcSearch(wcSearch), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [wcSearch]);

  const loadWorkCenterOptions = React.useCallback(async () => {
    try {
      setWorkCenterOptions(await fetchWorkCenterFilterOptions({ activeOnly: true }));
    } catch (e) {
      toast.error((e as Error)?.message ?? "Failed to load work center filters.");
    }
  }, []);

  React.useEffect(() => {
    void loadWorkCenterOptions();
  }, [loadWorkCenterOptions]);

  const loadWorkCentersPage = React.useCallback(
    async (offset: number) => {
      const isFirstLoad = !wcLoadedOnce.current;
      if (isFirstLoad) setWcInitialLoading(true);
      else setWcFetching(true);
      try {
        const page = await fetchExternalWorkCentersPage({
          limit: LIST_PAGE_SIZE,
          cursor: String(offset),
          search: debouncedWcSearch.trim() || undefined,
          type: (wcTypeFilter as "" | "FACTORY" | "GROUP") || undefined,
          activeOnly: true,
        });
        setWorkCenterRows(page.items);
        setWcPageOffset(page.offset);
        setWcHasMore(page.hasMore);
        wcLoadedOnce.current = true;
      } catch (e) {
        toast.error((e as Error)?.message ?? "Failed to load work centers.");
      } finally {
        setWcInitialLoading(false);
        setWcFetching(false);
      }
    },
    [debouncedWcSearch, wcTypeFilter]
  );

  React.useEffect(() => {
    if (tab !== "workcenters") return;
    setWcPageOffset(0);
    void loadWorkCentersPage(0);
  }, [tab, loadWorkCentersPage]);

  const loadOrdersPage = React.useCallback(
    async (offset: number) => {
      const isFirstLoad = !ordersLoadedOnce.current;
      if (isFirstLoad) setOrdersInitialLoading(true);
      else setOrdersFetching(true);
      try {
        const page = await fetchSubcontractOrdersPage({
          limit: ordersPageSize,
          cursor: String(offset),
          search: debouncedOrderSearch.trim() || undefined,
          ...(orderStatusFilter ? { status: orderStatusFilter } : {}),
          ...(workCenterFilter ? { workCenterId: workCenterFilter } : {}),
          ...(speciesFilter ? { species: speciesFilter } : {}),
        });
        setOrders(page.items);
        setOrdersPageOffset(page.offset);
        setOrdersHasMore(page.hasMore);
        ordersLoadedOnce.current = true;
      } catch (e) {
        toast.error((e as Error)?.message ?? "Failed to load subcontract orders.");
      } finally {
        setOrdersInitialLoading(false);
        setOrdersFetching(false);
      }
    },
    [debouncedOrderSearch, orderStatusFilter, workCenterFilter, speciesFilter, ordersPageSize]
  );

  const handleOrdersPageSizeChange = React.useCallback((size: number) => {
    setOrdersPageSize(size);
    setOrdersPageOffset(0);
  }, []);

  React.useEffect(() => {
    if (tab !== "orders") return;
    setOrdersPageOffset(0);
    void loadOrdersPage(0);
  }, [tab, loadOrdersPage]);

  const loadWipPage = React.useCallback(
    async (offset: number) => {
      const isFirstLoad = !wipLoadedOnce.current;
      if (isFirstLoad) setWipInitialLoading(true);
      else setWipFetching(true);
      try {
        const page = await fetchWIPBalancesPage({
          limit: LIST_PAGE_SIZE,
          cursor: String(offset),
          search: debouncedWipSearch.trim() || undefined,
          workCenterId: workCenterFilter || undefined,
          hideZero: true,
        });
        setWip(page.items);
        setWipPageOffset(page.offset);
        setWipHasMore(page.hasMore);
        wipLoadedOnce.current = true;
      } catch (e) {
        toast.error((e as Error)?.message ?? "Failed to load WIP balances.");
      } finally {
        setWipInitialLoading(false);
        setWipFetching(false);
      }
    },
    [debouncedWipSearch, workCenterFilter]
  );

  React.useEffect(() => {
    if (tab !== "wip") return;
    setWipPageOffset(0);
    void loadWipPage(0);
  }, [tab, loadWipPage]);

  const orderSearchPending = orderSearch.trim() !== debouncedOrderSearch.trim();
  const ordersTableBusy = ordersFetching || orderSearchPending;
  const wipSearchPending = wipSearch.trim() !== debouncedWipSearch.trim();
  const wipTableBusy = wipFetching || wipSearchPending;
  const wcSearchPending = wcSearch.trim() !== debouncedWcSearch.trim();
  const wcTableBusy = wcFetching || wcSearchPending;

  const orderFilterChips: FilterChip[] = React.useMemo(() => {
    const chips: FilterChip[] = [];
    if (speciesFilter) {
      const opt = SPECIES_FILTER_OPTIONS.find((o) => o.value === speciesFilter);
      chips.push({ id: "species", label: "Species", value: opt?.label ?? speciesFilter });
    }
    if (workCenterFilter) {
      const wc = workCenterOptions.find((w) => w.id === workCenterFilter);
      chips.push({ id: "wc", label: "Work center", value: wc?.name ?? workCenterFilter });
    }
    if (orderStatusFilter) {
      const opt = ORDER_STATUS_OPTIONS.find((o) => o.value === orderStatusFilter);
      chips.push({ id: "status", label: "Status", value: opt?.label ?? orderStatusFilter });
    }
    if (orderSearch.trim()) chips.push({ id: "q", label: "Search", value: orderSearch.trim() });
    return chips;
  }, [speciesFilter, workCenterFilter, orderStatusFilter, orderSearch, workCenterOptions]);

  const handleClearOrderFilters = () => {
    setOrderSearch("");
    setSpeciesFilter("");
    setWorkCenterFilter("");
    setOrderStatusFilter("");
  };

  const handleRemoveOrderFilterChip = (id: string) => {
    if (id === "species") setSpeciesFilter("");
    if (id === "wc") setWorkCenterFilter("");
    if (id === "status") setOrderStatusFilter("");
    if (id === "q") setOrderSearch("");
  };

  const refreshOrders = React.useCallback(() => {
    void loadOrdersPage(ordersPageOffset);
  }, [loadOrdersPage, ordersPageOffset]);

  React.useEffect(() => {
    if (!sendSheetOpen) return;
    fetchExternalWorkCenters({ activeOnly: true })
      .then(setSendSheetWorkCenters)
      .catch(() => {
        setSendSheetWorkCenters([]);
        toast.error("Failed to load work centers for send sheet.");
      });
  }, [sendSheetOpen]);

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

  // Re-derive BOM IDs for all batches when reverseBoms loads
  React.useEffect(() => {
    if (!reverseBoms.length) return;
    setProcessingBatches((prev) =>
      prev.map((b) => ({ ...b, bomId: findBom(reverseBoms, b.species, b.processType, b.productId) }))
    );
  }, [reverseBoms]);

  const selectedGrn = React.useMemo(
    () => availableGrns.find((g) => g.id === orderGrnId) ?? null,
    [availableGrns, orderGrnId]
  );

  const alreadyProcessedLineCount = React.useMemo(() => {
    return processingBatches.filter((b) => b.unavailableReason === "already_processed").length;
  }, [processingBatches]);

  const linkedPoSummary = React.useMemo(() => {
    if (!selectedGrn) return null;
    const id = selectedGrn.sourceDocumentId;
    const isPo = selectedGrn.sourceDocumentType === "purchase-order";
    const ref = selectedGrn.poRef?.trim();
    if (isPo && id) {
      const short = id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-6)}` : id;
      return ref ? `${ref} (${short})` : short;
    }
    if (ref) return ref;
    return null;
  }, [selectedGrn]);

  const handleDispatch = async (order: SubcontractOrderRow) => {
    if (order.status !== "SENT") return;
    setDispatchingId(order.id);
    try {
      await dispatchSubcontractOrder(order.id);
      toast.success("Order marked as In Processing (WIP).");
      await loadOrdersPage(ordersPageOffset);
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
      await loadOrdersPage(ordersPageOffset);
    } catch (e) {
      toast.error((e as Error)?.message ?? "Receive failed");
    } finally {
      setReceivingId(null);
    }
  };

  const splitProcessingBatch = (idx: number) => {
    setProcessingBatches((prev) => {
      const cur = prev[idx];
      if (!cur || cur.alreadyProcessed || !cur.available) return prev;
      const cap = maxInputKgForBatch(prev, idx);
      if (cap <= 1e-6) return prev;
      const half = Math.round((cur.inputWeightKg / 2) * 1000) / 1000;
      const first = Math.min(Math.max(half, 1e-6), cap);
      const second = Math.round((cur.inputWeightKg - first) * 1000) / 1000;
      if (second <= 1e-6) return prev;
      const dup: ProcessingBatch = {
        ...cur,
        batchUid: globalThis.crypto.randomUUID(),
        inputWeightKg: second,
        enabled: true,
        previewExpanded: false,
      };
      const next = prev.map((b, i) => (i === idx ? { ...b, inputWeightKg: first, previewExpanded: false } : b));
      return [...next.slice(0, idx + 1), dup, ...next.slice(idx + 1)];
    });
  };

  const resetOrderForm = () => {
    setOrderGrnId("");
    setProcessingBatches([]);
  };

  const handleCreateOrders = async () => {
    if (!orderGrnId) {
      toast.error("Select a goods receipt (GRN). Processing uses recorded receipt weight only.");
      return;
    }
    const toCreate = processingBatches.filter(
      (b) => b.enabled && !b.alreadyProcessed && b.inputWeightKg > 1e-6
    );
    if (!toCreate.length) {
      toast.error("No eligible batches selected. Enable batches with a positive send quantity (kg).");
      return;
    }
    const missing = toCreate.find((b) => !b.workCenterId || !b.processType);
    if (missing) {
      toast.error(`Set work center and process type for: ${missing.productName}`);
      return;
    }
    const missingBom = toCreate.find((b) => !b.bomId);
    if (missingBom) {
      toast.error(
        `Pick species and process so a BOM is selected for "${missingBom.productName}", or configure reverse BOMs.`
      );
      return;
    }
    const EPS = 1e-4;
    const lineTotals = new Map<number, number>();
    for (const b of toCreate) {
      const prev = lineTotals.get(b.lineIndex) ?? 0;
      lineTotals.set(b.lineIndex, Math.round((prev + b.inputWeightKg) * 1000) / 1000);
    }
    const over = [...lineTotals.entries()].find(([lineIdx, sum]) => {
      const ref = toCreate.find((b) => b.lineIndex === lineIdx);
      const cap = ref?.remainingWeightKg ?? 0;
      return sum > cap + EPS;
    });
    if (over) {
      toast.error(
        `Send quantities for one receipt line exceed remaining kilograms (${over[1]} kg > cap). Adjust inputs or remove a split.`
      );
      return;
    }
    for (let bi = 0; bi < processingBatches.length; bi++) {
      const b = processingBatches[bi];
      if (!b.enabled || b.alreadyProcessed) continue;
      const cap = maxInputKgForBatch(processingBatches, bi);
      if (b.inputWeightKg > cap + EPS) {
        toast.error(`"${b.productName}": send quantity exceeds remaining allowed for that line (${cap} kg max).`);
        return;
      }
    }
    setSavingOrder(true);
    let created = 0;
    const errors: string[] = [];
    for (const batch of toCreate) {
      try {
        await createSubcontractOrder({
          workCenterId: batch.workCenterId,
          bomId: batch.bomId,
          species: batch.species || undefined,
          processType: batch.processType || undefined,
          grnId: orderGrnId,
          grnLineIndex: batch.lineIndex,
          inputWeightKg: batch.inputWeightKg,
        });
        created++;
      } catch (e) {
        errors.push(`${batch.productName}: ${(e as Error)?.message ?? "failed"}`);
      }
    }
    setSavingOrder(false);
    if (created) toast.success(`${created} subcontract order${created > 1 ? "s" : ""} created.`);
    if (errors.length) errors.forEach((msg) => toast.error(msg));
    if (created) {
      setSendSheetOpen(false);
      resetOrderForm();
      await loadOrdersPage(0);
      setTab("orders");
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
      await Promise.all([loadWorkCenterOptions(), loadWorkCentersPage(0)]);
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
        const poLabel = r.purchaseOrderNumber ?? (r.purchaseOrderId?.length ? r.purchaseOrderId.slice(-8) : "");
        const grnLabel = r.grnNumber ?? (r.grnId?.length ? r.grnId.slice(-8) : "");
        return (
          <div className="text-xs space-y-0.5">
            {r.purchaseOrderId && poLabel ? (
              <div className="text-muted-foreground">
                PO: <DocumentNumber value={poLabel} className="text-xs" />
              </div>
            ) : null}
            {r.grnId && grnLabel ? (
              <div className="text-muted-foreground">
                GRN: <DocumentNumber value={grnLabel} className="text-xs" />
              </div>
            ) : null}
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
        const [first, ...rest] = r.feeRates;
        const line = (fr: (typeof r.feeRates)[number]) =>
          `${fr.species ? `${fr.species} ` : ""}${fr.serviceType}: ${formatMoney(fr.ratePerKg, fr.currency)}/kg`;
        return (
          <div className="text-xs">
            <div>{line(first)}</div>
            {rest.length > 0 ? (
              <div className="text-muted-foreground">+{rest.length} more rate{rest.length !== 1 ? "s" : ""}</div>
            ) : null}
          </div>
        );
      },
    },
    { id: "address", header: "Address", accessor: (r: ExternalWorkCenterRow) => r.address ?? "—" },
    { id: "active", header: "Active", accessor: (r: ExternalWorkCenterRow) => r.isActive ? "Yes" : "No" },
  ];

  return (
    <PageShell className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden">
      <PageHeader
        title="Subcontracting / Job Work"
        description="WIP at external work centers — factories and women's groups. Processing fees auto-post to GL on receive."
        breadcrumbs={[
          { label: areaLabel, href: "/manufacturing/boms" },
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
                  Choose a goods receipt (GRN). Recorded receipt weight sets the line ceiling; you may send a portion
                  now and return for the rest, or split one line into multiple batches (e.g. half filleting / half
                  gutting) before creating orders. Each batch uses the work center rate card for processing fees.
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-5 py-6">

                {!grnsLoading && availableGrns.length === 0 && (
                  <p className="text-sm text-muted-foreground rounded-md border border-dashed px-3 py-2">
                    No posted GRNs have open receipt kilograms for subcontracting right now. Lines with no weight, or where
                    every kilogram is already allocated to subcontract orders, are excluded — you can partial-send a line
                    and return later while weight remains.
                  </p>
                )}

                {/* ── GRN selection ── */}
                <div className="space-y-2">
                  <Label>GRN *</Label>
                  <Select
                    value={orderGrnId || undefined}
                    onValueChange={(val) => {
                      setOrderGrnId(val);
                      const grn = availableGrns.find((g) => g.id === val);
                      const lines = grn?.lineAvailability ?? [];
                      const batches: ProcessingBatch[] = lines.map((l) => {
                        const sp = detectSpecies(l.productName, l.sku);
                        const lineTotal =
                          typeof l.receivedWeightKg === "number"
                            ? l.receivedWeightKg
                            : typeof l.remainingWeightKg === "number"
                              ? l.remainingWeightKg
                              : 0;
                        const remaining =
                          typeof l.remainingWeightKg === "number"
                            ? l.remainingWeightKg
                            : lineTotal;
                        return {
                          batchUid: globalThis.crypto.randomUUID(),
                          lineIndex: l.lineIndex,
                          productId: l.productId,
                          productName: l.productName,
                          sku: l.sku,
                          lineTotalWeightKg: lineTotal,
                          remainingWeightKg: remaining,
                          inputWeightKg: Math.max(0, remaining),
                          species: sp,
                          processType: "",
                          workCenterId: "",
                          bomId: findBom(reverseBoms, sp, "", l.productId),
                          available: l.available,
                          enabled: l.available,
                          alreadyProcessed: !l.available,
                          unavailableReason: l.unavailableReason,
                          previewExpanded: false,
                        };
                      });
                      setProcessingBatches(batches);
                    }}
                    disabled={grnsLoading || availableGrns.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={grnsLoading ? "Loading GRNs…" : "Select a posted GRN"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableGrns.map((grn) => {
                        const eligible = grn.eligibleLineCount ?? grn.lineAvailability?.filter((l) => l.available).length ?? 0;
                        const total = grn.lineCount ?? grn.lineAvailability?.length ?? 0;
                        return (
                          <SelectItem key={grn.id} value={grn.id}>
                            {grn.number}
                            {grn.poRef ? ` · PO: ${grn.poRef}` : ""}
                            {` · ${grn.status}`}
                            {total > 0 ? ` · ${eligible}/${total} lines open` : ""}
                            {grn.receivedWeightKg ? ` · ${grn.receivedWeightKg.toLocaleString()} kg` : ""}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* ── Linked PO (read-only, from GRN) ── */}
                {selectedGrn && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Linked purchase order</Label>
                    <p className="text-sm rounded-md bg-muted px-3 py-2 font-mono break-all">
                      {linkedPoSummary ?? (
                        <span className="text-muted-foreground font-sans italic">None on this receipt</span>
                      )}
                    </p>
                  </div>
                )}

                <Separator />

                {/* ── GRN mode: per-batch cards ── */}
                {orderGrnId && processingBatches.length > 0 && (
                  <div className="space-y-3">
                    {alreadyProcessedLineCount > 0 && (
                      <p className="text-xs text-muted-foreground">
                        <Icons.Info className="inline h-3.5 w-3.5 mr-1 align-text-bottom" aria-hidden />
                        {alreadyProcessedLineCount} line{alreadyProcessedLineCount !== 1 ? "s" : ""}{" "}
                        {alreadyProcessedLineCount === 1 ? "was" : "were"} already sent to processing — excluded below.
                      </p>
                    )}
                    <p className="text-sm font-medium">
                      Processing batches
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        ({processingBatches.filter((b) => b.enabled && !b.alreadyProcessed && b.inputWeightKg > 0).length}{" "}
                        selected · {processingBatches.filter((b) => b.available).length} actionable line(s) on this GRN ·{" "}
                        {processingBatches.length} line(s) total shown)
                      </span>
                    </p>
                    {processingBatches.map((batch, idx) => {
                      const batchWc = sendSheetWorkCenters.find((w) => w.id === batch.workCenterId) ?? null;
                      const batchBom = reverseBoms.find((b) => b.id === batch.bomId) ?? null;
                      const maxKg = maxInputKgForBatch(processingBatches, idx);
                      const batchPreview = buildPreviewLines(batchBom, batch.inputWeightKg, batchWc, batch.processType, batch.species);
                      const batchFee = batchPreview.reduce((s, l) => s + (l.amount ?? 0), 0);
                      return (
                        <div
                          key={batch.batchUid}
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
                                  {batch.unavailableReason === "no_weight"
                                    ? "No weight recorded"
                                    : "Already sent to processor"}
                                </Badge>
                              ) : (
                                <div className="text-right leading-tight">
                                  <div className="flex items-center justify-end gap-1 text-sm font-semibold">
                                    <Icons.Weight className="h-3.5 w-3.5 text-muted-foreground" />
                                    Line {batch.lineTotalWeightKg.toLocaleString()} kg
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {batch.remainingWeightKg.toLocaleString()} kg open for subcontract
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Config fields (only when enabled + not already processed) */}
                          {!batch.alreadyProcessed && batch.enabled && (
                            <div className="space-y-3 pt-1">
                              <div className="flex flex-wrap items-end gap-2">
                                <div className="space-y-1 flex-1 min-w-[140px]">
                                  <Label className="text-xs">Send quantity (kg) *</Label>
                                  <Input
                                    type="number"
                                    step="0.001"
                                    min={0}
                                    className="h-8 text-xs"
                                    value={Number.isFinite(batch.inputWeightKg) ? batch.inputWeightKg : ""}
                                    onChange={(e) => {
                                      const raw = Number(e.target.value);
                                      const cap = maxInputKgForBatch(processingBatches, idx);
                                      if (!Number.isFinite(raw)) return;
                                      const next = Math.min(Math.max(raw, 0), cap);
                                      updateBatch(idx, {
                                        inputWeightKg: Math.round(next * 1000) / 1000,
                                      });
                                    }}
                                  />
                                  <p className="text-[11px] text-muted-foreground">Max now: {maxKg.toLocaleString()} kg</p>
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 shrink-0"
                                  disabled={
                                    batch.alreadyProcessed || batch.inputWeightKg <= 2
                                  }
                                  onClick={() => splitProcessingBatch(idx)}
                                >
                                  Split batch
                                </Button>
                              </div>

                              {/* Work center */}
                              <div className="space-y-1">
                                <Label className="text-xs">Work center *</Label>
                                <Select value={batch.workCenterId || ""} onValueChange={(v) => updateBatch(idx, { workCenterId: v })}>
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Select work center" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {sendSheetWorkCenters.map((w) => (
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

              </div>

              <SheetFooter>
                <Button variant="outline" onClick={() => { setSendSheetOpen(false); resetOrderForm(); }} disabled={savingOrder}>
                  Cancel
                </Button>
                {(() => {
                  const eligibleCount = processingBatches.filter(
                    (b) => b.enabled && !b.alreadyProcessed && b.inputWeightKg > 0
                  ).length;
                  return (
                    <Button
                      onClick={handleCreateOrders}
                      disabled={savingOrder || !orderGrnId || eligibleCount === 0}
                    >
                      {savingOrder
                        ? "Creating…"
                        : `Create ${eligibleCount} order${eligibleCount !== 1 ? "s" : ""}`}
                    </Button>
                  );
                })()}
              </SheetFooter>
            </SheetContent>
          </Sheet>
        }
      />

      <div className="flex min-h-0 flex-col overflow-hidden px-6 pb-6">
        <div className="flex shrink-0 gap-2 border-b pb-2">
          {(["orders", "wip", "workcenters"] as const).map((t) => (
            <Button key={t} variant={tab === t ? "secondary" : "ghost"} size="sm" onClick={() => setTab(t)}>
              {t === "orders" ? "Subcontract orders" : t === "wip" ? "WIP at processors" : "External work centers"}
            </Button>
          ))}
        </div>

        <>
            {tab === "orders" && (
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden pt-4">
                <div className="shrink-0">
                  <h2 className="text-lg font-semibold tracking-tight">Subcontract orders</h2>
                  <p className="text-sm text-muted-foreground">
                    Send material to processor; receive finished goods with processing fee and yield.
                  </p>
                </div>

                <DataTableToolbar
                  className="shrink-0 rounded-xl border bg-card/80 shadow-sm backdrop-blur-sm"
                  searchPlaceholder="Search order, work center, BOM, PO, or GRN…"
                  searchValue={orderSearch}
                  onSearchChange={setOrderSearch}
                  searchInputProps={{
                    spellCheck: false,
                    autoComplete: "off",
                  }}
                  filters={[
                    {
                      id: "species",
                      label: "Species",
                      options: SPECIES_FILTER_OPTIONS,
                      value: speciesFilter,
                      onChange: setSpeciesFilter,
                    },
                    {
                      id: "workCenter",
                      label: "Work center",
                      options: [
                        { label: "All work centers", value: "" },
                        ...workCenterOptions.map((w) => ({ label: w.name, value: w.id })),
                      ],
                      value: workCenterFilter,
                      onChange: setWorkCenterFilter,
                    },
                    {
                      id: "status",
                      label: "Status",
                      options: ORDER_STATUS_OPTIONS,
                      value: orderStatusFilter,
                      onChange: setOrderStatusFilter,
                    },
                  ]}
                  activeFiltersCount={orderFilterChips.length}
                  onClearFilters={handleClearOrderFilters}
                  filterChips={orderFilterChips}
                  onRemoveFilterChip={handleRemoveOrderFilterChip}
                  actions={
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={ordersInitialLoading || ordersFetching}
                      onClick={refreshOrders}
                    >
                      <Icons.RefreshCw
                        className={cn("h-4 w-4 mr-1.5", (ordersInitialLoading || ordersFetching) && "animate-spin")}
                      />
                      Refresh
                    </Button>
                  }
                />

                {!ordersLoadedOnce.current && ordersInitialLoading ? (
                  <SkeletonDataTable
                    rows={ordersPageSize}
                    columnWidths={["w-28", "w-36", "w-32", "w-36", "w-28", "w-20", "w-24", "w-24", "w-32"]}
                  />
                ) : (
                  <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
                    <TableLinearProgress active={ordersTableBusy} />
                    <div
                      className={cn(
                        "flex min-h-0 flex-1 flex-col transition-opacity duration-200",
                        ordersTableBusy && "pointer-events-none opacity-60"
                      )}
                    >
                      <DataTable<SubcontractOrderRow>
                        data={orders}
                        columns={orderColumns}
                        scrollMode="fill"
                        maxVisibleRows={ordersPageSize}
                        className="min-h-0 flex-1 border-0"
                        onRowClick={(r) => window.location.assign(`/manufacturing/subcontracting/orders/${r.id}`)}
                        emptyMessage="No subcontract orders match your filters. Use Send to processor to create one."
                      />
                    </div>
                  </div>
                )}

                <TablePagination
                  className="shrink-0"
                  pageOffset={ordersPageOffset}
                  pageSize={ordersPageSize}
                  pageSizeOptions={[...ORDERS_PAGE_SIZE_OPTIONS]}
                  onPageSizeChange={handleOrdersPageSizeChange}
                  itemCount={!ordersLoadedOnce.current && ordersInitialLoading ? 0 : orders.length}
                  hasMore={ordersHasMore}
                  loading={ordersFetching || (!ordersLoadedOnce.current && ordersInitialLoading)}
                  busy={orderSearchPending}
                  onPrevious={() => {
                    if (ordersPageOffset <= 0 || ordersFetching || ordersInitialLoading) return;
                    void loadOrdersPage(Math.max(0, ordersPageOffset - ordersPageSize));
                  }}
                  onNext={() => {
                    if (!ordersHasMore || ordersFetching || ordersInitialLoading) return;
                    void loadOrdersPage(ordersPageOffset + ordersPageSize);
                  }}
                  entityLabel="orders"
                />
              </div>
            )}

            {tab === "wip" && (
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden pt-4">
                <div className="shrink-0">
                  <h2 className="text-lg font-semibold tracking-tight">WIP at processors</h2>
                  <p className="text-sm text-muted-foreground">
                    Inventory on CoolCatch&apos;s books but physically at an external work center.
                  </p>
                </div>

                <DataTableToolbar
                  className="shrink-0 rounded-xl border bg-card/80 shadow-sm backdrop-blur-sm"
                  searchPlaceholder="Search SKU, product, or work center…"
                  searchValue={wipSearch}
                  onSearchChange={setWipSearch}
                  searchInputProps={{ spellCheck: false, autoComplete: "off" }}
                  filters={[
                    {
                      id: "workCenter",
                      label: "Work center",
                      options: [
                        { label: "All work centers", value: "" },
                        ...workCenterOptions.map((w) => ({ label: w.name, value: w.id })),
                      ],
                      value: workCenterFilter,
                      onChange: setWorkCenterFilter,
                    },
                  ]}
                  activeFiltersCount={(workCenterFilter ? 1 : 0) + (wipSearch.trim() ? 1 : 0)}
                  onClearFilters={() => {
                    setWorkCenterFilter("");
                    setWipSearch("");
                  }}
                  actions={
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={wipInitialLoading || wipFetching}
                      onClick={() => void loadWipPage(wipPageOffset)}
                    >
                      <Icons.RefreshCw
                        className={cn("h-4 w-4 mr-1.5", (wipInitialLoading || wipFetching) && "animate-spin")}
                      />
                      Refresh
                    </Button>
                  }
                />

                {!wipLoadedOnce.current && wipInitialLoading ? (
                  <SkeletonDataTable
                    rows={LIST_PAGE_SIZE}
                    columnWidths={["w-40", "w-24", "w-48", "w-28", "w-36"]}
                  />
                ) : (
                  <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
                    <TableLinearProgress active={wipTableBusy} />
                    <div
                      className={cn(
                        "flex min-h-0 flex-1 flex-col transition-opacity duration-200",
                        wipTableBusy && "pointer-events-none opacity-60"
                      )}
                    >
                      <DataTable<WIPBalanceRow>
                        data={wip}
                        columns={wipColumns}
                        scrollMode="natural"
                        size="comfortable"
                        className="min-h-0 flex-1 border-0"
                        emptyMessage="No WIP balances match your filters."
                      />
                    </div>
                  </div>
                )}

                <TablePagination
                  className="shrink-0"
                  pageOffset={wipPageOffset}
                  pageSize={LIST_PAGE_SIZE}
                  itemCount={!wipLoadedOnce.current && wipInitialLoading ? 0 : wip.length}
                  hasMore={wipHasMore}
                  loading={wipFetching || (!wipLoadedOnce.current && wipInitialLoading)}
                  busy={wipSearchPending}
                  onPrevious={() => {
                    if (wipPageOffset <= 0 || wipFetching || wipInitialLoading) return;
                    void loadWipPage(Math.max(0, wipPageOffset - LIST_PAGE_SIZE));
                  }}
                  onNext={() => {
                    if (!wipHasMore || wipFetching || wipInitialLoading) return;
                    void loadWipPage(wipPageOffset + LIST_PAGE_SIZE);
                  }}
                  entityLabel="balances"
                />
              </div>
            )}

            {tab === "workcenters" && (
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden pt-4">
                <div className="flex shrink-0 items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">External work centers</h2>
                    <p className="text-sm text-muted-foreground">
                      Factories and women&apos;s groups — fee rates apply when creating orders. Click a row to view WIP.
                    </p>
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
                </div>

                <DataTableToolbar
                  className="shrink-0 rounded-xl border bg-card/80 shadow-sm backdrop-blur-sm"
                  searchPlaceholder="Search code or name…"
                  searchValue={wcSearch}
                  onSearchChange={setWcSearch}
                  searchInputProps={{ spellCheck: false, autoComplete: "off" }}
                  filters={[
                    {
                      id: "type",
                      label: "Type",
                      options: WC_TYPE_OPTIONS,
                      value: wcTypeFilter,
                      onChange: setWcTypeFilter,
                    },
                  ]}
                  activeFiltersCount={(wcTypeFilter ? 1 : 0) + (wcSearch.trim() ? 1 : 0)}
                  onClearFilters={() => {
                    setWcTypeFilter("");
                    setWcSearch("");
                  }}
                  actions={
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={wcInitialLoading || wcFetching}
                      onClick={() => void loadWorkCentersPage(wcPageOffset)}
                    >
                      <Icons.RefreshCw
                        className={cn("h-4 w-4 mr-1.5", (wcInitialLoading || wcFetching) && "animate-spin")}
                      />
                      Refresh
                    </Button>
                  }
                />

                {!wcLoadedOnce.current && wcInitialLoading ? (
                  <SkeletonDataTable
                    rows={LIST_PAGE_SIZE}
                    columnWidths={["w-24", "w-40", "w-20", "w-36", "w-32", "w-16"]}
                  />
                ) : (
                  <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
                    <TableLinearProgress active={wcTableBusy} />
                    <div
                      className={cn(
                        "flex min-h-0 flex-1 flex-col transition-opacity duration-200",
                        wcTableBusy && "pointer-events-none opacity-60"
                      )}
                    >
                      <DataTable<ExternalWorkCenterRow>
                        data={workCenterRows}
                        columns={workCenterColumns}
                        scrollMode="natural"
                        size="comfortable"
                        className="min-h-0 flex-1 border-0"
                        emptyMessage="No work centers match your filters."
                        onRowClick={(row) => {
                          setWorkCenterFilter(row.id);
                          setTab("wip");
                        }}
                      />
                    </div>
                  </div>
                )}

                <TablePagination
                  className="shrink-0"
                  pageOffset={wcPageOffset}
                  pageSize={LIST_PAGE_SIZE}
                  itemCount={!wcLoadedOnce.current && wcInitialLoading ? 0 : workCenterRows.length}
                  hasMore={wcHasMore}
                  loading={wcFetching || (!wcLoadedOnce.current && wcInitialLoading)}
                  busy={wcSearchPending}
                  onPrevious={() => {
                    if (wcPageOffset <= 0 || wcFetching || wcInitialLoading) return;
                    void loadWorkCentersPage(Math.max(0, wcPageOffset - LIST_PAGE_SIZE));
                  }}
                  onNext={() => {
                    if (!wcHasMore || wcFetching || wcInitialLoading) return;
                    void loadWorkCentersPage(wcPageOffset + LIST_PAGE_SIZE);
                  }}
                  entityLabel="work centers"
                />
              </div>
            )}
        </>
      </div>
    </PageShell>
  );
}
