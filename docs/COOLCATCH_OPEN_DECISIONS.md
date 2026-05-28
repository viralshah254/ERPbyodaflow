# CoolCatch open decisions (O1–O10)

From **CoolCatch_ERP_Requirements_Document.xlsx** — resolve with CoolCatch leadership before locking Phase 2 scope.

| ID | Topic | Options | Recommendation | Owner | Phase 1 default |
|----|-------|---------|----------------|-------|-----------------|
| O1 | Month-end variance journal | A) Manual journal from report B) Draft journal one-click post | B — fewer errors | Joram / Finance | **B implemented** — generate + approve & post on `/finance/coolcatch-month-end` |
| O2 | Price cut-off times | Confirm 07:00 submit / 07:30 approval | Use workbook times | Joram / Alvin | **07:00 / 07:30** in API + mobile my-prices |
| O3 | NFC lead routing | GPS nearest / BD manual / HQ assign | GPS if outlet coordinates accurate (O7) | Joram / BD | **GPS** when `assignedOutletOrgId` set at capture |
| O4 | Analytics BI platform | BigQuery / Postgres / Azure / other | Walter to confirm | Walter | **Export snapshot only** — `POST /api/coolcatch/analytics/export`; no separate BI DB in Phase 1 |
| O5 | Daraja product | Paybill C2B / Till / STK Push | STK for best match | Joram / Finance | **C2B webhook** + manual match queue; STK via existing MPESA_* env |
| O6 | eTIMS connector | Odaflow provider vs custom build | Configure `ETIMS_API_*` | Walter / Odaflow | **HTTP connector + stub** — production keys required for go-live |
| O7 | Franchise GPS | Confirm live locations | Required for NFC + delivery fees | Joram / Alvin | **Pending data** — outlet profiles |
| O8 | Offline mobile | Yes / No | Yes for sourcing + trips | Walter | **Queue implemented** — `offline_sync_service` + “Save offline” on sourcing |
| O9 | Warehouse stock take | Phase 1 vs 2 | Phase 2 unless zero effort | Joram / Alvin | **Phase 2** — franchise Saturday take in Phase 1 |
| O10 | Role matrix | CEO, COO, finance, field roles | Sign-off on `ERP USER MATRIX AND ACCESS.pdf` | Walter | **Role templates** in backend; full matrix review in first session |

## Phase 1 vs Phase 2 (proposed)

**Phase 1 (built in this gap closure):**

- EMP engine, BS lines UI, sourcing Models 1–3 UI, month-end, dispatch alerts, eTIMS ops, M-Pesa recon (HQ + franchise view)
- Franchise intake, sell, my-prices, chase list (mobile + web HQ)
- Internal mobile personas + offline sourcing queue

**Phase 2 (pending decisions):**

- Dedicated analytics database + BI dashboards (O4)
- Full WhatsApp catalogue/checkout SLA (T15)
- Warehouse stock take (O9)
- Bluetooth thermal printer SDK
- Load test 30 concurrent users (req 1.8)

## Next session agenda

1. Confirm O2, O5, O6 production credentials timeline  
2. Validate O7 outlet GPS list  
3. Walk through `COOLCATCH_UAT_T1_T12.md` on staging  
4. Sign Phase 2 scope for analytics and warehouse stock take  
