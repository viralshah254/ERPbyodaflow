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
import { getMockSavedViews, type SavedViewRow } from "@/lib/mock/reports";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function SavedViewsPage() {
  const rows = React.useMemo(() => getMockSavedViews(), []);

  return (
    <PageShell>
      <PageHeader
        title="Saved Views"
        description="Your saved report views"
        breadcrumbs={[
          { label: "Reports", href: "/reports" },
          { label: "Saved Views" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button size="sm" onClick={() => toast.info("Save view (stub)")}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            Save view
          </Button>
        }
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Saved views</CardTitle>
            <CardDescription>
              {rows.length} saved view(s). Run or edit from here.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {rows.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No saved views. Save a report view from the Report library.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Report type</TableHead>
                    <TableHead>Last run</TableHead>
                    <TableHead>Filters</TableHead>
                    <TableHead className="w-32" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.reportType}</TableCell>
                      <TableCell>{new Date(r.lastRun).toLocaleString()}</TableCell>
                      <TableCell className="text-muted-foreground">{r.filters ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => toast.info(`Run (stub): ${r.name}`)}>
                            Run
                          </Button>
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
