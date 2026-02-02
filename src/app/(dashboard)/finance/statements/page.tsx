"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import * as Icons from "lucide-react";
import Link from "next/link";

export default function FinancialStatementsPage() {
  return (
    <PageLayout
      title="Financial Statements"
      description="Generate financial reports"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <Link href="/finance/statements/pnl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icons.TrendingUp className="h-5 w-5" />
                Profit & Loss
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View income statement and profitability
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <Link href="/finance/statements/balance-sheet">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icons.Scale className="h-5 w-5" />
                Balance Sheet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View assets, liabilities, and equity
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <Link href="/finance/statements/cash-flow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icons.ArrowLeftRight className="h-5 w-5" />
                Cash Flow
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View cash inflows and outflows
              </p>
            </CardContent>
          </Link>
        </Card>
      </div>
    </PageLayout>
  );
}





