"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/layout/page-layout";
import * as Icons from "lucide-react";

export default function FinanceDashboardPage() {
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
              <div className="text-2xl font-bold">KES 2,450,000</div>
              <p className="text-xs text-muted-foreground">Across 3 bank accounts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AR Outstanding</CardTitle>
              <Icons.ArrowDownCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KES 1,850,000</div>
              <p className="text-xs text-muted-foreground">23 customers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AP Outstanding</CardTitle>
              <Icons.ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KES 980,000</div>
              <p className="text-xs text-muted-foreground">12 suppliers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Revenue (MTD)</CardTitle>
              <Icons.TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KES 4,200,000</div>
              <p className="text-xs text-muted-foreground">+12% vs last month</p>
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
                {[
                  { customer: "ABC Corp", amount: "KES 450,000", days: 45 },
                  { customer: "XYZ Ltd", amount: "KES 320,000", days: 30 },
                  { customer: "DEF Inc", amount: "KES 180,000", days: 15 },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{item.customer}</p>
                      <p className="text-sm text-muted-foreground">{item.days} days overdue</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{item.amount}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4">
                View All AR
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming Payables</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { supplier: "Supplier A", amount: "KES 250,000", due: "Jan 25" },
                  { supplier: "Supplier B", amount: "KES 180,000", due: "Jan 28" },
                  { supplier: "Supplier C", amount: "KES 120,000", due: "Feb 1" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{item.supplier}</p>
                      <p className="text-sm text-muted-foreground">Due {item.due}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{item.amount}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4">
                View All AP
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
              {[
                { date: "2024-01-20", memo: "Monthly depreciation", amount: "KES 50,000", status: "Posted" },
                { date: "2024-01-19", memo: "Bank charges", amount: "KES 2,500", status: "Posted" },
                { date: "2024-01-18", memo: "Accrued expenses", amount: "KES 15,000", status: "Draft" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{item.memo}</p>
                    <p className="text-sm text-muted-foreground">{item.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{item.amount}</p>
                    <p className="text-xs text-muted-foreground">{item.status}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4">
              View All Journals
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}





