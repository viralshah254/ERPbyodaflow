"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROUTE_REGISTRY } from "@/lib/qa/route-registry";
import { NAV_SECTIONS_CONFIG } from "@/config/navigation/sections";

interface LinkCheck {
  source: string;
  target: string;
  exists: boolean;
}

function extractNavHrefs(): string[] {
  const hrefs: string[] = [];
  for (const section of NAV_SECTIONS_CONFIG) {
    for (const item of section.items) {
      if (item.href) hrefs.push(item.href);
      if (item.children) {
        for (const child of item.children) {
          if (child.href) hrefs.push(child.href);
        }
      }
    }
  }
  return [...new Set(hrefs)];
}

function checkLinks(): LinkCheck[] {
  const navHrefs = extractNavHrefs();
  const routePaths = new Set(ROUTE_REGISTRY.map((r) => r.path));
  const checks: LinkCheck[] = [];

  for (const href of navHrefs) {
    // Handle dynamic routes
    const normalizedHref = href.replace(/\[.*?\]/g, "");
    const exists =
      routePaths.has(href) ||
      ROUTE_REGISTRY.some((r) => {
        if (r.path === href) return true;
        // Check if it's a base path for dynamic route
        const basePath = r.path.split("/[")[0];
        return basePath === href || href.startsWith(basePath + "/");
      });
    checks.push({ source: "nav", target: href, exists });
  }

  return checks;
}

export default function LinkCheckPage() {
  const [checks, setChecks] = React.useState<LinkCheck[]>([]);

  React.useEffect(() => {
    setChecks(checkLinks());
  }, []);

  const okCount = checks.filter((c) => c.exists).length;
  const brokenCount = checks.filter((c) => !c.exists).length;

  return (
    <PageShell>
      <PageHeader
        title="Link check"
        description="Validate nav hrefs point to existing routes."
        breadcrumbs={[{ label: "Dev", href: "/dev" }, { label: "Link check" }]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setChecks(checkLinks())}>
              Re-check
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dev/route-check">Route check</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dev/action-audit">Action audit</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
            <CardDescription>
              Checks that all nav `href` values resolve to actual routes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Badge variant="default">{okCount} OK</Badge>
              <Badge variant={brokenCount > 0 ? "destructive" : "outline"}>
                {brokenCount} Broken
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nav Links ({checks.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted/95">
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checks.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Badge variant="outline">{c.source}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{c.target}</TableCell>
                      <TableCell>
                        {c.exists ? (
                          <Badge variant="default">OK</Badge>
                        ) : (
                          <Badge variant="destructive">Broken</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={c.target} target="_blank">Test</Link>
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
            <CardTitle className="text-base">Drill-Through Links (Manual Check)</CardTitle>
            <CardDescription>
              These drill-through patterns should work throughout the app.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2">
              <li>
                <span className="font-medium">Product SKU</span> → <code>/master/products/[id]</code>
              </li>
              <li>
                <span className="font-medium">Customer name</span> → <code>/master/parties?tab=customers</code> or <code>/ar/customers</code>
              </li>
              <li>
                <span className="font-medium">Supplier name</span> → <code>/master/parties?tab=suppliers</code> or <code>/ap/suppliers</code>
              </li>
              <li>
                <span className="font-medium">Warehouse</span> → <code>/master/warehouses</code>
              </li>
              <li>
                <span className="font-medium">Employee</span> → <code>/payroll/employees</code>
              </li>
              <li>
                <span className="font-medium">Document</span> → <code>/docs/[type]/[id]</code>
              </li>
              <li>
                <span className="font-medium">Approval item</span> → Doc view + approval sheet
              </li>
              <li>
                <span className="font-medium">Analytics segment</span> → Drill drawer → list
              </li>
              <li>
                <span className="font-medium">Work queue item</span> → Resolve deep link
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
