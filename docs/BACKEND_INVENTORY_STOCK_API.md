## Inventory Stock, Adjustments & Movements — Backend API

**Scope:** How stock is stored and updated across warehouses, variants, batches, documents (invoices/GRNs), and manufacturing. This doc is the focused spec for `/api/inventory/*` endpoints used by:

- `Inventory → Stock Levels`, `Inventory → Movements`
- `Warehouse → Transfers`, `Cycle counts`
- Document posting (sales invoices, GRNs, production receipts/issues)

**Base path:** All routes use prefix `/api`. All queries/writes are scoped by tenant/org and (where relevant) branch/warehouse.

---

## 1. Data model

### 1.1 Stock snapshot (current levels)

- **Table/collection:** `StockLevel`
- **Key dimensions:**
  - `orgId`
  - `productId`
  - `variantId?` — null for non-variant SKUs; set for variant SKUs.
  - `warehouseId`
  - `locationId?` — bin/zone/rack.
  - `batchId?` — lot/batch tracking (optional).
- **Fields:**
  - `onHand: number` — total physical quantity.
  - `reserved: number` — on sales orders, production reservations, etc.
  - `available: number` — `onHand - reserved` (can be stored or computed).
  - `reorderLevel?: number`
  - `status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK"`
  - `lastMovementAt?: string` — ISO datetime of last movement.

> **Rule:** status is derived from `onHand` and `reorderLevel`:
> - `onHand <= 0` → `OUT_OF_STOCK`
> - `onHand > 0` and `available <= reorderLevel` → `LOW_STOCK`
> - else → `IN_STOCK`

### 1.2 Stock movement (ledger)

- **Table/collection:** `StockMovement`
- **Fields:**
  - `id: string`
  - `orgId: string`
  - `date: string` — movement date.
  - `direction: "IN" | "OUT"`
  - `quantity: number` — always positive.
  - `uom: string`
  - `productId`, `variantId?`
  - `warehouseId`, `locationId?`, `batchId?`
  - `sourceType: "INVOICE" | "DELIVERY" | "GRN" | "ADJUSTMENT" | "TRANSFER" | "PRODUCTION" | "CYCLE_COUNT" | "OTHER"`
  - `sourceId: string` — e.g. invoice id, grn id, adjustment id, work-order id.
  - `lineId?: string` — reference to doc line.
  - `reason?: string` — free text for adjustments.
  - `createdAt: string`

The **source document** (invoice, GRN, work order completion) owns the business context; movements are the normalized inventory ledger.

### 1.3 Stock adjustment document

- **Table/collection:** `StockAdjustment`
- **Fields:**
  - `id: string`
  - `orgId: string`
  - `number: string`
  - `date: string`
  - `reason?: string`
  - `lines: { stockLevelId, productId, variantId?, warehouseId, locationId?, batchId?, quantityDelta, uom, comment? }[]`
  - `status: "DRAFT" | "POSTED" | "CANCELLED"`

Posting an adjustment creates corresponding `StockMovement` records and updates `StockLevel`.

---

## 2. Stock levels & movements endpoints

### 2.1 List stock levels (for `/inventory/stock-levels`)

- **GET** `/api/inventory/stock-levels`
- **Query:**
  - `sku?`, `productId?`, `variantId?`
  - `warehouseId?`
  - `locationId?`
  - `batchId?`
  - `status?: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK"`
  - `search?: string` — matches `sku`, product name, warehouse code.
  - Pagination: `limit?`, `cursor?`
- **Response** — 200:

```json
{
  "items": [
    {
      "id": "sl1",
      "productId": "p1",
      "variantId": "v1",
      "sku": "SKU-001-1KG",
      "name": "Product Alpha 1kg",
      "warehouseId": "wh1",
      "warehouse": "WH-Main",
      "locationId": "loc1",
      "location": "A-01-02",
      "batchId": "b1",
      "batchNumber": "BATCH-001",
      "onHand": 150,
      "reserved": 25,
      "available": 125,
      "reorderLevel": 50,
      "status": "IN_STOCK",
      "lastMovementAt": "2024-01-20T10:00:00Z"
    }
  ],
  "nextCursor": null
}
```

**Frontend wiring:**

- `src/app/(dashboard)/inventory/stock-levels/page.tsx`
  - Replace `getMockStock()` with `GET /api/inventory/stock-levels` using the same filters (`warehouseId`, `status`, `search`).
  - Map response into the existing `StockRow` shape (add variant/batch columns later if desired).

### 2.2 Get one stock level (for `/inventory/stock-levels/[id]`)

- **GET** `/api/inventory/stock-levels/:id`
- **Response** — 200: one `StockLevel` row plus optional aggregate:

```json
{
  "id": "sl1",
  "productId": "p1",
  "variantId": "v1",
  "sku": "SKU-001-1KG",
  "name": "Product Alpha 1kg",
  "warehouseId": "wh1",
  "warehouse": "WH-Main",
  "location": "A-01-02",
  "batchNumber": "BATCH-001",
  "onHand": 150,
  "reserved": 25,
  "available": 125,
  "reorderLevel": 50,
  "status": "IN_STOCK"
}
```

- Detail page can also call:
  - `GET /api/inventory/stock-levels?sku=SKU-001-1KG` to show the same SKU in other warehouses/locations.
  - `GET /api/inventory/movements?stockLevelId=sl1` (see below) for movement history.

### 2.3 List movements

- **GET** `/api/inventory/movements`
- **Query:**
  - `productId?`, `variantId?`, `sku?`
  - `warehouseId?`, `locationId?`, `batchId?`
  - `fromDate?`, `toDate?`
  - `sourceType?`
- **Response** — 200:

```json
{
  "items": [
    {
      "id": "mv1",
      "date": "2024-01-20",
      "direction": "OUT",
      "quantity": 10,
      "uom": "EA",
      "warehouseId": "wh1",
      "locationId": "loc1",
      "batchNumber": "BATCH-001",
      "sourceType": "INVOICE",
      "sourceId": "inv-123",
      "lineId": "inv-123-1",
      "reason": "Sales invoice INV-123"
    }
  ]
}
```

Frontend movements page can consume this directly.

---

## 3. Stock adjustments (for “Stock Adjustment” sheet)

### 3.1 Create and post adjustment

- **POST** `/api/inventory/stock-adjustments`
- **Body:**

```json
{
  "date": "2024-01-25",
  "reason": "Cycle count variance",
  "lines": [
    {
      "stockLevelId": "sl1",
      "quantityDelta": -3,
      "uom": "EA",
      "comment": "Damaged"
    }
  ]
}
```

- **Response** — 201:

```json
{ "id": "adj-001" }
```

- **Behaviour:**
  - For each line:
    - Create `StockMovement` with `direction = "IN"` if `quantityDelta > 0`, else `"OUT"`.
    - Update `StockLevel.onHand` and `reserved/available` as appropriate (for a simple adjustment, `reserved` is unchanged and `available` follows `onHand`).
    - Recompute `status` using the rules in §1.1.
  - Emit `stock.movement` and `stock.adjustment.posted` events (see `BACKEND_SPEC.md` §2).

**Frontend wiring:**

- The current sheet in `stock-levels/page.tsx` collects:
  - `stockLevelId`
  - `adjustMode` (Increase/Decrease)
  - `adjustQuantity` (absolute value)
  - `reason`
- On **Apply adjustment**:
  - Compute `quantityDelta` (positive for increase, negative for decrease).
  - Call `POST /api/inventory/stock-adjustments` and refresh the table via `GET /api/inventory/stock-levels`.

> **UX note:** Because the sheet uses a text/number input, backspacing from `0` to empty should be accepted — backend should treat missing/empty quantity as validation error and return `400 { error: "quantityDelta must be non-zero" }`.

---

## 4. Documents and manufacturing → stock integration

Everything is intentionally **event-driven and interconnected**:

### 4.1 Sales invoices (and deliveries)

- On **Post invoice** or **Post delivery note**:
  - For each line (product/variant, warehouse, quantity):
    - Generate `StockMovement` with `direction = "OUT"`, `sourceType = "INVOICE"` or `"DELIVERY"`.
    - Update `StockLevel`:
      - `onHand -= quantityIssued`
      - `reserved` should already have been reduced when the order was fulfilled; if not, adjust accordingly.
  - Emit `stock.movement` and `invoice.posted` / `delivery-note.posted`.
  - `Stock Levels` list and detail will reflect the new quantities immediately via `StockLevel`.

### 4.2 GRNs / Purchase receipts

- On **Post GRN (goods receipt)**:
  - For each line:
    - `StockMovement` with `direction = "IN"`, `sourceType = "GRN"`, plus `batchId` / expiry if applicable.
    - Increase `StockLevel.onHand` (and `available`).

### 4.3 Manufacturing production & consumption

- On **issue to production** (components):
  - Document: material issue or work order pick.
  - `StockMovement` direction `"OUT"`, `sourceType = "PRODUCTION"`, referencing work order id.
  - Reduce `StockLevel` for raw/packaging materials.

- On **produce finished goods** (report completion / backflush):
  - Document: production receipt or work order completion.
  - `StockMovement` direction `"IN"` for finished-good variants, `sourceType = "PRODUCTION"`.
  - Increase `StockLevel` in the FG warehouse (and by batch where relevant).

> **Net effect:** Invoices, GRNs, transfers, production issues/receipts and manual adjustments **all** go through the same `StockMovement` and `StockLevel` logic, so `Stock Levels` and `Movements` pages always show the true picture.

---

## 5. Flags, out-of-stock and UX hints

- Backend should always return `status` per row; frontend:
  - Maps `"IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK"` to the existing `StatusBadge` pills.
  - Shows `"Out of Stock"` wherever `onHand = 0` (including in Stock Adjustment sheet after refresh).
- For manufacturers, you can extend the response with:
  - `inProduction?: number` — quantity currently in WIP.
  - `nextReceiptsDate?: string` — earliest expected inbound from open POs or work orders.

This spec, together with `BACKEND_API_SPEC_SINGLE_SOURCE.md` and `BACKEND_PRODUCTS_API.md`, should be enough to implement inventory APIs that are **fully wired** into documents (invoices/GRNs), warehouse operations, and manufacturing, and to hook the existing React pages to real data instead of mocks.

