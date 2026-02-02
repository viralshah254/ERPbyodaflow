"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import * as Icons from "lucide-react";

export default function PeriodClosePage() {
  return (
    <PageLayout
      title="Period Close"
      description="Close accounting periods and lock transactions"
    >
      <Card>
        <CardHeader>
          <CardTitle>Close Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {[
              "Reconcile all bank accounts",
              "Review AR aging and follow up on overdue",
              "Review AP aging and schedule payments",
              "Post depreciation journals",
              "Review and adjust inventory valuations",
              "Verify all journal entries are posted",
              "Run financial statements and review",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                <Checkbox id={`check-${i}`} />
                <Label htmlFor={`check-${i}`} className="flex-1 cursor-pointer">
                  {item}
                </Label>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t">
            <Button className="w-full" size="lg">
              <Icons.Lock className="mr-2 h-4 w-4" />
              Lock Period
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              This will prevent any transactions from being posted to this period
            </p>
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
}





