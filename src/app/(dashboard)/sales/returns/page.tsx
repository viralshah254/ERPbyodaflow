"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import * as Icons from "lucide-react";

export default function SalesReturnsPage() {
  return (
    <PageLayout
      title="Returns / Credit Notes"
      description="Manage sales returns and credit notes"
      actions={
        <Button>
          <Icons.Plus className="mr-2 h-4 w-4" />
          Create Return
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Returns</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon="RotateCcw"
            title="No returns"
            description="Sales returns and credit notes will appear here"
            action={{
              label: "Create Return",
              onClick: () => {},
            }}
          />
        </CardContent>
      </Card>
    </PageLayout>
  );
}





