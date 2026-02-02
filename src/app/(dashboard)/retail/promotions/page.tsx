"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import * as Icons from "lucide-react";

const MOCK = [
  { id: "1", name: "January Sale", start: "2025-01-01", end: "2025-01-31", status: "Active" },
  { id: "2", name: "Valentine Week", start: "2025-02-10", end: "2025-02-16", status: "Upcoming" },
];

export default function RetailPromotionsPage() {
  const terminology = useTerminology();
  const promLabel = t("promotion", terminology);

  return (
    <PageLayout
      title={`${promLabel}s`}
      description="Promotions list and calendar"
      actions={
        <Button>
          <Icons.Plus className="mr-2 h-4 w-4" />
          New promotion
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Promotions</CardTitle>
          <p className="text-sm text-muted-foreground">Simple list + calendar view (stub). {MOCK.length} promotions.</p>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border p-4 space-y-2">
            {MOCK.map((p) => (
              <div key={p.id} className="flex justify-between items-center py-2 border-b last:border-0">
                <span className="font-medium">{p.name}</span>
                <span className="text-sm text-muted-foreground">{p.start} – {p.end}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
