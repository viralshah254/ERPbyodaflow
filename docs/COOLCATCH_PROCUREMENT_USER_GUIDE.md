# CoolCatch — Multi-Source Procurement & Landed Costing User Guide

**For:** Procurement, Finance, and Warehouse teams  
**Version:** 1.0  
**Last updated:** March 2025

---

## Overview

CoolCatch operates a high-frequency procurement model across Kenya and Uganda. This guide explains how to use the ERP for:

1. **Landed costing** — Multi-currency (KES/UGX), permits, and inbound logistics
2. **Three-way match** — Purchase Order → Cash disbursement → Actual weight received (CoD integrity)
3. **Inventory reconciliation** — Paid weight vs received weight tracking

---

## 1. Landed Costing (Cross-Border Sourcing)

Landed costs include sourcing costs, multi-currency conversion (KES/UGX), permits, and inbound logistics. The system allocates these costs across receipt lines by **weight** (ideal for fish).

### Quick start (3 steps)

1. **Create a GRN** (Goods Receipt Note) from your Purchase Order when stock arrives.
2. **Add landed costs** — From the GRN detail page, click **"Add landed costs"**, or go to **Inventory → Costing** and click **Allocate** on the receipt.
3. **Use the Quick Add** — Click **"Quick add: Permit + Border + Inbound freight"** to pre-fill the common cost types. Enter amounts and currencies (KES or UGX) for each line, then **Save all**.

### Cost types supported

| Type | Use case | Typical currency |
|------|----------|-------------------|
| **Permits** | Fishing permits, licenses | KES |
| **Border / customs** | Cross-border clearance (KE↔UG) | UGX or KES |
| **Inbound freight** | Farm → processing facility / hub | KES |
| **Outbound freight** | Hub → customer | KES |
| **Storage** | Cold storage | KES |
| **Duty** | Import duty | KES / UGX |

### Multi-currency (KES / UGX)

- Each cost line can have its own currency (KES, UGX, USD).
- **Exchange rates** must be set in **Settings → Finance** for UGX and other currencies. The system converts to base currency (typically KES) when running costing.
- If a rate is missing, the allocation will fail with a clear message — add the rate and retry.

### Allocation method

- Costs are allocated by **weight** across receipt lines.
- Ensure GRN lines have **received weight (kg)** entered — this is required when cash-weight audit is enabled.

### Where to do it

- **From GRN:** Open the receipt → **Add landed costs** → opens the allocation form for that receipt.
- **From Costing page:** **Inventory → Costing** → Landed cost allocation table → **Allocate** on any GRN or Bill.

---

## 2. Cash-on-Delivery (CoD) Integrity — Three-Way Match

Farm-gate sourcing is cash-based. The ERP provides a **Three-Way Match** to prevent leakages:

1. **Purchase Order** — What was ordered
2. **Cash disbursement** — What was paid at farm gate (with paid weight)
3. **GRN (Goods Receipt)** — What was actually received (received weight)

### Workflow

1. **Create PO** — As usual.
2. **Record cash disbursement** — When you pay at farm gate:
   - Go to **Purchasing → Cash-to-Weight Audit**
   - Click **Record disbursement**
   - Select PO, enter amount, currency (KES/UGX), date, and **paid weight (kg)** per line (or total for single-line POs)
   - Save
3. **Create GRN** — When stock arrives, create GRN from PO. Enter **received weight (kg)** for each line.
4. **Build audit** — Click **Build audit** to create audit lines linking PO, cash, and GRN.
5. **Reconcile** — Review audit lines. If paid weight ≠ received weight, the system flags a **VARIANCE**. Use **Reconcile** to update or resolve.

### Variance handling

- **MATCHED** — Paid and received weights align (within tolerance).
- **VARIANCE** — Difference detected (transit shrinkage, grading). Assign, investigate, approve, resolve.
- **PENDING** — Awaiting GRN or disbursement data.

---

## 3. Inventory Reconciliation — Paid vs Received Weight

### Why it matters

- **Paid weight** = What you paid for at farm gate.
- **Received weight** = What arrived at the processing facility.
- Differences can indicate transit shrinkage, grading, or errors.

### Where to see it

- **GRN detail page** — Shows received weight per line; editable when status is DRAFT.
- **Cash-to-Weight Audit** — Full audit trail with paid vs received and variance.
- **Procurement Variance Panel** — Summary of total paid vs received across audit lines.

### Editing weights

- **Received weight:** Edit on the GRN line (when DRAFT). The system blocks posting until all lines have weight when cash-weight audit is enabled.
- **Paid weight:** Entered when recording the cash disbursement.

---

## 4. End-to-End Flow (Summary)

```
1. Create PO
2. Pay at farm gate → Record disbursement (amount + paid weight)
3. Stock arrives → Create GRN from PO
4. Enter received weight on each GRN line
5. Add landed costs (permit, border, freight) — multi-currency
6. Post GRN
7. Build audit → Reconcile any variances
8. Run costing (Inventory → Costing → Run costing)
```

---

## 5. Tips & Troubleshooting

### Landed cost allocation fails with "Exchange rate required"

- Go to **Settings → Finance** and add an exchange rate for the currency (e.g. UGX → KES) for the receipt date.

### GRN won't post — "all lines must have received weight"

- Cash-weight audit is on. Enter **received weight (kg)** for every line on the GRN.

### Multi-line PO disbursement — "Enter paid weight for each line"

- For POs with multiple lines, you must enter paid weight per line when recording the disbursement.

### No templates for Quick Add

- Create landed cost templates first: **Settings** (or ask admin) for Permit, Border, Inbound freight. The seed script creates these for CoolCatch demo.

---

## 6. Quick Reference

| Task | Location |
|------|----------|
| Add landed costs | GRN detail → Add landed costs, or Inventory → Costing → Allocate |
| Record disbursement | Purchasing → Cash-to-Weight Audit → Record disbursement |
| Build audit | Purchasing → Cash-to-Weight Audit → Build audit |
| Reconcile variance | Cash-to-Weight Audit → Reconcile on audit line |
| Run costing | Inventory → Costing → Run costing |
| Exchange rates | Settings → Finance |

---

*For technical implementation details, see `COOL_CATCH_REQUIREMENTS_IMPLEMENTATION.md` and `BACKEND_SPEC_COOL_CATCH.md`.*
