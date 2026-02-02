"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import * as Icons from "lucide-react";

export default function BudgetsPage() {
  return (
    <PageLayout
      title="Budgets"
      description="Create and track budgets by cost center"
      actions={
        <Button>
          <Icons.Plus className="mr-2 h-4 w-4" />
          Create Budget
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Budgets</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon="Target"
            title="No budgets"
            description="Create budgets to track performance against targets"
            action={{
              label: "Create Budget",
              onClick: () => {},
            }}
          />
        </CardContent>
      </Card>
    </PageLayout>
  );
}





