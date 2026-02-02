"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { INDUSTRY_TEMPLATES } from "@/config/industryTemplates";
import * as Icons from "lucide-react";

export default function IndustriesPage() {
  return (
    <div className="py-24 lg:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Built for your industry</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Templates tailored to your business type with the right terminology and
            workflows from day one.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
          {Object.values(INDUSTRY_TEMPLATES).map((template) => {
            const IconComponent = (Icons[template.icon as keyof typeof Icons] || Icons.Box) as React.ComponentType<{ className?: string }>;
            return (
              <Card key={template.orgType} className="p-8 hover:shadow-lg transition-shadow">
                <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
                  <IconComponent className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">{template.name}</h3>
                <p className="text-muted-foreground mb-6">{template.description}</p>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/industries/${template.orgType.toLowerCase()}`}>
                    Learn more
                  </Link>
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}





