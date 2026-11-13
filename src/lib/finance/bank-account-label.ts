export type StatementReadyBankAccount = {
  name: string;
  bank: string;
  accountNumber: string;
  /** True when the stored number is a slug rather than the number on a statement. */
  accountNumberMissing: boolean;
  /** Petty cash and travel floats stay on the register and are not statement accounts. */
  usesStatement: boolean;
};

const SMALL_WORDS = new Set(["of", "and", "the"]);

function tidyBankTitle(raw: string): string {
  const normalized = raw
    .replace(/\bMORIENTAL\b/gi, "M-ORIENTAL")
    .replace(/-\s+\$/g, "-$")
    .replace(/\s+/g, " ")
    .trim();
  const letters = normalized.replace(/[^A-Za-z]/g, "");
  const uppercase = letters.replace(/[^A-Z]/g, "").length;
  if (!letters || uppercase / letters.length < 0.8) return normalized;
  const titled = normalized.replace(/[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*/g, (word) => {
    if (/^\d+$/.test(word)) return word;
    const lower = word.toLowerCase();
    if (lower === "m-pesa" || lower === "mpesa") return "M-Pesa";
    if (lower === "m-oriental") return "M-Oriental";
    if (lower === "ltd") return "Ltd";
    if (lower === "ac") return "AC";
    if (lower === "usd" || lower === "kes") return lower.toUpperCase();
    if (SMALL_WORDS.has(lower)) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  });
  return titled.replace(/\(/g, " (").replace(/\s{2,}/g, " ").trim();
}

function institutionName(title: string): string {
  return title
    .replace(/\d{6,}/g, "")
    .replace(/[-–—]\s*\$?\s*AC\b/gi, "")
    .replace(/[-–—\s]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isStatementNumber(value: string): boolean {
  return /^\d[\d\s-]{4,}$/.test(value.trim());
}

export function bankAccountUsesStatement(input: { name?: string; bankName?: string; accountNumber?: string }): boolean {
  return !/\bpetty[\s-]*cash\b|\btravel[\s-]*float\b|\bupcountry\b/i.test(
    `${input.name ?? ""} ${input.bankName ?? ""} ${input.accountNumber ?? ""}`,
  );
}

export function statementReadyBankAccount(input: {
  name: string;
  accountNumber?: string;
  bankName?: string;
}): StatementReadyBankAccount {
  const name = tidyBankTitle(input.name);
  const storedBank = input.bankName && input.bankName.trim().toLowerCase() !== "bank"
    ? tidyBankTitle(input.bankName)
    : "";
  const bank = storedBank && storedBank !== name && !/\d{6,}/.test(storedBank)
    ? institutionName(storedBank)
    : institutionName(name);
  const storedNumber = (input.accountNumber ?? "").trim();
  const embedded = name.match(/\d{6,}/)?.[0];
  const accountNumber = isStatementNumber(storedNumber)
    ? storedNumber.replace(/\s+/g, "")
    : (embedded ?? storedNumber);
  return {
    name,
    bank: bank || name,
    accountNumber,
    accountNumberMissing: !isStatementNumber(accountNumber),
    usesStatement: bankAccountUsesStatement(input),
  };
}

export function tidyCounterpartyName(name: string): string {
  return name
    .replace(/SUPERMAKET/gi, "SUPERMARKET")
    .replace(/--+|–{2,}/g, " – ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatReconDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
