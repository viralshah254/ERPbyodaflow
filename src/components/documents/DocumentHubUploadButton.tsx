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
  onPendingChange,
  onUploaded,
}: {
  sourceTransaction?: { docType: string; docId: string };
  label?: string;
  onPendingChange?: (fileNames: string[]) => void;
  onUploaded?: (result: Awaited<ReturnType<typeof uploadDocumentHubFiles>>) => void | Promise<void>;
}) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [readingName, setReadingName] = React.useState<string | null>(null);

  const onFiles = async (list: FileList | null) => {
    const files = list ? Array.from(list) : [];
    if (!files.length) return;
    setBusy(true);
    setReadingName(files.length === 1 ? files[0].name : `${files.length} files`);
    onPendingChange?.(files.map((file) => file.name));
    try {
      const result = await uploadDocumentHubFiles(files, sourceTransaction);
      onPendingChange?.([]);
      const count = result.uploads.reduce((sum, upload) => sum + upload.items.length, 0);
      toast.success(count === 1 ? "Read. It\u2019s in the inbox." : `Read. ${count} documents are in the inbox.`);
      if (onUploaded) await onUploaded(result);
      else router.push("/documents/hub");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
      setReadingName(null);
      onPendingChange?.([]);
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
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()} className="max-w-[16rem]">
        {busy ? <Icons.Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" /> : <Icons.ScanLine className="mr-2 h-4 w-4 shrink-0" />}
        <span className="truncate">{busy ? `Reading ${readingName ?? "file"}` : label}</span>
      </Button>
    </>
  );
}
