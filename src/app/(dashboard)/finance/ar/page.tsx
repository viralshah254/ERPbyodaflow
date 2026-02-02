"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import * as Icons from "lucide-react";

export default function AccountsReceivablePage() {
  return (
    <PageLayout
      title="Accounts Receivable"
      description="Manage customer invoices and payments"
      actions={
        <Button variant="outline">
          <Icons.Download className="mr-2 h-4 w-4" />
          Aging Report
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Customer Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon="ArrowDownCircle"
            title="No receivables"
            description="Customer invoices and payments will appear here"
          />
        </CardContent>
      </Card>
    </PageLayout>
  );
}





