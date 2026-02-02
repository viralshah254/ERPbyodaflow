"use client";

import * as React from "react";

export default function AboutPage() {
  return (
    <div className="py-24 lg:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
        <h1 className="text-4xl font-bold mb-6">About ERP by OdaFlow</h1>
        <div className="prose prose-gray max-w-none">
          <p className="text-lg text-muted-foreground mb-6">
            ERP by OdaFlow is built for manufacturers, distributors, and shops who need
            real-world solutions for managing inventory, orders, finance, and operations.
          </p>
          <p className="text-muted-foreground mb-6">
            We believe that ERP software should be powerful yet simple, customizable yet
            ready to use, and designed for the way businesses actually operate.
          </p>
        </div>
      </div>
    </div>
  );
}





