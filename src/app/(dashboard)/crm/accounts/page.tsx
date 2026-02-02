"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import * as Icons from "lucide-react";

export default function CRMAccountsPage() {
  return (
    <PageLayout
      title="Accounts / Parties"
      description="Manage customer and partner accounts"
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
            icon="Building2"
            title="No accounts"
            description="Add accounts to manage customer and partner relationships"
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





