"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import * as Icons from "lucide-react";

export default function AccountsPayablePage() {
  return (
    <PageLayout
      title="Accounts Payable"
      description="Manage supplier bills and payments"
      actions={
        <Button>
          <Icons.Plus className="mr-2 h-4 w-4" />
          Record Bill
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Supplier Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon="ArrowUpCircle"
            title="No payables"
            description="Supplier bills and payments will appear here"
            action={{
              label: "Record Bill",
              onClick: () => {},
            }}
          />
        </CardContent>
      </Card>
    </PageLayout>
  );
}





