"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import * as Icons from "lucide-react";

const links = [
  {
    href: "/settings/financial/currencies",
    label: "Currencies",
    desc: "Base currency and enabled currencies",
    icon: "Banknote" as const,
  },
  {
    href: "/settings/financial/exchange-rates",
    label: "Exchange rates",
    desc: "Manual and imported rates",
    icon: "TrendingUp" as const,
  },
  {
    href: "/settings/financial/chart-of-accounts",
    label: "Chart of Accounts",
    desc: "COA tree, account types, control accounts",
    icon: "ListTree" as const,
  },
  {
    href: "/settings/financial/taxes",
    label: "Taxes",
    desc: "Tax codes, rates, effective dates",
    icon: "Receipt" as const,
  },
  {
    href: "/settings/financial/fiscal-years",
    label: "Fiscal years",
    desc: "Years, periods, close/reopen",
    icon: "Calendar" as const,
  },
];

export default function FinancialSettingsHubPage() {
  return (
    <PageShell>
      <PageHeader
        title="Financial settings"
        description="Currencies, exchange rates, and related configuration"
        breadcrumbs={[
          { label: "Settings", href: "/settings/org" },
          { label: "Financial" },
        ]}
        sticky
        showCommandHint
      />
      <div className="p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map(({ href, label, desc, icon }) => {
            const Icon = (Icons[icon] || Icons.Wallet) as React.ComponentType<{
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
