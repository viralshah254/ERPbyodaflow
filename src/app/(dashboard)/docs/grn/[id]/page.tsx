"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import DocTypeNewPage from "../../[type]/new/page";

/** Goods receipts have one screen: the inventory receipt. Creating one stays on the document wizard. */
export default function GrnDocumentRedirectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = String(params?.id ?? "");

  useEffect(() => {
    if (!id || id === "new") return;
    router.replace(`/inventory/receipts/${encodeURIComponent(id)}`);
  }, [id, router]);

  if (id === "new") return <DocTypeNewPage />;

  return <p className="p-6 text-sm text-muted-foreground">Opening receipt…</p>;
}
