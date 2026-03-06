# Cool Catch Distributors Ltd — Requirements vs OdaFlow ERP Gap Analysis

**Purpose:** Map the [Operational & ERP Functional Requirements](Operational%20&%20ERP%20Functional%20Requirements.pdf) for Cool Catch to the current codebase. Build features so Cool Catch can use them via a dedicated template, while making the same capabilities available to other customers (template- and flag-driven).

---

## Strategy: Account + Template

- **Create a Cool Catch account:** On signup, select org type **DISTRIBUTOR** and template **Cool Catch (Franchise & VAS)**. The org will get `templateId: "cool-catch"` and the corresponding feature flags. Nav will show: Franchise (Commission & rebates, VMI), Cash-to-Weight Audit under Purchasing, Subcontracting under Manufacturing.
- **Reuse for others:** All new capabilities are gated by **feature flags** and optional **nav sections**. Any other distributor (or future franchise/VAS client) can be given the same template or individual flags.

### How to create a Cool Catch account

1. Go to **Sign up** (e.g. `/signup` or `/signup?orgType=DISTRIBUTOR`).
2. In **Step 2 (Choose your business type)** select **Distributor**, then choose the template **Cool Catch (Franchise & VAS)**.
3. Complete onboarding. The org context will have `templateId: "cool-catch"` and feature flags set; sidebar will include Franchise, Cash-to-Weight Audit, and Subcontracting.
4. (Backend) When you persist orgs, store `templateId` per org so that returning users get the correct template applied (e.g. from `org.templateId` or tenant config).

---

## 1. Multi-Source Procurement & Cash Management

| Requirement | ERP feature needed | Current state | Gap / action |
|-------------|--------------------|----------------|--------------|
| **Landed costing** (multi-currency KES/UGX, permits, inbound logistics) | Landed cost allocation with multi-currency | `src/lib/mock/inventory/landed-cost.ts` — templates (freight, insurance, duty); allocation by qty/value/weight. Settings: currencies, exchange rates (KES/UGX supported in intercompany mocks). | **Extend:** Add allocation basis "weight"; support multi-currency on landed cost lines; optional "permits" / "border" cost types. Landed cost UI already exists at `/inventory/costing`. |
| **Cross-border sourcing** (KES/UGX, landed costs) | Multi-currency PO/GRN, exchange rates | Exchange rates: `src/lib/mock/exchange-rates.ts`, `settings/financial/exchange-rates`. Document create wizard has `exchangeRate`. | **Extend:** Ensure PO/GRN/Bill support document currency (UGX) and conversion to base (KES). Add permit/customs cost type to landed cost. |
| **Cash-on-Delivery (CoD) integrity** | Three-Way Match: **PO → Cash Disbursement → Actual Weight Received** | **Current 3-way match** is **PO → GRN → Bill** (qty/price), at `src/app/(dashboard)/ap/three-way-match/page.tsx`. | **New:** Add a **Procurement Audit (Cash-to-Weight)** flow: link PO → Cash disbursement (payment) → Weight received (GRN with weight). New page or mode when flag `procurementAuditCashWeight` is on. |
| **Inventory reconciliation** | Paid weight (farm) vs received weight (facility) | Stock movements, receipts (GRN). No weight tracking on receipt lines. | **Extend:** Add optional **weight** (and **paid weight** vs **received weight**) on receipt/GRN lines and reconciliation report when flag is on. |

---

## 2. Subcontracted Value-Added Services (VAS)

| Requirement | ERP feature needed | Current state | Gap / action |
|-------------|--------------------|----------------|--------------|
| **WIP at external work centers** | Subcontracting / job work: stock at 3rd party (factory, women's groups) | Manufacturing: BOMs, routing, work orders. No "external work center" or "subcontractor" location type. | **New:** Subcontracting module (flag `subcontracting`): External work centers; transfer to processor; WIP balance by processor; receive finished goods. New nav section or under Manufacturing. |
| **Mass balance & yield** | Per batch: primary yield (fillets/gutted), secondary (byproducts), process loss | BOM has co-products and by-products (formula type) in `manufacturing/boms/[id]` and `getFormulaExtras`. No batch-level yield recording or mass balance report. | **Extend:** Add yield/mass balance to work order or "processing receipt": input weight, output primary/secondary/loss; reconcile to BOM. |
| **Service fee integration** | Per-unit processing fee (filleting vs gutting) added to finished good valuation | Costing: valuation summary, landed cost. No "processing fee" or "subcontract charge" on work order/BOM. | **New:** On BOM or work order: processing fee per unit (by operation type); auto-add to finished good cost when receiving from subcontractor. |
| **Reverse BOM / disassembly** | One input (Round Fish) → multiple outputs (Fillet, Gutted, Byproducts, Waste) | BOM supports **formula** type with **co-products** and **by-products** (`FormulaCoProduct`, `FormulaByProduct` in boms). Assembly is 1 output from many inputs; reverse = 1 input, many outputs. | **Extend:** Ensure formula BOM supports **one input, multiple outputs** (reverse/disassembly) in UI and cost allocation. Already partially there; verify and document. |

---

## 3. Outsourced Cold Chain & Logistic Hubs

| Requirement | ERP feature needed | Current state | Gap / action |
|-------------|--------------------|----------------|--------------|
| **Asset attribution** | Every trip: Monthly leased truck vs spot-hire (per-trip) | No "trip" or "logistics run" entity; no truck/asset assignment. | **New:** Optional **logistics / fleet** (flag or part of distribution): Trip entity with link to "leased truck" or "spot hire"; cost allocation to trip. |
| **Nairobi holding area** | Cold storage as central hub (7T consignments) | Warehouses/locations exist. No specific "holding area" or "hub" type. | **Config:** Use existing **warehouse** (e.g. "Nairobi Cold Hub") with location type; no code change. Optional label in template terminology. |
| **Logistics costing** | Inbound (farm → factory/hub), Outbound (hub → franchisee) | Landed cost has freight. No inbound/outbound split by leg. | **Extend:** Landed cost or new "logistics cost" entity: leg type (inbound/outbound), link to PO/transfer; allocate to cost of goods. |
| **Ownership transfer** | Inventory at holding area until transfer or sale to franchisee | Transfers and sales exist. | **No gap:** Use stock transfers and sales orders. |

---

## 4. Franchise Network & Automated Replenishment

| Requirement | ERP feature needed | Current state | Gap / action |
|-------------|--------------------|----------------|--------------|
| **Segmented SKU mix** | Franchisee-specific product mix (high-value / standard / value-segment) | Price lists, customers. No "franchisee" party type or segment-specific catalog. | **Extend:** Customer/franchisee type or tag; optional "allowed SKU mix" or price list per franchisee. Can start with customer segments + price lists. |
| **Revenue collection** | 100% revenue to CoolCatch; franchisee keys volumes into tracking | Standard AR/sales; no specific "franchisee sales remittance" flow. | **Config:** Franchisees as customers; sales orders/invoices; payment to parent. Optional report "Franchisee revenue remittance". |
| **Automated commission engine** | Weekly commission from sales volume | No commission/rebate engine. | **New:** **Commission & rebate engine** (flag `commissionEngine`): rules (e.g. % of sales by period); weekly run; payout ledger. New nav: e.g. Finance → Commission & rebates. |
| **Margin guarantee & top-ups** | Minimum commission; top-up if shortfall (e.g. 8-week launch) | No conditional journal or top-up logic. | **New:** **Conditional journal / top-up:** When commission &lt; floor for a period, system proposes (or auto-posts) top-up journal. Flag `commissionEngine` or `marginGuarantee`. |
| **Parent Co. obligations** | Tracking: branding, marketing, CCTV; future lease agreements | No specific "parent obligations" module. | **Optional:** Custom entity or CRM "obligations" / "franchise support"; or deferred to Phase 2. |
| **VMI** | Ingest franchisee sales data; live stock velocity; reorder points | Retail replenishment exists (`/retail/replenishment`) for stores. No "franchisee VMI" or API ingestion. | **New:** **VMI / auto-replenishment** (flag `vmiReplenishment`): API or webhook to receive franchisee sales/stock; min-max or reorder point; auto **transfer order** from Cold Hub to franchisee. New section or under Distribution. |

---

## 5. Technical Success Factors (from doc)

| Requirement | Business logic | Current state | Gap / action |
|-------------|----------------|--------------|--------------|
| **Commission & rebate** | Weekly commission payouts | — | New: Commission engine (see above). |
| **Conditional journal entries** | Top-up when commission &lt; floor | — | New: Top-up logic + optional auto-post. |
| **Cash-to-weight audit** | Cash at farm vs weight at factory | — | New: Procurement audit (PO → Cash → Weight). |
| **Reverse BOM / co-products** | One input → multiple outputs | Formula BOM with co/by-products exists. | Verify reverse flow and cost split. |
| **Auto-replenishment (min-max)** | VMI from franchisees → Cold Hub dispatch | Retail replenishment (stores). | New: Franchisee VMI + transfer orders. |
| **Subcontracting** | Stock at 3rd party + processing fee | — | New: Subcontracting / job work module. |
| **Landed cost allocation** | Transport (per-trip/monthly) + storage in fish price | Landed cost exists. | Extend: transport type, storage cost type. |
| **API / webhook** | VMI integration | — | New: API for franchisee sales/stock ingestion. |

---

## 6. Implementation Order (suggested)

1. **Cool Catch template + flags**  
   Add industry template `cool-catch` (DISTRIBUTOR) and feature flags so the account can be created and nav shows only what we build.

2. **Commission & rebate engine**  
   High business impact; needed for weekly payouts and margin guarantee.

3. **Cash-to-weight (procurement audit)**  
   Critical for CoD integrity; extend 3-way match or add dedicated page.

4. **Landed cost extensions**  
   Multi-currency, weight basis, permits, inbound/outbound legs.

5. **Subcontracting / job work**  
   WIP at external processors; processing fee; then yield/mass balance.

6. **Reverse BOM / formula**  
   Confirm and document one-input-many-outputs; cost allocation.

7. **VMI + auto-replenishment**  
   Franchisee sales ingestion; reorder points; transfer orders from Cold Hub.

8. **Logistics / trip costing**  
   Leased vs spot truck; trip-level cost allocation.

---

## 7. Feature flags to add (in `industryTemplates/types.ts`)

- `procurementAuditCashWeight` — Cash-to-weight audit (PO → Cash → Weight).
- `subcontracting` — Subcontracting / job work; WIP at external processors.
- `commissionEngine` — Commission & rebate engine; margin guarantee / top-ups.
- `vmiReplenishment` — VMI from franchisees; auto-replenishment (min-max).
- `landedCostMultiCurrency` — Landed cost with multi-currency and permits (can use existing multi-currency if already on PO/GRN).
- `reverseBom` — Explicit reverse BOM / disassembly (can rely on formula BOM if verified).

Use these in the Cool Catch template and optionally in other templates (e.g. FMCG distributor) for upsell.

---

## 8. Navigation additions (gated by template / flags)

- **Finance:** Commission & rebates (when `commissionEngine`).
- **Purchasing / Procurement:** Cash-to-weight audit (when `procurementAuditCashWeight`).
- **Manufacturing or new section:** Subcontracting / job work (when `subcontracting`).
- **Distribution or new section:** Franchise / VMI replenishment (when `vmiReplenishment`).

Cool Catch template will enable these sections; other accounts get them only if they have the same template or flags enabled.
