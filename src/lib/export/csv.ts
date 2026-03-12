import { downloadTextFile } from "@/lib/api/client";

type CsvValue = string | number | boolean | null | undefined;

function escapeCsv(value: CsvValue): string {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function downloadCsv<T extends Record<string, CsvValue>>(
  filename: string,
  rows: T[],
  headers?: Array<keyof T>
): void {
  if (rows.length === 0) {
    downloadTextFile(filename, "", "text/csv;charset=utf-8");
    return;
  }

  const keys = (headers ?? Object.keys(rows[0])) as Array<keyof T>;
  const csv = [
    keys.join(","),
    ...rows.map((row) => keys.map((key) => escapeCsv(row[key])).join(",")),
  ].join("\n");

  downloadTextFile(filename, csv, "text/csv;charset=utf-8");
}

