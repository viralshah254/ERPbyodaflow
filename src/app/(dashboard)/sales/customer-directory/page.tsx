"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

function CustomerDirectoryRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "directory");
    router.replace(`/sales/customers?${params.toString()}`);
  }, [router, searchParams]);

  return null;
}

export default function CustomerDirectoryPage() {
  return (
    <React.Suspense fallback={null}>
      <CustomerDirectoryRedirect />
    </React.Suspense>
  );
}
