"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import * as Icons from "lucide-react";

export default function GeneralLedgerPage() {
  return (
    <PageLayout
      title="General Ledger"
      description="View all accounting transactions"
      actions={
        <Button variant="outline">
          <Icons.Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Ledger Entries</CardTitle>
            <div className="flex gap-2">
              <Input placeholder="Search..." className="w-64" />
              <Button variant="outline">Filter</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon="BookOpen"
            title="No ledger entries"
            description="Journal entries will appear here once posted"
          />
        </CardContent>
      </Card>
    </PageLayout>
  );
}





