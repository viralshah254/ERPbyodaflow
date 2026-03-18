# Sourcing Flow User Guide

**For:** Procurement, Finance, and Warehouse teams  
**Applies to:** Cross-border sourcing (KES/UGX), farm-gate cash procurement, landed costing  
**Last updated:** March 2026

---

## Overview

This guide walks through the complete sourcing flow for cash-based, cross-border procurement — the kind CoolCatch runs daily between Kenya and Uganda. Every step maps directly to the **Guided Sourcing Flow** page in the ERP.

The flow has five mandatory steps:

```
1. Create / approve Purchase Order
2. Record cash disbursement (farm-gate payment + paid weight)
3. Receive stock and confirm actual weight (GRN)
4. Apply landed costs (permits, border fees, inbound freight)
5. Resolve any variances, then clear AP and posting
```

None of these steps can be skipped cleanly — the system will block posting and AP settlement if cash-weight variances are unresolved or if exchange rates are missing.

---

## The Guided Sourcing Flow Dashboard

**Path:** Purchasing → Guided Sourcing Flow (`/purchasing/sourcing-flow`)

This is your daily command board. Open it before starting work to see the current health of the flow at a glance.

### Health Board

| Indicator | What it means |
|---|---|
| **Open POs** | Purchase orders not yet fully received — work to action. |
| **Open Variance Exceptions** | Paid weight vs received weight mismatches needing investigation. Must be zero before AP settlement. |
| **Landed Cost Sources** | GRNs and Bills that have been received and are available for landed cost allocation. |

Each step card on the page shows a **Complete** or **Pending** badge and an **Open step** button that takes you directly to the right screen. Work top to bottom.

---

## Step 1 — Create or Approve a Purchase Order

**Path:** Purchasing → Purchase Orders (`/purchasing/orders`)  
**Or create:** Documents → New → Purchase Order

### What to fill in

| Field | Notes |
|---|---|
| **Supplier** | Select from the supplier list. |
| **Currency** | Set to **UGX** for Uganda-sourced stock, **KES** for Kenya. This drives the FX conversion throughout the flow. |
| **Exchange rate** | Leave blank to auto-look up from Settings, or enter manually for a specific agreed rate. |
| **Lines** | Add each product/species with quantity and unit price in the document currency. |

### Cross-border sourcing fields

For Uganda or other cross-border purchases, you should also capture:

| Field | Notes |
|---|---|
| **Source country** | `UG` for Uganda, `KE` for Kenya. Required to trigger cross-border validation. |
| **Cross-border status** | Start at `DRAFT`. Progress through the lifecycle as the shipment moves: `PERMIT_PENDING` → `PERMIT_APPROVED` → `IN_TRANSIT` → `BORDER_CLEARED` → `RECEIVED`. |
| **Permit reference** | Required when source country is UG. Enter the permit/license number. |
| **Inbound logistics ref** | Transporter name, vehicle, or route reference. Required for cross-border. |
| **Border crossing date** | Required when status reaches `BORDER_CLEARED` or `RECEIVED`. |

> **Why this matters:** The system stores a full FX snapshot (rate, date, source) on the document when you save it with a non-base currency. This means every amount in the flow is traceable to the exact rate used — critical for finance audits.

### After saving

Submit the PO for approval if your org requires it. Once **Approved**, the PO is ready for cash disbursement and receiving.

---

## Step 2 — Record Cash Disbursement

**Path:** Purchasing → Cash-to-Weight Audit (`/purchasing/cash-weight-audit`)  
**Then:** Click **Record disbursement**

This is the farm-gate payment record. It links what you paid to how much weight you paid for.

### What to fill in

| Field | Notes |
|---|---|
| **Purchase Order** | Select the approved PO. |
| **Amount paid** | The cash amount handed over at farm gate. |
| **Currency** | Match the PO currency (KES or UGX). |
| **Date** | The actual payment date. |
| **Reference** | Receipt number, voucher, or driver name. |
| **Paid weight (kg)** | For single-line POs: enter total paid weight. For multi-line POs: enter paid weight per line. |

> **Important:** Always enter paid weight. This is the first leg of the three-way match. Without it, audit lines cannot be built.

### Multi-line POs

If your PO has multiple product lines (e.g. Tilapia + Nile Perch), you must enter a paid weight for each line. The system will prompt you line by line.

---

## Step 3 — Receive Stock and Confirm Actual Weight (GRN)

**Path:** Inventory → Receipts (GRN) (`/inventory/receipts`)  
**Or:** Documents → Goods Receipt → New (from the approved PO)

### Creating the GRN

Convert the approved PO to a GRN:

1. Open the PO.
2. Click **Convert → Goods Receipt (GRN)**.
3. Select the receiving warehouse.
4. The GRN lines are pre-filled from the PO.

### Entering received weight

For each GRN line, enter the **received weight (kg)**. This is what actually arrived at the processing facility — it will be compared against the paid weight from Step 2.

> **The system blocks posting** if any line is missing received weight and cash-weight audit is enabled. Every line must have a weight before the GRN can be posted.

### Posting the GRN

Once weights are entered and you are satisfied:

1. Click **Post GRN**.
2. Stock is added to inventory at the document currency value.
3. The GRN becomes a landed-cost source (visible in Step 4).

---

## Step 4 — Apply Landed Costs

**Path:** Inventory → Costing (`/inventory/costing`)  
**Or:** Open the GRN → click **Add landed costs**

Landed costs cover everything paid beyond the raw product price: permits, border clearance, transport, cold storage, and duties. These costs are added to the inventory value of the received stock.

### Quick approach (from GRN)

1. Open the posted GRN.
2. Click **Add landed costs**.
3. The allocation form opens, pre-loaded for that GRN.
4. Click **Quick add: Permit + Border + Inbound freight** to pre-fill the three most common cost types.
5. Enter the amount and currency for each line.
6. Click **Save all**.

### From the Costing page

1. Go to **Inventory → Costing**.
2. In the **Landed cost allocation** table, find the GRN or Bill.
3. Click **Allocate**.
4. Add lines manually or use quick add.

### Cost types

| Type | Description | Typical currency |
|---|---|---|
| Permit | Fishing permit, license | KES |
| Border / customs | Cross-border clearance, KE↔UG | UGX or KES |
| Inbound freight | Farm to processing hub | KES |
| Outbound freight | Hub to customer | KES |
| Storage | Cold storage | KES |
| Duty | Import duty | KES / UGX |

### Multi-currency landed costs

Each cost line can be in a different currency (KES, UGX, USD). The system converts each line to base currency (KES) using the exchange rate set in **Settings → Finance**.

- If no rate exists for the given currency and date, the allocation will fail with a message like: `Exchange rate required for UGX. Add rate in Settings.`
- Add the rate and retry. The system will record a full FX snapshot for every conversion.

### Allocation basis

Costs are allocated across GRN lines by **weight** — each line receives a share of the landed cost proportional to its received weight. This is the correct method for fish and other perishable commodities sold by weight.

> **Preview before saving:** The allocation form shows the impact per line (allocated amount) before you confirm. Review this to make sure the numbers make sense.

---

## Step 5 — Resolve Variances and Clear Posting

**Path:** Purchasing → Cash-to-Weight Audit (`/purchasing/cash-weight-audit`)

After the GRN is posted, you can build the audit to compare paid weight vs received weight.

### Building the audit

Click **Build audit** (or it may build automatically after GRN posting). This creates **Procurement Audit Lines** linking:

- PO line → Cash disbursement (paid weight) → GRN line (received weight)

Each audit line gets a status:

| Status | Meaning |
|---|---|
| **MATCHED** | Paid and received weights match within tolerance. No action needed. |
| **VARIANCE** | A difference was detected. Must be investigated and resolved before AP settlement. |
| **PENDING** | Awaiting GRN or disbursement data. |

### Working through variances

For each VARIANCE line:

1. Click **Assign** to assign it to a team member.
2. Click **Investigate** once the team member begins reviewing.
3. Enter **investigation notes** explaining the cause (e.g. transit shrinkage, grading loss, weighing error).
4. Click **Approve** once the variance is explained and accepted.
5. Click **Resolve** to close the exception.

> **The system blocks AP three-way matching if there are unresolved VARIANCE exceptions.** You cannot settle the bill or run the three-way match until all exceptions are resolved.

### AP three-way match

Once all variances are resolved:

1. Go to **Finance → AP → Three-Way Match** (`/ap/three-way-match`).
2. Select the **PO**, **GRN**, and **Bill**.
3. Click **Run match**.

The system checks:
- Supplier consistency across all three documents
- Quantity variance within tolerance (default 2%)
- Amount variance within tolerance (default 2%)
- Zero unresolved cash-weight variance exceptions

If all checks pass, the match is recorded and the bill is cleared for payment.

---

## FX Snapshot — What It Is and Where to See It

Every time the system converts a non-base-currency amount (e.g. UGX → KES), it stores a **FX snapshot** containing:

| Field | Meaning |
|---|---|
| **From / To currency** | e.g. UGX → KES |
| **Rate** | The exchange rate used |
| **Rate date** | The date the rate applied |
| **Rate source** | `MANUAL` if you entered it; `SYSTEM` if it was looked up automatically |
| **Captured at** | Timestamp of when the conversion was recorded |

This snapshot is stored on the document, on each posting line, and on each landed cost allocation line. It is never recalculated retroactively — what you saw when you posted is what is on record.

### How to add exchange rates

1. Go to **Settings → Finance → Exchange Rates**.
2. Click **Add rate**.
3. Enter: from currency (e.g. UGX), to currency (KES), rate, and effective date.
4. Save.

Rates are looked up by date — the system uses the most recent rate on or before the document date. Add new rates before processing documents for a new period.

---

## Quick Reference

| Task | Where to go |
|---|---|
| View flow health and open each step | Purchasing → Guided Sourcing Flow |
| Create a purchase order | Purchasing → Purchase Orders → Create PO |
| Record farm-gate cash payment | Purchasing → Cash-to-Weight Audit → Record disbursement |
| Create GRN from PO | Open the PO → Convert → GRN |
| Enter received weight on GRN | Open the GRN (DRAFT) → edit each line's received weight |
| Add landed costs from GRN | Open the GRN (POSTED) → Add landed costs |
| Add landed costs from costing page | Inventory → Costing → Allocate |
| Build audit (paid vs received) | Purchasing → Cash-to-Weight Audit → Build audit |
| Resolve a variance exception | Cash-to-Weight Audit → find VARIANCE line → Assign → Investigate → Approve → Resolve |
| Run AP three-way match | Finance → AP → Three-Way Match |
| Add exchange rates | Settings → Finance → Exchange Rates |
| View FX snapshot on a document | Open document → check FX / exchange rate fields in header |

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| `Exchange rate required for UGX` on landed cost | No UGX→KES rate exists for the document date | Settings → Finance → Exchange Rates → add rate |
| GRN blocks posting — "received weight required" | Cash-weight audit is on; a line has no weight | Open GRN → enter received weight on every line |
| Cash disbursement — "enter paid weight per line" | Multi-line PO requires per-line weights | Enter paid weight for each PO line individually |
| Three-way match fails — "unresolved variance exceptions" | Outstanding VARIANCE audit lines | Purchasing → Cash-to-Weight Audit → resolve all exceptions first |
| Three-way match fails — "quantity variance exceeds tolerance" | GRN qty differs from PO qty by more than 2% | Investigate receiving; adjust GRN or update PO before matching |
| Three-way match fails — "amount variance exceeds tolerance" | Bill total differs from PO total by more than 2% | Check bill amount vs PO; contact supplier if needed |
| Landed cost allocation fails — "source not found" | GRN was not posted before allocating | Post the GRN first, then add landed costs |
| No templates in Quick Add | Landed cost templates not set up | Settings → create Permit, Border, and Inbound Freight templates |
| Cross-border PO rejects — "permitReference required" | Source country is UG but no permit ref entered | Enter the fishing permit or license number on the PO |

---

*For technical implementation details, see `COOL_CATCH_REQUIREMENTS_IMPLEMENTATION.md` and `BACKEND_SPEC.md`. For the original legacy flow reference, see `COOLCATCH_PROCUREMENT_USER_GUIDE.md`.*
