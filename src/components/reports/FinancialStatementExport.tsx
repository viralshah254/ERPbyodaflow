"use client";
import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadFile } from "@/lib/api/client";
import { useHasPermission } from "@/lib/rbac/use-write-guard";
import { toast } from "sonner";
export function FinancialStatementExport({ type, periodId, currency, disabled, completeExports }: { completeExports: boolean; type: "pnl" | "balance-sheet" | "cash-flow"; periodId: string; currency: string; disabled: boolean }) {
  const canExport = useHasPermission("reports.export.read"), [format, setFormat] = React.useState("pdf");
  if (!canExport) return null;
  if (!completeExports) return <span className="text-xs text-muted-foreground">Statement exports require the reporting backend update.</span>;
  return <div className="flex overflow-hidden rounded-lg border print:hidden"><select aria-label="Statement export format" value={format} className="bg-background px-3 text-sm" onChange={(e) => setFormat(e.target.value)}><option value="pdf">PDF</option><option value="xlsx">Excel</option><option value="csv">CSV</option></select><Button className="rounded-l-none" disabled={disabled} onClick={() => { const params = new URLSearchParams({ format, periodId }); if (currency) params.set("currency", currency); void downloadFile(`/api/finance/statements/${type}?${params}`, `${type}.${format}`, (message) => toast.error(message)); }}><Download className="mr-2 h-4 w-4" />Export statement</Button></div>;
}
