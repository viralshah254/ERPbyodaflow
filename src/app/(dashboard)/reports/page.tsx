"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  fetchReportExportsApi,
  fetchReportLibraryApi,
  fetchSavedReportViewsApi,
  fetchScheduledReportsApi,
  runReportExportApi,
  scheduleReportApi,
} from "@/lib/api/reports";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isApiConfigured } from "@/lib/api/client";

const QUICK_LINKS = [
  { href: "/reports/saved", label: "Saved Views", desc: "Your saved report views", icon: "Bookmark" as const },
  { href: "/reports/scheduled", label: "Scheduled", desc: "Automated report schedules", icon: "Clock" as const },
  { href: "/reports/exports", label: "Exports", desc: "Export history & downloads", icon: "Download" as const },
  { href: "/reports/vat-summary", label: "VAT summary", desc: "VAT output, input, net", icon: "Receipt" as const },
  { href: "/reports/wht-summary", label: "WHT summary", desc: "Withholding tax by period", icon: "Percent" as const },
  { href: "/reports/commission-reconciliation", label: "Commission reconciliation", desc: "Sales/commission/top-up/journal/settlement", icon: "Scale" as const },
  { href: "/reports/batch-costing", label: "Batch Costing", desc: "Total landed cost per batch — cost/kg & recommended sell price", icon: "Calculator" as const },
];

const CATEGORY_LABELS: Record<string, string> = {
  sales: "Sales",
  finance: "Finance",
  inventory: "Inventory",
  purchasing: "Purchasing",
  general: "General",
};

const CRON_BY_FREQUENCY: Record<string, string> = {
  daily: "0 9 * * *",
  weekly: "0 9 * * 0",
  monthly: "0 9 1 * *",
};

export default function ReportsPage() {
  const [savedCount, setSavedCount] = React.useState(0);
  const [scheduledCount, setScheduledCount] = React.useState(0);
  const [exports, setExports] = React.useState<Array<{ id: string }>>([]);
  const [library, setLibrary] = React.useState<Array<{ id: string; name: string; description: string; category: string }>>([]);
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [scheduleReport, setScheduleReport] = React.useState<{ id: string; name: string } | null>(null);
  const [scheduleName, setScheduleName] = React.useState("");
  const [scheduleFrequency, setScheduleFrequency] = React.useState<"daily" | "weekly" | "monthly">("daily");
  const [scheduleRecipients, setScheduleRecipients] = React.useState("");
  const [scheduleSaving, setScheduleSaving] = React.useState(false);

  const refresh = React.useCallback(async () => {
    const [saved, scheduled, exportRows, libraryRows] = await Promise.all([
      fetchSavedReportViewsApi(),
      fetchScheduledReportsApi(),
      fetchReportExportsApi(),
      fetchReportLibraryApi(),
    ]);
    setSavedCount(saved.length);
    setScheduledCount(scheduled.length);
    setExports(exportRows);
    setLibrary(libraryRows);
  }, []);

  React.useEffect(() => {
    refresh().catch((error) => toast.error((error as Error).message || "Failed to load reports."));
  }, [refresh]);

  return (
    <PageShell>
      <PageHeader
        title="Report Library"
        description="Reports, saved views, schedules, and exports"
        breadcrumbs={[{ label: "Reports" }]}
        sticky
        showCommandHint
      />
      <div className="p-6 space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map(({ href, label, desc, icon }) => {
            const Icon = (Icons[icon] || Icons.FileText) as React.ComponentType<{ className?: string }>;
            const count =
              label === "Saved Views" ? savedCount :
              label === "Scheduled" ? scheduledCount :
              exports.length;
            return (
              <Link key={href} href={href}>
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader className="flex flex-row items-center gap-2">
                    <div className="rounded-lg bg-muted p-2">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">{label}</CardTitle>
                      <CardDescription>{desc}</CardDescription>
                    </div>
                    {count > 0 && (
                      <Badge variant="secondary">{count}</Badge>
                    )}
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Report library</CardTitle>
            <CardDescription>
              Browse report templates, run them, and capture export history.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {library.map((r) => (
                <div
                  key={r.id}
                  className="flex items-start gap-3 rounded-lg border p-4 hover:bg-muted/30 transition-colors"
                >
                  <Icons.FileText className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{r.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                    <Badge variant="outline" className="mt-2 text-xs">
                      {CATEGORY_LABELS[r.category] ?? r.category}
                    </Badge>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={async () => {
                        try {
                          await runReportExportApi(r.id);
                          await refresh();
                          toast.success(`Report executed for ${r.name}.`);
                        } catch (error) {
                          toast.error((error as Error).message || "Failed to run report.");
                        }
                      }}
                    >
                      Run
                    </button>
                    {isApiConfigured() && (
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                        onClick={() => {
                          setScheduleReport({ id: r.id, name: r.name });
                          setScheduleName(`${r.name} schedule`);
                          setScheduleFrequency("daily");
                          setScheduleRecipients("");
                          setScheduleOpen(true);
                        }}
                      >
                        Schedule
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Sheet open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Schedule report</SheetTitle>
            <SheetDescription>
              {scheduleReport ? `Schedule ${scheduleReport.name} to run automatically.` : "Select a report."}
            </SheetDescription>
          </SheetHeader>
          {scheduleReport && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Schedule name</Label>
                <Input
                  value={scheduleName}
                  onChange={(e) => setScheduleName(e.target.value)}
                  placeholder="e.g. Monthly VAT report"
                />
              </div>
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={scheduleFrequency} onValueChange={(v) => setScheduleFrequency(v as "daily" | "weekly" | "monthly")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Recipients (comma-separated emails)</Label>
                <Input
                  value={scheduleRecipients}
                  onChange={(e) => setScheduleRecipients(e.target.value)}
                  placeholder="e.g. finance@example.com"
                />
              </div>
            </div>
          )}
          <SheetFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!scheduleReport || scheduleSaving}
              onClick={async () => {
                if (!scheduleReport) return;
                setScheduleSaving(true);
                try {
                  await scheduleReportApi({
                    reportId: scheduleReport.id,
                    name: scheduleName || scheduleReport.name,
                    cron: CRON_BY_FREQUENCY[scheduleFrequency],
                    recipients: scheduleRecipients
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  });
                  toast.success("Report scheduled.");
                  setScheduleOpen(false);
                  await refresh();
                } catch (error) {
                  toast.error((error as Error).message || "Failed to schedule.");
                } finally {
                  setScheduleSaving(false);
                }
              }}
            >
              {scheduleSaving ? "Saving..." : "Save schedule"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
