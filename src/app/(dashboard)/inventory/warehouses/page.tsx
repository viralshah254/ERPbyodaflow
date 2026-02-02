"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import * as Icons from "lucide-react";

export default function WarehousesPage() {
  return (
    <PageLayout
      title="Warehouses & Locations"
      description="Manage warehouse locations and storage areas"
      actions={
        <Button>
          <Icons.Plus className="mr-2 h-4 w-4" />
          Add Warehouse
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Warehouses</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon="MapPin"
            title="No warehouses"
            description="Add warehouses to organize your inventory storage"
            action={{
              label: "Add Warehouse",
              onClick: () => {},
            }}
          />
        </CardContent>
      </Card>
    </PageLayout>
  );
}





