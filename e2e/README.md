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

Local tests now expect one of these auth setups:

- Explicit local dev auth via `.env.local`:
  - `NEXT_PUBLIC_ENABLE_DEV_AUTH=1`
  - `NEXT_PUBLIC_DEV_USER_ID=<real user id>`
  - `NEXT_PUBLIC_CURRENT_BRANCH_ID=<branch id>`
- Or a fully configured Firebase browser sign-in flow.

**CI:** Playwright config starts the app automatically (`npm run build && npm run start`).

Tests no longer click a demo login. They bootstrap by visiting `/dashboard` and rely on the configured local auth path.

- **payroll.spec.ts**: create employee, create pay run, open pay run line, export bank CSV, request approval (stub), open payslip preview.
- **week16-tax-pricing.spec.ts**: VAT breakdown on invoice doc, WHT on bill doc, payroll posting → journal, pricing on invoice line.
