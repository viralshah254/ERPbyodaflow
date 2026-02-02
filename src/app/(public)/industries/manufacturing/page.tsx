"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AppFrame } from "@/components/marketing/app-frame";
import { INDUSTRY_TEMPLATES } from "@/config/industryTemplates";

export default function ManufacturingPage() {
  const template = INDUSTRY_TEMPLATES.MANUFACTURER;

  return (
    <div className="py-24 lg:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold mb-4">ERP for Manufacturers</h1>
            <p className="text-xl text-muted-foreground">
              {template.description}
            </p>
          </div>

          <div className="mb-16">
            <AppFrame>
              <div className="p-8 bg-muted/30 min-h-[400px]" />
            </AppFrame>
          </div>

          <div className="text-center">
            <Button size="lg" asChild>
              <Link href={`/signup?orgType=MANUFACTURER`}>
                Set up as Manufacturer
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}





