# E2E tests (Playwright)

Run payroll and flow tests against the app.

**Prerequisites:** `npm install` (includes `@playwright/test`). Then install browsers:

```bash
npx playwright install chromium
```

**Local:** Start the app (`npm run dev`), then in another terminal:

```bash
npm run test:e2e
```

**CI:** Playwright config starts the app automatically (`npm run build && npm run start`).

Tests log in via "Manufacturer Demo" on `/login`.

- **payroll.spec.ts**: create employee, create pay run, open pay run line, export bank CSV, request approval (stub), open payslip preview.
- **week16-tax-pricing.spec.ts**: VAT breakdown on invoice doc, WHT on bill doc, payroll posting → journal, pricing on invoice line.
