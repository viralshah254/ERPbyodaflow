"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LIST_PAGE_BODY_CLASS,
  LIST_PAGE_SHELL_CLASS,
  PageShell,
} from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { CustomerAccountsPanel } from "@/components/customers/CustomerAccountsPanel";
import { useCanWriteFinance, useCanWriteSales } from "@/lib/rbac/use-write-guard";
import * as Icons from "lucide-react";

function CustomerCreditContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canWriteFinance = useCanWriteFinance();
  const canWriteSales = useCanWriteSales();
  const editCustomerId = searchParams.get("id");
  const [refreshKey, setRefreshKey] = React.useState(0);

  const syncId = React.useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("id", id);
      else params.delete("id");
      params.delete("new");
      const qs = params.toString();
      router.replace(qs ? `/ar/customers?${qs}` : "/ar/customers", { scroll: false });
    },
    [router, searchParams]
  );

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Customer credit"
        description="Raise limits, set payment terms, and review balances for existing customers. New customers are created under Sales."
        breadcrumbs={[
          { label: "Finance", href: "/finance" },
          { label: "Customer credit" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex flex-wrap gap-2">
            {canWriteSales ? (
              <Button variant="outline" asChild>
                <Link href="/sales/customers?new=1">
                  <Icons.Plus className="mr-2 h-4 w-4" />
                  New customer
                </Link>
              </Button>
            ) : null}
            <Button variant="outline" asChild>
              <Link href="/sales/customers">
                <Icons.Users className="mr-2 h-4 w-4" />
                Customer list
              </Link>
            </Button>
          </div>
        }
      />
      <div className={LIST_PAGE_BODY_CLASS}>
        {!canWriteFinance ? (
          <p className="mb-3 text-sm text-muted-foreground">
            You can view credit details. Raising limits requires finance write access.
          </p>
        ) : (
          <p className="mb-3 text-sm text-muted-foreground">
            Open a customer to update credit limit, payment terms, and credit control.
          </p>
        )}
        <CustomerAccountsPanel
          key={refreshKey}
          editCustomerId={editCustomerId}
          onEditCustomerIdChange={syncId}
          creditFocused
          onAddCustomer={
            canWriteSales ? () => router.push("/sales/customers?new=1") : undefined
          }
          onCustomerSaved={() => setRefreshKey((k) => k + 1)}
        />
      </div>
    </PageShell>
  );
}

export default function ARCustomersPage() {
  return (
    <React.Suspense
      fallback={
        <PageShell className={LIST_PAGE_SHELL_CLASS}>
          <PageHeader
            title="Customer credit"
            description="Loading…"
            breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Customer credit" }]}
          />
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        </PageShell>
      }
    >
      <CustomerCreditContent />
    </React.Suspense>
  );
}
