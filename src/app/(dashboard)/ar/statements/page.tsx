"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { LIST_PAGE_SHELL_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { PartyStatementView } from "@/components/finance/PartyStatementView";
import { searchArCustomerOptionsApi } from "@/lib/api/payments";
import { useCanWriteFinance } from "@/lib/rbac/use-write-guard";

function CustomerStatementsContent() {
  const searchParams = useSearchParams();
  const canWriteFinance = useCanWriteFinance();
  return (
    <PartyStatementView
      kind="customer"
      partyId={searchParams.get("partyId") ?? searchParams.get("id")}
      from={searchParams.get("from")}
      to={searchParams.get("to")}
      loadOptions={searchArCustomerOptionsApi}
      canEmail={canWriteFinance}
    />
  );
}

export default function CustomerStatementsPage() {
  return (
    <React.Suspense
      fallback={
        <PageShell className={LIST_PAGE_SHELL_CLASS}>
          <PageHeader
            title="Customer statements"
            description="Loading…"
            breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Customer statements" }]}
          />
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        </PageShell>
      }
    >
      <CustomerStatementsContent />
    </React.Suspense>
  );
}
