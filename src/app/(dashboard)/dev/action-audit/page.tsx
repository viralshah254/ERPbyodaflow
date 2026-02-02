"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ACTION_REGISTRY,
  getActionsByModule,
  getActionSummary,
} from "@/lib/qa/action-registry";

export default function ActionAuditPage() {
  const [filter, setFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "ok" | "stub" | "dead">("all");
  const byModule = React.useMemo(() => getActionsByModule(), []);
  const summary = React.useMemo(() => getActionSummary(), []);
  const modules = Object.keys(byModule).sort();

  const filtered = React.useMemo(() => {
    let list = ACTION_REGISTRY;
    if (statusFilter !== "all") {
      list = list.filter((a) => a.status === statusFilter);
    }
    if (filter.trim()) {
      const q = filter.toLowerCase();
      list = list.filter(
        (a) =>
          a.page.toLowerCase().includes(q) ||
          a.action.toLowerCase().includes(q) ||
          a.module.toLowerCase().includes(q) ||
          a.behavior.toLowerCase().includes(q)
      );
    }
    return list;
  }, [filter, statusFilter]);

  return (
    <PageShell>
      <PageHeader
        title="Action audit"
        description="Every CTA must navigate, open drawer, export, or show API pending. No dead buttons."
        breadcrumbs={[{ label: "Dev", href: "/dev" }, { label: "Action audit" }]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dev/route-check">Route check</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dev/data-health">Data health</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
            <CardDescription>
              Green = working, Yellow = stub (API pending), Red = dead (must fix).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Badge variant="default">{summary.ok} OK</Badge>
              <Badge variant="secondary">{summary.stub} Stub</Badge>
              <Badge variant={summary.dead > 0 ? "destructive" : "outline"}>
                {summary.dead} Dead
              </Badge>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-4">
          <Input
            placeholder="Filter actions..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="max-w-sm"
          />
          <div className="flex gap-2">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
            >
              All
            </Button>
            <Button
              variant={statusFilter === "ok" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("ok")}
            >
              OK
            </Button>
            <Button
              variant={statusFilter === "stub" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("stub")}
            >
              Stub
            </Button>
            <Button
              variant={statusFilter === "dead" ? "destructive" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("dead")}
            >
              Dead
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actions ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted/95">
                  <TableRow>
                    <TableHead>Module</TableHead>
                    <TableHead>Page</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Behavior</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a, i) => (
                    <TableRow key={`${a.page}-${a.action}-${i}`}>
                      <TableCell>
                        <Badge variant="outline">{a.module}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{a.page}</TableCell>
                      <TableCell>{a.action}</TableCell>
                      <TableCell className="text-muted-foreground">{a.behavior}</TableCell>
                      <TableCell>
                        {a.status === "ok" ? (
                          <Badge variant="default">OK</Badge>
                        ) : a.status === "stub" ? (
                          <Badge variant="secondary">Stub</Badge>
                        ) : (
                          <Badge variant="destructive">Dead</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">By Module</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {modules.map((m) => (
                <Badge key={m} variant="outline">
                  {m}: {byModule[m]?.length ?? 0}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
