"use client";

import * as React from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { DataTable } from "@/components/ui/data-table";
import { FiltersBar } from "@/components/ui/filters-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { RowActions } from "@/components/ui/row-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import * as Icons from "lucide-react";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: string;
  creditLimit: number;
  outstanding: number;
  status: string;
}

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = React.useState("");

  const customers: Customer[] = [
    {
      id: "1",
      name: "ABC Retail Ltd",
      email: "contact@abcretail.com",
      phone: "+254 712 345 678",
      type: "B2B_SHOP",
      creditLimit: 500000,
      outstanding: 125000,
      status: "Active",
    },
    {
      id: "2",
      name: "XYZ Shop",
      email: "info@xyzshop.com",
      phone: "+254 723 456 789",
      type: "B2B_SHOP",
      creditLimit: 300000,
      outstanding: 85000,
      status: "Active",
    },
    {
      id: "3",
      name: "Global Distributors",
      email: "sales@globaldist.com",
      phone: "+254 734 567 890",
      type: "DISTRIBUTOR",
      creditLimit: 1000000,
      outstanding: 320000,
      status: "Active",
    },
  ];

  const filteredCustomers = React.useMemo(() => {
    return customers.filter((customer) => {
      return (
        searchQuery === "" ||
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [searchQuery]);

  const columns = [
    {
      id: "name",
      header: "Customer",
      accessor: (row: Customer) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              {row.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{row.name}</div>
            <div className="text-xs text-muted-foreground">{row.email}</div>
          </div>
        </div>
      ),
      sticky: true,
    },
    {
      id: "phone",
      header: "Phone",
      accessor: "phone" as keyof Customer,
    },
    {
      id: "type",
      header: "Type",
      accessor: (row: Customer) => (
        <Badge variant="outline">{row.type.replace("_", " ")}</Badge>
      ),
    },
    {
      id: "creditLimit",
      header: "Credit Limit",
      accessor: (row: Customer) => (
        <div className="text-right">KES {row.creditLimit.toLocaleString()}</div>
      ),
    },
    {
      id: "outstanding",
      header: "Outstanding",
      accessor: (row: Customer) => (
        <div className="text-right font-medium">
          KES {row.outstanding.toLocaleString()}
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessor: (row: Customer) => <StatusBadge status={row.status} />,
    },
    {
      id: "actions",
      header: "",
      accessor: (row: Customer) => (
        <RowActions
          actions={[
            {
              label: "View",
              icon: "Eye",
              onClick: () => console.log("View", row.id),
            },
            {
              label: "Edit",
              icon: "Edit",
              onClick: () => console.log("Edit", row.id),
            },
            {
              label: "Create Order",
              icon: "ShoppingCart",
              onClick: () => console.log("Create Order", row.id),
            },
            {
              label: "View Ledger",
              icon: "FileText",
              onClick: () => console.log("Ledger", row.id),
            },
          ]}
        />
      ),
      className: "w-[50px]",
    },
  ];

  return (
    <PageLayout
      title="Customers"
      description="Manage customer accounts and relationships"
      actions={
        <Button>
          <Icons.Plus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      }
    >
      <Card>
        <FiltersBar
          searchPlaceholder="Search by name or email..."
          onSearchChange={setSearchQuery}
          filters={[
            {
              id: "type",
              label: "Type",
              options: [
                { label: "All Types", value: "all" },
                { label: "B2B Shop", value: "B2B_SHOP" },
                { label: "Distributor", value: "DISTRIBUTOR" },
                { label: "B2C", value: "B2C" },
              ],
            },
            {
              id: "status",
              label: "Status",
              options: [
                { label: "All Statuses", value: "all" },
                { label: "Active", value: "Active" },
                { label: "Inactive", value: "Inactive" },
              ],
            },
          ]}
        />
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Customers</CardTitle>
              <CardDescription>
                {filteredCustomers.length} customers
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Icons.Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button variant="outline" size="sm">
                <Icons.Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={filteredCustomers}
            columns={columns}
            onRowClick={(row) => console.log("Row clicked", row.id)}
            emptyMessage="No customers found. Add your first customer to get started."
          />
        </CardContent>
      </Card>
    </PageLayout>
  );
}

