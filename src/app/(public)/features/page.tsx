"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { AppFrame } from "@/components/marketing/app-frame";
import * as Icons from "lucide-react";

export default function FeaturesPage() {
  const features = [
    {
      title: "Operational speed",
      description:
        "Process orders, manage inventory, and get approvals faster. Real-time updates keep everyone aligned.",
      icon: Icons.Zap,
    },
    {
      title: "Visibility end-to-end",
      description:
        "Track stock levels, deliveries, and collections across all branches. Know what's happening, when it's happening.",
      icon: Icons.Eye,
    },
    {
      title: "AI that drives action",
      description:
        "Get intelligent suggestions for reordering, anomaly detection, and automated summaries. AI that actually helps.",
      icon: Icons.Brain,
    },
    {
      title: "Industry templates",
      description:
        "Pre-configured workflows and terminology for manufacturers, distributors, and shops. Get started in minutes.",
      icon: Icons.LayoutTemplate,
    },
    {
      title: "Customization",
      description:
        "Custom fields, workflows, and dashboards. Make the ERP work exactly how your business operates.",
      icon: Icons.Sliders,
    },
    {
      title: "Multi-branch support",
      description:
        "Manage multiple locations from a single dashboard. Track inventory, orders, and finances across all branches.",
      icon: Icons.MapPin,
    },
  ];

  return (
    <div className="py-24 lg:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Everything you need to run your business</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed for manufacturers, distributors, and shops.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <Card key={i} className="p-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            );
          })}
        </div>

        <div className="max-w-4xl mx-auto">
          <AppFrame>
            <div className="p-8 bg-muted/30 min-h-[400px]" />
          </AppFrame>
        </div>
      </div>
    </div>
  );
}





