"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listDiscountPolicies } from "@/lib/data/pricing.repo";
import type { DiscountPolicy } from "@/lib/products/pricing-types";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function PricingRulesPage() {
  const [policies, setPolicies] = React.useState<DiscountPolicy[]>([]);

  React.useEffect(() => {
    setPolicies(listDiscountPolicies());
  }, []);

  return (
    <PageShell>
      <PageHeader
        title="Pricing rules"
        description="Discount policies, validity, approval linkage. Stub: link to approvals."
        breadcrumbs={[{ label: "Pricing", href: "/pricing/overview" }, { label: "Rules" }]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button size="sm" onClick={() => toast.info("Add discount policy (stub). API pending.")}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              Add policy
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/pricing/overview">Overview</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/approvals/inbox">Approvals</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Discount policies</CardTitle>
            <CardDescription>Volume, promo, channel. Optional approval before apply. Stub data.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead>Validity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{p.type}</Badge>
                    </TableCell>
                    <TableCell>{p.requiresApproval ? "Required" : "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.startDate && p.endDate ? `${p.startDate} – ${p.endDate}` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer default price list</CardTitle>
            <CardDescription>Assign default price list per customer. Stub: configure via party master (API pending).</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" onClick={() => toast.info("Customer price list assignment (stub). API pending.")}>
              Configure
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
