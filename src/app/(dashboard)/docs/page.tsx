"use client";

import * as React from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import * as Icons from "lucide-react";

const DOC_TYPES = [
  { type: "sales-order", labelKey: "salesOrder" as const, icon: "ShoppingCart", href: "/docs/sales-order" },
  { type: "purchase-order", labelKey: "purchaseOrder" as const, icon: "FileText", href: "/docs/purchase-order" },
  { type: "grn", labelKey: "goodsReceipt" as const, icon: "PackageCheck", href: "/docs/grn" },
  { type: "invoice", labelKey: "invoice" as const, icon: "Receipt", href: "/docs/invoice" },
  { type: "journal", labelKey: "journalEntry" as const, icon: "FileEdit", href: "/docs/journal" },
] as const;

export default function DocumentCenterHubPage() {
  const terminology = useTerminology();

  return (
    <PageLayout
      title="Document Center"
      description="Create and manage core documents"
      actions={
        <Button asChild>
          <Link href="/docs/sales-order/new">
            <Icons.Plus className="mr-2 h-4 w-4" />
            New document
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DOC_TYPES.map((doc) => {
          const IconComponent = (Icons[doc.icon as keyof typeof Icons] || Icons.FileText) as React.ComponentType<{ className?: string }>;
          return (
            <Link key={doc.type} href={doc.href}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <IconComponent className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{t(doc.labelKey, terminology)}</CardTitle>
                    <CardDescription>List, create, and manage</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    View list
                    <Icons.ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </PageLayout>
  );
}
