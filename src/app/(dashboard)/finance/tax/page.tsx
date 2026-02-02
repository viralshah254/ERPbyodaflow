"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import * as Icons from "lucide-react";

export default function TaxPage() {
  return (
    <PageLayout
      title="Tax / VAT"
      description="Manage tax codes and VAT returns"
      actions={
        <Button>
          <Icons.Plus className="mr-2 h-4 w-4" />
          Add Tax Code
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Tax Codes</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon="Receipt"
            title="No tax codes"
            description="Configure tax codes for your jurisdiction"
            action={{
              label: "Add Tax Code",
              onClick: () => {},
            }}
          />
        </CardContent>
      </Card>
    </PageLayout>
  );
}





