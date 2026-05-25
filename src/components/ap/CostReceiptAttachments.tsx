"use client";

import * as React from "react";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fetchApiBinary } from "@/lib/api/client";
import {
  downloadLandedCostAttachment,
  fetchLandedCostAttachments,
  type LandedCostAttachmentRow,
} from "@/lib/api/landed-cost";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type CostReceiptAttachment = {
  id: string;
  fileName: string;
  contentType?: string;
  allocationId: string;
  /** Shown in preview title when grouped under a supplier bill. */
  costLabel?: string;
};

type Props = {
  attachments?: CostReceiptAttachment[];
  allocationId?: string;
  lineIndex?: number;
  costLabel?: string;
  className?: string;
};

function attachmentPath(allocationId: string, fileId: string): string {
  return `/api/inventory/landed-cost/allocation/${encodeURIComponent(allocationId)}/attachments/${encodeURIComponent(fileId)}`;
}

function fileIcon(contentType?: string, fileName?: string) {
  const ct = (contentType ?? "").toLowerCase();
  const name = (fileName ?? "").toLowerCase();
  if (ct.startsWith("image/") || /\.(png|jpe?g|gif|webp|heic)$/i.test(name)) {
    return Icons.Image;
  }
  if (ct === "application/pdf" || name.endsWith(".pdf")) {
    return Icons.FileText;
  }
  return Icons.Paperclip;
}

function canPreview(contentType?: string, fileName?: string): boolean {
  const ct = (contentType ?? "").toLowerCase();
  const name = (fileName ?? "").toLowerCase();
  return ct.startsWith("image/") || ct === "application/pdf" || /\.(png|jpe?g|gif|webp|heic|pdf)$/i.test(name);
}

function ReceiptChip({
  att,
  onPreview,
}: {
  att: CostReceiptAttachment;
  onPreview: (att: CostReceiptAttachment) => void;
}) {
  const Icon = fileIcon(att.contentType, att.fileName);
  const previewable = canPreview(att.contentType, att.fileName);

  return (
    <div
      className={cn(
        "group inline-flex max-w-full items-center gap-1 rounded-md border border-border/80 bg-muted/40",
        "px-2 py-1 text-xs shadow-sm transition-colors hover:bg-muted/70 hover:border-primary/30",
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
      <span className="truncate max-w-[7rem] font-medium text-foreground/90" title={att.fileName}>
        {att.fileName}
      </span>
      <div className="ml-0.5 flex shrink-0 items-center gap-0.5 border-l border-border/60 pl-1">
        {previewable ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-primary"
            aria-label={`Open ${att.fileName}`}
            onClick={() => onPreview(att)}
          >
            <Icons.Eye className="h-3.5 w-3.5" />
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-primary"
          aria-label={`Download ${att.fileName}`}
          onClick={() =>
            void downloadLandedCostAttachment(att.allocationId, att.id, att.fileName, (msg) =>
              toast.error(msg ?? "Download failed."),
            )
          }
        >
          <Icons.Download className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function CostReceiptAttachments({
  attachments: initialAttachments,
  allocationId,
  lineIndex,
  costLabel,
  className,
}: Props) {
  const [loaded, setLoaded] = React.useState<CostReceiptAttachment[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [preview, setPreview] = React.useState<CostReceiptAttachment | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);

  const hasInitial = (initialAttachments?.length ?? 0) > 0;

  React.useEffect(() => {
    if (hasInitial || !allocationId || lineIndex === undefined) {
      setLoaded([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchLandedCostAttachments(allocationId, lineIndex)
      .then((items: LandedCostAttachmentRow[]) => {
        if (cancelled) return;
        setLoaded(
          items.map((a) => ({
            id: a.id,
            fileName: a.fileName,
            contentType: a.contentType,
            allocationId,
            costLabel,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setLoaded([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [allocationId, lineIndex, costLabel, hasInitial]);

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const attachments = React.useMemo(() => {
    if (hasInitial) return initialAttachments!;
    return loaded;
  }, [hasInitial, initialAttachments, loaded]);

  const openPreview = React.useCallback(async (att: CostReceiptAttachment) => {
    setPreview(att);
    setPreviewLoading(true);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    const blob = await fetchApiBinary(attachmentPath(att.allocationId, att.id));
    if (!blob) {
      toast.error("Could not open receipt.");
      setPreview(null);
      setPreviewLoading(false);
      return;
    }
    if (!canPreview(att.contentType, att.fileName)) {
      void downloadLandedCostAttachment(att.allocationId, att.id, att.fileName, (msg) =>
        toast.error(msg ?? "Download failed."),
      );
      setPreview(null);
      setPreviewLoading(false);
      return;
    }
    setPreviewUrl(URL.createObjectURL(blob));
    setPreviewLoading(false);
  }, []);

  const closePreview = React.useCallback(() => {
    setPreview(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPreviewLoading(false);
  }, []);

  if (loading) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
        <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading…
      </span>
    );
  }

  if (!attachments.length) {
    return (
      <span className={cn("text-xs text-muted-foreground/70 italic", className)} onClick={(e) => e.stopPropagation()}>
        No receipt
      </span>
    );
  }

  if (attachments.length === 1) {
    return (
      <>
        <div className={cn("flex min-w-0", className)} onClick={(e) => e.stopPropagation()}>
          <ReceiptChip att={attachments[0]!} onPreview={openPreview} />
        </div>
        <PreviewSheet
          open={!!preview}
          onOpenChange={(open) => !open && closePreview()}
          attachment={preview}
          previewUrl={previewUrl}
          loading={previewLoading}
          onDownload={() => {
            if (!preview) return;
            void downloadLandedCostAttachment(preview.allocationId, preview.id, preview.fileName, (msg) =>
              toast.error(msg ?? "Download failed."),
            );
          }}
        />
      </>
    );
  }

  return (
    <>
      <div className={cn("flex min-w-0 flex-wrap gap-1.5", className)} onClick={(e) => e.stopPropagation()}>
        {attachments.slice(0, 2).map((att) => (
          <ReceiptChip key={att.id} att={att} onPreview={openPreview} />
        ))}
        {attachments.length > 2 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
              >
                +{attachments.length - 2} more
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {attachments.slice(2).map((att) => (
                <DropdownMenuItem
                  key={att.id}
                  className="flex items-center justify-between gap-2"
                  onSelect={(e) => e.preventDefault()}
                >
                  <span className="truncate">{att.fileName}</span>
                  <span className="flex shrink-0 gap-1">
                    {canPreview(att.contentType, att.fileName) ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => void openPreview(att)}
                      >
                        <Icons.Eye className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() =>
                        void downloadLandedCostAttachment(att.allocationId, att.id, att.fileName, (msg) =>
                          toast.error(msg ?? "Download failed."),
                        )
                      }
                    >
                      <Icons.Download className="h-3.5 w-3.5" />
                    </Button>
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
      <PreviewSheet
        open={!!preview}
        onOpenChange={(open) => !open && closePreview()}
        attachment={preview}
        previewUrl={previewUrl}
        loading={previewLoading}
        onDownload={() => {
          if (!preview) return;
          void downloadLandedCostAttachment(preview.allocationId, preview.id, preview.fileName, (msg) =>
            toast.error(msg ?? "Download failed."),
          );
        }}
      />
    </>
  );
}

function PreviewSheet({
  open,
  onOpenChange,
  attachment,
  previewUrl,
  loading,
  onDownload,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attachment: CostReceiptAttachment | null;
  previewUrl: string | null;
  loading: boolean;
  onDownload: () => void;
}) {
  const isPdf =
    attachment &&
    (attachment.contentType === "application/pdf" || attachment.fileName.toLowerCase().endsWith(".pdf"));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 pr-8 text-base">
            <Icons.Receipt className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="truncate">{attachment?.fileName ?? "Receipt"}</span>
          </SheetTitle>
          {attachment?.costLabel ? (
            <p className="text-sm text-muted-foreground">{attachment.costLabel}</p>
          ) : null}
        </SheetHeader>
        <div className="mt-2 flex shrink-0 justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onDownload} disabled={!attachment}>
            <Icons.Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
        <div className="mt-4 min-h-0 flex-1 overflow-auto rounded-lg border bg-muted/20 p-2">
          {loading ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading preview…
            </div>
          ) : previewUrl && attachment ? (
            isPdf ? (
              <iframe
                title={attachment.fileName}
                src={previewUrl}
                className="h-[min(70vh,720px)] w-full rounded-md border-0 bg-white"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- blob preview
              <img
                src={previewUrl}
                alt={attachment.fileName}
                className="mx-auto max-h-[70vh] w-auto max-w-full object-contain"
              />
            )
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Collect receipt files for a bill list row (supplier bill or nested cost line). */
export function collectBillReceiptAttachments(row: {
  rowKind?: "bill" | "cost";
  allocationId?: string;
  lineIndex?: number;
  costType?: string;
  costAttachments?: Array<{ id: string; fileName: string; contentType?: string }>;
  linkedShipmentCosts?: Array<{
    allocationId: string;
    lineIndex: number;
    costType: string;
    attachments?: Array<{ id: string; fileName: string; contentType?: string }>;
  }>;
}): CostReceiptAttachment[] {
  const out: CostReceiptAttachment[] = [];

  if (row.rowKind === "cost" && row.allocationId && row.costAttachments?.length) {
    for (const att of row.costAttachments) {
      out.push({
        ...att,
        allocationId: row.allocationId,
        costLabel: row.costType,
      });
    }
    return out;
  }

  if (row.rowKind === "bill" && row.linkedShipmentCosts?.length) {
    for (const cost of row.linkedShipmentCosts) {
      for (const att of cost.attachments ?? []) {
        out.push({
          ...att,
          allocationId: cost.allocationId,
          costLabel: cost.costType,
        });
      }
    }
    return out;
  }

  return out;
}
