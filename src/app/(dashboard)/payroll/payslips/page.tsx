"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { fetchPayslipsApi } from "@/lib/api/payroll";
import type { Payslip } from "@/lib/payroll/types";
import { formatMoney } from "@/lib/money";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { downloadCsv } from "@/lib/export/csv";
import { toast } from "sonner";
import { downloadFile, downloadTextFile, isApiConfigured } from "@/lib/api/client";
import * as Icons from "lucide-react";

export default function PayslipsPage() {
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Payslip | null>(null);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [slips, setSlips] = React.useState<Payslip[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    const loadPayslips = async () => {
      setLoading(true);
      try {
        const items = await fetchPayslipsApi();
        if (!cancelled) setSlips(items);
      } catch (e) {
        if (!cancelled) toast.error((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadPayslips();
    return () => {
      cancelled = true;
    };
  }, []);
  const filtered = React.useMemo(() => {
    if (!search.trim()) return slips;
    const q = search.trim().toLowerCase();
    return slips.filter((s) => s.employeeName.toLowerCase().includes(q) || s.month.includes(q));
  }, [slips, search]);

  const columns = React.useMemo(
    () => [
      { id: "employeeName", header: "Employee", accessor: (r: Payslip) => <span className="font-medium">{r.employeeName}</span>, sticky: true },
      { id: "month", header: "Month", accessor: "month" as keyof Payslip },
      { id: "gross", header: "Gross", accessor: (r: Payslip) => formatMoney(r.gross, r.currency) },
      { id: "net", header: "Net", accessor: (r: Payslip) => formatMoney(r.net, r.currency) },
    ],
    []
  );

  const openPreview = (s: Payslip) => {
    setSelected(s);
    setPreviewOpen(true);
  };

  const handleDownloadPDF = (payslipId?: string) => {
    if (!payslipId) {
      toast.info("Select a payslip to download.");
      return;
    }
    if (isApiConfigured()) {
      downloadFile(
        `/api/payroll/payslips/${encodeURIComponent(payslipId)}/pdf`,
        `payslip-${payslipId}.pdf`,
        (msg) => toast.info(msg || "PDF not yet available.")
      );
      return;
    }
    const slip = filtered.find((row) => row.id === payslipId);
    if (!slip) return;
    downloadTextFile(
      `payslip-${slip.employeeName.replaceAll(" ", "-").toLowerCase()}-${slip.month}.txt`,
      [
        `Payslip: ${slip.employeeName}`,
        `Month: ${slip.month}`,
        `Gross: ${formatMoney(slip.gross, slip.currency)}`,
        `Statutory: ${formatMoney(slip.statutory, slip.currency)}`,
        `Net: ${formatMoney(slip.net, slip.currency)}`,
      ].join("\n")
    );
    toast.success("Payslip preview exported.");
  };

  return (
    <PageShell>
      <PageHeader
        title="Payslips"
        description="Preview and export payslips."
        breadcrumbs={[
          { label: "Payroll", href: "/payroll/overview" },
          { label: "Payslips" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <ExplainThis prompt="Explain payslips and PDF download." label="Explain" />
            <Button variant="outline" size="sm" asChild>
              <Link href="/payroll/overview">Overview</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search by employee, month..."
          searchValue={search}
          onSearchChange={setSearch}
          onExport={() =>
            downloadCsv(
              `payslips-${new Date().toISOString().slice(0, 10)}.csv`,
              filtered.map((row) => ({
                employeeName: row.employeeName,
                month: row.month,
                gross: row.gross,
                statutory: row.statutory,
                net: row.net,
                currency: row.currency,
              }))
            )
          }
        />
        <Card>
          <CardHeader>
            <CardTitle>Payslips</CardTitle>
            <CardDescription>Open to preview or export a payslip copy.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable<Payslip>
              data={filtered}
              columns={columns}
              onRowClick={openPreview}
              emptyMessage={loading ? "Loading payslips..." : "No payslips."}
            />
          </CardContent>
        </Card>
      </div>

      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Payslip preview</SheetTitle>
            <SheetDescription>{selected?.employeeName ?? "—"} · {selected?.month ?? "—"}</SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="mt-6 space-y-2 text-sm">
              <p><span className="text-muted-foreground">Gross:</span> {formatMoney(selected.gross, selected.currency)}</p>
              <p><span className="text-muted-foreground">Statutory:</span> {formatMoney(selected.statutory, selected.currency)}</p>
              <p><span className="text-muted-foreground">Net:</span> {formatMoney(selected.net, selected.currency)}</p>
            </div>
          )}
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
            <Button onClick={() => handleDownloadPDF(selected?.id)} data-testid="payslip-preview-download-pdf">Download PDF</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
