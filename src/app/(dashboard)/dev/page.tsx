"use client";

import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const LINKS = [
  { href: "/dev/route-check", label: "Route check", desc: "List all routes, verify reachable" },
  { href: "/dev/action-audit", label: "Action audit", desc: "No dead buttons, all CTAs work" },
  { href: "/dev/link-check", label: "Link check", desc: "Nav hrefs → route validation" },
  { href: "/dev/data-health", label: "Data health", desc: "Products, packaging, pricing, tax checks" },
];

export default function DevHubPage() {
  return (
    <PageShell>
      <PageHeader
        title="Dev"
        description="Hardening, QA, data health"
        breadcrumbs={[{ label: "Dev" }]}
        sticky
        showCommandHint
      />
      <div className="p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LINKS.map(({ href, label, desc }) => (
            <Link key={href} href={href}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-base">{label}</CardTitle>
                  <CardDescription>{desc}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
