"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/layout/page-layout";
import { fetchFinanceOverviewApi } from "@/lib/api/finance";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function FinanceDashboardPage() {
  const [overview, setOverview] = React.useState<Awaited<ReturnType<typeof fetchFinanceOverviewApi>> | null>(null);

  React.useEffect(() => {
    fetchFinanceOverviewApi()
      .then(setOverview)
      .catch((error) => toast.error((error as Error).message || "Failed to load finance dashboard."));
  }, []);

  const summary = overview?.summary;

  return (
    <PageLayout
      title="Finance Dashboard"
      description="Overview of your financial position and key metrics"
      actions={
        <>
          <Button variant="outline">
            <Icons.FileEdit className="mr-2 h-4 w-4" />
            Create Journal
          </Button>
          <Button>
            <Icons.Plus className="mr-2 h-4 w-4" />
            Record Receipt
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cash Balance</CardTitle>
              <Icons.Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMoney(summary?.cashBalance ?? 0, "KES")}</div>
              <p className="text-xs text-muted-foreground">Across {summary?.bankAccountCount ?? 0} bank account(s)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AR Outstanding</CardTitle>
              <Icons.ArrowDownCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMoney(summary?.arOutstanding ?? 0, "KES")}</div>
              <p className="text-xs text-muted-foreground">{overview?.arOutstandingItems.length ?? 0} open item(s)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AP Outstanding</CardTitle>
              <Icons.ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMoney(summary?.apOutstanding ?? 0, "KES")}</div>
              <p className="text-xs text-muted-foreground">{overview?.apOutstandingItems.length ?? 0} supplier item(s)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Revenue (MTD)</CardTitle>
              <Icons.TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMoney(summary?.netRevenue ?? 0, "KES")}</div>
              <p className="text-xs text-muted-foreground">Posted invoice revenue</p>
            </CardContent>
          </Card>
        </div>

        {/* Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Overdue Receivables</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(overview?.arOutstandingItems ?? []).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{item.number}</p>
                      <p className="text-sm text-muted-foreground">Due {item.dueDate ?? "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatMoney(item.outstanding, "KES")}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4" asChild>
                <Link href="/treasury/collections">
                View All AR
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming Payables</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(overview?.apOutstandingItems ?? []).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{item.number}</p>
                      <p className="text-sm text-muted-foreground">Due {item.dueDate ?? "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatMoney(item.outstanding, "KES")}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4" asChild>
                <Link href="/ap/payments">
                View All AP
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Journals */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Journal Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
                {(overview?.recentJournals ?? []).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                      <p className="font-medium">{item.reference ?? item.number}</p>
                    <p className="text-sm text-muted-foreground">{item.date}</p>
                  </div>
                  <div className="text-right">
                      <p className="font-semibold">{formatMoney(item.total, "KES")}</p>
                      <p className="text-xs text-muted-foreground">{item.status}</p>
                  </div>
                </div>
              ))}
            </div>
              <Button variant="outline" className="w-full mt-4" asChild>
                <Link href="/finance/journals">
              View All Journals
                </Link>
              </Button>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}





