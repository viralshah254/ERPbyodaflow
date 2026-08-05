"use client";

import { CustomersHub } from "@/components/customers/CustomersHub";
import { useSearchParams } from "next/navigation";
import * as React from "react";

function SalesCustomersPageContent() {
  const searchParams = useSearchParams();
  const fromFinance = searchParams.get("from") === "finance";
  return <CustomersHub fromFinance={fromFinance} />;
}

export default function SalesCustomersPage() {
  return (
    <React.Suspense fallback={null}>
      <SalesCustomersPageContent />
    </React.Suspense>
  );
}
