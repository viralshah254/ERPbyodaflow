# Franchise retail ops — stock, POS, pricing, ordering

## Walk-in customers

- Use **one** org-level POS counterparty (**Walk-in / Cash sale**) provisioned via `/api/retail/pos-context`; do not create a Party per anonymous visitor.
- For analytics later, prefer document-level tags (`saleChannel` / segment) rather than thousands of CRM contacts.

## HQ: outlet stock (manage franchisees → Stock tab)

- API: `GET /api/franchise/outlets/:outletOrgId/stock` (requires `franchise.commission.read`, franchisor session).
- Stock rows include bins without `locationId` or with `locationId: null`.
- Product/warehouse names resolve across HQ + outlet org ids where IDs match posted GRNs and transfers.

## Mobile POS: `defaultWarehouseId`

- Bootstrap: `GET /api/retail/pos-context` (`sales.read`).
- **New franchise outlets** created via billing/network onboarding receive **Main warehouse** + `OrgSetting` section `retail.pos` with `defaultWarehouseId` automatically (`finalizeStagedFranchise`).
- **Legacy outlets:** set warehouse via admin Settings → Retail POS or `PATCH /api/settings/retail/pos` with `{ "defaultWarehouseId": "<warehouse uuid>" }` for that outlet org.
- If mobile POS shows **`defaultWarehouseId=null`**, the outlet org likely has no **`WarehouseModel`** row yet or no **`retail.pos`** override — fix before expecting stock columns on `GET /products`.

## Franchise mandatory floors + catalog visibility

1. **Release batch franchise pricing** (gates sellable SKUs on outlets):

   `POST /api/franchise/hq/batch-franchise-pricing/upsert`

   Body:

   ```json
   {
     "grnId": "<posted grn id>",
     "release": true,
     "items": [
       {
         "productId": "<uuid>",
         "transferPrice": 100,
         "minRetailFloor": 120,
         "currency": "KES"
       }
     ]
   }
   ```

   Permission: `franchise.commission.read` (same family as alerts).

2. **Alerts:** `GET /api/franchise/hq/batch-franchise-pricing/alerts` — surfaced on **Pricing → Overview**.

3. **Outlet price list** (suggested retail ladder): **Franchise → Manage franchisees → &lt;outlet&gt; → Price List** — `PATCH /api/franchise/outlets/:id/price-list` with `{ "priceListId": "..." }`. The outlet detail **Overview** summary (`GET /api/franchise/outlets/:id/summary`) returns **`priceListId` / `priceListName`** so the Price List tab reflects the saved assignment after refresh.

4. **Price list ≠ Sell gate:** Outlet assignment feeds `resolveOutletPriceListId` but **mobile Sell** still filters to SKUs with **released** batch rows (`hasReleasedBatchPricing`). Use **Orders → Request stock** / `stockRequestCatalog=true` on `GET /products` when HQ needs reorder lines without batch release.

Frontend helper: `upsertBatchFranchisePricingApi` in [`src/lib/api/franchise-pricing.ts`](../src/lib/api/franchise-pricing.ts).

## Debugging generic API errors (mobile)

- HQ BFF may return `{ "error": "Internal server error", "requestId": "..." }`. Flutter logs **`[API] METHOD url → status requestId=…`** in debug builds; user-facing messages append **`Reference: &lt;requestId&gt;`** when present — match **`requestId`** to server logs.

## Franchise orders to HQ

- Outlet raises purchase requests; HQ sees **Inbound orders / Orders to HQ** flows (`GET /api/franchise/network/inbound-orders`, accept → HQ sales order).
- Replenishment: `/api/franchise/vmi/replenishment-orders` (VMI permissions) where enabled.
