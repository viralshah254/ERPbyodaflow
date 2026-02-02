"use client";

import * as React from "react";
import Link from "next/link";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getMockTimesheetEntries, getMockWeekStarts } from "@/lib/mock/timesheets";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { useCopilotStore } from "@/stores/copilot-store";
import * as Icons from "lucide-react";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_LABELS: Record<(typeof DAYS)[number], string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

function weekRange(weekStart: string): string {
  const d = new Date(weekStart);
  const end = new Date(d);
  end.setDate(end.getDate() + 6);
  return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
}

export default function TimesheetsPage() {
  const openWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);
  const weekStarts = React.useMemo(() => getMockWeekStarts(), []);
  const [weekStart, setWeekStart] = React.useState(weekStarts[0] ?? "2025-01-27");
  const entries = React.useMemo(() => getMockTimesheetEntries(weekStart), [weekStart]);

  const totalHours = React.useMemo(() => {
    return entries.reduce((s, e) => s + e.mon + e.tue + e.wed + e.thu + e.fri + e.sat + e.sun, 0);
  }, [entries]);

  const handleSubmit = () => {
    window.alert("Submit for approval (stub). Reuse approvals module.");
  };

  return (
    <PageShell>
      <PageHeader
        title="Timesheets"
        description="Weekly grid, project/task, hours, submit for approval"
        breadcrumbs={[
          { label: "Projects", href: "/projects/overview" },
          { label: "Timesheets" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex items-center gap-2">
            <ExplainThis prompt="Explain timesheets and approval flow." label="Explain timesheets" />
            <Button variant="outline" size="sm" onClick={() => openWithPrompt("Help me fill my timesheet for this week.")}>
              <Icons.Sparkles className="mr-2 h-4 w-4" />
              Ask Copilot
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={entries.every((e) => e.status !== "DRAFT")}>
              Submit for approval
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/approvals/requests">My requests</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground block">Week</span>
            <Select value={weekStart} onValueChange={setWeekStart}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {weekStarts.map((w) => (
                  <SelectItem key={w} value={w}>
                    {weekRange(w)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <span className="text-sm text-muted-foreground">Total: <strong>{totalHours}</strong> h</span>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Entries</CardTitle>
            <CardDescription>Project/task, hours per day, notes. Submit for approval (reuse approvals).</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Project / Task</TableHead>
                  {DAYS.map((d) => (
                    <TableHead key={d} className="w-16 text-center">{DAY_LABELS[d]}</TableHead>
                  ))}
                  <TableHead className="min-w-[140px]">Notes</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">
                      {e.projectCode} {e.taskName ? `· ${e.taskName}` : ""}
                    </TableCell>
                    {DAYS.map((d) => (
                      <TableCell key={d} className="text-center">
                        <Input
                          type="number"
                          min={0}
                          max={24}
                          step={0.5}
                          className="w-14 h-8 text-center mx-auto"
                          value={e[d]}
                          readOnly
                        />
                      </TableCell>
                    ))}
                    <TableCell className="text-muted-foreground text-sm max-w-[160px] truncate">{e.notes ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={e.status === "APPROVED" ? "secondary" : e.status === "SUBMITTED" ? "default" : "outline"}>
                        {e.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {entries.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No entries for this week. Add project/task rows (stub).
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
