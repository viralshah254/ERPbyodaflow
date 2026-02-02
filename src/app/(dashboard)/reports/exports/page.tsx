"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMockExportHistory, type ExportHistoryRow } from "@/lib/mock/reports";
import * as Icons from "lucide-react";

export default function ExportsPage() {
  const rows = React.useMemo(() => getMockExportHistory(), []);

  return (
    <PageShell>
      <PageHeader
        title="Exports"
        description="Export history and downloads"
        breadcrumbs={[
          { label: "Reports", href: "/reports" },
          { label: "Exports" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button size="sm" variant="outline" onClick={() => window.alert("Export (stub)")}>
            <Icons.Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        }
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Export history</CardTitle>
            <CardDescription>
              {rows.length} export(s). Download or re-export (stub).
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {rows.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No exports yet. Run a report and export to add here.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="uppercase">{r.format}</TableCell>
                      <TableCell>{new Date(r.createdAt).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "completed" ? "default" : r.status === "failed" ? "destructive" : "secondary"}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.size ?? "—"}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={r.status !== "completed"}
                          onClick={() => window.alert(`Download (stub): ${r.name}`)}
                        >
                          Download
                        </Button>
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
