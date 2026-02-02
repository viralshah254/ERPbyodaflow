"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import * as Icons from "lucide-react";

export default function CRMTicketsPage() {
  return (
    <PageLayout
      title="Support / Tickets"
      description="Manage customer support tickets"
      actions={
        <Button>
          <Icons.Plus className="mr-2 h-4 w-4" />
          Create Ticket
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Support Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon="Ticket"
            title="No tickets"
            description="Customer support tickets will appear here"
            action={{
              label: "Create Ticket",
              onClick: () => {},
            }}
          />
        </CardContent>
      </Card>
    </PageLayout>
  );
}





