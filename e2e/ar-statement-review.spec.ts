import { expect, test } from "@playwright/test";
import { fixtureApi } from "./fixtures/erp-guide-api";

test("reviews a merchant upload and confirms a payment against an older route invoice", async ({ page }) => {
  const errors: string[] = [];
  const confirms: unknown[] = [];
  const uploads: string[] = [];
  const line = { _id: "statement-1", reference: "LATE000001", amount: 12345, status: "PENDING",
    eligible: true, statementDate: "2026-11-16T08:00:00Z", description: "Merchant payment", tillNumber: "123456" };
  const invoice = { sourceId: "older-invoice", sourceNumber: "INV-OLD-01", sourceDate: "2024-01-11T00:00:00Z", openAmount: 12345 };
  await fixtureApi(page);
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/treasury/bank-accounts", route => route.fulfill({ json: {
    items: [{ id: "mpesa", name: "M-Pesa merchant", accountNumber: "123456", currency: "KES", isActive: true }],
  } }));
  await page.route("**/api/import/bank-statement", route => {
    const raw = route.request().postData() || "";
    const preview = /name="preview"\r\n\r\ntrue/.test(raw);
    uploads.push(preview ? "preview" : "import");
    expect(raw).toContain("statement.csv");
    return route.fulfill({ json: preview ? { preview: { rows: 1, customerLines: 1, otherLines: 0,
      firstDate: line.statementDate, lastDate: line.statementDate } } : { imported: 1, duplicates: 0, batchId: "batch" } });
  });
  await page.route("**/api/ar/statement-review**", route => {
    const request = route.request();
    const url = new URL(request.url());
    let response: unknown;
    if (url.pathname.endsWith("/invoices")) {
      expect(url.searchParams.get("partyId")).toBe("customer");
      response = { items: [invoice], hasMore: false };
    } else if (url.pathname.endsWith("/confirm")) {
      confirms.push(request.postDataJSON());
      response = { paymentId: "receipt", status: "MATCHED" };
    } else if (url.pathname.endsWith("/statement-1")) {
      response = { line: confirms.length ? { ...line, status: "MATCHED" } : line, eligible: true, mpesa: true,
        tillNumber: line.tillNumber, receiptNumber: "AR-BANK-0001", proposals: [],
        route: { partyId: "customer", partyName: "Route Customer", loadNoteId: "route", invoiceHint: invoice.sourceNumber },
        suggestions: [{ candidateId: invoice.sourceId, candidateType: "invoice", candidateNumber: invoice.sourceNumber,
          partyId: "customer", partyName: "Route Customer", openAmount: invoice.openAmount, signals: [{ code: "INVOICE_NUMBER", label: "Invoice noted by the route team" }] }],
      };
    } else {
      response = { currency: "KES", items: uploads.includes("import") && !confirms.length ? [line] : [], hasMore: false };
    }
    return route.fulfill({ json: response });
  });

  await page.goto("/ar/payments", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Statements & matching" }).click();
  const sheet = page.getByRole("dialog", { name: "Statements & matching" });
  await sheet.getByLabel("Statement type").selectOption("MPESA");
  await sheet.getByRole("button", { name: "Upload statement", exact: true }).click();
  await sheet.getByLabel("Statement CSV file").setInputFiles({ name: "statement.csv", mimeType: "text/csv", buffer: Buffer.from("Date,Reference,Amount\n2026-11-16,LATE000001,12345") });
  await sheet.getByRole("button", { name: "Preview file" }).click();
  await expect(sheet.getByText(/1 customer credits/)).toBeVisible();
  expect(uploads).toEqual(["preview"]);
  await sheet.getByRole("button", { name: "Import for review" }).click();
  await sheet.getByRole("button", { name: /LATE000001.*12,345\.00/ }).click();
  await expect(sheet.getByText("Route collection · Route Customer")).toBeVisible();
  await sheet.getByRole("button", { name: /Open invoice · INV-OLD-01/ }).click();
  await expect(sheet.getByLabel("Apply to INV-OLD-01")).toHaveValue("12,345.00");
  await expect(sheet.getByRole("button", { name: "Review match" })).toBeDisabled();
  await sheet.getByLabel("What did you verify on the M-Pesa statement?").fill("Checked code, amount and till.");
  await sheet.getByRole("button", { name: "Review match" }).click();
  expect(confirms).toEqual([]);
  await sheet.getByRole("button", { name: "Confirm match" }).click();
  await expect(sheet.getByText("Matched to receipt AR-BANK-0001.")).toBeVisible();
  expect(confirms).toEqual([{ partyId: "customer", keepOnAccount: false, reviewNote: "Checked code, amount and till.",
    allocations: [{ documentId: "older-invoice", amount: 12345 }] }]);
  expect(errors).toEqual([]);
});
