"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as Icons from "lucide-react";

interface DocumentAttachmentsProps {
  files?: { id: string; name: string; size?: string }[];
  onUpload?: (file: File) => void | Promise<void>;
  onDownload?: (file: { id: string; name: string; size?: string }) => void;
}

const MOCK_FILES = [
  { id: "1", name: "contract-signed.pdf", size: "240 KB" },
  { id: "2", name: "delivery-scan.png", size: "1.2 MB" },
];

/** Attachments panel: list + lightweight demo upload/download behavior. */
export function DocumentAttachments({
  files = MOCK_FILES,
  onUpload,
  onDownload,
}: DocumentAttachmentsProps) {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    try {
      await onUpload?.(file);
      if (!onUpload) {
        toast.success(`Attachment ${file.name} recorded.`);
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <div
        className={cn(
          "rounded-lg border-2 border-dashed p-6 text-center transition-colors",
          isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 bg-muted/20"
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          void handleFiles(e.dataTransfer.files);
        }}
      >
        <p className="text-sm text-muted-foreground mb-2">Drag and drop files here, or</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          <Icons.Upload className="mr-2 h-4 w-4" />
          Upload file
        </Button>
      </div>
      {files.length === 0 ? (
        <p className="text-sm text-muted-foreground">No attachments.</p>
      ) : (
        <ul className="space-y-2">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-2 rounded border px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icons.FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{f.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {f.size && <span className="text-xs text-muted-foreground">{f.size}</span>}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7"
                  onClick={() => {
                    onDownload?.(f);
                    if (!onDownload) {
                      toast.success(`Attachment preview for ${f.name} is only available in demo mode.`);
                    }
                  }}
                >
                  <Icons.Download className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
