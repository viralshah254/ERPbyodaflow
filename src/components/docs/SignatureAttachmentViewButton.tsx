"use client";

import * as React from "react";
import { fetchApiBinary } from "@/lib/api/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { DocTypeKey } from "@/config/documents/types";
import { toast } from "sonner";

type Props = {
  docType: DocTypeKey;
  documentId: string;
  attachmentId: string;
  /** Button/link label */
  label?: string;
};

export function SignatureAttachmentViewButton({
  docType,
  documentId,
  attachmentId,
  label = "View signature",
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [objectUrl, setObjectUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    return () => {
      setObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, []);

  React.useEffect(() => {
    if (!open || !attachmentId) return;
    let cancelled = false;
    setLoading(true);
    const path = `/api/documents/${docType}/${documentId}/attachments/${attachmentId}`;
    void fetchApiBinary(path).then((blob) => {
      if (cancelled) return;
      if (!blob) {
        toast.error("Could not load signature.");
        setOpen(false);
        setLoading(false);
        return;
      }
      const url = URL.createObjectURL(blob);
      setObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, docType, documentId, attachmentId]);

  return (
    <>
      <button
        type="button"
        className="text-primary underline-offset-4 hover:underline font-medium bg-transparent border-0 p-0 cursor-pointer"
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setObjectUrl((prev) => {
              if (prev) URL.revokeObjectURL(prev);
              return null;
            });
            setLoading(false);
          }
        }}
      >
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Signature</SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex min-h-[200px] items-center justify-center px-1">
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : objectUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- blob URL preview
              <img
                src={objectUrl}
                alt="Signature"
                className="max-h-[70vh] w-auto max-w-full object-contain"
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
