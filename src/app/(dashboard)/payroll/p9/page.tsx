"use client";

import * as React from "react";
import Link from "next/link";
import { LIST_PAGE_SHELL_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
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
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import {
  fetchP9ListApi,
  fetchP9ByEmployeeApi,
  generateP9Api,
  p9PdfUrl,
  type P9CertRow,
  type P9CertDetail,
  type P9MonthRow,
} from "@/lib/api/payroll";
import { downloadFile, isApiConfigured } from "@/lib/api/client";
import { formatMoney } from "@/lib/money";
import { downloadCsv } from "@/lib/export/csv";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => currentYear - i);

function P9MonthTable({ months, currency = "KES" }: { months: P9MonthRow[]; currency?: string }) {
  const fmt = (n: number) =>
    n === 0
      ? <span className="text-muted-foreground">—</span>
      : <span className="tabular-nums">{formatMoney(n, currency)}</span>;

  const monthByNum = new Map(months.map((m) => [m.month, m]));
  const totals: P9MonthRow = months.reduce(
    (acc, m) => ({
      month: 0,
      basicSalary: acc.basicSalary + m.basicSalary,
      benefitsInKind: acc.benefitsInKind + m.benefitsInKind,
      valueOfQuarters: acc.valueOfQuarters + m.valueOfQuarters,
      totalGross: acc.totalGross + m.totalGross,
      pension: acc.pension + m.pension,
      prmf: acc.prmf + m.prmf,
      ahl: acc.ahl + m.ahl,
      shif: acc.shif + m.shif,
      ownerOccupiedInterest: acc.ownerOccupiedInterest + m.ownerOccupiedInterest,
      chargeablePay: acc.chargeablePay + m.chargeablePay,
      personalRelief: acc.personalRelief + m.personalRelief,
      insuranceRelief: acc.insuranceRelief + m.insuranceRelief,
      taxBeforeRelief: acc.taxBeforeRelief + m.taxBeforeRelief,
      netPaye: acc.netPaye + m.netPaye,
    }),
    {
      month: 0, basicSalary: 0, benefitsInKind: 0, valueOfQuarters: 0,
      totalGross: 0, pension: 0, prmf: 0, ahl: 0, shif: 0,
      ownerOccupiedInterest: 0, chargeablePay: 0, personalRelief: 0,
      insuranceRelief: 0, taxBeforeRelief: 0, netPaye: 0,
    }
  );

  const cols: Array<{ key: keyof P9MonthRow; label: string; col: string }> = [
    { key: "basicSalary",       label: "A — Basic salary",      col: "A" },
    { key: "totalGross",        label: "E — Total gross",        col: "E" },
    { key: "pension",           label: "F — NSSF (pension)",     col: "F" },
    { key: "ahl",               label: "H — AHL",                col: "H" },
    { key: "shif",              label: "I — SHIF",               col: "I" },
    { key: "chargeablePay",     label: "K — Chargeable pay",     col: "K" },
    { key: "personalRelief",    label: "L — Personal relief",    col: "L" },
    { key: "taxBeforeRelief",   label: "N — Tax before relief",  col: "N" },
    { key: "netPaye",           label: "O — Net PAYE charged",   col: "O" },
  ];

  return (
    <div className="overflow-x-auto rounded-lg border text-xs">
      <table className="w-full min-w-[640px]">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-3 py-2 text-left font-semibold sticky left-0 bg-muted/40 w-20">Month</th>
            {cols.map((c) => (
              <th key={c.key} className="px-2 py-2 text-right font-semibold text-muted-foreground whitespace-nowrap">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MONTH_NAMES.map((name, idx) => {
            const m = monthByNum.get(idx + 1);
            const isEmpty = !m;
            return (
              <tr key={name} className={`border-b last:border-0 ${isEmpty ? "opacity-40" : ""} hover:bg-muted/20 transition-colors`}>
                <td className="px-3 py-1.5 font-medium sticky left-0 bg-background">{name}</td>
                {cols.map((c) => (
                  <td key={c.key} className="px-2 py-1.5 text-right">
                    {m ? fmt(m[c.key] as number) : <span className="text-muted-foreground">—</span>}
                  </td>
                ))}
              </tr>
            );
          })}
          <tr className="border-t-2 bg-muted/30 font-semibold">
            <td className="px-3 py-2 sticky left-0 bg-muted/30">Total</td>
            {cols.map((c) => (
              <td key={c.key} className="px-2 py-2 text-right text-primary">
                {fmt(totals[c.key] as number)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function P9FormsPage() {
  const [year, setYear] = React.useState(currentYear);
  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);
  const [certs, setCerts] = React.useState<P9CertRow[]>([]);
  const [search, setSearch] = React.useState("");
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detail, setDetail] = React.useState<P9CertDetail | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);

  const load = React.useCallback(async (y: number) => {
    setLoading(true);
    try {
      const res = await fetchP9ListApi(y);
      setCerts(res.items);
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to load P9 certificates");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(year); }, [year, load]);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return certs;
    const q = search.toLowerCase();
    return certs.filter(
      (c) =>
        (c.employeeName ?? "").toLowerCase().includes(q) ||
        (c.employeePin ?? "").toLowerCase().includes(q)
    );
  }, [certs, search]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await generateP9Api(year);
      toast.success(`P9 cards generated for ${res.generated} employee${res.generated !== 1 ? "s" : ""} (${year}).`);
      await load(year);
    } catch (e) {
      toast.error((e as Error).message ?? "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenDetail = async (cert: P9CertRow) => {
    setDetail(null);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const d = await fetchP9ByEmployeeApi(cert.employeeId, year);
      setDetail(d);
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to load P9 detail");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDownloadPdf = (cert: P9CertRow) => {
    if (!isApiConfigured()) {
      toast.info("API not configured. Connect to download the PDF.");
      return;
    }
    const url = p9PdfUrl(cert.employeeId, year);
    const filename = `p9-${cert.employeeName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}-${year}.pdf`;
    downloadFile(url, filename, (msg) => toast.info(msg ?? "PDF not yet available."));
  };

  const columns = React.useMemo(
    () => [
      {
        id: "employee",
        header: "Employee",
        accessor: (r: P9CertRow) => (
          <div>
            <p className="font-medium">{r.employeeName}</p>
            {r.employeePin && <p className="text-xs text-muted-foreground">{r.employeePin}</p>}
          </div>
        ),
        sticky: true,
      },
      {
        id: "months",
        header: "Months",
        accessor: (r: P9CertRow) => (
          <Badge variant="outline">{r.monthsCovered} / 12</Badge>
        ),
      },
      {
        id: "chargeable",
        header: "Total chargeable pay",
        accessor: (r: P9CertRow) => (
          <span className="tabular-nums">{formatMoney(r.totalChargeablePay, "KES")}</span>
        ),
      },
      {
        id: "tax",
        header: "Total PAYE",
        accessor: (r: P9CertRow) => (
          <span className="tabular-nums font-medium">{formatMoney(r.totalTax, "KES")}</span>
        ),
      },
      {
        id: "updated",
        header: "Last updated",
        accessor: (r: P9CertRow) =>
          r.generatedAt
            ? new Date(r.generatedAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })
            : "—",
      },
      {
        id: "actions",
        header: "",
        accessor: (r: P9CertRow) => (
          <div className="flex gap-1 justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={(e) => { e.stopPropagation(); handleDownloadPdf(r); }}
            >
              <Icons.Download className="h-3.5 w-3.5 mr-1" />
              PDF
            </Button>
          </div>
        ),
      },
    ],
    [year] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="P9 Tax Deduction Cards"
        description="Annual employee PAYE cards for Kenya full-time employees. Auto-generated when a pay run is posted."
        breadcrumbs={[
          { label: "Payroll", href: "/payroll/overview" },
          { label: "P9 Forms" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2 items-center">
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="h-8 w-28 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEAR_OPTIONS.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              disabled={generating}
              onClick={handleGenerate}
            >
              {generating ? (
                <><Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…</>
              ) : (
                <><Icons.RefreshCw className="mr-2 h-4 w-4" /> Regenerate all</>
              )}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/payroll/overview">Overview</Link>
            </Button>
          </div>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
        <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-200 flex items-start gap-3">
          <Icons.Info className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            P9 cards are auto-generated for Kenya full-time employees each time a pay run is posted.
            Use <strong>Regenerate all</strong> to rebuild all cards for the selected year from scratch.
            Download a PDF to share with the employee for KRA filing.
          </div>
        </div>

        <DataTableToolbar className="shrink-0"
          searchPlaceholder="Search by employee name or KRA PIN..."
          searchValue={search}
          onSearchChange={setSearch}
          onExport={() =>
            downloadCsv(
              `p9-${year}.csv`,
              filtered.map((r) => ({
                employeeName: r.employeeName,
                employeePin: r.employeePin,
                taxYear: r.taxYear,
                monthsCovered: r.monthsCovered,
                totalChargeablePay: r.totalChargeablePay,
                totalTax: r.totalTax,
                generatedAt: r.generatedAt,
              }))
            )
          }
        />

        <div className="relative flex min-h-0 flex-col rounded-xl border bg-card shadow-sm">
          <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold">P9 Cards — {year}</h3>
              <p className="text-xs text-muted-foreground">
                {certs.length === 0 && !loading
                  ? `No P9 cards found for ${year}. Post a pay run to auto-generate, or use Regenerate all.`
                  : `${certs.length} Kenya full-time employee${certs.length !== 1 ? "s" : ""}. Click a row to preview the full P9 table.`}
              </p>
            </div>
            <Badge variant="secondary" className="text-xs">
              KRA P9 · {year}
            </Badge>
          </div>
          <DataTable<P9CertRow>
              data={filtered}
              columns={columns}
              onRowClick={handleOpenDetail}
              emptyMessage={loading ? "Loading…" : `No P9 cards for ${year}.`}
              scrollMode="natural"
              size="comfortable"
              />
        </div>
      </div>

      {/* Detail sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>P9 Tax Deduction Card</SheetTitle>
            <SheetDescription>
              {detail
                ? `${detail.employeeName} · KRA PIN: ${detail.employeePin || "—"} · Tax Year ${year}`
                : "Loading…"}
            </SheetDescription>
          </SheetHeader>

          {detailLoading && (
            <div className="flex items-center justify-center py-16">
              <Icons.Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!detailLoading && detail && (
            <div className="mt-6 space-y-6">
              {/* Employer / Employee metadata */}
              <div className="grid grid-cols-2 gap-4 text-sm rounded-lg border p-4 bg-muted/20">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Employer</p>
                  <p className="font-medium">{detail.employerName || "—"}</p>
                  <p className="text-xs text-muted-foreground">PIN: {detail.employerPin || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Employee</p>
                  <p className="font-medium">{detail.employeeName}</p>
                  <p className="text-xs text-muted-foreground">PIN: {detail.employeePin || "—"}</p>
                </div>
              </div>

              {/* Monthly table */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  Monthly breakdown (KES)
                </p>
                <P9MonthTable months={detail.months} />
              </div>

              {/* Totals summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-4 bg-muted/20">
                  <p className="text-xs text-muted-foreground">Total chargeable pay (Col. K)</p>
                  <p className="text-lg font-semibold tabular-nums mt-1">{formatMoney(detail.totalChargeablePay, "KES")}</p>
                </div>
                <div className="rounded-lg border p-4 bg-primary/5 border-primary/20">
                  <p className="text-xs text-muted-foreground">Total PAYE charged (Col. O)</p>
                  <p className="text-lg font-semibold tabular-nums text-primary mt-1">{formatMoney(detail.totalTax, "KES")}</p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Columns B (Benefits in kind), C (Quarters), G (PRMF), J (Owner-occupied interest),
                and M (Insurance relief) are shown as zero until separately tracked in payroll settings.
              </p>
            </div>
          )}

          <SheetFooter className="mt-6 gap-2">
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Close
            </Button>
            {detail && (
              <Button
                onClick={() =>
                  handleDownloadPdf({
                    id: detail.id,
                    employeeId: detail.employeeId,
                    employeeName: detail.employeeName,
                    employeePin: detail.employeePin,
                    taxYear: detail.taxYear,
                    monthsCovered: detail.months.length,
                    totalChargeablePay: detail.totalChargeablePay,
                    totalTax: detail.totalTax,
                    generatedAt: detail.generatedAt,
                    lastUpdatedByPayRunId: detail.lastUpdatedByPayRunId,
                  })
                }
              >
                <Icons.Download className="mr-2 h-4 w-4" />
                Download P9 PDF
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
