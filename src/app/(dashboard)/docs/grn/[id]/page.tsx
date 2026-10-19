"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/** Goods receipts have one screen: the inventory receipt. */
export default function GrnDocumentRedirectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = String(params?.id ?? "");

  useEffect(() => {
    if (!id) return;
    router.replace(`/inventory/receipts/${encodeURIComponent(id)}`);
  }, [id, router]);

  return <p className="p-6 text-sm text-muted-foreground">Opening receipt…</p>;
}
