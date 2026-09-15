"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { LIST_PAGE_SHELL_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { PartyStatementView } from "@/components/finance/PartyStatementView";
import { searchApSupplierOptionsApi } from "@/lib/api/payments";
import { useCanWriteFinance } from "@/lib/rbac/use-write-guard";

function SupplierStatementsContent() {
  const searchParams = useSearchParams();
  const canWriteFinance = useCanWriteFinance();
  return (
    <PartyStatementView
      kind="supplier"
      partyId={searchParams.get("partyId") ?? searchParams.get("id")}
      from={searchParams.get("from")}
      to={searchParams.get("to")}
      loadOptions={searchApSupplierOptionsApi}
      canEmail={canWriteFinance}
    />
  );
}

export default function SupplierStatementsPage() {
  return (
    <React.Suspense
      fallback={
        <PageShell className={LIST_PAGE_SHELL_CLASS}>
          <PageHeader
            title="Supplier statements"
            description="Loading…"
            breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Supplier statements" }]}
          />
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        </PageShell>
      }
    >
      <SupplierStatementsContent />
    </React.Suspense>
  );
}
