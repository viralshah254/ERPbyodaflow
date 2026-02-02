"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import * as Icons from "lucide-react";

export default function PaymentsPage() {
  return (
    <PageLayout
      title="Payments & Receipts"
      description="Record and track all payments and receipts"
      actions={
        <>
          <Button variant="outline">
            <Icons.ArrowDownCircle className="mr-2 h-4 w-4" />
            Record Receipt
          </Button>
          <Button>
            <Icons.ArrowUpCircle className="mr-2 h-4 w-4" />
            Make Payment
          </Button>
        </>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon="CreditCard"
            title="No transactions"
            description="Record payments and receipts to track cash flow"
            action={{
              label: "Record Receipt",
              onClick: () => {},
            }}
          />
        </CardContent>
      </Card>
    </PageLayout>
  );
}





