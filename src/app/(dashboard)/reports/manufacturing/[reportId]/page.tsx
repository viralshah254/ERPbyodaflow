"use client";
import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MANUFACTURING_REPORT_IDS, fetchManufacturingReport, downloadManufacturingReport, type ManufacturingReport, type ManufacturingReportId, type ManufacturingReportParams } from "@/lib/api/manufacturing-reports";
import { useHasPermission } from "@/lib/rbac/use-write-guard";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";
import { formatMoney } from "@/lib/money";

export default function ManufacturingReportPage() {
  const scopeKey = useAuthStore((state) => `${state.org?.orgId}:${state.user?.userId}:${state.permissions.join(",")}`);
  const id = String(useParams().reportId) as ManufacturingReportId;
  const [report, setReport] = React.useState<ManufacturingReport | null>(null);
  const [selection, setSelection] = React.useState("");
  const [quantity, setQuantity] = React.useState("1");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [applied, setApplied] = React.useState<ManufacturingReportParams | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [page, setPage] = React.useState(0);
  const serial = React.useRef(0);
  const cancelPending = React.useCallback(() => { serial.current++; }, []);
  const canExport = useHasPermission("reports.export.read");
  const load = React.useCallback(async (params: ManufacturingReportParams = {}) => {
    const request = ++serial.current;
    setBusy(true); setError(""); setApplied(null);
    try { const result = await fetchManufacturingReport(id, params); if (request !== serial.current) return; setReport(result); setPage(0); if (!result.requires || params[result.requires]) setApplied(params); }
    catch (e) { if (request === serial.current) { setError(e instanceof Error ? e.message : "Report could not load."); setReport((previous) => previous ? { ...previous, rows: [], warnings: [], totalWipValue: undefined } : null); } }
    finally { if (request === serial.current) setBusy(false); }
  }, [id]);
  React.useEffect(() => { setReport(null); setSelection(""); setQuantity("1"); setDateFrom(""); setDateTo(""); if (MANUFACTURING_REPORT_IDS.includes(id)) void load(); return cancelPending; }, [id, load, cancelPending, scopeKey]);
  if (!MANUFACTURING_REPORT_IDS.includes(id)) return <PageShell><PageHeader title="Report not found" /></PageShell>;
  const isBom = id.startsWith("bom-");
  const invalidate = () => setApplied(null);
  const label = (key: string) => key.replace(/([A-Z])/g, " $1").replace(/^./, (value) => value.toUpperCase()).replace(/Kes$/, "KES");
  return <PageShell><PageHeader title={report?.title ?? id.replaceAll("-", " ")} description="FMCG manufacturing reports" actions={<Button variant="outline" asChild><Link href="/reports">Report library</Link></Button>} />
    <div className="mx-auto max-w-[1800px] space-y-5 p-4 sm:p-7">
      <form className="flex flex-wrap items-end gap-4 rounded-xl border bg-card p-5 shadow-sm print:hidden" onSubmit={(event) => { event.preventDefault(); void load({ ...(report?.requires ? { [report.requires]: selection } : {}), ...(id === "bom-explosion" ? { quantity } : {}), ...(id === "manufacture-orders" ? { dateFrom, dateTo } : {}) }); }}>
        {isBom && <div className="min-w-64 space-y-2"><Label htmlFor="report-selection">{id === "bom-explosion" ? "Recipe and version" : "Component"}</Label><select id="report-selection" className="h-10 w-full rounded-md border bg-background px-3" value={selection} onChange={(event) => { setSelection(event.target.value); invalidate(); }}><option value="">Select…</option>{report?.options?.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></div>}
        {id === "bom-explosion" && <div className="space-y-2"><Label htmlFor="output-qty">Output quantity in recipe UOM</Label><Input id="output-qty" type="number" min="0.000001" step="any" value={quantity} onChange={(event) => { setQuantity(event.target.value); invalidate(); }} /></div>}
        {id === "manufacture-orders" && <><div className="space-y-2"><Label htmlFor="created-from">Created from</Label><Input id="created-from" type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); invalidate(); }} /></div><div className="space-y-2"><Label htmlFor="created-to">Created through</Label><Input id="created-to" type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); invalidate(); }} /></div></>}
        <Button disabled={busy || (isBom && !selection)}>Run report</Button>
        {canExport && <><Button variant="outline" type="button" disabled={busy || !applied || report?.readOnlyPreview} onClick={() => applied && downloadManufacturingReport(id, applied, (message) => toast.error(message))}>Export CSV</Button><Button variant="outline" type="button" disabled={busy || !applied} onClick={() => window.print()}>Print this page / PDF</Button></>}
      </form>
      <p className="text-xs text-muted-foreground print:hidden">CSV exports refresh live data and include their own generation time, report basis and evidence warnings. No quantities or values from different UOMs are combined.</p>
      {error && <p role="alert" className="rounded-md border border-destructive p-3 text-destructive">{error}</p>}
      {busy && <p role="status">Loading report…</p>}
      {report && <>{report.readOnlyPreview && <p className="rounded-md border p-3 text-sm">Local read-only preview. Production report access and CSV export require the matching backend release.</p>}<p className="rounded-xl border bg-muted/30 p-5 text-sm leading-6 text-muted-foreground">{report.basis}</p>{report.warnings.map((warning) => <p role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-6" key={warning}>{warning}</p>)}
        {report.id === "work-in-progress" && <p className="font-medium">Retained WIP: {report.totalWipValue == null ? "Needs reconciliation" : formatMoney(report.totalWipValue, "KES")}</p>}
        {applied ? <><p className="text-xs text-muted-foreground">{report.rows.length} rows · Page {page + 1} of {Math.max(1, Math.ceil(report.rows.length / 50))} · Generated {new Date(report.generatedAt).toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })} EAT</p><div className="max-h-[65vh] overflow-auto rounded-xl border bg-card print:max-h-none print:overflow-visible"><table className="w-full text-sm"><thead className="sticky top-0 bg-muted"><tr className="border-b text-left">{report.columns.map((column) => <th key={column} className="p-3">{label(column)}</th>)}</tr></thead><tbody>{report.rows.slice(page * 50, (page + 1) * 50).map((row, index) => <tr className="border-b last:border-0 hover:bg-muted/30" key={page * 50 + index}>{report.columns.map((column) => <td key={column} className={`px-4 py-3.5 ${typeof row[column] === "number" ? "text-right tabular-nums" : ""} ${row[column] == null ? "text-amber-700 dark:text-amber-300" : ""}`}>{row[column] == null ? "Unconfirmed" : typeof row[column] === "boolean" ? row[column] ? "Yes" : "No" : typeof row[column] === "number" ? Number(row[column]).toLocaleString("en-KE", { maximumFractionDigits: 6 }) : String(row[column])}</td>)}</tr>)}</tbody></table></div><div className="flex gap-3 print:hidden"><Button variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button><Button variant="outline" disabled={(page + 1) * 50 >= report.rows.length} onClick={() => setPage(page + 1)}>Next</Button></div>{!report.rows.length && <p>No matching rows. This does not certify the completeness of opening balances.</p>}</> : <p>Choose filters and run the report to display current results.</p>}
      </>}
    </div></PageShell>;
}
