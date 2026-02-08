"use client";

import * as React from "react";
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
import { Badge } from "@/components/ui/badge";
import { getMockScheduledReports, type ScheduledReportRow } from "@/lib/mock/reports";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function ScheduledReportsPage() {
  const rows = React.useMemo(() => getMockScheduledReports(), []);

  return (
    <PageShell>
      <PageHeader
        title="Scheduled Reports"
        description="Automated report schedules"
        breadcrumbs={[
          { label: "Reports", href: "/reports" },
          { label: "Scheduled" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button size="sm" onClick={() => toast.info("Schedule report (stub)")}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            Schedule Report
          </Button>
        }
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Scheduled reports</CardTitle>
            <CardDescription>
              {rows.length} schedule(s). Reports run automatically and can be emailed.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {rows.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No scheduled reports. Create one to automate delivery.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Report</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Next run</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-32" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.reportType}</TableCell>
                      <TableCell className="capitalize">{r.frequency}</TableCell>
                      <TableCell>{new Date(r.nextRun).toLocaleString()}</TableCell>
                      <TableCell className="text-muted-foreground">{r.recipients}</TableCell>
                      <TableCell>
                        <Badge variant={r.enabled ? "default" : "secondary"}>
                          {r.enabled ? "On" : "Off"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => toast.info("Edit (stub)")}>
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
