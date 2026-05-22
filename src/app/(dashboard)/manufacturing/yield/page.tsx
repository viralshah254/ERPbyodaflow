"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchYieldRecordsPage,
  fetchMassBalanceReportPage,
  createYieldRecord,
  type YieldRecordRow,
  type MassBalanceSummaryRow,
} from "@/lib/api/yield";
import {
  fetchSubcontractOrders,
  fetchReverseBoms,
  fetchExternalWorkCenters,
  fetchWorkCenterFilterOptions,
  type SubcontractOrderRow,
  type WorkCenterFilterOption,
} from "@/lib/api/cool-catch";
import {
  fetchManufacturingWorkOrders,
  type ManufacturingWorkOrder,
} from "@/lib/api/manufacturing";
import type { FilterChip } from "@/components/ui/filter-chips";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { manufacturingAreaLabel } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";

const SEARCH_DEBOUNCE_MS = 400;
const PAGE_SIZE = 25;

const SPECIES_OPTIONS = [
  { label: "All species", value: "" },
  { label: "Tilapia", value: "TILAPIA" },
  { label: "Nile Perch", value: "NILE_PERCH" },
];

const PROCESS_OPTIONS = [
  { label: "All processes", value: "" },
  { label: "Filleting", value: "FILLETING" },
  { label: "Gutting", value: "GUTTING" },
];

interface BomOutputLine {
  productId: string;
  productName?: string;
  type: "OUTPUT_PRIMARY" | "OUTPUT_SECONDARY" | "WASTE";
  expectedKg: number;
  actualKg: string;
}

function lineTypeBadge(type: string) {
  if (type === "OUTPUT_PRIMARY" || type === "PRIMARY")
    return <Badge variant="default" className="text-xs">Primary</Badge>;
  if (type === "OUTPUT_SECONDARY" || type === "SECONDARY")
    return <Badge variant="secondary" className="text-xs">Secondary</Badge>;
  return <Badge variant="destructive" className="text-xs">Waste</Badge>;
}

function speciesLabel(species?: string | null) {
  if (species === "TILAPIA") return "Tilapia";
  if (species === "NILE_PERCH") return "Nile Perch";
  return null;
}

function formatKg(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return (
    <span className="tabular-nums font-medium">
      {value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
}

function yieldPctClass(pct?: number | null) {
  if (pct == null) return "text-muted-foreground";
  if (pct >= 85) return "text-green-600 dark:text-green-500 font-semibold";
  if (pct >= 70) return "text-foreground font-medium";
  return "text-amber-600 dark:text-amber-500 font-medium";
}

function sourceCell(row: { subcontractOrderNumber?: string; workOrderNumber?: string; workCenterName?: string | null }) {
  const ref = row.subcontractOrderNumber ?? row.workOrderNumber;
  if (!ref) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="min-w-0 space-y-0.5">
      <DocumentNumber value={ref} className="text-sm" />
      {row.workCenterName ? (
        <p className="truncate text-xs text-muted-foreground">{row.workCenterName}</p>
      ) : null}
    </div>
  );
}

function alertBadge(alert?: string) {
  if (!alert || alert === "OK") return null;
  return (
    <Badge variant={alert === "ALERT" ? "destructive" : "secondary"} className="text-xs shrink-0">
      {alert}
    </Badge>
  );
}

export default function ManufacturingYieldPage() {
  const router = useRouter();
  const terminology = useTerminology();
  const areaLabel = manufacturingAreaLabel(terminology);

  const [tab, setTab] = React.useState<"records" | "mass-balance">("records");
  const [workCenterOptions, setWorkCenterOptions] = React.useState<WorkCenterFilterOption[]>([]);

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [speciesFilter, setSpeciesFilter] = React.useState("");
  const [processFilter, setProcessFilter] = React.useState("");
  const [workCenterFilter, setWorkCenterFilter] = React.useState("");

  const [records, setRecords] = React.useState<YieldRecordRow[]>([]);
  const [recordsInitialLoading, setRecordsInitialLoading] = React.useState(true);
  const [recordsFetching, setRecordsFetching] = React.useState(false);
  const [recordsPageOffset, setRecordsPageOffset] = React.useState(0);
  const [recordsHasMore, setRecordsHasMore] = React.useState(false);
  const recordsLoadedOnce = React.useRef(false);

  const [massBalance, setMassBalance] = React.useState<MassBalanceSummaryRow[]>([]);
  const [mbSummary, setMbSummary] = React.useState({ alertCount: 0, warningCount: 0 });
  const [mbInitialLoading, setMbInitialLoading] = React.useState(false);
  const [mbFetching, setMbFetching] = React.useState(false);
  const [mbPageOffset, setMbPageOffset] = React.useState(0);
  const [mbHasMore, setMbHasMore] = React.useState(false);
  const mbLoadedOnce = React.useRef(false);

  const [recordYieldOpen, setRecordYieldOpen] = React.useState(false);
  const [yieldSaving, setYieldSaving] = React.useState(false);
  const [subcontractOrders, setSubcontractOrders] = React.useState<SubcontractOrderRow[]>([]);
  const [reverseBoms, setReverseBoms] = React.useState<
    Array<{ id: string; name: string; items: Array<{ productId: string; productName?: string; type: string; quantity: number }> }>
  >([]);
  const [workOrders, setWorkOrders] = React.useState<ManufacturingWorkOrder[]>([]);
  const [selectedScoId, setSelectedScoId] = React.useState("");
  const [selectedWorkOrderId, setSelectedWorkOrderId] = React.useState("");
  const [inputKgOverride, setInputKgOverride] = React.useState("");
  const [outputLines, setOutputLines] = React.useState<BomOutputLine[]>([]);

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [search]);

  React.useEffect(() => {
    fetchWorkCenterFilterOptions({ activeOnly: true })
      .then(setWorkCenterOptions)
      .catch(() => toast.error("Failed to load work center filters."));
  }, []);

  const listQuery = React.useMemo(
    () => ({
      search: debouncedSearch.trim() || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      workCenterId: workCenterFilter || undefined,
      species: speciesFilter || undefined,
      processType: processFilter || undefined,
    }),
    [debouncedSearch, dateFrom, dateTo, workCenterFilter, speciesFilter, processFilter]
  );

  const loadRecordsPage = React.useCallback(
    async (offset: number) => {
      const isFirstLoad = !recordsLoadedOnce.current;
      if (isFirstLoad) setRecordsInitialLoading(true);
      else setRecordsFetching(true);
      try {
        const page = await fetchYieldRecordsPage({ ...listQuery, limit: PAGE_SIZE, cursor: String(offset) });
        setRecords(page.items);
        setRecordsPageOffset(page.offset);
        setRecordsHasMore(page.hasMore);
        recordsLoadedOnce.current = true;
      } catch (e) {
        toast.error((e as Error)?.message ?? "Failed to load yield records.");
      } finally {
        setRecordsInitialLoading(false);
        setRecordsFetching(false);
      }
    },
    [listQuery]
  );

  const loadMassBalancePage = React.useCallback(
    async (offset: number) => {
      const isFirstLoad = !mbLoadedOnce.current;
      if (isFirstLoad) setMbInitialLoading(true);
      else setMbFetching(true);
      try {
        const page = await fetchMassBalanceReportPage({ ...listQuery, limit: PAGE_SIZE, cursor: String(offset) });
        setMassBalance(page.items);
        setMbPageOffset(page.offset);
        setMbHasMore(page.hasMore);
        setMbSummary(page.summary ?? { alertCount: 0, warningCount: 0 });
        mbLoadedOnce.current = true;
      } catch (e) {
        toast.error((e as Error)?.message ?? "Failed to load mass balance report.");
      } finally {
        setMbInitialLoading(false);
        setMbFetching(false);
      }
    },
    [listQuery]
  );

  React.useEffect(() => {
    if (tab !== "records") return;
    setRecordsPageOffset(0);
    void loadRecordsPage(0);
  }, [tab, loadRecordsPage]);

  React.useEffect(() => {
    if (tab !== "mass-balance") return;
    setMbPageOffset(0);
    void loadMassBalancePage(0);
  }, [tab, loadMassBalancePage]);

  const searchPending = search.trim() !== debouncedSearch.trim();
  const recordsTableBusy = recordsFetching || searchPending;
  const mbTableBusy = mbFetching || searchPending;

  const filterChips: FilterChip[] = React.useMemo(() => {
    const chips: FilterChip[] = [];
    if (dateFrom) chips.push({ id: "from", label: "From", value: dateFrom });
    if (dateTo) chips.push({ id: "to", label: "To", value: dateTo });
    if (workCenterFilter) {
      const wc = workCenterOptions.find((w) => w.id === workCenterFilter);
      chips.push({ id: "wc", label: "Work center", value: wc?.name ?? workCenterFilter });
    }
    if (speciesFilter) {
      const opt = SPECIES_OPTIONS.find((o) => o.value === speciesFilter);
      chips.push({ id: "species", label: "Species", value: opt?.label ?? speciesFilter });
    }
    if (processFilter) {
      const opt = PROCESS_OPTIONS.find((o) => o.value === processFilter);
      chips.push({ id: "process", label: "Process", value: opt?.label ?? processFilter });
    }
    if (search.trim()) chips.push({ id: "q", label: "Search", value: search.trim() });
    return chips;
  }, [dateFrom, dateTo, workCenterFilter, speciesFilter, processFilter, search, workCenterOptions]);

  const handleClearFilters = () => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setWorkCenterFilter("");
    setSpeciesFilter("");
    setProcessFilter("");
  };

  const handleRemoveFilterChip = (id: string) => {
    if (id === "from") setDateFrom("");
    if (id === "to") setDateTo("");
    if (id === "wc") setWorkCenterFilter("");
    if (id === "species") setSpeciesFilter("");
    if (id === "process") setProcessFilter("");
    if (id === "q") setSearch("");
  };

  const refreshActiveTab = () => {
    if (tab === "records") void loadRecordsPage(recordsPageOffset);
    else void loadMassBalancePage(mbPageOffset);
  };

  React.useEffect(() => {
    if (!recordYieldOpen) return;
    Promise.all([
      fetchSubcontractOrders({ status: "WIP" }).then(setSubcontractOrders),
      fetchReverseBoms().then(setReverseBoms),
      fetchManufacturingWorkOrders().then((all) =>
        setWorkOrders(all.filter((wo) => ["released", "in_progress", "started", "completed"].includes(wo.status.toLowerCase())))
      ),
      fetchExternalWorkCenters({ activeOnly: true }).catch(() => {}),
    ]).catch(() => {});
  }, [recordYieldOpen]);

  React.useEffect(() => {
    if (!selectedScoId) {
      setOutputLines([]);
      return;
    }
    const sco = subcontractOrders.find((s) => s.id === selectedScoId);
    if (!sco) return;
    const inputLine = (sco.lines ?? []).find((l) => l.type === "INPUT");
    const inputQty = inputLine?.quantity ?? 0;
    if (!inputKgOverride && inputQty > 0) setInputKgOverride(String(inputQty));
    const bom = reverseBoms.find((b) => b.id === sco.bomId);
    if (!bom) {
      setOutputLines(
        (sco.lines ?? [])
          .filter((l) => l.type === "OUTPUT_PRIMARY" || l.type === "OUTPUT_SECONDARY" || l.type === "WASTE")
          .map((l) => ({
            productId: l.productId ?? "",
            productName: l.productName,
            type: l.type as BomOutputLine["type"],
            expectedKg: l.quantity,
            actualKg: "",
          }))
      );
      return;
    }
    const scale = inputQty > 0 ? inputQty / 100 : 1;
    const scoNameMap = new Map<string, string>();
    (sco.lines ?? []).forEach((l) => {
      if (l.productId && l.productName) scoNameMap.set(l.productId, l.productName);
    });
    setOutputLines(
      bom.items.map((item) => {
        const lineType: BomOutputLine["type"] =
          item.type === "PRIMARY" ? "OUTPUT_PRIMARY" : item.type === "SECONDARY" ? "OUTPUT_SECONDARY" : "WASTE";
        return {
          productId: item.productId ?? "",
          productName: scoNameMap.get(item.productId ?? "") ?? item.productName ?? (item.productId ?? "").slice(-12),
          type: lineType,
          expectedKg: Math.round(item.quantity * scale * 100) / 100,
          actualKg: "",
        };
      })
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedScoId, subcontractOrders, reverseBoms]);

  React.useEffect(() => {
    if (!selectedWorkOrderId) return;
    const wo = workOrders.find((w) => w.id === selectedWorkOrderId);
    if (!wo) return;
    const inputQty = wo.quantity ?? wo.plannedQuantity ?? 0;
    if (!inputKgOverride && inputQty > 0) setInputKgOverride(String(inputQty));
    const bom = reverseBoms.find((b) => b.id === wo.bomId);
    if (!bom) {
      setOutputLines([]);
      return;
    }
    const scale = inputQty > 0 ? inputQty / 100 : 1;
    setOutputLines(
      bom.items.map((item) => {
        const lineType: BomOutputLine["type"] =
          item.type === "PRIMARY" ? "OUTPUT_PRIMARY" : item.type === "SECONDARY" ? "OUTPUT_SECONDARY" : "WASTE";
        return {
          productId: item.productId ?? "",
          productName: item.productName ?? (item.productId ?? "").slice(-12),
          type: lineType,
          expectedKg: Math.round(item.quantity * scale * 100) / 100,
          actualKg: "",
        };
      })
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkOrderId, workOrders, reverseBoms]);

  const currentInputKg = Number(inputKgOverride) || 0;

  const scaledLines = React.useMemo(() => {
    if (!selectedScoId || !currentInputKg) return outputLines;
    const sco = subcontractOrders.find((s) => s.id === selectedScoId);
    const bom = sco?.bomId ? reverseBoms.find((b) => b.id === sco.bomId) : null;
    if (!bom) return outputLines;
    const scale = currentInputKg / 100;
    return outputLines.map((line, i) => ({
      ...line,
      expectedKg: Math.round((bom.items[i]?.quantity ?? 0) * scale * 100) / 100,
    }));
  }, [outputLines, currentInputKg, selectedScoId, subcontractOrders, reverseBoms]);

  const processLossKg =
    currentInputKg > 0
      ? currentInputKg -
        scaledLines.filter((l) => l.type !== "WASTE").reduce((s, l) => s + (Number(l.actualKg) || 0), 0) -
        scaledLines.filter((l) => l.type === "WASTE").reduce((s, l) => s + (Number(l.actualKg) || 0), 0)
      : 0;

  const handleUpdateActual = (index: number, value: string) => {
    setOutputLines((prev) => prev.map((l, i) => (i === index ? { ...l, actualKg: value } : l)));
  };

  const handleRecordYield = async () => {
    if (!currentInputKg || currentInputKg <= 0) {
      toast.error("Enter a valid input weight (kg).");
      return;
    }
    if (scaledLines.length === 0) {
      toast.error("Select a subcontract order or work order with output lines.");
      return;
    }
    const lines = scaledLines.map((l) => ({
      skuId: l.productId,
      type: l.type === "OUTPUT_PRIMARY" ? ("PRIMARY" as const) : l.type === "OUTPUT_SECONDARY" ? ("SECONDARY" as const) : ("WASTE" as const),
      quantityKg: Number(l.actualKg) || l.expectedKg,
    }));
    if (lines.every((l) => l.quantityKg <= 0)) {
      toast.error("Enter at least one output quantity.");
      return;
    }
    setYieldSaving(true);
    try {
      await createYieldRecord({
        workOrderId: selectedWorkOrderId || undefined,
        subcontractOrderId: selectedScoId || undefined,
        inputWeightKg: currentInputKg,
        lines,
      });
      toast.success("Yield record saved.");
      setRecordYieldOpen(false);
      setSelectedScoId("");
      setSelectedWorkOrderId("");
      setInputKgOverride("");
      setOutputLines([]);
      recordsLoadedOnce.current = false;
      mbLoadedOnce.current = false;
      if (tab === "records") void loadRecordsPage(0);
      else void loadMassBalancePage(0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save yield.");
    } finally {
      setYieldSaving(false);
    }
  };

  const yieldColumns = React.useMemo(
    () => [
      {
        id: "recordedAt",
        header: "Recorded",
        accessor: (r: YieldRecordRow) => (
          <span className="text-sm tabular-nums">{new Date(r.recordedAt).toLocaleString()}</span>
        ),
        sticky: true,
      },
      {
        id: "source",
        header: "Source",
        accessor: (r: YieldRecordRow) => sourceCell(r),
      },
      {
        id: "species",
        header: "Species / Process",
        accessor: (r: YieldRecordRow) => {
          const sp = speciesLabel(r.species);
          if (!sp && !r.processType) return "—";
          return (
            <span className="text-sm">
              {sp ?? "—"}
              {r.processType ? <span className="text-muted-foreground"> · {r.processType}</span> : null}
            </span>
          );
        },
      },
      { id: "inputKg", header: "Input (kg)", accessor: (r: YieldRecordRow) => formatKg(r.inputWeightKg) },
      { id: "primaryKg", header: "Primary (kg)", accessor: (r: YieldRecordRow) => formatKg(r.outputPrimaryKg) },
      { id: "secondaryKg", header: "Secondary (kg)", accessor: (r: YieldRecordRow) => formatKg(r.outputSecondaryKg) },
      { id: "wasteKg", header: "Process loss (kg)", accessor: (r: YieldRecordRow) => formatKg(r.wasteKg) },
      {
        id: "yieldPct",
        header: "Yield %",
        accessor: (r: YieldRecordRow) =>
          r.yieldPercent != null ? (
            <span className={cn("tabular-nums text-sm", yieldPctClass(r.yieldPercent))}>
              {r.yieldPercent.toFixed(1)}%
            </span>
          ) : (
            "—"
          ),
      },
    ],
    []
  );

  const massBalanceColumns = React.useMemo(
    () => [
      {
        id: "alert",
        header: "",
        accessor: (r: MassBalanceSummaryRow) => alertBadge(r.alert),
        className: "w-10",
      },
      {
        id: "period",
        header: "Period",
        accessor: (r: MassBalanceSummaryRow) => <span className="tabular-nums text-sm">{r.period}</span>,
        sticky: true,
      },
      {
        id: "source",
        header: "Work order / SCO",
        accessor: (r: MassBalanceSummaryRow) => sourceCell(r),
      },
      {
        id: "species",
        header: "Species / Process",
        accessor: (r: MassBalanceSummaryRow) => {
          const sp = speciesLabel(r.species);
          if (!sp && !r.processType) return "—";
          return (
            <span className="text-sm">
              {sp ?? "—"}
              {r.processType ? <span className="text-muted-foreground"> · {r.processType}</span> : null}
            </span>
          );
        },
      },
      { id: "inputKg", header: "Input (kg)", accessor: (r: MassBalanceSummaryRow) => formatKg(r.inputWeightKg) },
      { id: "primaryKg", header: "Primary (kg)", accessor: (r: MassBalanceSummaryRow) => formatKg(r.outputPrimaryKg) },
      { id: "secondaryKg", header: "Secondary (kg)", accessor: (r: MassBalanceSummaryRow) => formatKg(r.outputSecondaryKg) },
      {
        id: "processLoss",
        header: "Process loss (kg)",
        accessor: (r: MassBalanceSummaryRow) => {
          const loss = r.processLossKg ?? r.wasteKg;
          if (loss == null) return "—";
          const pct = r.inputWeightKg > 0 ? (loss / r.inputWeightKg) * 100 : null;
          return (
            <span className="tabular-nums text-sm">
              {formatKg(loss)}
              {pct != null ? (
                <span className="ml-1 text-xs text-muted-foreground">({pct.toFixed(1)}%)</span>
              ) : null}
            </span>
          );
        },
      },
      {
        id: "yieldPct",
        header: "Yield %",
        accessor: (r: MassBalanceSummaryRow) => (
          <span className={cn("tabular-nums text-sm", yieldPctClass(r.yieldPercent))}>
            {r.yieldPercent?.toFixed(1) ?? "—"}%
          </span>
        ),
      },
      {
        id: "variance",
        header: "Primary variance vs BOM",
        accessor: (r: MassBalanceSummaryRow) => {
          const v = r.varianceVsBom;
          if (!v) return "—";
          const pct = v.primaryVariancePct;
          const color =
            pct == null
              ? ""
              : Math.abs(pct) > 10
                ? "text-destructive font-semibold"
                : Math.abs(pct) > 5
                  ? "text-amber-600 dark:text-amber-500 font-medium"
                  : "text-green-600 dark:text-green-500";
          return (
            <span className={cn("tabular-nums text-sm", color)}>
              {v.primaryVarianceKg > 0 ? "+" : ""}
              {v.primaryVarianceKg.toFixed(2)} kg
              {pct != null ? ` (${pct > 0 ? "+" : ""}${pct.toFixed(1)}%)` : ""}
            </span>
          );
        },
      },
    ],
    []
  );

  const toolbarFilters = [
    {
      id: "species",
      label: "Species",
      options: SPECIES_OPTIONS,
      value: speciesFilter,
      onChange: setSpeciesFilter,
    },
    {
      id: "process",
      label: "Process",
      options: PROCESS_OPTIONS,
      value: processFilter,
      onChange: setProcessFilter,
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
  ];

  const dateFilterRow = (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">From</Label>
        <Input type="date" className="h-9 w-36" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">To</Label>
        <Input type="date" className="h-9 w-36" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>
    </div>
  );

  return (
    <PageShell className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden">
      <PageHeader
        title="Yield / Mass balance"
        description="Record actual outputs per batch; compare to BOM-expected. Process loss = input − primary − secondary."
        breadcrumbs={[
          { label: areaLabel, href: "/manufacturing/boms" },
          { label: "Yield" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button onClick={() => setRecordYieldOpen(true)}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            Record yield
          </Button>
        }
      />

      <div className="flex min-h-0 flex-col overflow-hidden px-6 pb-6">
        <div className="flex shrink-0 gap-2 border-b pb-2">
          {(["records", "mass-balance"] as const).map((t) => (
            <Button key={t} variant={tab === t ? "secondary" : "ghost"} size="sm" onClick={() => setTab(t)}>
              {t === "records" ? "Yield records" : "Mass balance report"}
            </Button>
          ))}
        </div>

        {tab === "records" && (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden pt-4">
            <div className="shrink-0">
              <h2 className="text-lg font-semibold tracking-tight">Yield records</h2>
              <p className="text-sm text-muted-foreground">
                Actual input weight and output by SKU — primary, secondary byproducts, and process loss.
              </p>
            </div>

            <DataTableToolbar
              className="shrink-0 rounded-xl border bg-card/80 shadow-sm backdrop-blur-sm"
              searchPlaceholder="Search order number or work center…"
              searchValue={search}
              onSearchChange={setSearch}
              searchInputProps={{ spellCheck: false, autoComplete: "off" }}
              filters={toolbarFilters}
              activeFiltersCount={filterChips.length}
              onClearFilters={handleClearFilters}
              filterChips={filterChips}
              onRemoveFilterChip={handleRemoveFilterChip}
              actions={
                <Button variant="outline" size="sm" disabled={recordsInitialLoading || recordsFetching} onClick={refreshActiveTab}>
                  <Icons.RefreshCw className={cn("h-4 w-4 mr-1.5", (recordsInitialLoading || recordsFetching) && "animate-spin")} />
                  Refresh
                </Button>
              }
            >
              {dateFilterRow}
            </DataTableToolbar>

            {!recordsLoadedOnce.current && recordsInitialLoading ? (
              <SkeletonDataTable rows={PAGE_SIZE} columnWidths={["w-32", "w-36", "w-28", "w-20", "w-20", "w-20", "w-24", "w-16"]} />
            ) : (
              <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
                <TableLinearProgress active={recordsTableBusy} />
                <div className={cn("flex min-h-0 flex-1 flex-col transition-opacity duration-200", recordsTableBusy && "pointer-events-none opacity-60")}>
                  <DataTable<YieldRecordRow>
                    data={records}
                    columns={yieldColumns}
                    scrollMode="natural"
                    size="comfortable"
                    className="min-h-0 flex-1 border-0"
                    onRowClick={(row) => router.push(`/manufacturing/yield/${row.id}`)}
                    emptyMessage="No yield records match your filters. Record yield to add one."
                  />
                </div>
              </div>
            )}

            <TablePagination
              className="shrink-0"
              pageOffset={recordsPageOffset}
              pageSize={PAGE_SIZE}
              itemCount={!recordsLoadedOnce.current && recordsInitialLoading ? 0 : records.length}
              hasMore={recordsHasMore}
              loading={recordsFetching || (!recordsLoadedOnce.current && recordsInitialLoading)}
              busy={searchPending}
              onPrevious={() => {
                if (recordsPageOffset <= 0 || recordsFetching || recordsInitialLoading) return;
                void loadRecordsPage(Math.max(0, recordsPageOffset - PAGE_SIZE));
              }}
              onNext={() => {
                if (!recordsHasMore || recordsFetching || recordsInitialLoading) return;
                void loadRecordsPage(recordsPageOffset + PAGE_SIZE);
              }}
              entityLabel="records"
            />
          </div>
        )}

        {tab === "mass-balance" && (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden pt-4">
            <div className="shrink-0">
              <h2 className="text-lg font-semibold tracking-tight">Mass balance report</h2>
              <p className="text-sm text-muted-foreground">
                Input vs actual output per batch vs BOM-expected. Negative primary variance = yield below standard.
              </p>
            </div>

            <DataTableToolbar
              className="shrink-0 rounded-xl border bg-card/80 shadow-sm backdrop-blur-sm"
              searchPlaceholder="Search order number or work center…"
              searchValue={search}
              onSearchChange={setSearch}
              searchInputProps={{ spellCheck: false, autoComplete: "off" }}
              filters={toolbarFilters}
              activeFiltersCount={filterChips.length}
              onClearFilters={handleClearFilters}
              filterChips={filterChips}
              onRemoveFilterChip={handleRemoveFilterChip}
              actions={
                <Button variant="outline" size="sm" disabled={mbInitialLoading || mbFetching} onClick={refreshActiveTab}>
                  <Icons.RefreshCw className={cn("h-4 w-4 mr-1.5", (mbInitialLoading || mbFetching) && "animate-spin")} />
                  Refresh
                </Button>
              }
            >
              {dateFilterRow}
            </DataTableToolbar>

            {(mbSummary.alertCount > 0 || mbSummary.warningCount > 0) && (
              <div className="flex shrink-0 items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
                <Icons.AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                <span>
                  {mbSummary.alertCount > 0 && (
                    <span className="font-medium text-destructive">
                      {mbSummary.alertCount} alert{mbSummary.alertCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  {mbSummary.alertCount > 0 && mbSummary.warningCount > 0 ? ", " : null}
                  {mbSummary.warningCount > 0 && (
                    <span className="font-medium text-amber-700 dark:text-amber-500">
                      {mbSummary.warningCount} warning{mbSummary.warningCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  <span className="text-muted-foreground"> on this page — primary yield beyond tolerance.</span>
                </span>
              </div>
            )}

            {!mbLoadedOnce.current && mbInitialLoading ? (
              <SkeletonDataTable rows={PAGE_SIZE} columnWidths={["w-8", "w-24", "w-36", "w-28", "w-20", "w-20", "w-20", "w-24", "w-16", "w-36"]} />
            ) : (
              <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
                <TableLinearProgress active={mbTableBusy} />
                <div className={cn("flex min-h-0 flex-1 flex-col transition-opacity duration-200", mbTableBusy && "pointer-events-none opacity-60")}>
                  <DataTable<MassBalanceSummaryRow>
                    data={massBalance}
                    columns={massBalanceColumns}
                    scrollMode="natural"
                    size="comfortable"
                    className="min-h-0 flex-1 border-0"
                    emptyMessage="No mass balance rows match your filters. Record yield batches to populate this report."
                  />
                </div>
              </div>
            )}

            <TablePagination
              className="shrink-0"
              pageOffset={mbPageOffset}
              pageSize={PAGE_SIZE}
              itemCount={!mbLoadedOnce.current && mbInitialLoading ? 0 : massBalance.length}
              hasMore={mbHasMore}
              loading={mbFetching || (!mbLoadedOnce.current && mbInitialLoading)}
              busy={searchPending}
              onPrevious={() => {
                if (mbPageOffset <= 0 || mbFetching || mbInitialLoading) return;
                void loadMassBalancePage(Math.max(0, mbPageOffset - PAGE_SIZE));
              }}
              onNext={() => {
                if (!mbHasMore || mbFetching || mbInitialLoading) return;
                void loadMassBalancePage(mbPageOffset + PAGE_SIZE);
              }}
              entityLabel="rows"
            />
          </div>
        )}
      </div>

      <Sheet open={recordYieldOpen} onOpenChange={setRecordYieldOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Record yield</SheetTitle>
            <SheetDescription>
              Link to a work order or WIP subcontract order. Output lines pre-populate from the BOM — enter actual kg per product.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-5">
            <div className="space-y-2">
              <Label>Work order (batch)</Label>
              <Select
                value={selectedWorkOrderId || "__none_wo__"}
                onValueChange={(v) => {
                  const id = v === "__none_wo__" ? "" : v;
                  setSelectedWorkOrderId(id);
                  if (id) setSelectedScoId("");
                  setInputKgOverride("");
                  setOutputLines([]);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a released / in-progress work order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none_wo__">— No work order —</SelectItem>
                  {workOrders.map((wo) => (
                    <SelectItem key={wo.id} value={wo.id}>
                      {wo.number}
                      {wo.productName ? ` · ${wo.productName}` : ""}
                      {wo.quantity ? ` · ${wo.quantity} kg` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-muted-foreground">Or: subcontract order (WIP)</Label>
              <Select
                value={selectedScoId || "__none_sco__"}
                onValueChange={(v) => {
                  const id = v === "__none_sco__" ? "" : v;
                  setSelectedScoId(id);
                  if (id) setSelectedWorkOrderId("");
                  setInputKgOverride("");
                  setOutputLines([]);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subcontract order in WIP" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none_sco__">— None —</SelectItem>
                  {subcontractOrders.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.number} · {s.workCenterName}
                      {s.species ? ` · ${speciesLabel(s.species)}` : ""}
                      {s.processType ? ` · ${s.processType}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Input weight (kg) *</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Weight at processing facility"
                value={inputKgOverride}
                onChange={(e) => setInputKgOverride(e.target.value)}
              />
            </div>

            {scaledLines.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <p className="text-sm font-medium">Actual outputs</p>
                  {scaledLines.map((line, i) => (
                    <div key={i} className="space-y-2 rounded-lg border bg-muted/30 p-3">
                      <div className="flex items-center justify-between gap-2">
                        {lineTypeBadge(line.type)}
                        <span className="truncate text-xs text-muted-foreground">{line.productName}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Expected (kg)</Label>
                          <p className="tabular-nums text-sm font-medium">{line.expectedKg.toFixed(2)}</p>
                        </div>
                        <div>
                          <Label className="text-xs">Actual (kg)</Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder={line.expectedKg.toFixed(2)}
                            value={line.actualKg}
                            onChange={(e) => handleUpdateActual(i, e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {currentInputKg > 0 && (
                    <div className="rounded-lg border bg-background p-3 text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Unaccounted loss</span>
                        <span className={cn("tabular-nums font-medium", processLossKg > 0 ? "text-destructive" : "text-green-600")}>
                          {Math.max(0, processLossKg).toFixed(2)} kg
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {!selectedScoId && !selectedWorkOrderId && (
              <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                Select a work order or WIP subcontract order to auto-populate output lines from the BOM.
              </div>
            )}
          </div>

          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setRecordYieldOpen(false)} disabled={yieldSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleRecordYield}
              disabled={yieldSaving || !currentInputKg || (scaledLines.length === 0 && !selectedScoId && !selectedWorkOrderId)}
            >
              {yieldSaving ? "Saving…" : "Save yield"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
