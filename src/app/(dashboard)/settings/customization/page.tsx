import { CustomFields } from "@/components/customization/custom-fields";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CustomizationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Customization</h1>
        <p className="text-muted-foreground">
          Customize your ERP to match your business needs
        </p>
      </div>

      <Tabs defaultValue="fields" className="space-y-4">
        <TabsList>
          <TabsTrigger value="fields">Custom Fields</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
        </TabsList>

        <TabsContent value="fields" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Product Custom Fields</CardTitle>
              <CardDescription>
                Add custom fields to products
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CustomFields entity="Product" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sales Order Custom Fields</CardTitle>
              <CardDescription>
                Add custom fields to sales orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CustomFields entity="SalesOrder" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Definitions</CardTitle>
              <CardDescription>
                Configure custom workflows for your business processes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Workflow configuration UI will be implemented here
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Module Configuration</CardTitle>
              <CardDescription>
                Enable or disable modules based on your needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Module toggle UI will be implemented here
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

