## Parties (Customers, Franchisees, Suppliers) — Backend API

**Scope:** Core party master data used across sales, purchasing, AR/AP, distribution, franchise, and CRM. This file drills into `/api/parties` and related fields referenced in `BACKEND_SPEC.md` (§10.2, §10.9).

**Base path:** All routes use prefix `/api`. Auth + org/tenant scoping apply to every request.

---

## 1. Concepts & data model

There is a **single Party entity**; role and segment fields distinguish customers, franchisees, suppliers, etc.

- **Party**
  - `id: string`
  - `orgId: string`
  - `name: string`
  - `roles: ("customer" | "supplier" | "franchisee")[]`
  - `customerType?: "DISTRIBUTOR" | "WHOLESALER" | "RETAILER" | "FRANCHISEE" | "END_CUSTOMER"`
  - `supplierType?: "RAW_MATERIAL" | "SERVICE" | "LOGISTICS" | "OTHER"`
  - `channel?: "MODERN_TRADE" | "GENERAL_TRADE" | "E_COM" | "HORECA" | "OTHER"`
  - `email?: string`
  - `phone?: string`
  - `taxId?: string`
  - `creditLimit?: number`
  - `paymentTermsId?: string`
  - `defaultPriceListId?: string`
  - `defaultCurrency?: string`
  - `status: "ACTIVE" | "INACTIVE"`
  - `createdAt`, `updatedAt`: ISO timestamps.

> **Navigation intent:**  
> - Masters → Parties shows **Customers**, **Franchisees**, **Suppliers** as first-class tabs.  
> - Sales and AR views filter on `roles` contains `"customer"` (and optional `customerType`).  
> - Purchasing and AP views filter on `roles` contains `"supplier"`.

---

## 2. Endpoints

### 2.1 List parties

- **GET** `/api/parties`
- **Query:**
  - `role?: "customer" | "supplier" | "franchisee"` — filter by role.
  - `customerType?: "DISTRIBUTOR" | "WHOLESALER" | "RETAILER" | "FRANCHISEE" | "END_CUSTOMER"`
  - `supplierType?: "RAW_MATERIAL" | "SERVICE" | "LOGISTICS" | "OTHER"`
  - `status?: "ACTIVE" | "INACTIVE"`
  - `search?: string` — matches `name`, `email`, `phone`, tax id.
  - `limit?: number` (max 100), `cursor?: string` — offset-based or opaque cursor; return `nextCursor`.
- **Response** — 200:

```json
{
  "items": [
    {
      "id": "c1",
      "name": "ABC Retail",
      "roles": ["customer"],
      "customerType": "RETAILER",
      "email": "abc@retail.com",
      "phone": "+254700000000",
      "status": "ACTIVE"
    }
  ],
  "nextCursor": null
}
```

**ERP navigation mapping**

- `/master/parties`
  - Customers tab → `GET /api/parties?role=customer`.
  - Franchisees tab → `GET /api/parties?role=franchisee` (or `customerType=FRANCHISEE`).
  - Suppliers tab → `GET /api/parties?role=supplier`.
- `/sales/customers`, `/ar/customers`
  - `GET /api/parties?role=customer&status=ACTIVE`.
- `/ap/suppliers`
  - `GET /api/parties?role=supplier&status=ACTIVE`.

### 2.2 Get party detail

- **GET** `/api/parties/:id`
- **Response** — 200:

```json
{
  "id": "c1",
  "name": "ABC Retail",
  "roles": ["customer"],
  "customerType": "RETAILER",
  "channel": "MODERN_TRADE",
  "email": "abc@retail.com",
  "phone": "+254700000000",
  "taxId": "P1234567X",
  "creditLimit": 100000,
  "paymentTermsId": "NET30",
  "defaultPriceListId": "PL-RETAIL",
  "status": "ACTIVE"
}
```

- 404 if not found.

### 2.3 Create party

- **POST** `/api/parties`
- **Body (minimal):**

```json
{
  "name": "XYZ Shop (Franchisee)",
  "roles": ["customer", "franchisee"],
  "customerType": "FRANCHISEE",
  "email": "xyz@shop.com",
  "phone": "+254700000001",
  "status": "ACTIVE"
}
```

- **Response** — 201:

```json
{ "id": "c2" }
```

**Notes**

- Require at least one role (`roles` non-empty).
- When `roles` contains `"customer"` and `customerType` is omitted, default to `"RETAILER"`.
- When `roles` contains `"supplier"` and `supplierType` is omitted, default to `"RAW_MATERIAL"`.
- Enforce uniqueness of `(orgId, name)` or `(orgId, taxId)` per your business rules.

### 2.4 Update party

- **PATCH** `/api/parties/:id`
- **Body** — partial:

```json
{
  "roles": ["customer", "franchisee"],
  "customerType": "FRANCHISEE",
  "channel": "GENERAL_TRADE",
  "status": "ACTIVE"
}
```

- **Response** — 200: full party object.

### 2.5 Deactivate / archive party

- **PATCH** `/api/parties/:id/status`
- **Body:**

```json
{ "status": "INACTIVE" }
```

- **Response** — 200: `{ "id": "c1", "status": "INACTIVE" }`.

Implementation can alias this to the general PATCH endpoint; the important contract is that **documents must not allow new transactions** with inactive parties without override.

---

## 3. Navigation & filtering patterns

To make the ERP navigation intuitive and consistent:

- **Masters → Parties**
  - Tabs:
    - **Customers** — `role=customer`; filter dropdown `customerType` (Distributor, Wholesaler, Retailer, Franchisee, End customer).
    - **Franchisees** — `role=franchisee` or `customerType=FRANCHISEE`.
    - **Suppliers** — `role=supplier`; filter dropdown `supplierType` (Raw material, Service, Logistics, Other).
  - Drawer:
    - When launched from Customers tab, default `roles=["customer"]` and `customerType="RETAILER"`.
    - From Franchisees tab, default `roles=["customer","franchisee"]` and `customerType="FRANCHISEE"`.
    - From Suppliers tab, default `roles=["supplier"]` and `supplierType="RAW_MATERIAL"`.

- **Sales navigation**
  - `/sales/customers`, `/ar/customers` and document pickers (quotes, sales orders, invoices) filter `roles` contains `"customer"` and `status="ACTIVE"`.
  - Reports and analytics can segment by `customerType` and `channel`.

- **Purchasing / AP navigation**
  - `/ap/suppliers`, supplier pickers for POs, GRNs, Bills, Payments filter `roles` contains `"supplier"` and `status="ACTIVE"`.
  - Additional grouping by `supplierType` for procurement analytics.

- **Franchise navigation (Cool Catch layer)**
  - `/franchise/commission`, `/franchise/vmi` use only parties where `roles` contains `"franchisee"` (or `customerType="FRANCHISEE"`).

---

## 4. Permissions and security

- Recommended permission codes:
  - `masters.parties.read` — list/get parties.
  - `masters.parties.write` — create/update/deactivate parties.
  - Sales and purchasing modules re-use their own read permissions for document-level access.
- All endpoints must be scoped by tenant/org and respect branch visibility rules where applicable.

---

## 5. Frontend wiring summary

- **Current mocks:** `src/lib/mock/masters.ts` exposes `PartyRow` with `roles`, `customerType`, `supplierType`.
- **Masters → Parties page:** `src/app/(dashboard)/master/parties/page.tsx`
  - Uses tabs for Customers / Franchisees / Suppliers.
  - Uses filters for `customerType` and `supplierType` and read-only forms for types in the drawer.
  - Once backend is implemented, the page should be switched from mocks to:
    - `GET /api/parties` (with `role` + type filters).
    - `POST /api/parties`, `PATCH /api/parties/:id` for create/edit.

This document, together with `BACKEND_SPEC.md` and `BACKEND_API_SPEC_SINGLE_SOURCE.md`, defines how party masters should behave to support clean ERP navigation across sales, purchasing, distribution, and franchise modules.

