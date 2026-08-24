"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  downloadImportTemplateAsFormatApi,
  exportPriceTagPricesAsFormatApi,
  importPriceListsApi,
  type PartySheetExportFormat,
} from "@/lib/api/import-export";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const ACCEPT =
  ".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function FormatMenu({
  label,
  icon: Icon,
  disabled,
  onPick,
}: {
  label: string;
  icon: typeof Icons.Download;
  disabled?: boolean;
  onPick: (format: PartySheetExportFormat) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled}>
          <Icon className="mr-1.5 h-3.5 w-3.5" />
          {label}
          <Icons.ChevronDown className="ml-1.5 h-3.5 w-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onPick("xlsx")}>
          <Icons.FileSpreadsheet className="mr-2 h-4 w-4" />
          Microsoft Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onPick("csv")}>
          <Icons.FileText className="mr-2 h-4 w-4" />
          CSV (Google Sheets)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Price-tag sheet actions.
 * - multi: page-level import/template that can create several tags in one file.
 * - single: lock import to the open tag and download that tag’s current prices.
 */
export function PriceTagSheetActions({
  mode,
  priceListId,
  tagName,
  onImported,
}: {
  mode: "multi" | "single";
  priceListId?: string;
  tagName?: string;
  onImported?: () => void;
}) {
  const [importing, setImporting] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    setImporting(true);
    try {
      const result = await importPriceListsApi(
        file,
        mode === "single" && priceListId ? { priceListId } : undefined
      );
      const skipped = result.skipped?.length ?? 0;
      if (mode === "single" && tagName) {
        toast.success(
          `Imported ${result.pricesUpserted} price(s) into “${tagName}”` +
            (skipped ? ` · ${skipped} skipped` : "")
        );
      } else {
        toast.success(
          `Imported prices: ${result.pricesUpserted} row(s), ${result.tagsCreated} tag(s) created, ${result.tagsUpdated} updated` +
            (skipped ? ` · ${skipped} skipped` : "")
        );
      }
      onImported?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Price sheet import failed");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleTemplate = (format: PartySheetExportFormat) => {
    void (async () => {
      const ok = await downloadImportTemplateAsFormatApi("price-lists", format, (msg) =>
        toast.error(msg)
      );
      if (ok) {
        toast.success(
          format === "xlsx"
            ? "Excel template downloaded — one row per product; put the tag name in priceTag."
            : "CSV template downloaded — one row per product; put the tag name in priceTag."
        );
      }
    })();
  };

  const handleDownload = (format: PartySheetExportFormat) => {
    if (!priceListId || !tagName) return;
    setDownloading(true);
    void (async () => {
      const ok = await exportPriceTagPricesAsFormatApi(priceListId, tagName, format, (msg) =>
        toast.error(msg)
      );
      if (ok) {
        toast.success(
          format === "xlsx"
            ? `“${tagName}” prices downloaded as Excel — edit and import back.`
            : `“${tagName}” prices downloaded as CSV — edit and import back.`
        );
      }
      setDownloading(false);
    })();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => void handleImport(e.target.files?.[0])}
      />
      {mode === "single" ? (
        <FormatMenu
          label={downloading ? "Downloading…" : "Download prices"}
          icon={Icons.Download}
          disabled={downloading || !priceListId}
          onPick={handleDownload}
        />
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="outline"
        title={
          mode === "single"
            ? `Import prices into “${tagName ?? "this tag"}”. priceTag column is optional.`
            : "Import several tags at once. Columns: priceTag, sku or barcode, price, discountPercent (optional)."
        }
        disabled={importing || (mode === "single" && !priceListId)}
        onClick={() => fileRef.current?.click()}
      >
        <Icons.Upload className="mr-1.5 h-3.5 w-3.5" />
        {importing ? "Importing…" : mode === "single" ? "Import" : "Import CSV"}
      </Button>
      {mode === "multi" ? (
        <FormatMenu label="Template" icon={Icons.FileDown} onPick={handleTemplate} />
      ) : null}
    </div>
  );
}
