"use client";

import * as React from "react";
import { fetchApiBinary } from "@/lib/api/client";
import { TableLinearProgress } from "@/components/ui/table-linear-progress";

const MAX_PAGES = 12;

export function DocumentHubPreview({
  fileId,
  fileName,
  contentType,
  fileUrl,
  fill = false,
}: {
  fileId: string;
  fileName: string;
  contentType?: string;
  fileUrl?: string;
  fill?: boolean;
}) {
  if (fileUrl) {
    return <StoredFilePreview fileUrl={fileUrl} fileName={fileName} contentType={contentType} fill={fill} />;
  }
  return <StoredBytesPreview fileId={fileId} fileName={fileName} contentType={contentType} fill={fill} />;
}

function StoredFilePreview({
  fileUrl,
  fileName,
  contentType,
  fill,
}: {
  fileUrl: string;
  fileName: string;
  contentType?: string;
  fill: boolean;
}) {
  const pdf = fileName.toLowerCase().endsWith(".pdf") || (contentType || "").includes("pdf");
  const image = (contentType || "").startsWith("image/") && !pdf;
  return (
    <div className={fill ? "flex h-full min-h-[32rem] flex-col overflow-hidden bg-muted/30" : "overflow-hidden rounded-lg border"}>
      <div className={fill ? "relative min-h-0 flex-1 overflow-y-auto" : "relative max-h-[75vh] overflow-y-auto bg-muted/40"}>
        {pdf ? (
          <iframe title={fileName} src={fileUrl} className={fill ? "h-full min-h-[32rem] w-full bg-white" : "h-[75vh] w-full bg-white"} />
        ) : null}
        {image ? <img src={fileUrl} alt={fileName} className="mx-auto max-h-[75vh] w-full object-contain" /> : null}
        {!pdf && !image ? (
          <a href={fileUrl} target="_blank" rel="noreferrer" className="block p-6 text-sm underline">
            Open {fileName}
          </a>
        ) : null}
      </div>
      <p className="truncate border-t px-3 py-2 text-xs text-muted-foreground">{fileName}</p>
    </div>
  );
}

function StoredBytesPreview({
  fileId,
  fileName,
  contentType,
  fill,
}: {
  fileId: string;
  fileName: string;
  contentType?: string;
  fill: boolean;
}) {
  const stageRef = React.useRef<HTMLDivElement>(null);
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState<string | null>(null);
  const [rendering, setRendering] = React.useState(true);
  const [pageCount, setPageCount] = React.useState(0);

  React.useEffect(() => {
    const stage = stageRef.current;
    let objectUrl: string | null = null;
    let cancelled = false;
    setImageUrl(null);
    setFailed(null);
    setRendering(true);
    setPageCount(0);
    if (stage) stage.replaceChildren();

    void (async () => {
      const blob = await fetchApiBinary(`/api/document-hub/files/${fileId}`);
      if (cancelled) return;
      if (!blob) {
        setFailed("The original file could not be loaded.");
        setRendering(false);
        return;
      }
      const bytes = new Uint8Array(await blob.arrayBuffer());
      if (cancelled) return;
      const namePdf = fileName.toLowerCase().endsWith(".pdf");
      const typePdf = (blob.type || contentType || "").includes("pdf");
      const header = String.fromCharCode(...bytes.slice(0, 5));
      const isPdf = namePdf || typePdf || header.startsWith("%PDF");
      const isImage = (blob.type || contentType || "").startsWith("image/") && !isPdf;
      if (isImage) {
        objectUrl = URL.createObjectURL(new Blob([bytes], { type: blob.type || contentType || "image/jpeg" }));
        setImageUrl(objectUrl);
        setRendering(false);
        return;
      }
      if (!isPdf) {
        objectUrl = URL.createObjectURL(new Blob([bytes], { type: blob.type || "application/octet-stream" }));
        setImageUrl(objectUrl);
        setFailed("open-link");
        setRendering(false);
        return;
      }
      try {
        const pdfjs = (await import(/* webpackIgnore: true */ "/pdf.min.mjs" as string)) as {
          GlobalWorkerOptions: { workerSrc: string };
          getDocument: (src: { data: Uint8Array }) => { promise: Promise<{
            numPages: number;
            destroy: () => Promise<void>;
            getPage: (number: number) => Promise<{
              getViewport: (options: { scale: number }) => { width: number; height: number };
              render: (options: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void> };
            }>;
          }> };
        };
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const pdf = await pdfjs.getDocument({ data: bytes.slice() }).promise;
        if (cancelled) {
          await pdf.destroy();
          return;
        }
        const shown = Math.min(pdf.numPages, MAX_PAGES);
        setPageCount(pdf.numPages);
        const width = Math.max(320, (stageRef.current?.clientWidth ?? 720) - 24);
        for (let number = 1; number <= shown; number += 1) {
          if (cancelled) break;
          const page = await pdf.getPage(number);
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: width / base.width });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.className = "mx-auto mb-3 max-w-full bg-white shadow-sm";
          const context = canvas.getContext("2d");
          if (!context) continue;
          await page.render({ canvasContext: context, viewport }).promise;
          stageRef.current?.appendChild(canvas);
        }
        await pdf.destroy();
        if (!cancelled) setRendering(false);
      } catch (error) {
        if (!cancelled) {
          const detail = error instanceof Error ? error.message : "";
          setFailed(detail ? `This PDF could not be drawn. ${detail}` : "This PDF could not be drawn.");
          setRendering(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [contentType, fileId, fileName]);

  const linkOnly = failed === "open-link" && imageUrl;

  return (
    <div className={fill ? "flex h-full min-h-[32rem] flex-col overflow-hidden bg-muted/30" : "overflow-hidden rounded-lg border"}>
      <div className={fill ? "relative min-h-0 flex-1 overflow-y-auto" : "relative max-h-[75vh] overflow-y-auto bg-muted/40"}>
        <TableLinearProgress active={rendering} />
        {rendering ? <div className="h-80" /> : null}
        {failed && failed !== "open-link" ? <p className="p-6 text-sm text-muted-foreground">{failed}</p> : null}
        {imageUrl && !linkOnly ? <img src={imageUrl} alt={fileName} className="mx-auto max-h-[75vh] w-full object-contain" /> : null}
        {linkOnly ? (
          <a href={imageUrl} target="_blank" rel="noreferrer" className="block p-6 text-sm underline">
            Open {fileName}
          </a>
        ) : null}
        <div ref={stageRef} className="px-3 py-3" />
        {pageCount > MAX_PAGES ? (
          <p className="px-3 pb-3 text-xs text-muted-foreground">Showing the first {MAX_PAGES} of {pageCount} pages.</p>
        ) : null}
      </div>
      <p className="truncate border-t px-3 py-2 text-xs text-muted-foreground">{fileName}</p>
    </div>
  );
}
