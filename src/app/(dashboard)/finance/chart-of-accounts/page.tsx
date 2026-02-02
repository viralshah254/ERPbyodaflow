"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import * as Icons from "lucide-react";

export default function ChartOfAccountsPage() {
  return (
    <PageLayout
      title="Chart of Accounts"
      description="Manage your account structure"
      actions={
        <Button>
          <Icons.Plus className="mr-2 h-4 w-4" />
          Add Account
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon="ListTree"
            title="No accounts"
            description="Create accounts to organize your financial data"
            action={{
              label: "Add Account",
              onClick: () => {},
            }}
          />
        </CardContent>
      </Card>
    </PageLayout>
  );
}





