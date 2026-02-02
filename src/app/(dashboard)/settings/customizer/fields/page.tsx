"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { CustomFields } from "@/components/customization/custom-fields";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CustomFieldsPage() {
  return (
    <PageLayout
      title="Custom Fields"
      description="Add custom fields to entities (Enterprise)"
    >
      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="orders">Sales Orders</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Product Custom Fields</CardTitle>
            </CardHeader>
            <CardContent>
              <CustomFields entity="Product" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Sales Order Custom Fields</CardTitle>
            </CardHeader>
            <CardContent>
              <CustomFields entity="SalesOrder" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle>Customer Custom Fields</CardTitle>
            </CardHeader>
            <CardContent>
              <CustomFields entity="Customer" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}





