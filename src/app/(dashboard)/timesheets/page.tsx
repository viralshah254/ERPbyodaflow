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
import { fetchRuntimeSession } from "@/lib/api/context";
import { fetchProjectsApi } from "@/lib/api/projects";
import { fetchTimesheetsApi } from "@/lib/api/timesheets";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { useCopilotStore } from "@/stores/copilot-store";
import { useCopilotFeatureEnabled } from "@/lib/copilot-feature";
import { toast } from "sonner";
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

function startOfWeek(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
}

type WeeklyRow = {
  id: string;
  projectCode: string;
  taskName?: string;
  notes?: string;
  status: "RECORDED";
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  sun: number;
};

type DayKey = (typeof DAYS)[number];

export default function TimesheetsPage() {
  const copilotEnabled = useCopilotFeatureEnabled();
  const openWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);
  const [weekStarts, setWeekStarts] = React.useState<string[]>([]);
  const [weekStart, setWeekStart] = React.useState("");
  const [rawEntries, setRawEntries] = React.useState<Array<{ projectId: string; userId: string; date: string; hours: number; description?: string }>>([]);
  const [projectCodes, setProjectCodes] = React.useState<Map<string, string>>(new Map());
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        const session = await fetchRuntimeSession();
        const [projects, timesheets] = await Promise.all([
          fetchProjectsApi(),
          fetchTimesheetsApi({ userId: session.user.userId }),
        ]);
        if (cancelled) return;
        const projectMap = new Map(projects.map((project) => [project.id, project.code]));
        const weeks = Array.from(new Set(timesheets.map((item) => startOfWeek(item.date)))).sort((a, b) => b.localeCompare(a));
        setWeekStarts(weeks);
        setWeekStart((current) => current || weeks[0] || "");
        setRawEntries(timesheets);
        setProjectCodes(projectMap);
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Failed to load timesheets.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleEntries = React.useMemo(() => {
    const grouped = new Map<string, WeeklyRow>();
    for (const item of rawEntries.filter((row) => !weekStart || startOfWeek(row.date) === weekStart)) {
      const dayIndex = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][new Date(`${item.date}T00:00:00Z`).getUTCDay()] as DayKey;
      const key = `${item.projectId}:${item.description ?? ""}`;
      const current =
        grouped.get(key) ??
        {
          id: key,
          projectCode: projectCodes.get(item.projectId) ?? item.projectId,
          taskName: undefined,
          notes: item.description,
          status: "RECORDED" as const,
          mon: 0,
          tue: 0,
          wed: 0,
          thu: 0,
          fri: 0,
          sat: 0,
          sun: 0,
        };
      current[dayIndex] += item.hours;
      grouped.set(key, current);
    }
    return Array.from(grouped.values());
  }, [projectCodes, rawEntries, weekStart]);

  const totalHours = React.useMemo(() => {
    return visibleEntries.reduce((s, e) => s + e.mon + e.tue + e.wed + e.thu + e.fri + e.sat + e.sun, 0);
  }, [visibleEntries]);

  return (
    <PageShell>
      <PageHeader
        title="Timesheets"
        description="Weekly grid of live project hours"
        breadcrumbs={[
          { label: "Projects", href: "/projects/overview" },
          { label: "Timesheets" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex items-center gap-2">
            <ExplainThis prompt="Explain timesheets and approval flow." label="Explain timesheets" />
            {copilotEnabled ? (
              <Button variant="outline" size="sm" onClick={() => openWithPrompt("Help me fill my timesheet for this week.")}>
                <Icons.Sparkles className="mr-2 h-4 w-4" />
                Ask Copilot
              </Button>
            ) : null}
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
            <CardDescription>Live weekly entries grouped by project and note.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {loading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Loading timesheets...</div>
            ) : (
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
                  {visibleEntries.map((e) => (
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
                        <Badge variant="secondary">
                          {e.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {!loading && visibleEntries.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No entries for this week.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
