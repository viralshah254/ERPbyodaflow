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
  ROUTE_REGISTRY,
  getRoutesByModule,
  getOrphanRoutes,
} from "@/lib/qa/route-registry";

export default function RouteCheckPage() {
  const [filter, setFilter] = React.useState("");
  const byModule = React.useMemo(() => getRoutesByModule(), []);
  const orphans = React.useMemo(() => getOrphanRoutes(), []);
  const modules = Object.keys(byModule).sort();

  const filtered = React.useMemo(() => {
    if (!filter.trim()) return ROUTE_REGISTRY;
    const q = filter.toLowerCase();
    return ROUTE_REGISTRY.filter(
      (r) =>
        r.path.toLowerCase().includes(q) ||
        r.module.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)
    );
  }, [filter]);

  const navCount = ROUTE_REGISTRY.filter((r) => r.inNav).length;
  const orphanCount = orphans.length;
  const totalCount = ROUTE_REGISTRY.length;

  return (
    <PageShell>
      <PageHeader
        title="Route check"
        description="All routes. Click to verify reachable. Green = in nav, Yellow = orphan/detail."
        breadcrumbs={[{ label: "Dev", href: "/dev" }, { label: "Route check" }]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dev/action-audit">Action audit</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dev/link-check">Link check</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Badge variant="secondary">{totalCount} total</Badge>
              <Badge variant="default">{navCount} in nav</Badge>
              <Badge variant="outline">{orphanCount} orphan/internal</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-4">
          <Input
            placeholder="Filter routes..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Routes ({filtered.length})</CardTitle>
            <CardDescription>Click any route to open in new tab.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted/95">
                  <TableRow>
                    <TableHead>Path</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.path}>
                      <TableCell className="font-mono text-sm">{r.path}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{r.module}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.description}</TableCell>
                      <TableCell>
                        {r.inNav ? (
                          <Badge variant="default">In Nav</Badge>
                        ) : r.dynamic ? (
                          <Badge variant="secondary">Detail</Badge>
                        ) : (
                          <Badge variant="outline">Orphan</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={r.path} target="_blank">Open</Link>
                        </Button>
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
