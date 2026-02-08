"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMockReportLibrary, getMockSavedViews, getMockScheduledReports, getMockExportHistory } from "@/lib/mock/reports";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const QUICK_LINKS = [
  { href: "/reports/saved", label: "Saved Views", desc: "Your saved report views", icon: "Bookmark" as const },
  { href: "/reports/scheduled", label: "Scheduled", desc: "Automated report schedules", icon: "Clock" as const },
  { href: "/reports/exports", label: "Exports", desc: "Export history & downloads", icon: "Download" as const },
  { href: "/reports/vat-summary", label: "VAT summary", desc: "VAT output, input, net", icon: "Receipt" as const },
  { href: "/reports/wht-summary", label: "WHT summary", desc: "Withholding tax by period", icon: "Percent" as const },
];

const CATEGORY_LABELS: Record<string, string> = {
  sales: "Sales",
  finance: "Finance",
  inventory: "Inventory",
  purchasing: "Purchasing",
  general: "General",
};

export default function ReportsPage() {
  const saved = React.useMemo(() => getMockSavedViews(), []);
  const scheduled = React.useMemo(() => getMockScheduledReports(), []);
  const exports = React.useMemo(() => getMockExportHistory(), []);
  const library = React.useMemo(() => getMockReportLibrary(), []);

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
              label === "Saved Views" ? saved.length :
              label === "Scheduled" ? scheduled.length :
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
              Browse report templates. Run (stub) or save as view.
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
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline shrink-0"
                    onClick={() => toast.info(`Run report (stub): ${r.name}`)}
                  >
                    Run
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
