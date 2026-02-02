"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import * as Icons from "lucide-react";

const links = [
  {
    href: "/approvals/inbox",
    label: "Inbox",
    desc: "Items requiring your approval",
    icon: "Inbox" as const,
  },
  {
    href: "/approvals/requests",
    label: "My requests",
    desc: "Items you submitted for approval",
    icon: "Send" as const,
  },
];

export default function ApprovalsHubPage() {
  return (
    <PageShell>
      <PageHeader
        title="Approvals"
        description="Inbox and submitted requests"
        breadcrumbs={[{ label: "Approvals" }]}
        sticky
        showCommandHint
      />
      <div className="p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {links.map(({ href, label, desc, icon }) => {
            const Icon = (Icons[icon] || Icons.CheckCircle2) as React.ComponentType<{
              className?: string;
            }>;
            return (
              <Link key={href} href={href}>
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader className="flex flex-row items-center gap-2">
                    <div className="rounded-lg bg-muted p-2">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-base">{label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{desc}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
}
