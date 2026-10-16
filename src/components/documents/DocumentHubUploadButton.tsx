"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { uploadDocumentHubFiles } from "@/lib/api/document-hub";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export function DocumentHubUploadButton({
  sourceTransaction,
  label = "Scan or upload",
}: {
  sourceTransaction?: { docType: string; docId: string };
  label?: string;
}) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);

  const onFiles = async (list: FileList | null) => {
    const files = list ? Array.from(list) : [];
    if (!files.length) return;
    setBusy(true);
    try {
      await uploadDocumentHubFiles(files, sourceTransaction);
      toast.success(files.length === 1 ? "Document sent to the hub." : `${files.length} documents sent to the hub.`);
      router.push("/documents/hub");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        capture="environment"
        multiple
        className="hidden"
        onChange={(event) => void onFiles(event.target.files)}
      />
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
        <Icons.ScanLine className="mr-2 h-4 w-4" />
        {busy ? "Reading…" : label}
      </Button>
    </>
  );
}
