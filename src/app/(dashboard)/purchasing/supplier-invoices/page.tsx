"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import * as Icons from "lucide-react";

export default function SupplierInvoicesPage() {
  return (
    <PageLayout
      title="Supplier Invoices (AP Bills)"
      description="Manage supplier invoices and bills"
      actions={
        <Button>
          <Icons.Plus className="mr-2 h-4 w-4" />
          Record Bill
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Supplier Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon="FileText"
            title="No supplier invoices"
            description="Record supplier invoices to track accounts payable"
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





