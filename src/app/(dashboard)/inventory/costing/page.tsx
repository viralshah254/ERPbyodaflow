"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FormattedDecimalInput } from "@/components/ui/formatted-decimal-input";
import { Label } from "@/components/ui/label";
import { parseDecimalString } from "@/lib/decimal-input";
import { Badge } from "@/components/ui/badge";
import {
  fetchLandedCostSources,
  fetchLandedCostTemplates,
  fetchLandedCostAllocation,
  postLandedCostAllocation,
  uploadLandedCostAttachment,
  type LandedCostSourceRow,
  type LandedCostTemplateRow,
  type LandedCostCostCentre,
} from "@/lib/api/landed-cost";
import {
  fetchProcessingCostDraft,
  fetchProcessingCostAllocation,
  saveProcessingCostAllocation,
  PROCESSING_TYPE_LABELS,
  PROCESSING_COST_CATEGORY_LABELS,
  type ProcessingType,
  type ProcessingCostDraftResult,
  type ProcessingCostDraftLine,
} from "@/lib/api/processing-cost";
import { fetchInventoryValuation, fetchLatestInventoryCosting, runInventoryCostingApi } from "@/lib/api/inventory-costing";
import { listLandedCostAllocations } from "@/lib/data/inventory-costing.repo";
import { fetchSavedExchangeRateApi, type FinancialExchangeRateRow } from "@/lib/api/financial-settings";
import { formatMoney } from "@/lib/money";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as Icons from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type WizardStep = 0 | 1 | 2 | 3 | 4; // 0=FX, 1=Permits, 2=Logistics, 3=Processing costs, 4=Summary

interface CostLine {
  templateId: string;
  amount: string;
  currency: string;
  reference: string;
  costCentre: LandedCostCostCentre;
  /** Locally-staged evidence files — uploaded after allocation is saved. */
  files?: File[];
}

function parseCostLineAmount(raw: string): number {
  const n = parseDecimalString(raw);
  return Number.isFinite(n) ? n : 0;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LANDED_COST_TYPE_LABELS: Record<string, string> = {
  freight: "Freight",
  insurance: "Insurance",
  duty: "Import duty",
  other: "Other",
  permit: "Permits",
  border: "Border / customs",
  inbound_freight: "Inbound freight",
  outbound_freight: "Outbound freight",
  storage: "Cold storage",
};

const WIZARD_STEPS = [
  { id: 0, label: "FX conversion", icon: Icons.TrendingUp },
  { id: 1, label: "Permits & customs", icon: Icons.FileCheck },
  { id: 2, label: "Inbound logistics", icon: Icons.Truck },
  { id: 3, label: "Processing costs", icon: Icons.Factory },
  { id: 4, label: "Summary & confirm", icon: Icons.CheckCircle2 },
] as const;

// ─── Wizard step indicator ────────────────────────────────────────────────────

function WizardStepIndicator({ current }: { current: WizardStep }) {
  return (
    <div className="flex items-center gap-1 w-full mb-6">
      {WIZARD_STEPS.map((s, idx) => {
        const done = s.id < current;
        const active = s.id === current;
        const Icon = s.icon;
        return (
          <React.Fragment key={s.id}>
            <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all",
                  done && "bg-emerald-500 text-white",
                  active && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                  !done && !active && "bg-muted text-muted-foreground"
                )}
              >
                {done ? <Icons.Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span
                className={cn(
                  "text-[10px] text-center leading-tight hidden sm:block",
                  active ? "font-semibold text-primary" : "text-muted-foreground"
                )}
              >
                {s.label}
              </span>
            </div>
            {idx < WIZARD_STEPS.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 rounded-full transition-all",
                  s.id < current ? "bg-emerald-400" : "bg-muted"
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Step 0: FX Conversion ───────────────────────────────────────────────────

function StepFxConversion({
  source,
  fxRate,
  fxLoading,
  fxError,
  onNext,
}: {
  source: LandedCostSourceRow;
  fxRate: FinancialExchangeRateRow | null;
  fxLoading: boolean;
  fxError: string | null;
  onNext: () => void;
}) {
  const currency = source.currency ?? "KES";
  const isKes = currency.toUpperCase() === "KES";
  const total = (source as { totalAmount?: number; total?: number }).totalAmount ?? (source as { total?: number }).total ?? 0;
  const kesEquivalent = fxRate ? total * fxRate.rate : null;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-base">Step 1: Currency conversion</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Confirm the exchange rate used to convert this document&apos;s value to KES (your base currency).
        </p>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Document</span>
          <span className="font-medium">{source.number}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Document currency</span>
          <Badge variant="outline">{currency}</Badge>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Document total</span>
          <span className="font-semibold">{formatMoney(total, currency)}</span>
        </div>
      </div>

      {isKes ? (
        <div className="flex items-start gap-3 rounded-lg border bg-emerald-50 border-emerald-200 p-4">
          <Icons.CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">No conversion needed</p>
            <p className="text-sm text-emerald-700">
              This document is already in KES — the base currency. No exchange rate is required.
            </p>
          </div>
        </div>
      ) : fxLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Icons.Loader2 className="h-4 w-4 animate-spin" />
          Looking up {currency} → KES exchange rate…
        </div>
      ) : fxError ? (
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-lg border bg-amber-50 border-amber-200 p-4">
            <Icons.AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Exchange rate not found</p>
              <p className="text-sm text-amber-700">
                No {currency} → KES rate found. You must set one before costs can be converted accurately.
              </p>
              <Button variant="link" size="sm" className="h-auto p-0 mt-1 text-amber-800" asChild>
                <Link href="/settings/financial/exchange-rates" target="_blank">
                  Set up exchange rates →
                </Link>
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            You can still continue — the system will use the rate it finds at the time of posting, or throw an error if
            none is available.
          </p>
        </div>
      ) : fxRate ? (
        <div className="rounded-lg border p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Exchange rate</p>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-lg font-bold">1 {currency}</p>
              <p className="text-xs text-muted-foreground">source currency</p>
            </div>
            <Icons.ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="text-center">
              <p className="text-lg font-bold text-primary">{fxRate.rate.toFixed(6)} KES</p>
              <p className="text-xs text-muted-foreground">
                as of {new Date(fxRate.date).toLocaleDateString()} · {fxRate.source}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
            <span className="text-sm text-muted-foreground">KES equivalent of document total</span>
            <span className="font-bold text-primary">
              {kesEquivalent !== null ? formatMoney(kesEquivalent, "KES") : "—"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            This rate will be locked as an FX snapshot on each other cost line when you save.
          </p>
        </div>
      ) : null}

      <Button
        className="w-full"
        onClick={onNext}
        disabled={!isKes && !!fxError && !fxRate}
      >
        <Icons.ArrowRight className="mr-2 h-4 w-4" />
        {isKes ? "No conversion needed — continue to permits" : "Confirm rate & continue to permits"}
      </Button>
    </div>
  );
}

// ─── Step 1: Permits & Customs ───────────────────────────────────────────────

function StepPermits({
  lines,
  templates,
  onChange,
  onFilesChange,
  onAdd,
  onRemove,
  onNext,
  onBack,
  onSkip,
}: {
  lines: CostLine[];
  templates: LandedCostTemplateRow[];
  onChange: (idx: number, field: keyof CostLine, value: string) => void;
  onFilesChange: (idx: number, files: File[]) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const permitTemplates = templates; // all templates; the wizard step determines costCentre, not the template type

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-base">Step 2: Permits &amp; customs costs</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Add any fishing licences, border clearance fees, or customs duties paid for this shipment.
          Include the permit reference number for audit traceability.
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-md border bg-amber-50 border-amber-100 px-3 py-2">
        <Icons.FileCheck className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
        <p className="text-xs text-amber-700">
          Each permit cost is tracked as a separate cost centre (<strong>permits</strong>). This allows you to report
          permit spend independently from freight and the purchase value.
        </p>
      </div>

      <div className="space-y-3">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Permit cost lines
        </Label>
        {lines.map((line, idx) => (
          <div key={idx} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Cost line {idx + 1}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onRemove(idx)}
                disabled={lines.length <= 1}
              >
                <Icons.X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <Label className="text-xs mb-1 block">Cost type</Label>
                <Select value={line.templateId} onValueChange={(v) => onChange(idx, "templateId", v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select permit type…" />
                  </SelectTrigger>
                  <SelectContent>
                    {permitTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {(t as { name?: string }).name ?? LANDED_COST_TYPE_LABELS[(t as { type?: string }).type as keyof typeof LANDED_COST_TYPE_LABELS]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Amount</Label>
                <FormattedDecimalInput
                  placeholder="0.00"
                  className="h-9"
                  value={line.amount}
                  onValueChange={(raw) => onChange(idx, "amount", raw)}
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Currency</Label>
                <Select value={line.currency} onValueChange={(v) => onChange(idx, "currency", v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KES">KES</SelectItem>
                    <SelectItem value="UGX">UGX</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-xs mb-1 block">
                  Permit / licence number{" "}
                  <span className="text-muted-foreground font-normal">(optional — for audit trail)</span>
                </Label>
                <Input
                  placeholder="e.g. KFS/LIC/2025/04821"
                  className="h-9"
                  value={line.reference}
                  onChange={(e) => onChange(idx, "reference", e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs mb-1 block flex items-center gap-1">
                  <Icons.Paperclip className="h-3 w-3" />
                  Evidence{" "}
                  <span className="text-muted-foreground font-normal">(invoice / receipt — optional)</span>
                </Label>
                <label className="flex items-center gap-2 cursor-pointer rounded border border-dashed px-3 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                  <Icons.Upload className="h-3.5 w-3.5 shrink-0" />
                  {(line.files?.length ?? 0) > 0
                    ? (line.files ?? []).map((f) => f.name).join(", ")
                    : "Upload invoice or receipt"}
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      const selected = Array.from(e.target.files ?? []);
                      onFilesChange(idx, [...(line.files ?? []), ...selected]);
                    }}
                  />
                </label>
                {(line.files?.length ?? 0) > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(line.files ?? []).map((f, fi) => (
                      <span key={fi} className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs">
                        {f.name}
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => onFilesChange(idx, (line.files ?? []).filter((_, i) => i !== fi))}
                        >
                          <Icons.X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={onAdd} className="w-full border border-dashed">
          <Icons.Plus className="mr-2 h-4 w-4" />
          Add another permit cost
        </Button>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onBack}>
          <Icons.ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back
        </Button>
        <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground">
          Skip (no permit costs)
        </Button>
        <Button size="sm" className="ml-auto" onClick={onNext}>
          Next: Inbound logistics <Icons.ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Step 2: Inbound Logistics ────────────────────────────────────────────────

function StepLogistics({
  lines,
  templates,
  onChange,
  onFilesChange,
  onAdd,
  onRemove,
  onNext,
  onBack,
  onSkip,
}: {
  lines: CostLine[];
  templates: LandedCostTemplateRow[];
  onChange: (idx: number, field: keyof CostLine, value: string) => void;
  onFilesChange: (idx: number, files: File[]) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const logisticsTemplates = templates; // all templates; the wizard step determines costCentre, not the template type

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-base">Step 3: Inbound logistics costs</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Add the cost of transporting the fish from farm to your processing hub — truck hire, cold-chain storage, or
          any handling fees paid to carriers.
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-md border bg-emerald-50 border-emerald-100 px-3 py-2">
        <Icons.Truck className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
        <p className="text-xs text-emerald-700">
          Logistics costs are tracked as a separate cost centre (<strong>inbound logistics</strong>). This shows you the
          exact freight cost per kg — essential for route-level profitability.
        </p>
      </div>

      <div className="space-y-3">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Logistics cost lines
        </Label>
        {lines.map((line, idx) => (
          <div key={idx} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Cost line {idx + 1}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onRemove(idx)}
                disabled={lines.length <= 1}
              >
                <Icons.X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <Label className="text-xs mb-1 block">Cost type</Label>
                <Select value={line.templateId} onValueChange={(v) => onChange(idx, "templateId", v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select logistics type…" />
                  </SelectTrigger>
                  <SelectContent>
                    {logisticsTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {(t as { name?: string }).name ?? LANDED_COST_TYPE_LABELS[(t as { type?: string }).type as keyof typeof LANDED_COST_TYPE_LABELS]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Amount</Label>
                <FormattedDecimalInput
                  placeholder="0.00"
                  className="h-9"
                  value={line.amount}
                  onValueChange={(raw) => onChange(idx, "amount", raw)}
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Currency</Label>
                <Select value={line.currency} onValueChange={(v) => onChange(idx, "currency", v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KES">KES</SelectItem>
                    <SelectItem value="UGX">UGX</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-xs mb-1 block">
                  Carrier / waybill reference{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  placeholder="e.g. KE-2025-00471"
                  className="h-9"
                  value={line.reference}
                  onChange={(e) => onChange(idx, "reference", e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs mb-1 block flex items-center gap-1">
                  <Icons.Paperclip className="h-3 w-3" />
                  Evidence{" "}
                  <span className="text-muted-foreground font-normal">(invoice / receipt — optional)</span>
                </Label>
                <label className="flex items-center gap-2 cursor-pointer rounded border border-dashed px-3 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                  <Icons.Upload className="h-3.5 w-3.5 shrink-0" />
                  {(line.files?.length ?? 0) > 0
                    ? (line.files ?? []).map((f) => f.name).join(", ")
                    : "Upload invoice or receipt"}
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      const selected = Array.from(e.target.files ?? []);
                      onFilesChange(idx, [...(line.files ?? []), ...selected]);
                    }}
                  />
                </label>
                {(line.files?.length ?? 0) > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(line.files ?? []).map((f, fi) => (
                      <span key={fi} className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs">
                        {f.name}
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => onFilesChange(idx, (line.files ?? []).filter((_, i) => i !== fi))}
                        >
                          <Icons.X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={onAdd} className="w-full border border-dashed">
          <Icons.Plus className="mr-2 h-4 w-4" />
          Add another logistics cost
        </Button>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onBack}>
          <Icons.ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back
        </Button>
        <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground">
          Skip (no logistics costs)
        </Button>
        <Button size="sm" className="ml-auto" onClick={onNext}>
          Next: Processing costs <Icons.ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Step 3: Processing Costs ────────────────────────────────────────────────

function StepProcessingCosts({
  sourceId,
  processingType,
  onProcessingTypeChange,
  draftLines,
  onLoadDraft,
  loadingDraft,
  onLineAmountChange,
  onNext,
  onBack,
  onSkip,
}: {
  sourceId: string;
  processingType: ProcessingType;
  onProcessingTypeChange: (t: ProcessingType) => void;
  draftLines: ProcessingCostDraftLine[];
  onLoadDraft: () => void;
  loadingDraft: boolean;
  onLineAmountChange: (idx: number, amount: string) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const total = draftLines.reduce((s, l) => s + l.amount, 0);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-base">Step 4: Processing &amp; packing costs</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Auto-calculate processing fee, packaging materials, and outbound logistics from your org&apos;s
          cost profile. Review and override any line before saving.
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-md border bg-blue-50 border-blue-100 px-3 py-2">
        <Icons.Sparkles className="h-4 w-4 mt-0.5 text-blue-600 shrink-0" />
        <p className="text-xs text-blue-700">
          Amounts are computed from your org profile constants (from the Filleting Model workbook). You
          can adjust any line — overrides are tracked separately from formula values.
        </p>
      </div>

      {/* Processing type selector */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1.5">
          Processing type
        </label>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(PROCESSING_TYPE_LABELS) as [ProcessingType, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => onProcessingTypeChange(key)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                processingType === key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-muted border-border"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={onLoadDraft} disabled={loadingDraft}>
          {loadingDraft ? (
            <Icons.Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Icons.Wand2 className="mr-1.5 h-3.5 w-3.5" />
          )}
          {draftLines.length > 0 ? "Recalculate from profile" : "Auto-calculate from profile"}
        </Button>
        {draftLines.length > 0 && (
          <span className="text-xs text-muted-foreground">
            Total: KES {total.toLocaleString("en-US", { maximumFractionDigits: 2 })}
          </span>
        )}
      </div>

      {draftLines.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block">
            Cost lines — edit to override
          </label>
          {draftLines.map((line, idx) => (
            <div key={idx} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium">
                    {PROCESSING_COST_CATEGORY_LABELS[line.category]}
                  </span>
                  <p className="text-xs text-muted-foreground">{line.label}</p>
                </div>
                {line.isOverride && (
                  <span className="text-[10px] rounded bg-amber-100 text-amber-700 px-1.5 py-0.5 font-medium">
                    Override
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs mb-1 block text-muted-foreground">
                    Amount (KES)
                    {line.ratePerUnit != null && line.basisQty != null && (
                      <span className="ml-1 opacity-70">
                        — {line.ratePerUnit.toLocaleString()} × {line.basisQty.toLocaleString(undefined, { maximumFractionDigits: 0 })} {line.rateUnit?.replace("per_", "")}
                      </span>
                    )}
                  </label>
                  <FormattedDecimalInput
                    className="h-9"
                    value={String(line.amount)}
                    onValueChange={(raw) => onLineAmountChange(idx, raw)}
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <p className="text-xs text-muted-foreground pb-2">Currency: KES</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onBack}>
          <Icons.ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back
        </Button>
        <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground">
          Skip (no processing costs)
        </Button>
        <Button size="sm" className="ml-auto" onClick={onNext} disabled={draftLines.length === 0 && processingType !== "manual"}>
          Next: Review summary <Icons.ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Step 4: Summary & Confirm ────────────────────────────────────────────────

function StepSummary({
  source,
  permitLines,
  logisticsLines,
  processingCostLines,
  fxRate,
  onBack,
  onJumpToStep,
  onSave,
  saving,
  canEdit,
  hasExistingAllocation,
}: {
  source: LandedCostSourceRow;
  permitLines: CostLine[];
  logisticsLines: CostLine[];
  processingCostLines: ProcessingCostDraftLine[];
  fxRate: FinancialExchangeRateRow | null;
  onBack: () => void;
  onJumpToStep: (step: WizardStep) => void;
  onSave: () => void;
  saving: boolean;
  canEdit: boolean;
  hasExistingAllocation: boolean;
}) {
  const currency = source.currency ?? "KES";
  const docTotal = (source as { totalAmount?: number; total?: number }).totalAmount ?? (source as { total?: number }).total ?? 0;
  const rate = fxRate?.rate ?? 1;
  const docInKes = currency.toUpperCase() === "KES" ? docTotal : docTotal * rate;

  const toKes = (amount: number, curr: string) => {
    if (curr.toUpperCase() === "KES") return amount;
    return amount * (fxRate?.rate ?? 1);
  };

  const permitTotal = permitLines
    .filter((l) => l.templateId && parseCostLineAmount(l.amount) > 0)
    .reduce((s, l) => s + toKes(parseCostLineAmount(l.amount), l.currency), 0);

  const logisticsTotal = logisticsLines
    .filter((l) => l.templateId && parseCostLineAmount(l.amount) > 0)
    .reduce((s, l) => s + toKes(parseCostLineAmount(l.amount), l.currency), 0);

  const processingCostTotal = processingCostLines.reduce((s, l) => s + l.amount, 0);

  const totalLanded = docInKes + permitTotal + logisticsTotal + processingCostTotal;

  const totalWeightKg = ((source as { lines?: Array<{ weightKg?: number; receivedWeightKg?: number; quantity?: number }> }).lines ?? []).reduce(
    (s, l) => s + (l.receivedWeightKg ?? l.weightKg ?? 0),
    0
  );
  const costPerKg = totalWeightKg > 0 ? totalLanded / totalWeightKg : null;
  const goodsPerKg = totalWeightKg > 0 ? docInKes / totalWeightKg : null;
  const permitsPerKg = totalWeightKg > 0 ? permitTotal / totalWeightKg : null;
  const logisticsPerKg = totalWeightKg > 0 ? logisticsTotal / totalWeightKg : null;
  const processingPerKg = totalWeightKg > 0 ? processingCostTotal / totalWeightKg : null;

  const hasValidLines =
    permitLines.some((l) => l.templateId && parseCostLineAmount(l.amount) > 0) ||
    logisticsLines.some((l) => l.templateId && parseCostLineAmount(l.amount) > 0) ||
    processingCostLines.some((l) => l.amount > 0);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-base">Step 5: Summary &amp; confirm</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Review the complete other costs breakdown before posting to inventory.
        </p>
      </div>

      {/* Breakdown table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                Cost centre
              </th>
              <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                Original amount
              </th>
              <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                In KES
              </th>
              <th className="px-3 py-2.5 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {/* Purchase value */}
            <tr>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Icons.ShoppingBag className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Purchase value</p>
                    <p className="text-xs text-muted-foreground">{source.number}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-right font-mono">
                {formatMoney(docTotal, currency)}
              </td>
              <td className="px-4 py-3 text-right font-mono font-medium">
                {formatMoney(docInKes, "KES")}
              </td>
              <td className="px-3 py-3" />
            </tr>

            {/* Permits */}
            <tr className={cn(permitTotal === 0 && "opacity-50")}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Icons.FileCheck className="h-4 w-4 text-amber-500" />
                  <div>
                    <p className="font-medium">Permits &amp; customs</p>
                    {permitLines.filter((l) => l.reference).map((l, i) => (
                      <p key={i} className="text-xs text-muted-foreground">Ref: {l.reference}</p>
                    ))}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-right font-mono">
                {permitLines
                  .filter((l) => l.templateId && parseCostLineAmount(l.amount) > 0)
                  .map((l, i) => (
                    <span key={i} className="block">{formatMoney(parseCostLineAmount(l.amount), l.currency)}</span>
                  ))}
                {permitLines.filter((l) => l.templateId && parseCostLineAmount(l.amount) > 0).length === 0 && (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-right font-mono font-medium">
                {formatMoney(permitTotal, "KES")}
              </td>
              <td className="px-3 py-3">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onJumpToStep(1)}>
                  <Icons.Pencil className="h-3 w-3" />
                </Button>
              </td>
            </tr>

            {/* Logistics */}
            <tr className={cn(logisticsTotal === 0 && "opacity-50")}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Icons.Truck className="h-4 w-4 text-emerald-500" />
                  <div>
                    <p className="font-medium">Inbound logistics</p>
                    {logisticsLines.filter((l) => l.reference).map((l, i) => (
                      <p key={i} className="text-xs text-muted-foreground">Ref: {l.reference}</p>
                    ))}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-right font-mono">
                {logisticsLines
                  .filter((l) => l.templateId && parseCostLineAmount(l.amount) > 0)
                  .map((l, i) => (
                    <span key={i} className="block">{formatMoney(parseCostLineAmount(l.amount), l.currency)}</span>
                  ))}
                {logisticsLines.filter((l) => l.templateId && parseCostLineAmount(l.amount) > 0).length === 0 && (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-right font-mono font-medium">
                {formatMoney(logisticsTotal, "KES")}
              </td>
              <td className="px-3 py-3">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onJumpToStep(2)}>
                  <Icons.Pencil className="h-3 w-3" />
                </Button>
              </td>
            </tr>

            {/* Processing costs */}
            <tr className={cn(processingCostTotal === 0 && "opacity-50")}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Icons.Factory className="h-4 w-4 text-violet-500" />
                  <div>
                    <p className="font-medium">Processing &amp; packing</p>
                    {processingCostLines.map((l, i) => (
                      <p key={i} className="text-xs text-muted-foreground">{l.label}</p>
                    ))}
                    {processingCostLines.length === 0 && (
                      <p className="text-xs text-muted-foreground">Not set</p>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-right font-mono">
                {processingCostLines.filter((l) => l.amount > 0).map((l, i) => (
                  <span key={i} className="block">{formatMoney(l.amount, l.currency)}</span>
                ))}
                {processingCostLines.filter((l) => l.amount > 0).length === 0 && (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-right font-mono font-medium">
                {formatMoney(processingCostTotal, "KES")}
              </td>
              <td className="px-3 py-3">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onJumpToStep(3)}>
                  <Icons.Pencil className="h-3 w-3" />
                </Button>
              </td>
            </tr>
          </tbody>
          <tfoot className="border-t bg-muted/30">
            <tr>
              <td className="px-4 py-3 font-bold">Total cost</td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3 text-right font-bold text-primary text-base">
                {formatMoney(totalLanded, "KES")}
              </td>
              <td className="px-3 py-3" />
            </tr>
            {totalWeightKg > 0 && (
              <tr>
                <td className="px-4 py-2.5 text-sm text-muted-foreground">
                  Total weight ({totalWeightKg.toLocaleString()} kg)
                </td>
                <td className="px-4 py-2.5" />
                <td className="px-4 py-2.5 text-right font-semibold text-emerald-600 text-sm">
                  {costPerKg !== null ? `KES ${costPerKg.toFixed(2)} / kg` : "—"}
                </td>
                <td className="px-3 py-2.5" />
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      {/* Per-kg cost breakdown — only shown when weight data is available */}
      {totalWeightKg > 0 && costPerKg !== null && (
        <div className="rounded-lg border overflow-hidden">
          <div className="bg-muted/50 px-4 py-2.5 flex items-center gap-2">
            <Icons.Scale className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              New cost per kg — {totalWeightKg.toLocaleString()} kg total
            </span>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y">
              <tr>
                <td className="px-4 py-2.5 text-muted-foreground">Goods value</td>
                <td className="px-4 py-2.5 text-right tabular-nums font-mono text-muted-foreground">
                  {formatMoney(docInKes, "KES")}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums font-mono">
                  {goodsPerKg !== null ? `KES ${goodsPerKg.toFixed(2)} / kg` : "—"}
                </td>
              </tr>
              {permitTotal > 0 && (
                <tr>
                  <td className="px-4 py-2.5 text-muted-foreground">Permits &amp; customs</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-mono text-muted-foreground">
                    {formatMoney(permitTotal, "KES")}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-mono">
                    {permitsPerKg !== null ? `KES ${permitsPerKg.toFixed(2)} / kg` : "—"}
                  </td>
                </tr>
              )}
              {logisticsTotal > 0 && (
                <tr>
                  <td className="px-4 py-2.5 text-muted-foreground">Inbound logistics</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-mono text-muted-foreground">
                    {formatMoney(logisticsTotal, "KES")}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-mono">
                    {logisticsPerKg !== null ? `KES ${logisticsPerKg.toFixed(2)} / kg` : "—"}
                  </td>
                </tr>
              )}
              {processingCostTotal > 0 && (
                <tr>
                  <td className="px-4 py-2.5 text-muted-foreground">Processing &amp; packing</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-mono text-muted-foreground">
                    {formatMoney(processingCostTotal, "KES")}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-mono">
                    {processingPerKg !== null ? `KES ${processingPerKg.toFixed(2)} / kg` : "—"}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="border-t bg-emerald-50 dark:bg-emerald-950/30">
              <tr>
                <td className="px-4 py-3 font-bold text-emerald-700 dark:text-emerald-400">
                  Cost per kg (incl. other costs)
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-mono text-muted-foreground">
                  {formatMoney(totalLanded, "KES")}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-bold text-emerald-700 dark:text-emerald-400 text-base">
                  KES {costPerKg.toFixed(2)} / kg
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Per-product cost/kg allocation — shown when there are multiple lines with weight data */}
      {totalWeightKg > 0 && ((source as { lines?: Array<{ productId?: string; weightKg?: number; quantity?: number; amount?: number }> }).lines?.length ?? 0) > 1 && (
        <div className="rounded-lg border overflow-hidden">
          <div className="bg-muted/50 px-4 py-2.5 flex items-center gap-2">
            <Icons.Layers className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Per-product other cost allocation
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="text-left px-4 py-2 font-medium">Product</th>
                <th className="text-right px-4 py-2 font-medium">Weight (kg)</th>
                <th className="text-right px-4 py-2 font-medium">Goods</th>
                <th className="text-right px-4 py-2 font-medium">Other cost share</th>
                <th className="text-right px-4 py-2 font-medium">Cost / kg</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {((source as { lines?: Array<{ productId?: string; weightKg?: number; quantity?: number; amount?: number }> }).lines ?? []).map((line, idx) => {
                const lineWeight = (line as { receivedWeightKg?: number; weightKg?: number }).receivedWeightKg ?? line.weightKg ?? line.quantity ?? 0;
                const lineGoods = line.amount ?? 0;
                const landedShare = totalWeightKg > 0 ? ((permitTotal + logisticsTotal) * lineWeight) / totalWeightKg : 0;
                const fxShare = totalWeightKg > 0 ? ((docInKes - (currency.toUpperCase() === "KES" ? docTotal : 0)) * lineWeight) / totalWeightKg : 0;
                const totalForLine = lineGoods * (currency.toUpperCase() === "KES" ? 1 : rate) + landedShare + (currency.toUpperCase() !== "KES" ? fxShare : 0);
                const linePerKg = lineWeight > 0 ? totalForLine / lineWeight : null;
                return (
                  <tr key={idx}>
                    <td className="px-4 py-2 text-muted-foreground">{line.productId ?? `Line ${idx + 1}`}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{lineWeight > 0 ? lineWeight.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-mono">{formatMoney(lineGoods, currency)}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-mono text-amber-700">{landedShare > 0 ? `+${formatMoney(landedShare, "KES")}` : "—"}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-semibold">{linePerKg !== null ? `KES ${linePerKg.toFixed(2)}` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!hasValidLines && (
        <div className="flex items-start gap-2 rounded-md border bg-amber-50 border-amber-100 px-3 py-2">
          <Icons.AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            No additional cost lines entered. You can still save to record a zero-cost entry, or go back to add permit
            or logistics costs.
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onBack}>
          <Icons.ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back
        </Button>
        <Button
          size="sm"
          className="ml-auto"
          onClick={onSave}
          disabled={saving || (hasExistingAllocation && !canEdit)}
          title={hasExistingAllocation && !canEdit ? "Only an administrator can modify an existing allocation" : undefined}
        >
          {saving ? (
            <><Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" /> Posting…</>
          ) : (
            <><Icons.Check className="mr-2 h-4 w-4" /> Post other costs</>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Landed Cost Allocation Wizard (Sheet body) ───────────────────────────────

function LandedCostWizard({
  source,
  templates,
  canEdit,
  onDone,
  onCancel,
}: {
  source: LandedCostSourceRow;
  templates: LandedCostTemplateRow[];
  /** True if the current user is an admin who may overwrite an existing allocation. */
  canEdit: boolean;
  onDone: () => void;
  onCancel: () => void;
}) {
  const currency = source.currency ?? "KES";

  const [wizardStep, setWizardStep] = React.useState<WizardStep>(0);
  const [fxRate, setFxRate] = React.useState<FinancialExchangeRateRow | null>(null);
  const [fxLoading, setFxLoading] = React.useState(false);
  const [fxError, setFxError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [hydrating, setHydrating] = React.useState(source.isAllocated ?? false);
  const [hasExistingAllocation, setHasExistingAllocation] = React.useState(false);

  const defaultPermitCurrency = currency.toUpperCase() !== "KES" ? currency : "KES";
  const defaultLogisticsCurrency = "KES";

  const emptyPermitLine = (): CostLine => ({
    templateId: templates.find((t) => (t as { type?: string }).type === "permit")?.id ?? "",
    amount: "",
    currency: defaultPermitCurrency,
    reference: "",
    costCentre: "permits",
  });

  const emptyLogisticsLine = (): CostLine => ({
    templateId: templates.find((t) => (t as { type?: string }).type === "inbound_freight")?.id ?? "",
    amount: "",
    currency: defaultLogisticsCurrency,
    reference: "",
    costCentre: "inbound_logistics",
  });

  const [permitLines, setPermitLines] = React.useState<CostLine[]>([emptyPermitLine()]);
  const [logisticsLines, setLogisticsLines] = React.useState<CostLine[]>([emptyLogisticsLine()]);

  // Processing cost state
  const [processingType, setProcessingType] = React.useState<ProcessingType>("filleting");
  const [processingDraftResult, setProcessingDraftResult] = React.useState<ProcessingCostDraftResult | null>(null);
  const [processingLines, setProcessingLines] = React.useState<ProcessingCostDraftLine[]>([]);
  const [loadingDraft, setLoadingDraft] = React.useState(false);

  const handleLoadProcessingDraft = React.useCallback(async () => {
    setLoadingDraft(true);
    try {
      const result = await fetchProcessingCostDraft(source.id, processingType);
      if (result?.draft) {
        setProcessingDraftResult(result.draft);
        setProcessingLines(result.draft.lines.map((l) => ({ ...l })));
      }
    } catch {
      toast.error("Failed to calculate processing costs.");
    } finally {
      setLoadingDraft(false);
    }
  }, [source.id, processingType]);

  const handleProcessingLineAmountChange = React.useCallback((idx: number, raw: string) => {
    const n = parseDecimalString(raw);
    const amount = Number.isFinite(n) ? n : 0;
    setProcessingLines((prev) =>
      prev.map((l, i) => i === idx ? { ...l, amount, isOverride: true } : l)
    );
  }, []);

  // Hydrate from existing allocation when document is already allocated
  React.useEffect(() => {
    if (!source.isAllocated) return;
    setHydrating(true);
    Promise.all([
      fetchLandedCostAllocation(source.id),
      fetchProcessingCostAllocation(source.id),
    ])
      .then(([allocation, processingAlloc]) => {
        if (allocation) {
          setHasExistingAllocation(true);
          const savedPermitLines = (allocation.lines ?? []).filter((l) => l.costCentre === "permits");
          const savedLogisticsLines = (allocation.lines ?? []).filter((l) => l.costCentre === "inbound_logistics");
          if (savedPermitLines.length > 0) {
            setPermitLines(
              savedPermitLines.map((l) => ({
                templateId: l.templateId,
                amount: String(l.amount ?? ""),
                currency: l.currency ?? defaultPermitCurrency,
                reference: l.reference ?? "",
                costCentre: "permits" as const,
              }))
            );
          }
          if (savedLogisticsLines.length > 0) {
            setLogisticsLines(
              savedLogisticsLines.map((l) => ({
                templateId: l.templateId,
                amount: String(l.amount ?? ""),
                currency: l.currency ?? defaultLogisticsCurrency,
                reference: l.reference ?? "",
                costCentre: "inbound_logistics" as const,
              }))
            );
          }
        }
        if (processingAlloc) {
          setProcessingType(processingAlloc.processingType);
          setProcessingLines(
            processingAlloc.lines.map((l) => ({
              category: l.category,
              label: l.label,
              amount: l.amount,
              currency: l.currency,
              ratePerUnit: l.ratePerUnit,
              rateUnit: l.rateUnit,
              basisQty: l.basisQty,
              isOverride: l.isOverride,
            }))
          );
        }
      })
      .catch(() => { /* Non-fatal */ })
      .finally(() => setHydrating(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.id, source.isAllocated]);

  // Fetch FX rate on mount if needed
  React.useEffect(() => {
    if (currency.toUpperCase() === "KES") return;
    setFxLoading(true);
    setFxError(null);
    fetchSavedExchangeRateApi({
      fromCurrency: currency.toUpperCase(),
      toCurrency: "KES",
      date: source.date ? String(source.date).slice(0, 10) : undefined,
    })
      .then((rate) => setFxRate(rate))
      .catch(() => setFxError(`No ${currency} → KES rate found. Go to Settings → Exchange Rates to add one.`))
      .finally(() => setFxLoading(false));
  }, [currency, source.date]);

  const updateLine = (lines: CostLine[], setLines: React.Dispatch<React.SetStateAction<CostLine[]>>) =>
    (idx: number, field: keyof CostLine, value: string) => {
      setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
    };

  const updateLineFiles = (setLines: React.Dispatch<React.SetStateAction<CostLine[]>>) =>
    (idx: number, files: File[]) => {
      setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, files } : l)));
    };

  const addLine = (setLines: React.Dispatch<React.SetStateAction<CostLine[]>>, costCentre: LandedCostCostCentre, defaultCurrency: string) =>
    () => setLines((prev) => [...prev, { templateId: "", amount: "", currency: defaultCurrency, reference: "", costCentre }]);

  const removeLine = (setLines: React.Dispatch<React.SetStateAction<CostLine[]>>) =>
    (idx: number) => setLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const handleSave = async () => {
    if (hasExistingAllocation && !canEdit) {
      toast.error("Only an administrator can modify an existing allocation.");
      return;
    }

    const landedLines = [
      ...permitLines.filter((l) => l.templateId && parseCostLineAmount(l.amount) > 0),
      ...logisticsLines.filter((l) => l.templateId && parseCostLineAmount(l.amount) > 0),
    ];
    const processingLinesValid = processingLines.filter((l) => l.amount > 0);

    if (!landedLines.length && !processingLinesValid.length) {
      toast.info("No cost lines with amounts entered. Add at least one cost to save.");
      return;
    }

    setSaving(true);
    try {
      // Save landed costs (permits + inbound logistics)
      if (landedLines.length > 0) {
        const result = await postLandedCostAllocation({
          sourceId: source.id,
          lines: landedLines.map((l) => ({
            templateId: l.templateId,
            amount: parseCostLineAmount(l.amount),
            currency: l.currency,
            reference: l.reference || undefined,
            costCentre: l.costCentre,
          })),
        });
        // Upload evidence files
        if (result.id) {
          const fileTasks: Array<Promise<unknown>> = [];
          landedLines.forEach((line, lineIndex) => {
            for (const file of line.files ?? []) {
              fileTasks.push(
                uploadLandedCostAttachment(result.id!, lineIndex, file).catch((err: unknown) => {
                  console.warn("[landed-cost] attachment upload failed:", err);
                })
              );
            }
          });
          if (fileTasks.length > 0) await Promise.all(fileTasks);
        }
      }

      // Save processing costs
      if (processingLinesValid.length > 0) {
        await saveProcessingCostAllocation({
          sourceId: source.id,
          processingType,
          lines: processingLinesValid.map((l) => ({
            category: l.category,
            label: l.label,
            amount: l.amount,
            currency: l.currency,
            ratePerUnit: l.ratePerUnit,
            rateUnit: l.rateUnit,
            basisQty: l.basisQty,
            isOverride: l.isOverride,
          })),
          formulaSnapshot: processingDraftResult ?? undefined,
        });
      }

      const totalOtherCosts =
        landedLines.reduce((s, l) => s + parseCostLineAmount(l.amount), 0) +
        processingLinesValid.reduce((s, l) => s + l.amount, 0);
      toast.success(
        `Other costs saved for ${source.number} — KES ${totalOtherCosts.toLocaleString("en-US", { maximumFractionDigits: 2 })} total. Run costing to update valuations.`,
        { duration: 6000 }
      );
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save other costs.");
    } finally {
      setSaving(false);
    }
  };

  if (hydrating) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-3">
        <Icons.Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading existing allocation…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Source context bar */}
      <div className="rounded-lg border bg-muted/30 p-3 text-sm mb-5">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-semibold">{source.number}</span>
            <span className="text-muted-foreground ml-2 text-xs uppercase">{source.type}</span>
          </div>
          <span className="font-medium">
            {formatMoney(
              (source as { totalAmount?: number; total?: number }).totalAmount ?? (source as { total?: number }).total ?? 0,
              currency
            )}
          </span>
        </div>
        {currency.toUpperCase() !== "KES" && (
          <p className="text-xs text-muted-foreground mt-1">
            Cross-border document in {currency} — exchange rate required
          </p>
        )}
      </div>

      {/* Non-admin gate: show read-only warning when allocation exists and user cannot edit */}
      {hasExistingAllocation && !canEdit && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 mb-4 text-xs text-amber-800">
          <Icons.Lock className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
          <span>
            This allocation has already been saved. Only an administrator can modify it. You can review the lines below but cannot save changes.
          </span>
        </div>
      )}

      <WizardStepIndicator current={wizardStep} />

      <div className="flex-1">
        {wizardStep === 0 && (
          <StepFxConversion
            source={source}
            fxRate={fxRate}
            fxLoading={fxLoading}
            fxError={fxError}
            onNext={() => setWizardStep(1)}
          />
        )}
        {wizardStep === 1 && (
          <StepPermits
            lines={permitLines}
            templates={templates}
            onChange={updateLine(permitLines, setPermitLines)}
            onFilesChange={updateLineFiles(setPermitLines)}
            onAdd={addLine(setPermitLines, "permits", defaultPermitCurrency)}
            onRemove={removeLine(setPermitLines)}
            onNext={() => setWizardStep(2)}
            onBack={() => setWizardStep(0)}
            onSkip={() => setWizardStep(2)}
          />
        )}
        {wizardStep === 2 && (
          <StepLogistics
            lines={logisticsLines}
            templates={templates}
            onChange={updateLine(logisticsLines, setLogisticsLines)}
            onFilesChange={updateLineFiles(setLogisticsLines)}
            onAdd={addLine(setLogisticsLines, "inbound_logistics", defaultLogisticsCurrency)}
            onRemove={removeLine(setLogisticsLines)}
            onNext={() => setWizardStep(3)}
            onBack={() => setWizardStep(1)}
            onSkip={() => setWizardStep(3)}
          />
        )}
        {wizardStep === 3 && (
          <StepProcessingCosts
            sourceId={source.id}
            processingType={processingType}
            onProcessingTypeChange={(t) => {
              setProcessingType(t);
              setProcessingLines([]);
              setProcessingDraftResult(null);
            }}
            draftLines={processingLines}
            onLoadDraft={handleLoadProcessingDraft}
            loadingDraft={loadingDraft}
            onLineAmountChange={handleProcessingLineAmountChange}
            onNext={() => setWizardStep(4)}
            onBack={() => setWizardStep(2)}
            onSkip={() => setWizardStep(4)}
          />
        )}
        {wizardStep === 4 && (
          <StepSummary
            source={source}
            permitLines={permitLines}
            logisticsLines={logisticsLines}
            processingCostLines={processingLines}
            fxRate={fxRate}
            onBack={() => setWizardStep(3)}
            onJumpToStep={(s) => setWizardStep(s)}
            onSave={handleSave}
            saving={saving}
            canEdit={canEdit}
            hasExistingAllocation={hasExistingAllocation}
          />
        )}
      </div>

      {/* Cancel link */}
      <div className="pt-4 border-t mt-4">
        <Button variant="ghost" size="sm" className="text-muted-foreground w-full" onClick={onCancel}>
          Cancel — I&apos;ll come back to this later
        </Button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function InventoryCostingPage() {
  const hasCashWeightAudit = useOrgContextStore((s) => s.hasFlag?.("procurementAuditCashWeight") ?? false);
  const isPlatformOperator = useAuthStore((s) => s.isPlatformOperator);
  const authPermissions = useAuthStore((s) => s.permissions);
  // Admin = platform operator or any user with admin.settings permission
  const canEditAllocated = isPlatformOperator || authPermissions.includes("admin.settings");
  const [warehouseFilter, setWarehouseFilter] = React.useState("ALL");
  const [allocationOpen, setAllocationOpen] = React.useState(false);
  const [selectedSource, setSelectedSource] = React.useState<LandedCostSourceRow | null>(null);
  const [sources, setSources] = React.useState<LandedCostSourceRow[]>([]);
  const [templates, setTemplates] = React.useState<LandedCostTemplateRow[]>([]);
  const [sourcesLoading, setSourcesLoading] = React.useState(true);
  const [runCostingLoading, setRunCostingLoading] = React.useState(false);
  const [costingSnapshot, setCostingSnapshot] = React.useState<{
    ranAt: string | null;
    method: string;
    updated: number;
    totalValue: number;
  }>({ ranAt: null, method: "WEIGHTED_AVERAGE", updated: 0, totalValue: 0 });
  const [valuationSummary, setValuationSummary] = React.useState<
    Array<{ warehouseId: string; warehouse: string; skuCount: number; totalQty: number; totalValue: number }>
  >([]);
  const [allocations, setAllocations] = React.useState(() => listLandedCostAllocations());

  const summary = React.useMemo(
    () => valuationSummary.filter((row) => warehouseFilter === "ALL" || row.warehouseId === warehouseFilter),
    [valuationSummary, warehouseFilter]
  );
  const warehouses = React.useMemo(
    () => Array.from(new Set(summary.map((s) => s.warehouse))),
    [summary]
  );

  const searchParams = useSearchParams();
  // Accept either ?sourceId= or ?grnId= (GRN list uses grnId, detail uses sourceId)
  const sourceIdFromUrl = searchParams.get("sourceId") ?? searchParams.get("grnId");

  const loadSources = React.useCallback(() => {
    let cancelled = false;
    setSourcesLoading(true);
    Promise.all([fetchLandedCostSources({ type: "grn" }), fetchLandedCostTemplates()])
      .then(([srcList, tplList]) => {
        if (!cancelled) {
          setSources(srcList);
          setTemplates(tplList);
        }
      })
      .catch(() => { if (!cancelled) setSources([]); })
      .finally(() => { if (!cancelled) setSourcesLoading(false); });
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    return loadSources();
  }, [loadSources]);

  React.useEffect(() => {
    if (sourceIdFromUrl && sources.length > 0) {
      const src = sources.find((s) => s.id === sourceIdFromUrl);
      if (src) {
        setSelectedSource(src);
        setAllocationOpen(true);
        window.history.replaceState({}, "", "/inventory/costing");
      }
    }
  }, [sourceIdFromUrl, sources]);

  React.useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchInventoryValuation(), fetchLatestInventoryCosting()])
      .then(([valuation, snapshot]) => {
        if (cancelled) return;
        setValuationSummary(valuation.summary);
        setCostingSnapshot({
          ranAt: snapshot.ranAt,
          method: snapshot.method,
          updated: snapshot.updated,
          totalValue: snapshot.totalValue,
        });
      })
      .catch(() => { if (!cancelled) setValuationSummary([]); });
    return () => { cancelled = true; };
  }, []);

  const openAllocation = (src: LandedCostSourceRow) => {
    setSelectedSource(src);
    setAllocationOpen(true);
  };

  const handleWizardDone = () => {
    setAllocationOpen(false);
    setSelectedSource(null);
    setAllocations(listLandedCostAllocations());
    loadSources();
  };

  return (
    <PageShell>
      <PageHeader
        title="Inventory costing"
        description="Apply other costs and run inventory valuation"
        breadcrumbs={[
          { label: "Inventory", href: "/inventory/products" },
          { label: "Costing" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              disabled={runCostingLoading}
              onClick={async () => {
                setRunCostingLoading(true);
                try {
                  await runInventoryCostingApi();
                  const [valuation, snapshot] = await Promise.all([
                    fetchInventoryValuation(),
                    fetchLatestInventoryCosting(),
                  ]);
                  setValuationSummary(valuation.summary);
                  setCostingSnapshot({
                    ranAt: snapshot.ranAt,
                    method: snapshot.method,
                    updated: snapshot.updated,
                    totalValue: snapshot.totalValue,
                  });
                  toast.success("Costing run completed — valuations updated.");
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setRunCostingLoading(false);
                }
              }}
            >
              <Icons.Play className="mr-2 h-4 w-4" />
              Run costing
            </Button>
            {hasCashWeightAudit && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/purchasing/cash-weight-audit">Cash-to-weight audit</Link>
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/purchasing/sourcing-flow">
                <Icons.Map className="mr-2 h-4 w-4" />
                Sourcing journey
              </Link>
            </Button>
            <ExplainThis
              prompt="Explain inventory costing, FIFO vs weighted average, and other cost allocation including multi-currency."
              label="Explain costing"
            />
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/inventory/costing">Costing settings</Link>
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Guidance banner */}
        {sources.length > 0 && (() => {
          const pendingCount = sources.filter((s) => !s.isAllocated).length;
          const allocatedCount = sources.filter((s) => s.isAllocated).length;
          if (pendingCount === 0 && allocatedCount > 0) {
            return (
              <div className="flex items-start gap-3 rounded-lg border bg-emerald-50 border-emerald-200 px-4 py-3">
                <Icons.CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    All {allocatedCount} document{allocatedCount !== 1 ? "s" : ""} have other costs allocated
                  </p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    {canEditAllocated
                      ? "As an admin you can edit any allocation using the Edit button on each row."
                      : "Contact your administrator to amend an existing allocation."}
                  </p>
                </div>
              </div>
            );
          }
          return (
            <div className="flex items-start gap-3 rounded-lg border bg-primary/5 border-primary/20 px-4 py-3">
              <Icons.Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">
                  {pendingCount} document{pendingCount !== 1 ? "s" : ""} pending other cost allocation
                  {allocatedCount > 0 && <span className="ml-2 font-normal text-muted-foreground">({allocatedCount} already allocated)</span>}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Click <strong>Allocate</strong> on any row below to open the guided wizard.
                </p>
              </div>
            </div>
          );
        })()}

        {/* Stock valuation summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Stock valuation summary</CardTitle>
              <CardDescription>
                By warehouse — values include all posted other cost allocations.
                {costingSnapshot.ranAt && (
                  <span className="ml-1 text-muted-foreground">
                    Last run: {new Date(costingSnapshot.ranAt).toLocaleString()} · {costingSnapshot.method}
                  </span>
                )}
              </CardDescription>
            </div>
            <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All warehouses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All warehouses</SelectItem>
                {warehouses.map((w) => (
                  <SelectItem key={w} value={w}>{w}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>SKU count</TableHead>
                  <TableHead>Total qty</TableHead>
                  <TableHead>Total value (KES)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.map((r) => (
                  <TableRow key={r.warehouseId}>
                    <TableCell className="font-medium">{r.warehouse}</TableCell>
                    <TableCell>{r.skuCount}</TableCell>
                    <TableCell>{r.totalQty}</TableCell>
                    <TableCell>{formatMoney(r.totalValue, "KES")}</TableCell>
                  </TableRow>
                ))}
                {summary.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                      No valuation data — run costing to generate.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Landed cost allocation sources */}
        <Card>
          <CardHeader>
            <CardTitle>Other costs allocation</CardTitle>
            <CardDescription>
              Select a GRN or Bill and use the guided wizard to allocate currency conversion, permits, and inbound
              logistics. Costs are distributed by weight and posted to GL automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt (GRN)</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Goods value</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((s) => (
                  <TableRow key={s.id} className={s.isAllocated ? "opacity-80" : undefined}>
                    <TableCell className="font-medium">{s.number}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.date ? new Date(String(s.date)).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>{s.supplier ?? "—"}</TableCell>
                    <TableCell>
                      {(s.currency ?? "KES") !== "KES" ? (
                        <Badge variant="secondary">{s.currency}</Badge>
                      ) : (
                        <span className="text-muted-foreground">KES</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {formatMoney(
                        (s as { totalAmount?: number; total?: number }).totalAmount ?? (s as { total?: number }).total ?? 0,
                        s.currency ?? "KES"
                      )}
                    </TableCell>
                    <TableCell>
                      {s.isAllocated ? (
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-emerald-700 border-emerald-200 bg-emerald-50 gap-1 whitespace-nowrap"
                          >
                            <Icons.CheckCircle2 className="h-3 w-3" />
                            Allocated
                          </Badge>
                          {canEditAllocated && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openAllocation(s)}
                              className="whitespace-nowrap h-7 text-xs"
                              title="Edit existing allocation (admin)"
                            >
                              <Icons.Pencil className="mr-1 h-3 w-3" />
                              Edit
                            </Button>
                          )}
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => openAllocation(s)}
                          className="whitespace-nowrap"
                        >
                          <Icons.Sparkles className="mr-1.5 h-3.5 w-3.5" />
                          Allocate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {sourcesLoading && (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <Icons.Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                Loading sources…
              </div>
            )}
            {!sourcesLoading && sources.length === 0 && (
              <div className="py-10 text-center space-y-2">
                <Icons.Package className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No goods receipts pending other cost allocation.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/inventory/receipts">View all GRNs</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Costing activity */}
        <Card>
          <CardHeader>
            <CardTitle>Costing activity</CardTitle>
            <CardDescription>Recent other cost allocations and costing runs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="font-medium mb-1">Recent allocations</p>
              {allocations.length === 0 ? (
                <p className="text-muted-foreground text-sm">No allocations recorded yet.</p>
              ) : (
                allocations.slice(0, 5).map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div>
                      <span className="font-medium text-xs">{a.sourceId}</span>
                      <span className="text-muted-foreground text-xs ml-2">· {a.lines.length} line(s)</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(a.postedAt).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div>
              <p className="font-medium mb-1">Last costing run</p>
              {!costingSnapshot.ranAt ? (
                <p className="text-muted-foreground text-sm">No costing runs executed yet. Click &quot;Run costing&quot; above.</p>
              ) : (
                <p className="text-muted-foreground text-sm">
                  {costingSnapshot.method} · {costingSnapshot.updated} stock levels updated ·{" "}
                  {formatMoney(costingSnapshot.totalValue, "KES")} total value ·{" "}
                  {new Date(costingSnapshot.ranAt).toLocaleString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wizard Sheet */}
      <Sheet open={allocationOpen} onOpenChange={(open) => { if (!open) { setAllocationOpen(false); setSelectedSource(null); } }}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto flex flex-col">
          <SheetHeader className="mb-2">
            <SheetTitle className="flex items-center gap-2">
              <Icons.Sparkles className="h-5 w-5 text-primary" />
              {selectedSource?.isAllocated ? "Edit other cost allocation" : "Other costs wizard"}
            </SheetTitle>
            <SheetDescription>
              {selectedSource?.isAllocated
                ? "You are amending an existing allocation. Changes will overwrite the previously posted costs."
                : "Apply currency conversion, permit costs, and inbound logistics in three guided steps."}
            </SheetDescription>
          </SheetHeader>

          {selectedSource?.isAllocated && (
            <div className="flex items-start gap-2 rounded-md border bg-amber-50 border-amber-200 px-3 py-2 mb-2 mx-0">
              <Icons.AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                <strong>Admin edit:</strong> This document already has other costs allocated. Saving will replace the existing allocation and re-post the GL entries.
              </p>
            </div>
          )}

          {selectedSource && templates.length > 0 ? (
            <div className="flex-1 overflow-y-auto pt-2">
              <LandedCostWizard
                source={selectedSource}
                templates={templates}
                canEdit={canEditAllocated}
                onDone={handleWizardDone}
                onCancel={() => { setAllocationOpen(false); setSelectedSource(null); }}
              />
            </div>
          ) : selectedSource && !sourcesLoading ? (
            <div className="py-10 text-center space-y-3">
              <Icons.AlertCircle className="h-8 w-8 mx-auto text-amber-500" />
              <p className="text-sm text-muted-foreground">No cost templates found.</p>
              <p className="text-xs text-muted-foreground">
                Create permit, border, and inbound freight templates in{" "}
                <Link href="/settings/inventory/costing" className="underline">
                  Settings → Costing
                </Link>{" "}
                first.
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/settings/inventory/costing">Set up templates</Link>
              </Button>
            </div>
          ) : (
            <div className="py-10 text-center">
              <Icons.Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
