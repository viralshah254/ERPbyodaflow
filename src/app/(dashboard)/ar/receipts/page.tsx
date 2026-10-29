"use client";

import Link from "next/link";
import { LIST_PAGE_SHELL_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ReceiptCollectionGrid } from "@/components/finance/ReceiptCollectionGrid";

export default function CollectReceiptsPage() {
  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Collect receipts"
        description="Post cheques and other customer payments against open invoices."
        breadcrumbs={[
          { label: "Finance", href: "/finance" },
          { label: "AR Payments", href: "/ar/payments" },
          { label: "Collect receipts" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/ar/payments">AR payments</Link>
          </Button>
        }
      />
      <ReceiptCollectionGrid />
    </PageShell>
  );
}
