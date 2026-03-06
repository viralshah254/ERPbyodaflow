"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RecommendationCard } from "@/components/ai/RecommendationCard";
import { useUIStore } from "@/stores/ui-store";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const LAYERS = [
  {
    id: "planning",
    title: "Forecasting & Planning",
    description: "Demand forecasts, supply risk, scenario simulation",
    href: "/analytics/explore",
    icon: "TrendingUp",
    links: [
      { label: "Explore metrics", href: "/analytics/explore" },
      { label: "Simulations", href: "/analytics/simulations" },
      { label: "MRP", href: "/manufacturing/mrp" },
    ],
  },
  {
    id: "production",
    title: "Production Optimization",
    description: "Schedules, utilization, reorder suggestions",
    href: "/manufacturing/work-orders",
    icon: "Factory",
    links: [
      { label: "Work orders", href: "/manufacturing/work-orders" },
      { label: "MRP", href: "/manufacturing/mrp" },
      { label: "Routing", href: "/manufacturing/routing" },
      { label: "Approvals", href: "/approvals/inbox" },
    ],
  },
  {
    id: "procurement",
    title: "Autonomous Procurement",
    description: "Supplier performance, auto-PO proposals, approval queue",
    href: "/purchasing/orders",
    icon: "ShoppingCart",
    links: [
      { label: "Purchase orders", href: "/purchasing/orders" },
      { label: "Requests", href: "/purchasing/requests" },
      { label: "Approvals", href: "/approvals/inbox" },
      { label: "Work queue", href: "/work/queue" },
    ],
  },
  {
    id: "finance",
    title: "Finance Intelligence",
    description: "Margins, cash forecast, anomalies, fraud signals",
    href: "/analytics/finance",
    icon: "Landmark",
    links: [
      { label: "Finance intelligence", href: "/analytics/finance" },
      { label: "Cashflow", href: "/treasury/cashflow" },
      { label: "Bank recon", href: "/finance/bank-recon" },
      { label: "Three-way match", href: "/ap/three-way-match" },
    ],
  },
  {
    id: "ask-ai",
    title: "Ask AI",
    description: "Natural language commands, intent preview, generated views",
    href: "#",
    icon: "MessageSquare",
    links: [{ label: "Press ⌘K to open command bar", href: "#" }],
  },
] as const;

export default function ControlTowerPage() {
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen);

  return (
    <PageShell>
      <PageHeader
        title="Control Tower"
        description="Supply chain autopilot with human supervision — five intelligence layers"
        breadcrumbs={[{ label: "Control Tower" }]}
        sticky
        showCommandHint
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCommandPaletteOpen(true)}
          >
            <Icons.MessageSquare className="mr-2 h-4 w-4" />
            Ask AI (⌘K)
          </Button>
        }
      />
      <div className="p-6 space-y-8">
        {/* Five layers grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LAYERS.map((layer) => {
            const iconMap: Record<string, keyof typeof Icons> = {
              TrendingUp: "TrendingUp",
              Factory: "Factory",
              ShoppingCart: "ShoppingCart",
              Landmark: "Landmark",
              MessageSquare: "MessageSquare",
            };
            const Icon = Icons[iconMap[layer.icon] ?? "Box"] ?? Icons.Box;
            return (
              <Card
                key={layer.id}
                className="transition-colors hover:border-primary/30 hover:bg-muted/20"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{layer.title}</CardTitle>
                      <CardDescription className="mt-1 text-sm">
                        {layer.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {layer.links.map((link) => (
                    <div key={link.href + link.label}>
                      {link.href === "#" && link.label.includes("⌘K") ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-muted-foreground hover:text-foreground"
                          onClick={() => setCommandPaletteOpen(true)}
                        >
                          <Icons.Command className="mr-2 h-4 w-4" />
                          {link.label}
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
                          <Link href={link.href}>{link.label}</Link>
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Sample AI recommendation cards */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Sample recommendations</h2>
          <p className="text-sm text-muted-foreground mb-4">
            AI-first UX: insights before tables. Each recommendation includes drivers, risk, confidence, and Simulate / Approve / Modify.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <RecommendationCard
              layer="Planning"
              title="Increase maize flour production by 12% in Nairobi next month"
              drivers={[
                "Distributor demand +14%",
                "Harvest forecast −8%",
                "Promo uplift +6%",
              ]}
              risk="medium"
              confidence={83}
              onSimulate={() => toast.info("Simulate (stub). Opens scenario builder.")}
              onApprove={() => toast.success("Approve (stub). API pending.")}
              onModify={() => toast.info("Modify (stub). Opens plan editor.")}
              onExplain={() => toast.info("Why this? (stub). Opens explainability panel.")}
            />
            <RecommendationCard
              layer="Production"
              title="Run SKU-A after SKU-C"
              expectedUpside="Cleaning time −18%, Energy −6%, Scrap −4%"
              risk="low"
              confidence={79}
              onSimulate={() => toast.info("Simulate (stub).")}
              onApprove={() => toast.success("Approve (stub). API pending.")}
              onModify={() => toast.info("Override (stub).")}
            />
            <RecommendationCard
              layer="Procurement"
              title="Shift 40% volume from Supplier X to Supplier Y"
              drivers={[
                "Late deliveries: 27%",
                "Cost delta: −4%",
                "Risk rating improvement",
              ]}
              risk="medium"
              confidence={76}
              onSimulate={() => toast.info("Simulate (stub).")}
              onApprove={() => toast.success("Approve switch (stub). API pending.")}
            />
            <RecommendationCard
              layer="Finance"
              title="Packaging cost per unit increased 9%"
              drivers={[
                "Supplier change",
                "MOQ uplift",
                "Transport surcharge",
              ]}
              risk="medium"
              confidence={88}
              onModify={() => toast.info("Open investigation (stub).")}
              onApprove={() => toast.success("Approve mitigation (stub). API pending.")}
            />
          </div>
        </section>
      </div>
    </PageShell>
  );
}
