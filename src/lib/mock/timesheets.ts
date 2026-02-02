/**
 * Mock timesheets for /timesheets (weekly grid).
 */

export interface TimesheetEntryRow {
  id: string;
  userId: string;
  weekStart: string; // Monday YYYY-MM-DD
  projectId: string;
  projectCode: string;
  taskName?: string;
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  sun: number;
  notes?: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED";
}

export const MOCK_TIMESHEET_ENTRIES: TimesheetEntryRow[] = [
  {
    id: "ts1",
    userId: "u1",
    weekStart: "2025-01-27",
    projectId: "p1",
    projectCode: "PRJ-001",
    taskName: "Development",
    mon: 8,
    tue: 8,
    wed: 6,
    thu: 8,
    fri: 4,
    sat: 0,
    sun: 0,
    notes: "Warehouse automation sprint",
    status: "DRAFT",
  },
  {
    id: "ts2",
    userId: "u1",
    weekStart: "2025-01-27",
    projectId: "p2",
    projectCode: "PRJ-002",
    taskName: "Requirements",
    mon: 0,
    tue: 0,
    wed: 2,
    thu: 0,
    fri: 4,
    sat: 0,
    sun: 0,
    status: "DRAFT",
  },
];

export function getMockTimesheetEntries(weekStart?: string): TimesheetEntryRow[] {
  let out = [...MOCK_TIMESHEET_ENTRIES];
  if (weekStart) out = out.filter((e) => e.weekStart === weekStart);
  return out;
}

export function getMockWeekStarts(): string[] {
  return Array.from(new Set(MOCK_TIMESHEET_ENTRIES.map((e) => e.weekStart))).sort();
}
