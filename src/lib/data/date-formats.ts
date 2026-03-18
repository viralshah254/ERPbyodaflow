/**
 * Common date format options for dropdown selection.
 */
export const DATE_FORMAT_LIST: { value: string; label: string; example: string }[] = [
  { value: "YYYY-MM-DD", label: "ISO (YYYY-MM-DD)", example: "2026-03-17" },
  { value: "DD/MM/YYYY", label: "Day first (DD/MM/YYYY)", example: "17/03/2026" },
  { value: "MM/DD/YYYY", label: "Month first (MM/DD/YYYY)", example: "03/17/2026" },
  { value: "DD-MM-YYYY", label: "Day first with dashes (DD-MM-YYYY)", example: "17-03-2026" },
  { value: "MM-DD-YYYY", label: "Month first with dashes (MM-DD-YYYY)", example: "03-17-2026" },
  { value: "D MMM YYYY", label: "Short (17 Mar 2026)", example: "17 Mar 2026" },
  { value: "DD MMMM YYYY", label: "Long (17 March 2026)", example: "17 March 2026" },
];
