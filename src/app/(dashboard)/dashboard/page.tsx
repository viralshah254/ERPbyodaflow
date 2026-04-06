"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { QuickActionsRow } from "@/components/layout/quick-actions-row";
import { DashboardRenderer } from "@/components/dashboard/DashboardRenderer";
import { useOrgContextStore } from "@/stores/orgContextStore";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const orgRole = useOrgContextStore((s) => s.orgRole);

  // Franchise outlet users get their own simplified workspace.
  useEffect(() => {
    if (orgRole === "FRANCHISEE") {
      router.replace("/franchise/outlet");
    }
  }, [orgRole, router]);
  const quickActions = [
    { id: "so", label: "Create Sales Order", href: "/docs/sales-order/new", icon: "ShoppingCart" as const, variant: "outline" as const },
    { id: "po", label: "Create Purchase Order", href: "/docs/purchase-order/new", icon: "FileText" as const, variant: "outline" as const },
    { id: "grn", label: "Create GRN", href: "/docs/grn/new", icon: "PackageCheck" as const, variant: "outline" as const },
    { id: "je", label: "Create Journal Entry", href: "/docs/journal/new", icon: "FileEdit" as const, variant: "outline" as const },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Dashboard"
        description="Overview of your business operations"
        sticky
        showCommandHint
        actions={
          <>
            <Link
              href="/control-tower"
              className="text-sm font-medium text-primary hover:underline hidden sm:inline"
            >
              Control Tower
            </Link>
            <QuickActionsRow actions={quickActions} />
            <Link
              href="/inbox"
              className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline"
            >
              Inbox
            </Link>
          </>
        }
      />
      <div className="p-6">
        <DashboardRenderer />
      </div>
    </PageShell>
  );
}
