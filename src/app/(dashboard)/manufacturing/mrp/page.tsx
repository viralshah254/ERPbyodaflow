"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MrpPlanningGrid } from "@/components/manufacturing/MrpPlanningGrid";
import { getMrpGrid } from "@/lib/mock/mrp-planning";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function MrpPage() {
  const grid = React.useMemo(() => getMrpGrid(), []);
  const [itemFilter, setItemFilter] = React.useState("");

  return (
    <PageShell>
      <PageHeader
        title="MRP"
        description="Material requirements planning — periods × items, requirements and planned orders"
        breadcrumbs={[
          { label: "Manufacturing", href: "/manufacturing/boms" },
          { label: "MRP" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/manufacturing/boms">BOMs</Link>
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1.5">
            <Label htmlFor="mrp-item-filter">Filter items</Label>
            <Input
              id="mrp-item-filter"
              type="search"
              placeholder="SKU or name..."
              value={itemFilter}
              onChange={(e) => setItemFilter(e.target.value)}
              className="w-48"
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Planning grid</CardTitle>
            <CardDescription>
              Rows = items. Columns = periods (W1–W6). Each cell: <strong>Req</strong> (requirements) / <strong>Plan</strong> (planned orders). Stub data.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <MrpPlanningGrid
              periods={grid.periods}
              items={grid.items}
              getCell={grid.getCell}
              itemFilter={itemFilter}
              className="border-0 rounded-none"
            />
          </CardContent>
        </Card>

        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icons.Brain className="h-5 w-5" />
              AI recommended plan
            </CardTitle>
            <CardDescription>
              Suggestions based on demand and current stock (stub).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast.success("Apply suggestion (stub). API pending.")}
            >
              Apply suggestion
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
