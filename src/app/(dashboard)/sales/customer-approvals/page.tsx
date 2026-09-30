"use client";

import { LIST_PAGE_BODY_CLASS, LIST_PAGE_SHELL_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { SfaCustomerApprovalPanel } from "@/components/customers/SfaCustomerApprovalPanel";

export default function CustomerApprovalsPage() {
  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Pending approval"
        description="New customers sent from SFA. Approve them before they join the customer list."
        breadcrumbs={[
          { label: "Sales", href: "/sales/overview" },
          { label: "Customers", href: "/sales/customers" },
          { label: "Pending approval" },
        ]}
        sticky
      />
      <div className={LIST_PAGE_BODY_CLASS}>
        <SfaCustomerApprovalPanel />
      </div>
    </PageShell>
  );
}
