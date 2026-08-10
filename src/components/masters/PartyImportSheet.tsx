"use client";

import * as React from "react";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  downloadImportTemplateAsFormatApi,
  exportPartiesSheetApi,
  importPartiesApi,
  patchPartiesFromSheetApi,
  type ImportPartiesResult,
  type PartySheetExportKind,
  type PatchPartiesResult,
} from "@/lib/api/import-export";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const CUSTOMER_SHEET_KINDS: { value: PartySheetExportKind; label: string }[] = [
  { value: "all", label: "All customers" },
  { value: "modern-trade", label: "Modern trade only" },
  { value: "modern-trade-hq", label: "Modern trade HQ only" },
  { value: "gt-all", label: "General trade + distributor + van" },
  { value: "general-trade", label: "General trade only" },
  { value: "distributor", label: "Distributors only" },
  { value: "van-sales", label: "Van sales only" },
];

const ACCEPTED_IMPORT =
  ".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export type PartyImportType = "customer" | "supplier";

type PartyImportSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: PartyImportType;
  /** Singular label for UI copy, e.g. "Customer" / "Supplier". */
  entityLabel: string;
  /** Called after a successful import so the parent can refresh lists. */
  onImported?: () => void | Promise<void>;
  /** Open on the Google Sheets update tab. */
  initialTab?: "create" | "sheet";
};

export function PartyImportSheet({
  open,
  onOpenChange,
  type,
  entityLabel,
  onImported,
  initialTab = "create",
}: PartyImportSheetProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const sheetFileInputRef = React.useRef<HTMLInputElement>(null);
  const [tab, setTab] = React.useState<"create" | "sheet">(initialTab);
  const [importFile, setImportFile] = React.useState<File | null>(null);
  const [sheetFile, setSheetFile] = React.useState<File | null>(null);
  const [importing, setImporting] = React.useState(false);
  const [patching, setPatching] = React.useState(false);
  const [importResult, setImportResult] = React.useState<ImportPartiesResult | null>(null);
  const [patchResult, setPatchResult] = React.useState<PatchPartiesResult | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [sheetKind, setSheetKind] = React.useState<PartySheetExportKind>("all");

  const labelLower = entityLabel.toLowerCase();
  const templateEntity = type === "customer" ? "customers" : "suppliers";

  React.useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  const reset = () => {
    setImportFile(null);
    setSheetFile(null);
    setImportResult(null);
    setPatchResult(null);
    setDragOver(false);
    setSheetKind("all");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const pickFile = (
    file: File | null,
    setter: (f: File | null) => void,
    clearResult: () => void
  ) => {
    if (!file) return;
    const ok =
      /\.(csv|xlsx|xls)$/i.test(file.name) ||
      file.type === "text/csv" ||
      file.type.includes("spreadsheet") ||
      file.type.includes("excel");
    if (!ok) {
      toast.error("Use a CSV or Excel file (.csv, .xlsx, .xls).");
      return;
    }
    setter(file);
    clearResult();
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const result = await importPartiesApi(importFile, type);
      setImportResult(result);
      toast.success(
        `Imported ${result.imported} ${labelLower}${result.imported === 1 ? "" : "s"}.`
      );
      setImportFile(null);
      await onImported?.();
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  };

  const handlePatch = async () => {
    if (!sheetFile) return;
    setPatching(true);
    setPatchResult(null);
    try {
      const result = await patchPartiesFromSheetApi(sheetFile, type);
      setPatchResult(result);
      toast.success(
        `Updated ${result.updated} ${labelLower}${result.updated === 1 ? "" : "s"}` +
          (result.unchanged ? ` · ${result.unchanged} unchanged` : "") +
          "."
      );
      setSheetFile(null);
      await onImported?.();
      if (sheetFileInputRef.current) sheetFileInputRef.current.value = "";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sheet update failed.");
    } finally {
      setPatching(false);
    }
  };

  const dropZone = (
    file: File | null,
    onPick: (f: File | null) => void,
    inputRef: React.RefObject<HTMLInputElement>
  ) => (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMPORT}
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          onPick(e.dataTransfer.files?.[0] ?? null);
        }}
        className={`w-full rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
        }`}
      >
        {file ? (
          <div className="flex flex-col items-center gap-1">
            <Icons.FileCheck2 className="h-8 w-8 text-primary" />
            <p className="text-sm font-medium text-foreground">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(1)} KB · click to change
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <Icons.UploadCloud className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Drag &amp; drop your file here</p>
            <p className="text-xs text-muted-foreground">or click to browse · CSV, XLSX or XLS</p>
          </div>
        )}
      </button>
      <p className="text-xs text-muted-foreground text-center">
        Excel and Google Sheets downloads work — no need to convert first.
      </p>
    </>
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{labelLower}s — import &amp; sheet update</SheetTitle>
        </SheetHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "create" | "sheet")}
          className="mt-4"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Add new</TabsTrigger>
            <TabsTrigger value="sheet">Credit &amp; tax ID</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-5 py-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground space-y-2">
              {type === "customer" ? (
                <p>
                  Prefer importing <span className="font-medium text-foreground">general trade /
                  distributor / van</span> outlets in <span className="font-medium text-foreground">SFA</span>{" "}
                  first (with GPS), then sync here. Use this create import mainly for ERP-only
                  greenfield or quick Party setup. Modern trade stores stay in the shared SFA catalog —
                  link them from SFA, then set tax/credit under Credit &amp; tax ID.
                </p>
              ) : null}
              <p className="font-medium text-foreground">Columns</p>
              {type === "customer" ? (
                <ul className="list-disc pl-4 space-y-1">
                  <li>
                    <span className="font-medium text-foreground">name</span>{" "}
                    <span className="text-red-500">(required)</span> — customer or outlet name.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">customerKind</span>{" "}
                    <span className="text-muted-foreground">(optional)</span> — type of customer:{" "}
                    <code>general-trade</code>, <code>distributor</code>, <code>van-sales</code>, or{" "}
                    <code>modern-trade</code> / <code>modern-trade-branch</code> if you must create
                    Parties here.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">customerCode</span>{" "}
                    <span className="text-muted-foreground">(optional)</span> — your own short ID if you
                    have one (e.g. <code>8009</code> or <code>Naivas-1203</code>). Leave blank and we
                    create one for you.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">parentCode</span>{" "}
                    <span className="text-muted-foreground">(optional)</span> — for a supermarket branch,
                    put the HQ’s customerCode here (e.g. <code>8009</code>). Leave blank for everyone
                    else.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">taxId</span> /{" "}
                    <span className="font-medium text-foreground">creditLimitAmount</span>{" "}
                    <span className="text-muted-foreground">(optional)</span> — KRA PIN and credit limit.
                    You can add these later under Credit &amp; tax ID.
                  </li>
                </ul>
              ) : (
                <ul className="list-disc pl-4 space-y-1">
                  <li>
                    <span className="font-medium text-foreground">code</span>{" "}
                    <span className="text-red-500">(required)</span>
                  </li>
                  <li>
                    <span className="font-medium text-foreground">name</span>{" "}
                    <span className="text-red-500">(required)</span>
                  </li>
                </ul>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed p-3">
              <div className="flex items-center gap-2 text-sm">
                <Icons.FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Need the format?</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    <Icons.Download className="mr-2 h-3.5 w-3.5" />
                    Template
                    <Icons.ChevronDown className="ml-1.5 h-3.5 w-3.5 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => {
                      void (async () => {
                        const ok = await downloadImportTemplateAsFormatApi(
                          templateEntity,
                          "xlsx",
                          (msg) => toast.error(msg)
                        );
                        if (ok) {
                          toast.success("Excel template downloaded — open it in Microsoft Excel.");
                        }
                      })();
                    }}
                  >
                    <Icons.FileSpreadsheet className="mr-2 h-4 w-4" />
                    Microsoft Excel (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      void (async () => {
                        const ok = await downloadImportTemplateAsFormatApi(
                          templateEntity,
                          "csv",
                          (msg) => toast.error(msg)
                        );
                        if (ok) {
                          toast.success("CSV template downloaded — open it in Excel or Google Sheets.");
                        }
                      })();
                    }}
                  >
                    <Icons.FileText className="mr-2 h-4 w-4" />
                    CSV (Google Sheets)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {dropZone(importFile, (f) => pickFile(f, setImportFile, () => setImportResult(null)), fileInputRef)}

            {importResult && (
              <div className="space-y-2 rounded-lg border p-3 text-sm">
                <p className="font-medium text-foreground">
                  Result: {importResult.imported} imported
                </p>
                {(importResult.warnings?.length ?? 0) > 0 && (
                  <div className="space-y-1">
                    <p className="font-medium text-amber-600">
                      {importResult.warnings!.length} warning
                      {importResult.warnings!.length === 1 ? "" : "s"}
                    </p>
                    <ul className="list-disc pl-4 text-xs text-muted-foreground max-h-40 overflow-y-auto">
                      {importResult.warnings!.map((s, idx) => (
                        <li key={idx}>
                          Row {s.row}
                          {s.code ? ` (${s.code})` : ""}: {s.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(importResult.skipped?.length ?? 0) > 0 && (
                  <div className="space-y-1">
                    <p className="font-medium text-red-600">
                      {importResult.skipped!.length} skipped
                    </p>
                    <ul className="list-disc pl-4 text-xs text-muted-foreground max-h-40 overflow-y-auto">
                      {importResult.skipped!.map((s, idx) => (
                        <li key={idx}>
                          Row {s.row}
                          {s.code ? ` (${s.code})` : ""}: {s.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sheet" className="space-y-5 py-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">How to update credit &amp; tax ID</p>
              {type === "customer" ? (
                <ol className="list-decimal pl-4 space-y-1">
                  <li>
                    Sync customers from SFA first (so ERP already has the outlets linked). Do{" "}
                    <span className="font-medium text-foreground">not</span> re-import a full customer
                    master here just to set tax or credit.
                  </li>
                  <li>
                    Choose who to download (all, modern trade only, GT/van, etc.), then download Excel
                    or CSV.
                  </li>
                  <li>
                    Edit{" "}
                    <span className="font-medium text-foreground">taxId</span> and{" "}
                    <span className="font-medium text-foreground">creditLimitAmount</span> from your
                    finance data. Leave{" "}
                    <span className="font-medium text-foreground">customerCode</span> unchanged.
                  </li>
                  <li>
                    Upload below. We only update existing customers — nothing new is created. Orders
                    already match via the SFA link; tax/credit apply on the next credit check.
                  </li>
                </ol>
              ) : (
                <ol className="list-decimal pl-4 space-y-1">
                  <li>
                    <span className="font-medium text-foreground">Download all {labelLower}s</span> —
                    choose Excel (recommended) or CSV.
                  </li>
                  <li>
                    Edit{" "}
                    <span className="font-medium text-foreground">taxId</span> and{" "}
                    <span className="font-medium text-foreground">creditLimitAmount</span>.
                  </li>
                  <li>Upload below — existing rows only; nothing new is created.</li>
                </ol>
              )}
            </div>

            {type === "customer" ? (
              <div className="space-y-2">
                <Label htmlFor="sheet-kind">Download</Label>
                <Select
                  value={sheetKind}
                  onValueChange={(v) => setSheetKind(v as PartySheetExportKind)}
                >
                  <SelectTrigger id="sheet-kind" className="w-full">
                    <SelectValue placeholder="Who to download" />
                  </SelectTrigger>
                  <SelectContent>
                    {CUSTOMER_SHEET_KINDS.map((k) => (
                      <SelectItem key={k.value} value={k.value}>
                        {k.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="w-full" disabled={patching}>
                  <Icons.Download className="mr-2 h-4 w-4" />
                  Download{" "}
                  {type === "customer" && sheetKind !== "all"
                    ? CUSTOMER_SHEET_KINDS.find((k) => k.value === sheetKind)?.label.toLowerCase() ??
                      labelLower + "s"
                    : `all ${labelLower}s`}
                  <Icons.ChevronDown className="ml-auto h-4 w-4 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                <DropdownMenuItem
                  onSelect={() => {
                    void (async () => {
                      const ok = await exportPartiesSheetApi(
                        type,
                        "xlsx",
                        (msg) => toast.error(msg),
                        type === "customer" ? { kind: sheetKind } : undefined
                      );
                      if (ok) {
                        toast.success("Excel file downloaded — open it in Microsoft Excel to edit.");
                      }
                    })();
                  }}
                >
                  <Icons.FileSpreadsheet className="mr-2 h-4 w-4" />
                  Microsoft Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    void (async () => {
                      const ok = await exportPartiesSheetApi(
                        type,
                        "csv",
                        (msg) => toast.error(msg),
                        type === "customer" ? { kind: sheetKind } : undefined
                      );
                      if (ok) {
                        toast.success("CSV downloaded — open it in Excel or Google Sheets.");
                      }
                    })();
                  }}
                >
                  <Icons.FileText className="mr-2 h-4 w-4" />
                  CSV (Google Sheets)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {dropZone(sheetFile, (f) => pickFile(f, setSheetFile, () => setPatchResult(null)), sheetFileInputRef)}

            {patchResult && (
              <div className="space-y-2 rounded-lg border p-3 text-sm">
                <p className="font-medium text-foreground">
                  Result: {patchResult.updated} updated · {patchResult.unchanged} unchanged
                </p>
                {(patchResult.skipped?.length ?? 0) > 0 && (
                  <div className="space-y-1">
                    <p className="font-medium text-red-600">
                      {patchResult.skipped!.length} skipped
                    </p>
                    <ul className="list-disc pl-4 text-xs text-muted-foreground max-h-40 overflow-y-auto">
                      {patchResult.skipped!.map((s, idx) => (
                        <li key={idx}>
                          Row {s.row}
                          {s.code ? ` (${s.code})` : ""}: {s.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <SheetFooter>
          <Button
            variant="outline"
            disabled={importing || patching}
            onClick={() => handleOpenChange(false)}
          >
            {importResult || patchResult ? "Close" : "Cancel"}
          </Button>
          {tab === "create" ? (
            <Button disabled={!importFile || importing} onClick={() => void handleImport()}>
              {importing ? "Importing…" : importResult ? "Import again" : "Import"}
            </Button>
          ) : (
            <Button disabled={!sheetFile || patching} onClick={() => void handlePatch()}>
              {patching ? "Updating…" : patchResult ? "Apply again" : "Apply updates"}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
