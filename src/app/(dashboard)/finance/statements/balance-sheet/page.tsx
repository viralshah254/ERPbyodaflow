"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import * as Icons from "lucide-react";

export default function BalanceSheetPage() {
  return (
    <PageLayout
      title="Balance Sheet"
      description="Assets, liabilities, and equity as of the selected date"
      actions={
        <Button variant="outline">
          <Icons.Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Balance Sheet</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon="Scale"
            title="No data available"
            description="Select a date to generate the balance sheet"
          />
        </CardContent>
      </Card>
    </PageLayout>
  );
}





