# Fish Processing User Guide

**For:** Processing Coordinators, Warehouse teams, Finance  
**Applies to:** CoolCatch template only  
**Last updated:** March 2026

---

## Overview

This guide covers the complete flow from raw round fish to finished, costed products. CoolCatch sends raw stock to external processors — Industrial Factories and Women's Groups — who fillet, gut, or otherwise transform it. The ERP tracks every kilogram from dispatch to return, calculates yield, and adds processing fees directly into the finished product's cost.

The flow has five steps:

```
1. Set up your Reverse BOM (one-time per product type)
2. Set up External Work Centers (one-time per processor)
3. Create a Subcontract Order (send stock to processor)
4. Record actual outputs and yield when stock returns
5. Review costing — processing fees are folded into finished goods valuation
```

---

## How It Works — The Core Concept

```
Round Fish (RAW)
      |
      |  [Sent to external processor]
      |
      ↓
  Factory / Women's Group  ← WIP: Still on CoolCatch's books, physically away
      |
      |  [Processed and returned]
      ↓
  ┌─────────────┬──────────────┬─────────────┐
  │  Fillet     │  Byproducts  │   Waste     │
  │ (PRIMARY)   │  Skin/Bones  │ (WASTE)     │
  │             │ (SECONDARY)  │             │
  └─────────────┴──────────────┴─────────────┘
       + Processing fee per kg added to fillet/gutted cost
```

Stock stays on CoolCatch's balance sheet while at the processor. It is not expensed until the finished outputs are received back. The yield variance (paid weight vs received weight) is tracked automatically.

---

## Step 1 — Set Up a Reverse BOM

**Path:** Manufacturing → Bills of Material (`/manufacturing/boms`)

A Reverse BOM defines how one input (Round Fish) breaks into multiple outputs. You set this up once per processing type (Filleting, Gutting). It is reused every time you send a batch.

### Creating a Reverse BOM

1. Go to **Manufacturing → Bills of Material**.
2. Click **New BOM**.
3. Fill in:

| Field | Value |
|---|---|
| **Name** | e.g. `Round Fish – Filleting` |
| **Direction** | **Reverse** (this is the disassembly/yield BOM) |
| **Input item** | Round Fish (the RAW product) |

4. Add output lines. For each output, set:

| Field | Notes |
|---|---|
| **Product** | e.g. Fillet, Gutted Fish, Skin/Bones |
| **Line type** | `PRIMARY` for the main product, `SECONDARY` for sellable byproducts, `WASTE` for inedible waste |
| **Expected yield %** | e.g. Fillet = 35%, Skin/Bones = 20%, Waste = 5%, Process Loss = 40% |
| **UOM** | kg |

5. Save. This BOM is now available to attach to subcontract orders.

### Example — Round Fish Filleting BOM

| Output | Type | Expected yield |
|---|---|---|
| Fillet | PRIMARY | 35% |
| Gutted fish | PRIMARY | 20% |
| Skin / Bones | SECONDARY | 25% |
| Scale waste | WASTE | 5% |
| Process loss | WASTE | 15% |

> **Note:** Yields do not have to add to 100% exactly — the system measures actual vs expected after receipt and flags the variance.

---

## Step 2 — Set Up External Work Centers

**Path:** Manufacturing → Subcontracting (`/manufacturing/subcontracting`) → Work Centers tab

An External Work Center is a record for each processor you work with. You set this up once.

### Adding a Work Center

1. Go to **Manufacturing → Subcontracting**.
2. Click the **Work Centers** tab.
3. Click **Add work center**.
4. Fill in:

| Field | Notes |
|---|---|
| **Code** | Short unique code, e.g. `FACT-NAI`, `WG-KIS` |
| **Name** | e.g. `Nairobi Industrial Factory`, `Kisumu Women's Group` |
| **Type** | `FACTORY` for industrial processors, `GROUP` for women's groups / cooperatives |
| **Address** | Physical location (optional but recommended) |

5. Save. The work center is now available in subcontract orders.

---

## Step 3 — Create a Subcontract Order (Send Stock to Processor)

**Path:** Manufacturing → Subcontracting (`/manufacturing/subcontracting`)

This is the dispatch record. It tells the system that stock has physically left your warehouse and is now at the processor — but still belongs to CoolCatch.

### Sending stock

1. Go to **Manufacturing → Subcontracting**.
2. Click **Send to processor**.
3. Fill in the form:

| Field | Notes |
|---|---|
| **Work center** | Select the processor from your list |
| **Input SKU** | The raw product being sent (e.g. `ROUND-001`) |
| **Quantity** | Weight in kg being dispatched |
| **UOM** | kg |
| **Processing fee per unit** | The agreed fee per kg (e.g. KES 15/kg for filleting). Leave blank if no fee applies. |
| **Expected return date** | When you expect outputs back (optional) |

4. Click **Create order**.

The system creates a Subcontract Order with status `SENT` and records a WIP balance at the selected work center.

### What happens in the background

- A `WIP balance` entry is created: `X kg of Round Fish @ Nairobi Factory`
- Stock is **not** removed from CoolCatch's books — it is reclassified as WIP
- The order appears in the Orders list with status `SENT`

### Viewing the WIP balance

Go to **Manufacturing → Subcontracting → WIP** tab to see how much stock is currently at each external processor.

---

## Step 4 — Receive Outputs and Record Yield

**Path:** Manufacturing → Subcontracting → Orders → [Order number]  
**Or:** Manufacturing → Subcontracting → Orders tab → click **Receive**

When the processor returns the finished products, you record the actual output weights.

### Two ways to receive

**From the orders list:**  
Find the order (status `WIP`) in the list. Click **Receive**. The system marks it received at current weights.

**From the order detail page:**  
1. Open the order.
2. Review the **Yield Breakdown** card showing input vs expected outputs.
3. Click **Receive** in the top right.

> **Important:** Before clicking Receive, make sure the actual output quantities on the order lines match what physically came back. If the processor returned less than expected, update the output quantities first.

### What the yield breakdown shows

The detail page shows a **Yield Breakdown** card with:

| Field | What it means |
|---|---|
| **Input (kg)** | How much raw fish was sent |
| **Primary output (kg)** | Fillet or gutted fish returned |
| **Secondary output (kg)** | Byproducts returned (skin/bones) |
| **Process loss (kg)** | Input minus all outputs — the technical processing loss |
| **Service fee total** | Total processing fee based on per-unit rate × output quantity |

### Fee-to-COGS drilldown

Below the yield breakdown, the **Fee-to-COGS drilldown** shows:

| Field | What it means |
|---|---|
| **Expected yield vs actual yield** | How the processor performed against the BOM |
| **Yield variance** | The gap between expected and actual — investigate if large |
| **Service fee variance** | Difference between expected fee and actual fee charged |

---

## Step 5 — Costing (Processing Fees Added Automatically)

**Path:** Inventory → Costing (`/inventory/costing`)

Once the subcontract order is received, the processing fee is automatically included the next time you run inventory costing. No manual journal entry is needed.

### How it works

The costing engine uses **Weighted Average Cost (WAC)**. When it runs:

1. It finds all posted GRNs — these give the raw material cost.
2. It finds all landed cost allocations — permits, freight, border fees.
3. It finds all received subcontract orders — the processing fees are added to the output product's unit cost.

The result: **Fillet cost = Raw fish cost + Landed costs + Processing fee**, all per kg.

### Running a costing update

1. Go to **Inventory → Costing**.
2. Click **Run costing**.
3. The system recalculates WAC for all products based on recent receipts, landed costs, and subcontract fees.
4. View the updated cost per product in the **Inventory valuation** table.

---

## Viewing All Subcontract Orders

**Path:** Manufacturing → Subcontracting → Orders (`/manufacturing/subcontracting/orders`)

This page lists all subcontract orders with filters for:

- **Status:** Sent / WIP / Received
- **Work Center:** Filter by processor

Use this page to:
- Check how many batches are currently at processors (status `SENT` or `WIP`)
- Identify orders ready to receive
- Click into any order to see yield and fee details

---

## Viewing Yield Records

**Path:** Manufacturing → Yield / Mass Balance (`/manufacturing/yield`)

This page shows a history of all yield records — one record per completed batch. Use it to:

- Track yield performance over time by processor or product
- Identify batches with high process loss or yield variance
- Export for supplier performance reviews

Each yield record links back to the original subcontract order.

---

## Viewing Byproducts

**Path:** Manufacturing → Byproducts (`/manufacturing/byproducts`)

This page shows all `SECONDARY` output lines from received subcontract orders — the skin, bones, and other sellable byproducts. Use it to:

- Know how much sellable byproduct is in stock
- Plan sales of animal feed materials
- Track byproduct revenue contribution to overall margin

---

## Quick Reference

| Task | Where to go |
|---|---|
| Create a Reverse BOM (one-time) | Manufacturing → Bills of Material → New BOM |
| Add an external processor (one-time) | Manufacturing → Subcontracting → Work Centers tab |
| Send stock to processor | Manufacturing → Subcontracting → Send to processor |
| View WIP at processors | Manufacturing → Subcontracting → WIP tab |
| Browse all subcontract orders | Manufacturing → Subcontracting → Orders |
| View/receive a specific order | Click the order number to open the detail page |
| Record outputs received from processor | Open the order → click Receive |
| View yield and fee drilldown | Open the order → Yield Breakdown + Fee-to-COGS panels |
| See yield history across all batches | Manufacturing → Yield / Mass Balance |
| View sellable byproducts in stock | Manufacturing → Byproducts |
| Run inventory costing (adds processing fees) | Inventory → Costing → Run costing |

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| Work center not appearing in subcontract order form | Work center was created but not marked active | Manufacturing → Subcontracting → Work Centers → edit → set Active = Yes |
| Subcontract order stuck in SENT status | No one has clicked Receive after stock returned | Open the order → click Receive |
| Processing fee not appearing in product cost | Costing has not been run since the order was received | Inventory → Costing → Run costing |
| Yield breakdown shows 0 for outputs | Order was received without entering output quantities | Check the order lines — output quantities must be entered before receiving |
| Cannot find the order in the list | Status filter may be hiding it | Manufacturing → Subcontracting → Orders → set status filter to "All statuses" |
| BOM not appearing in subcontract order | BOM direction is set to STANDARD not REVERSE | Manufacturing → BOMs → edit the BOM → set Direction to Reverse |
| Yield variance is very high | Actual return weight much lower than sent — possible loss in transit | Investigate with the processor; file a variance exception if needed |

---

## Understanding Status Flow

```
Subcontract Order lifecycle:
  SENT  →  WIP  →  RECEIVED

SENT     Stock has been physically dispatched to the processor.
         WIP balance is active. Inventory still on CoolCatch's books.

WIP      Processing is underway at the work center.
         Can be updated to reflect progress.

RECEIVED Outputs have been returned and logged.
         WIP balance is cleared. Finished products enter stock.
         Processing fees are included in next costing run.
```

---

*For procurement context and the upstream sourcing flow, see `SOURCING_FLOW_USER_GUIDE.md`. For overall system setup and onboarding, see the admin setup guide.*
