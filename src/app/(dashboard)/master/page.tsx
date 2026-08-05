"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/lib/terminology";
import { useOrgContextStore, useTerminology } from "@/stores/orgContextStore";
import { isFmcgOrg } from "@/lib/fmcg/sfa-customer";
import * as Icons from "lucide-react";

const ICONS: Record<string, keyof typeof Icons> = {
  products: "Package",
  categories: "Tags",
  departments: "Layers",
  parties: "Users",
  warehouses: "MapPin",
};

export default function MasterHubPage() {
  const terminology = useTerminology();
  const templateId = useOrgContextStore((s) => s.templateId);
  const industryCategory = useOrgContextStore((s) => s.industryCategory);
  const fmcgOrg = isFmcgOrg(templateId) || industryCategory === "FMCG";
  const productLabel = t("product", terminology);
  const warehouseLabel = t("warehouse", terminology);

  const links = [
    { href: "/master/products", label: `${productLabel}s`, desc: "SKUs and products", key: "products" },
    {
      href: "/master/categories",
      label: "Categories",
      desc: "Edit or delete product categories",
      key: "categories",
    },
    ...(fmcgOrg
      ? [
          {
            href: "/master/departments",
            label: "Departments",
            desc: "Group categories for filters and reporting",
            key: "departments",
          },
        ]
      : []),
    { href: "/master/parties", label: "Parties", desc: "Customers and suppliers", key: "parties" },
    { href: "/master/warehouses", label: `${warehouseLabel}s`, desc: "Warehouses and locations", key: "warehouses" },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Masters"
        description={
          fmcgOrg
            ? "Products, categories, departments, parties, and warehouses"
            : "Products, categories, parties, and warehouses"
        }
        breadcrumbs={[{ label: "Masters" }]}
        sticky
        showCommandHint
      />
      <div className="p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map(({ href, label, desc, key }) => {
            const Icon = (Icons[ICONS[key]] || Icons.Box) as React.ComponentType<{ className?: string }>;
            return (
              <Link key={key} href={href}>
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader className="flex flex-row items-center gap-2">
                    <div className="rounded-lg bg-muted p-2">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-base">{label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{desc}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
}
