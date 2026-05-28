# CoolCatch UAT — T1–T12 (go-live gate)

Manual acceptance checklist aligned with **CoolCatch_ERP_Requirements_Document.xlsx** (QA sheet). Automated service-level checks live in `ERPbyodaflow-backend/src/services/coolcatch-workbook-uat.test.ts`.

Run automated tests:

```bash
cd ERPbyodaflow-backend && npm test -- coolcatch-workbook-uat
```

## Environment

- CoolCatch HQ org on `cool-catch` template with feature flags enabled
- Staging API + web (`NEXT_PUBLIC_API_URL`) + mobile (`API_BASE_URL`)
- Finance user + franchise outlet user + procurement mobile persona

## T1 — EMP/kg recalculation (CRITICAL)

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Create sourcing batch: 2,600 kg @ 298/kg + KES 82,868 ancillary (web or mobile) | EMP displayed within 5s | OPEN |
| 2 | Verify EMP ≈ (773,800 + 82,868) ÷ 2,340 sellable kg | ≈ KES 366.1/kg | OPEN |

**UI:** Web `/purchasing/coolcatch-sourcing`, mobile `/procurement/coolcatch-sourcing`

## T2 — Multi-SKU apportionment (CRITICAL)

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Model 3 batch: Tilapia 200kg, Fillet 50kg, Mgongo 30kg; logistics KES 5,600 | Per-SKU share 71.4% / 17.9% / 10.7% | OPEN |

**UI:** Model 3 SKU table on sourcing pages

## T3 — COGS only at sale (CRITICAL)

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | After sourcing, inspect COGS / GL | COGS = 0 | OPEN |
| 2 | Post franchise sale 30 kg | COGS = 30 × EMP | OPEN |
| 3 | Remaining inventory on BS franchise line | 470 kg × EMP (example) | OPEN |

**UI:** Mobile Sell; finance journals

## T4 — Four BS lines full cycle (CRITICAL)

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Source → process → dispatch → intake → sale | Correct line up/down each step | OPEN |
| 2 | `/finance/coolcatch-bs-inventory` totals | Σ lines ≈ total kg × EMP − COGS | OPEN |

## T5 — Saturday stock take (HIGH)

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Dispatch 200kg, sell 150kg, submit count 45kg | Variance 5kg in pending queue, not P&L | OPEN |
| 2 | EMP / BS restated on franchise line | Within 2 minutes | OPEN |

**UI:** Mobile weekly stock take

## T8 — Trip cost → EMP (HIGH)

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Trip: fuel 3000 + bags 400 + other 500, dispatch 280kg | Logistics/kg ≈ 13.93 | OPEN |
| 2 | EMP updates after trip complete | ≤ 5s | OPEN |

**UI:** Mobile logistics trip record; `/distribution/trips`

## T9 — Dispatch → in-transit alert (HIGH)

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Dispatch without intake | In-transit + warehouse decrease | OPEN |
| 2 | Wait 4h (or lower threshold in QA) | `/operations/dispatch-alerts` lists DN | OPEN |

## T10 — Processing yield variance (HIGH)

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Gutting 2600 in / 2280 out vs 2340 expected | EMP on actual kg; finance alert if >3% | OPEN |

## T11 — Sales E2E (CRITICAL)

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Sale 15kg, discount, bag, M-Pesa | Receipt + COGS + inventory −15kg ≤ 60s | OPEN |

**UI:** Mobile Sell (requires active price from My prices)

## T12 — eTIMS receipt (CRITICAL)

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Sale with eTIMS receipt type | Fiscal code ≤ 10s (or queued) | OPEN |
| 2 | Simulate timeout | Retry queue succeeds (`/finance/coolcatch-etims`) | OPEN |

**Config:** `ETIMS_API_URL` + `ETIMS_API_KEY` for production (see `docs/COOLCATCH_INTEGRATIONS.md`)

## Sign-off

| Role | Name | Date | Result |
|------|------|------|--------|
| Finance | | | |
| COO | | | |
| Tech Lead | | | |
