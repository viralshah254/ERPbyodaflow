"use client";
import * as React from "react";
import { Download, Link2, Check, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveReportSnapshot } from "@/lib/api/report-snapshots";
import { toast } from "sonner";
export function ReportExportActions({ disabled, onExport, params, family, reportId, completeExports = false }: { completeExports?: boolean; family: "operations" | "manufacturing"; reportId: string; disabled: boolean; onExport: (format: "pdf" | "xlsx" | "csv") => void; params: Record<string, string | undefined> | null }) {
  const [format, setFormat] = React.useState<"pdf" | "xlsx" | "csv">("pdf");
  const [saving, setSaving] = React.useState(false);
  async function save() { if (!params) return; setSaving(true); try { await saveReportSnapshot(family, reportId, params); toast.success("Snapshot saved. Find it in Reports → Snapshots."); } catch (error) { toast.error(error instanceof Error ? error.message : "Snapshot could not be saved."); } finally { setSaving(false); } }
  const [copied, setCopied] = React.useState(false);
  async function copy() {
    const url = new URL(window.location.href); url.search = "";
    for (const [key, value] of Object.entries(params ?? {})) if (value) url.searchParams.set(key, value);
    try { await navigator.clipboard.writeText(url.toString()); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    catch { toast.error("Could not copy this link. Copy the address from your browser."); }
  }
  return <div className="flex flex-wrap items-center gap-2 print:hidden">{completeExports && <Button type="button" variant="outline" disabled={disabled || saving} onClick={() => void save()}><Bookmark className="mr-2 h-4 w-4" />{saving ? "Saving…" : "Save snapshot"}</Button>}<Button type="button" title="Copy report filters; access still follows the recipient's role" variant="ghost" disabled={!params} onClick={() => void copy()}>{copied ? <Check className="mr-2 h-4 w-4" /> : <Link2 className="mr-2 h-4 w-4" />}{copied ? "Copied" : "Copy link"}</Button><div className="flex overflow-hidden rounded-lg border bg-background"><select aria-label="Export format" className="bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" value={completeExports ? format : "csv"} onChange={(e) => setFormat(e.target.value as typeof format)}>{completeExports && <><option value="pdf">PDF document</option><option value="xlsx">Excel workbook</option></>}<option value="csv">CSV data</option></select><Button type="button" className="rounded-l-none" disabled={disabled} onClick={() => onExport(completeExports ? format : "csv")}><Download className="mr-2 h-4 w-4" />Export all rows</Button></div></div>;
}
