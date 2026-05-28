# CoolCatch integrations — production setup

## eTIMS (KRA fiscal receipts)

**Backend:** `ERPbyodaflow-backend/src/services/etims-connector.ts`

| Variable | Purpose |
|----------|---------|
| `ETIMS_API_URL` | Production signing API base URL |
| `ETIMS_API_KEY` | API key / bearer for provider |
| `ETIMS_STUB_PIN` | Stub PIN when using dev stub |
| `ETIMS_STUB=1` | Force stub connector (default when URL/key missing) |

**Touchpoints:**

- Franchise mobile Sell → `POST /api/coolcatch/etims/issue` after sale
- Web `/finance/coolcatch-etims` — manual issue + retry queue
- Institutional invoices — same endpoint with `sourceType: invoice`

**Queue:** `POST /api/coolcatch/etims/retry-queue` processes `QUEUED` receipts after timeouts.

## Daraja / M-Pesa

**Backend:** `mpesa-c2b-reconcile.ts`, `routes/payments-webhook.ts`

| Variable | Purpose |
|----------|---------|
| `MPESA_ENV` | `sandbox` or `production` |
| `MPESA_CONSUMER_KEY` / `MPESA_CONSUMER_SECRET` | Daraja app |
| `MPESA_SHORT_CODE` | Paybill / till |
| `MPESA_PASSKEY` | STK Push |
| `MPESA_CALLBACK_URL` | Public C2B/STK callback URL |

**Matching:** Amount + phone + ±3 minute window against open sales (`coolcatch-workbook-uat` T8).

**Reconciliation UI:**

- HQ: `/finance/mpesa-recon` — unmatched queue + manual match
- Franchise mobile: `/franchise/mpesa-reconciliation` — read-only day view

## WhatsApp commerce

Settings → Integrations → WhatsApp / Coolcatch bot. See `.env.example` `COOLCATCH_BOT_*` and `WHATSAPP_*`.

## NFC / BD leads

Public `/nfc` → CRM deal with `source: NFC` → franchise chase list.

- HQ: `/franchise/chase-list`
- Mobile: `/franchise/chase-list`

Lead routing (GPS vs manual) is **open decision O3** — see `COOLCATCH_OPEN_DECISIONS.md`.
