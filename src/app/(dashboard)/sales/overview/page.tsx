"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import * as Icons from "lucide-react";

const links = [
  { href: "/sales/quotes", label: "Quotes", desc: "Create and manage quotes", icon: "FileText" as const },
  { href: "/sales/orders", label: "Sales Orders", desc: "Orders and fulfillment", icon: "ShoppingCart" as const },
  { href: "/sales/deliveries", label: "Deliveries", desc: "Delivery notes and shipments", icon: "Truck" as const },
  { href: "/sales/invoices", label: "Invoices", desc: "Customer invoices", icon: "Receipt" as const },
];

export default function SalesOverviewPage() {
  return (
    <PageShell>
      <PageHeader
        title="Sales"
        description="Quotes, orders, deliveries, and invoices"
        breadcrumbs={[{ label: "Sales" }]}
        sticky
        showCommandHint
      />
      <div className="p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {links.map(({ href, label, desc, icon }) => {
            const Icon = (Icons[icon] || Icons.FileText) as React.ComponentType<{ className?: string }>;
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
