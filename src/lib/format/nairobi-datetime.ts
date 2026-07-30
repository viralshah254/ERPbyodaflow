const NAIROBI = "Africa/Nairobi";

function nairobiParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: NAIROBI,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: get("hour"),
    minute: get("minute"),
    dayPeriod: get("dayPeriod").toLowerCase(),
  };
}

function dayKey(parts: ReturnType<typeof nairobiParts>) {
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatClock(parts: ReturnType<typeof nairobiParts>): string {
  const minute = parts.minute.padStart(2, "0");
  return `${parts.hour}:${minute} ${parts.dayPeriod}`;
}

/**
 * Human-readable time in East Africa (Nairobi):
 * "2 minutes ago", "Yesterday, 8:00 am", "23rd April, 8:00 am"
 */
export function formatNairobiRelativeTime(iso: string | Date | undefined | null): string {
  if (!iso) return "";
  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24 && dayKey(nairobiParts(date)) === dayKey(nairobiParts(now))) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  const dateParts = nairobiParts(date);
  const nowParts = nairobiParts(now);
  const clock = formatClock(dateParts);

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dayKey(dateParts) === dayKey(nairobiParts(yesterday))) {
    return `Yesterday, ${clock}`;
  }

  const monthLabel = MONTH_NAMES[dateParts.month - 1] ?? "";
  const dayLabel = `${ordinal(dateParts.day)} ${monthLabel}`;

  if (dateParts.year === nowParts.year) {
    return `${dayLabel}, ${clock}`;
  }

  return `${dayLabel} ${dateParts.year}, ${clock}`;
}

/** Prefer createdAt timestamp; fall back to document date (date-only). */
export function formatDocumentCreatedLabel(
  createdAt?: string | null,
  dateFallback?: string | null
): string {
  if (createdAt) {
    const label = formatNairobiRelativeTime(createdAt);
    if (label) return label;
  }
  const dateOnly = dateFallback?.trim().slice(0, 10);
  if (!dateOnly || !/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return dateOnly ?? "—";
  const [, y, m, d] = dateOnly.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? [];
  const monthLabel = MONTH_NAMES[Number(m) - 1] ?? "";
  const nowYear = nairobiParts(new Date()).year;
  const dayLabel = `${ordinal(Number(d))} ${monthLabel}`;
  return Number(y) === nowYear ? dayLabel : `${dayLabel} ${y}`;
}
