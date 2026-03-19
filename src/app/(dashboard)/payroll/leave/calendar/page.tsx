"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchLeaveCalendarApi } from "@/lib/api/payroll";
import type { LeaveType } from "@/lib/payroll/types";
import { toast } from "sonner";
import * as Icons from "lucide-react";

type CalendarEvent = {
  id: string;
  employeeId: string;
  employeeName: string;
  type: LeaveType;
  extraLabel?: string;
  startDate: string;
  endDate: string;
  days: number;
  isPaid: boolean;
};

const TYPE_COLORS: Record<LeaveType, string> = {
  ANNUAL: "bg-blue-100 text-blue-800 border-blue-200",
  SICK: "bg-orange-100 text-orange-800 border-orange-200",
  MATERNITY: "bg-pink-100 text-pink-800 border-pink-200",
  PATERNITY: "bg-purple-100 text-purple-800 border-purple-200",
  PAID_EXTRA: "bg-green-100 text-green-800 border-green-200",
  UNPAID: "bg-gray-100 text-gray-600 border-gray-200",
};

const TYPE_LABELS: Record<LeaveType, string> = {
  ANNUAL: "Annual",
  SICK: "Sick",
  MATERNITY: "Maternity",
  PATERNITY: "Paternity",
  PAID_EXTRA: "Extra",
  UNPAID: "Unpaid",
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const d = new Date(year, month - 1, 1).getDay();
  return d === 0 ? 6 : d - 1; // Monday-first, 0=Mon
}

export default function LeaveCalendarPage() {
  const now = new Date();
  const [year, setYear] = React.useState(now.getFullYear());
  const [month, setMonth] = React.useState(now.getMonth() + 1);
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchLeaveCalendarApi({ year, month });
      setEvents(data.events);
    } catch (e) { toast.error((e as Error).message); } finally { setLoading(false); }
  }, [year, month]);

  React.useEffect(() => { void refresh(); }, [refresh]);

  const prevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const eventsByDay = React.useMemo(() => {
    const map = new Map<number, CalendarEvent[]>();
    for (const ev of events) {
      const start = new Date(ev.startDate);
      const end = new Date(ev.endDate);
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month - 1, d);
        if (date >= start && date <= end) {
          const list = map.get(d) ?? [];
          list.push(ev);
          map.set(d, list);
        }
      }
    }
    return map;
  }, [events, year, month, daysInMonth]);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <PageShell>
      <PageHeader
        title="Leave calendar"
        description="Monthly view of all approved employee leave."
        breadcrumbs={[
          { label: "Payroll", href: "/payroll/overview" },
          { label: "Leave", href: "/payroll/leave/requests" },
          { label: "Calendar" },
        ]}
        sticky
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/payroll/leave/requests">Requests</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/payroll/leave/balances">Balances</Link>
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-4">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={prevMonth}><Icons.ChevronLeft className="h-4 w-4" /></Button>
            <h2 className="text-lg font-semibold w-44 text-center">{MONTHS[month - 1]} {year}</h2>
            <Button variant="outline" size="icon" onClick={nextMonth}><Icons.ChevronRight className="h-4 w-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.entries(TYPE_LABELS) as [LeaveType, string][]).map(([t, l]) => (
              <span key={t} className={`text-xs px-2 py-0.5 rounded border ${TYPE_COLORS[t]}`}>{l}</span>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {events.length} approved leave(s) in {MONTHS[month - 1]}
            </CardTitle>
            <CardDescription>Only approved leaves are shown.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground py-4">Loading calendar…</p>
            ) : (
              <div>
                {/* Weekday headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {WEEKDAYS.map((d) => (
                    <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                  ))}
                </div>
                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {cells.map((day, i) => {
                    if (!day) return <div key={`empty-${i}`} className="h-24" />;
                    const dayEvents = eventsByDay.get(day) ?? [];
                    const isToday = year === now.getFullYear() && month === now.getMonth() + 1 && day === now.getDate();
                    return (
                      <div
                        key={day}
                        className={`min-h-24 rounded-lg border p-1.5 ${isToday ? "border-primary bg-primary/5" : "border-border bg-card"}`}
                      >
                        <div className={`text-xs font-medium mb-1 ${isToday ? "text-primary" : "text-muted-foreground"}`}>{day}</div>
                        <div className="space-y-0.5">
                          {dayEvents.slice(0, 3).map((ev) => (
                            <div
                              key={ev.id}
                              className={`text-[10px] truncate rounded px-1 py-0.5 border ${TYPE_COLORS[ev.type]}`}
                              title={`${ev.employeeName} — ${TYPE_LABELS[ev.type]}${ev.extraLabel ? ` (${ev.extraLabel})` : ""}`}
                            >
                              {ev.employeeName.split(" ")[0]}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - 3} more</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Events list for the month */}
        {events.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">All leaves this month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {events.map((ev) => (
                  <div key={ev.id} className="py-2 flex items-center gap-3 text-sm">
                    <Badge variant="outline" className={`text-xs ${TYPE_COLORS[ev.type]}`}>
                      {TYPE_LABELS[ev.type]}
                    </Badge>
                    <span className="font-medium">{ev.employeeName}</span>
                    <span className="text-muted-foreground">
                      {new Date(ev.startDate).toLocaleDateString()} – {new Date(ev.endDate).toLocaleDateString()}
                    </span>
                    <span className="text-muted-foreground">{ev.days}d</span>
                    {!ev.isPaid && <Badge variant="outline" className="text-xs">Unpaid</Badge>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
