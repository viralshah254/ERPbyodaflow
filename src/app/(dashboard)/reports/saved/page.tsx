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
import { fetchSavedReportViewsApi, runReportExportApi } from "@/lib/api/reports";
import type { SavedViewRow } from "@/lib/types/reports";
import { isApiConfigured } from "@/lib/api/client";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function SavedViewsPage() {
  const [rows, setRows] = React.useState<SavedViewRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await fetchSavedReportViewsApi();
        if (!cancelled) setRows(data);
      } catch (error) {
        if (!cancelled) toast.error((error as Error).message || "Failed to load saved views.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

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
          <Button size="sm" asChild>
            <Link href="/reports">Open reports</Link>
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
            {loading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Loading saved views...
              </div>
            ) : rows.length === 0 ? (
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
                          {isApiConfigured() && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await runReportExportApi(r.id);
                                  toast.success(`Report ${r.name} run triggered.`);
                                } catch (err) {
                                  toast.error((err as Error).message || "Failed to run.");
                                }
                              }}
                            >
                              Run
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" asChild>
                            <Link href="/reports">Edit</Link>
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
