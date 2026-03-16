"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import * as Icons from "lucide-react";

export default function CRMAccountsPage() {
  const router = useRouter();
  return (
    <PageLayout
      title="Accounts / Parties"
      description="Manage customer and partner accounts"
      actions={
        <Button asChild>
          <Link href="/master/parties">
            <Icons.Plus className="mr-2 h-4 w-4" />
            Add Account
          </Link>
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon="Building2"
            title="No accounts"
            description="Add customer or partner accounts from Masters > Parties or Finance > AR Customers. They will appear here for CRM activities and deals."
            action={{
              label: "Go to Parties",
              onClick: () => router.push("/master/parties"),
            }}
          />
        </CardContent>
      </Card>
    </PageLayout>
  );
}





