# Backend: Subcontracting / Job Work API

**Purpose:** Implement subcontracting endpoints so the **Manufacturing → Subcontracting / Job Work** screens can:

- Manage **external work centers** (3rd-party factories, women's groups)
- Create and track **subcontract orders** (send stock out, receive back)
- Track **WIP at processors** and **processing fees per unit**

The frontend is wired in:

- `src/app/(dashboard)/manufacturing/subcontracting/page.tsx`
- `src/app/(dashboard)/manufacturing/subcontracting/orders/[id]/page.tsx`
- `src/lib/api/cool-catch.ts` (subcontracting section)

All routes below are under `/api`.

---

## 1. External work centers

Represents a 3rd‑party location where you send stock for processing.

```ts
ExternalWorkCenter {
  id: string;
  orgId: string;
  code: string;          // e.g. FACT-NAI
  name: string;          // e.g. Nairobi Industrial Factory
  type: "FACTORY" | "GROUP";
  address?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### GET `/api/manufacturing/work-centers/external`

**Description:** List all external work centers for the current org.

**Response:** `200`

```json
{
  "items": [
    {
      "id": "wc1",
      "code": "FACT-NAI",
      "name": "Nairobi Industrial Factory",
      "type": "FACTORY",
      "address": "Industrial Area, Nairobi",
      "isActive": true
    }
  ]
}
```

**Permission:** `manufacturing.read` or `manufacturing.subcontracting.read`.

---

### POST `/api/manufacturing/work-centers/external`

**Description:** Create a new external work center.

**Request body:**

```json
{
  "code": "FACT-NAI",
  "name": "Nairobi Industrial Factory",
  "type": "FACTORY",
  "address": "Industrial Area, Nairobi",
  "isActive": true
}
```

**Response:** `201` — full `ExternalWorkCenter` object.

**Validation:**

- `code` unique per org.
- `type` ∈ {`FACTORY`, `GROUP`}.

**Permission:** `manufacturing.subcontracting.write`.

> **Note:** Add PATCH `/api/manufacturing/work-centers/external/:id` later for edits; the current UI only needs create + list.

---

## 2. Subcontract orders

Represents sending input stock to a work center and receiving outputs (primary/secondary/waste) with processing fees.

```ts
SubcontractOrder {
  id: string;
  orgId: string;
  number: string;                // SCO-2025-001
  workCenterId: string;
  bomId?: string | null;         // reverse BOM used
  status: "SENT" | "WIP" | "RECEIVED";
  sentAt?: string | null;        // date stock left your warehouse
  receivedAt?: string | null;    // date goods received back
  expectedAt?: string | null;    // optional expected completion
  createdAt: string;
  lines: SubcontractOrderLine[];
}

SubcontractOrderLine {
  id: string;
  orderId: string;
  sku: string;
  productName: string;
  type: "INPUT" | "OUTPUT_PRIMARY" | "OUTPUT_SECONDARY" | "WASTE";
  quantity: number;
  uom: string;
  processingFeePerUnit?: number | null;   // KES per unit for that output line
  amount?: number | null;                 // total processing fee for this line
}
```

### GET `/api/manufacturing/subcontract-orders`

**Query params (all optional):**

- `workCenterId` — filter by work center.
- `status` — `SENT` \| `WIP` \| `RECEIVED`.

**Response:** `200`

```json
{
  "items": [
    {
      "id": "so1",
      "number": "SCO-2025-001",
      "workCenterId": "wc1",
      "workCenterName": "Nairobi Industrial Factory",
      "bomId": "bom1",
      "bomName": "Round Fish → Fillet + Byproduct",
      "status": "WIP",
      "sentAt": "2025-01-22",
      "receivedAt": null,
      "createdAt": "2025-01-22T08:00:00Z"
    }
  ]
}
```

**Permission:** `manufacturing.subcontracting.read`.

---

### GET `/api/manufacturing/subcontract-orders/:id`

**Description:** Order header + lines (input/output) for detail view.

**Response:** `200`

```json
{
  "id": "so1",
  "number": "SCO-2025-001",
  "workCenterId": "wc1",
  "workCenterName": "Nairobi Industrial Factory",
  "bomId": "bom1",
  "bomName": "Round Fish \u2192 Fillet + Byproduct",
  "status": "WIP",
  "sentAt": "2025-01-22",
  "receivedAt": null,
  "createdAt": "2025-01-22T08:00:00Z",
  "lines": [
    {
      "id": "sol1",
      "orderId": "so1",
      "sku": "ROUND-001",
      "productName": "Round Fish",
      "type": "INPUT",
      "quantity": 1000,
      "uom": "kg",
      "processingFeePerUnit": null,
      "amount": null
    },
    {
      "id": "sol2",
      "orderId": "so1",
      "sku": "FILLET-001",
      "productName": "Fillet Premium",
      "type": "OUTPUT_PRIMARY",
      "quantity": 0,
      "uom": "kg",
      "processingFeePerUnit": 25,
      "amount": null
    }
  ]
}
```

**Permission:** `manufacturing.subcontracting.read`.

---

### POST `/api/manufacturing/subcontract-orders`

**Description:** Create a new subcontract order from the “Send to processor” sheet.

**Request body (minimum UI contract):**

```json
{
  "workCenterId": "wc1",
  "bomId": null,
  "expectedAt": "2025-01-25",
  "lines": [
    {
      "sku": "ROUND-001",
      "type": "INPUT",
      "quantity": 1000,
      "uom": "kg"
    },
    {
      "sku": "ROUND-001-PROC",
      "productName": "Processing service",
      "type": "OUTPUT_PRIMARY",
      "quantity": 1000,
      "uom": "kg",
      "processingFeePerUnit": 25
    }
  ]
}
```

**Behaviour:**

- Creates `SubcontractOrder` with:
  - `status = "SENT"` (or `"WIP"` depending on your process)
  - `sentAt` = today
  - `number` from your sequence (e.g. `SCO-YYYY-###`)
- Creates **stock movement** from your warehouse to WIP-at-processor location for any `type: "INPUT"` lines.
- For output lines with `processingFeePerUnit`:
  - Store the fee on the line.
  - Optionally pre‑compute `amount = quantity × processingFeePerUnit`.

**Response:** `201` — full `SubcontractOrder` object (see GET by id).

**Permission:** `manufacturing.subcontracting.write`.

---

### POST `/api/manufacturing/subcontract-orders/:id/receive`

**Description:** Mark subcontract order as **RECEIVED** and move stock back from WIP at processor.

**Request body (minimum):** `{}` — UI currently doesn’t send body.

**Behaviour:**

- Validate order is in `WIP` or `SENT`.
- Create stock movements from WIP-at-processor to finished goods/raw locations based on **OUTPUT_PRIMARY / OUTPUT_SECONDARY / WASTE** lines.
- Set:
  - `status = "RECEIVED"`
  - `receivedAt = now`
- **Processing fees:** For each line with `processingFeePerUnit`:
  - Compute `amount = quantity × processingFeePerUnit`.
  - Post a **service/processing expense** or add to product cost per your costing policy (e.g. credit AP Accrual, debit WIP or COGS).

**Response:** `200` — `{ ok: true }` (or updated order).

**Permission:** `manufacturing.subcontracting.write`.

---

## 3. WIP at processors

Represents on‑hand quantity that is still at external work centers.

```ts
WIPBalance {
  workCenterId: string;
  workCenterName: string;
  sku: string;
  productName: string;
  quantity: number;
  uom: string;
  lastMovementAt: string;
}
```

### GET `/api/manufacturing/subcontract-orders/wip`

**Query params (optional):**

- `workCenterId` — filter to one work center.

**Response:** `200`

```json
{
  "items": [
    {
      "workCenterId": "wc1",
      "workCenterName": "Nairobi Industrial Factory",
      "sku": "ROUND-001",
      "productName": "Round Fish",
      "quantity": 1000,
      "uom": "kg",
      "lastMovementAt": "2025-01-22T08:00:00Z"
    }
  ]
}
```

**Implementation notes:**

- Derive from stock movement ledger where **location = external work center** and **not yet fully received**.
- The frontend uses this to show **“WIP at processors”** and filter by work center, so response should be fast and pre‑aggregated.

**Permission:** `manufacturing.subcontracting.read`.

---

## 4. Permissions summary

| Permission key                       | Used for                                   |\n|--------------------------------------|--------------------------------------------|\n| `manufacturing.subcontracting.read`  | List work centers, orders, WIP             |\n| `manufacturing.subcontracting.write` | Create work centers, create orders, receive orders |\n\n---

## 5. Frontend wiring summary

| UI action                                            | API call |\n|------------------------------------------------------|----------|\n| Load external work centers (External work centers tab) | `GET /api/manufacturing/work-centers/external` |\n| “New work center” → Save                             | `POST /api/manufacturing/work-centers/external` |\n| Load subcontract orders (Subcontract orders tab)     | `GET /api/manufacturing/subcontract-orders` |\n| Subcontract order detail page                        | `GET /api/manufacturing/subcontract-orders/:id` |\n| “Send to processor” → Create order                   | `POST /api/manufacturing/subcontract-orders` |\n| “Receive” button (list + detail)                     | `POST /api/manufacturing/subcontract-orders/:id/receive` |\n| “WIP at processors” table                            | `GET /api/manufacturing/subcontract-orders/wip` |\n\nThese endpoints, together with the models above, give full visibility of each 3rd‑party factory: which work centers exist, which orders are WIP or received, and how much stock (and processing cost) is sitting at each processor.\n+
