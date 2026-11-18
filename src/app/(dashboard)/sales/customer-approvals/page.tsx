"use client";

import { LIST_PAGE_BODY_PAGINATED_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { SfaCustomerApprovalPanel } from "@/components/customers/SfaCustomerApprovalPanel";

export default function CustomerApprovalsPage() {
  return (
    <PageShell>
      <PageHeader
        title="Pending approval"
        description="Direct customers sent from SFA. Approve checks for the same KRA PIN, phone, or a similar name, then you merge or create the customer. They cannot take orders until you do."
        breadcrumbs={[
          { label: "Sales", href: "/sales/overview" },
          { label: "Customers", href: "/sales/customers" },
          { label: "Pending approval" },
        ]}
        sticky
      />
      <div className={LIST_PAGE_BODY_PAGINATED_CLASS}>
        <SfaCustomerApprovalPanel />
      </div>
    </PageShell>
  );
}
