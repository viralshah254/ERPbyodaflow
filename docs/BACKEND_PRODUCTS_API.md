## Products, Variants, Packaging — Backend API

**Scope:** Core product master data used across inventory, pricing, manufacturing, and documents. This file drills into `/api/products` and related endpoints referenced in the single-source API spec.

**Base path:** All routes use prefix `/api`. Auth + org/tenant scoping apply to every request.

**Implementation note:** The backend also exposes legacy `/api/master/products` routes for list/create/update/delete. `/api/products` is the **primary spec path**; `/master/products` remains as a legacy alias.

---

## 1. Concepts & data model

- **Product (base product)**
  - Single source of truth for a product family.
  - Fields (minimal contract with frontend):
    - `id: string`
    - `sku: string` — base SKU, unique per org.
    - `name: string`
    - `category?: string`
    - `unit?: string` — display unit (e.g. `pcs`, `kg`).
    - `baseUom?: string` — base stock UOM (`EA`, `KG`, etc.).
    - `status: "ACTIVE" | "INACTIVE"`
    - `currentStock?: number` — optional aggregate stock for UI.
    - `createdAt`, `updatedAt` — ISO timestamps (recommended).

- **Product packaging (UOM conversions & barcode)** — **backlog**
  - One product → many packaging rows keyed by `productId`.
  - Fields:
    - `uom: string` — UOM code (e.g. `EA`, `CTN`, `KG`).
    - `unitsPer: number` — multiplier against base UOM.
    - `baseUom: string` — for clarity, echo of product base UOM.
    - `barcode?: string`
    - `isDefaultSalesUom?: boolean`
    - `isDefaultPurchaseUom?: boolean`
    - `dimensions?: { l: number; w: number; h: number; unit: "cm" | "in" }`
    - `weight?: { value: number; unit: "kg" | "g" }`

- **Product variants** — **backlog**
  - Represent size/grade specific SKUs within a product.
  - Fields:
    - `id: string`
    - `productId: string`
    - `sku: string` — unique SKU per variant.
    - `name?: string`
    - `size?: string` — e.g. `1kg`, `500ml`.
    - `packagingType?: string` — e.g. `bottle`, `sachet`, `carton`.
    - `grade?: string`
    - `status: "ACTIVE" | "INACTIVE"`
    - `attributes: { key: string; value: string }[]` — free-form list based on attribute definitions.

- **Product attribute definitions** — **backlog**
  - Org-level catalog used to drive variant dropdowns.
  - Fields:
    - `id: string`
    - `name: string` — display label (`Size`, `Grade`, `Flavor`, etc.).
    - `kind: "size" | "grade" | "flavor" | "packagingType" | "spec" | "custom"`
    - `options: string[]` — e.g. `["1kg", "5kg", "25kg"]`.

---

## 2. Product endpoints

### 2.1 List products

- **GET** `/api/products`
- **Query (recommended)**:
  - `search?: string` — matches `sku`, `name`, `category` (backend currently matches `sku`, `name`, `description`).
  - `status?: "ACTIVE" | "INACTIVE"`
  - `limit?: number` — max 100.
  - `cursor?: string` — opaque offset cursor returned as `nextCursor`.
- **Response** — 200:

```json
{
  "items": [
    {
      "id": "p1",
      "sku": "SKU-001",
      "name": "Product Alpha",
      "category": "Category A",
      "unit": "pcs",
      "baseUom": "EA",
      "status": "ACTIVE",
      "currentStock": 120,
      "createdAt": "2024-01-01T10:00:00Z",
      "updatedAt": "2024-01-10T09:30:00Z"
    }
  ],
  "nextCursor": null
}
```

- **Backend implementation (current):**
  - Path: `GET /api/products`
  - Uses `ProductModel` filtered by `orgId`, optional `status`, and `search` (regex over `sku`, `name`, `description`).
  - Sorts by `name`, paginates with `skip`/`limit`. `cursor` is treated as numeric offset; `nextCursor` is `null` when fewer than `limit` rows are returned.
  - Maps `unit` and `baseUom` from product `uom`. `currentStock` is not yet populated (can be added from `StockLevel` later).

- **Used by frontend:**
  - `/master/products`
  - `/inventory/products`

### 2.2 Get product detail

- **GET** `/api/products/:id`
- **Response** — 200:

```json
{
  "id": "p1",
  "sku": "SKU-001",
  "name": "Product Alpha",
  "category": "Category A",
  "unit": "pcs",
  "baseUom": "EA",
  "status": "ACTIVE",
  "currentStock": 120
}
```

- 404 if missing.
- **Backend implementation:**
  - Alias in `masters` router:
    - `GET /api/products/:id` → same handler as `/api/master/products/:id`.
  - Returns the full `ProductDoc` plus `id`; frontend should read at least `id`, `sku`, `name`, `uom` (maps to `unit`/`baseUom`).

- **Used by frontend:** `/master/products/[id]`, `/master/products/[id]/packaging`, `/variants`, `/attributes`.

### 2.3 Create product

- **POST** `/api/products`
- **Body**:

```json
{
  "sku": "SKU-001",
  "name": "Product Alpha",
  "category": "Category A",
  "unit": "pcs",
  "baseUom": "EA",
  "status": "ACTIVE"
}
```

- **Response** — 201:

```json
{ "id": "p1" }
```

- **Backend implementation (current):**
  - Path: `POST /api/products`
  - Requires `name`.
  - Writes:
    - `sku` → `ProductModel.sku`
    - `category` → `ProductModel.categoryId`
    - `baseUom` or `unit` → `ProductModel.uom` (default `"EA"`).
    - `status` → `ProductModel.status` (default `"ACTIVE"`).
  - Enforces SKU uniqueness via MongoDB unique index; duplicate SKU returns `400 { error: "sku must be unique per org" }`.

### 2.4 Update product

- **PATCH** `/api/products/:id`
- **Body** — partial:

```json
{
  "name": "Product Alpha (updated)",
  "category": "New category",
  "status": "INACTIVE"
}
```

- **Response** — 200: full product object (same shape as GET).

- **Backend implementation:**
  - Alias in `masters` router:
    - `PATCH /api/products/:id` → same as `/api/master/products/:id`.
  - Supports updates to `name`, `sku`, `description`, `uom`, `unitPrice`, `status`, etc.

### 2.5 Delete product

- **DELETE** `/api/products/:id`
- **Response**:
  - 204 on success (recommended) or 200 with `{ id, deleted: true }`.
  - 404 if not found.
- **Backend implementation (current):**
  - Alias in `masters` router:
    - `DELETE /api/products/:id` → deletes from `ProductModel` by `_id` + `orgId`.
  - Currently returns `200 { id, deleted: true }`. Frontend can treat this as success; later this can be tightened to `204`.

- Behaviour (recommended contract):
  - Option A (preferred): soft delete with `status = "INACTIVE"` but keep record and children.
  - Option B: hard delete product only if there are no dependent documents/stock.

---

## 3. Packaging endpoints (backlog)

> **Status:** Not implemented in backend yet. Frontend should treat these as future endpoints.

All packaging endpoints are scoped by `productId`.

### 3.1 List packaging rows

- **GET** `/api/products/:productId/packaging`
- **Response** — 200:

```json
{
  "items": [
    {
      "uom": "EA",
      "unitsPer": 1,
      "baseUom": "EA",
      "barcode": "1234567890123",
      "isDefaultSalesUom": true,
      "isDefaultPurchaseUom": false,
      "dimensions": { "l": 10, "w": 5, "h": 3, "unit": "cm" },
      "weight": { "value": 0.5, "unit": "kg" }
    }
  ]
}
```

### 3.2 Replace all packaging rows

- **PUT** `/api/products/:productId/packaging`
- **Body**:

```json
{
  "items": [
    {
      "uom": "EA",
      "unitsPer": 1,
      "baseUom": "EA",
      "barcode": "1234567890123",
      "isDefaultSalesUom": true,
      "isDefaultPurchaseUom": false,
      "dimensions": { "l": 10, "w": 5, "h": 3, "unit": "cm" },
      "weight": { "value": 0.5, "unit": "kg" }
    }
  ]
}
```

- **Response** — 200: same shape as list.
- Behaviour:
  - Validate:
    - Exactly one `isDefaultSalesUom` where required.
    - Exactly one `isDefaultPurchaseUom` where required.
    - `unitsPer > 0`; align with UOM catalog where applicable.

---

## 4. Variant & attribute endpoints (backlog)

> **Status:** Not implemented in backend yet. This section captures the intended contract; implementation can follow the same patterns as other master data.

### 4.1 List variants for a product

- **GET** `/api/products/:productId/variants`
- **Response** — 200:

```json
{
  "items": [
    {
      "id": "v1",
      "productId": "p1",
      "sku": "SKU-001-1KG",
      "name": "Product Alpha 1kg",
      "size": "1kg",
      "packagingType": "bag",
      "grade": "A",
      "status": "ACTIVE",
      "attributes": [
        { "key": "size", "value": "1kg" },
        { "key": "grade", "value": "A" }
      ]
    }
  ]
}
```

### 4.2 Create variant

- **POST** `/api/products/:productId/variants`
- **Body**:

```json
{
  "sku": "SKU-001-1KG",
  "name": "Product Alpha 1kg",
  "size": "1kg",
  "packagingType": "bag",
  "grade": "A",
  "status": "ACTIVE",
  "attributes": [
    { "key": "size", "value": "1kg" },
    { "key": "grade", "value": "A" }
  ]
}
```

- **Response** — 201:

```json
{ "id": "v1" }
```

### 4.3 Update variant

- **PATCH** `/api/products/:productId/variants/:variantId`
- **Body** — partial; same fields as create.
- **Response** — 200: full variant object.

### 4.4 Delete variant

- **DELETE** `/api/products/:productId/variants/:variantId`
- **Response** — 204 on success, 404 if not found.

---

## 5. Attribute definition endpoints (backlog)

Attributes are global to the org (not per product), but the UI shows them in a product context.

### 5.1 List attribute definitions

- **GET** `/api/products/attributes`
- **Response** — 200:

```json
{
  "items": [
    {
      "id": "ad1",
      "name": "Size",
      "kind": "size",
      "options": ["250g", "500g", "1kg"]
    }
  ]
}
```

### 5.2 Create attribute definition

- **POST** `/api/products/attributes`
- **Body**:

```json
{
  "name": "Grade",
  "kind": "grade",
  "options": ["A", "B", "C"]
}
```

- **Response** — 201: `{ "id": "ad2" }`.

### 5.3 Update attribute definition

- **PATCH** `/api/products/attributes/:id`
- **Body** — partial; same fields as create.
- **Response** — 200: full definition object.

### 5.4 Delete attribute definition

- **DELETE** `/api/products/attributes/:id`
- **Response** — 204.
- Behaviour:
  - Optional: prevent delete if in use by variants, or perform a cleanup/migration.

---

## 6. Frontend mapping (where this is used)

- `/master/products`
  - List + create products (`GET /api/products`, `POST /api/products`).
  - After create, UI navigates to `/master/products/:id/packaging` to set packaging + barcodes, then `/variants` to define size/grade SKUs (endpoints in §3–4 are backlog).

- `/master/products/[id]`
  - Loads base product (`GET /api/products/:id`).
  - Delete uses `DELETE /api/products/:id` (via `productDelete` stub in frontend).

- `/master/products/[id]/packaging`
  - Uses list + replace packaging (`GET` / `PUT /api/products/:productId/packaging`) — **backlog**.

- `/master/products/[id]/variants`
  - Uses list/create/update/delete variants (`/api/products/:productId/variants`) — **backlog**.

- `/master/products/[id]/attributes`
  - Uses attribute definition CRUD (`/api/products/attributes`) — **backlog**.

This document, together with the global API spec in the frontend repo, should be enough for backend engineers to implement product master data and for frontend engineers to wire products to real endpoints.


