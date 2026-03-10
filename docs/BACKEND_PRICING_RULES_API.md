# Backend: Pricing rules API (discount policies & customer default price list)

**Purpose:** Implement these endpoints so the frontend **Pricing → Rules** page (`/pricing/rules`) can list/add discount policies and configure customer default price lists. The frontend is already wired in `src/lib/api/pricing.ts`; when `NEXT_PUBLIC_API_URL` is set it will call the paths below.

**Base path:** `/api`. All routes require auth and org/branch context (e.g. Firebase token or `X-Demo-Mode` / `X-Dev-User-Id`).

---

## 1. Discount policies

### GET `/api/pricing/policies`

**Description:** List all discount policies for the current org.

**Response:** `200`

```json
{
  "items": [
    {
      "id": "dp1",
      "name": "Volume 10%",
      "type": "volume",
      "requiresApproval": true,
      "startDate": null,
      "endDate": null
    },
    {
      "id": "dp2",
      "name": "Promo Q1",
      "type": "promo",
      "requiresApproval": false,
      "startDate": "2025-01-01",
      "endDate": "2025-03-31"
    }
  ]
}
```

- **`type`** must be one of: `volume`, `promo`, `channel`.
- **Permission:** `pricing.read` (or equivalent).

---

### POST `/api/pricing/policies`

**Description:** Create a new discount policy.

**Request body:**

```json
{
  "name": "Volume 10%",
  "type": "volume",
  "requiresApproval": true,
  "startDate": "2025-01-01",
  "endDate": "2025-12-31"
}
```

- **Required:** `name`, `type`.
- **Optional:** `requiresApproval` (boolean), `startDate`, `endDate` (ISO date strings).

**Response:** `201`

```json
{
  "id": "dp3",
  "name": "Volume 10%",
  "type": "volume",
  "requiresApproval": true,
  "startDate": "2025-01-01",
  "endDate": "2025-12-31"
}
```

- **Permission:** `pricing.write`.

---

### PATCH `/api/pricing/policies/:id`

**Description:** Update an existing discount policy (partial update).

**Request body:** Any subset of `{ name, type, requiresApproval, startDate, endDate }`.

**Response:** `200` — full updated policy object.

**Errors:** `404` if policy not found. **Permission:** `pricing.write`.

---

### POST `/api/pricing/policies/:id/request-approval`

**Description:** Optional workflow: request approval for a policy before it can be applied. Backend may create an approval task and return 200.

**Request body (optional):**

```json
{ "comment": "Please review for Q2" }
```

**Response:** `200` (e.g. `{}` or `{ approvalId }`).

**Permission:** `pricing.write`. Frontend calls this when you add an “Request approval” action; not required for initial implementation.

---

## 2. Customer default price list

### GET `/api/pricing/customer-default-price-lists`

**Description:** List customer → default price list assignments for the current org. Used to show “Current assignments” in the Configure sheet.

**Response:** `200`

```json
{
  "items": [
    {
      "customerId": "cust-001",
      "customerName": "Acme Ltd",
      "priceListId": "pl-retail",
      "priceListName": "Retail"
    }
  ]
}
```

- **`customerName`** and **`priceListName`** are optional but recommended for display.
- **Permission:** `pricing.read`.

**Implementation note:** You can derive this from a `Party`/`Customer` model with a `defaultPriceListId` (or a join table `customer_default_price_list`). Return only customers that have a default price list set, or all customers with `defaultPriceListId` null for unset.

---

### POST `/api/pricing/customer-default-price-lists`

**Description:** Set (upsert) the default price list for a customer.

**Request body:**

```json
{
  "customerId": "cust-001",
  "priceListId": "pl-retail"
}
```

**Response:** `200` or `201` (e.g. `{}` or `{ customerId, priceListId }`).

**Errors:** `400` if `customerId` or `priceListId` invalid; `404` if customer or price list not found. **Permission:** `pricing.write`.

**Implementation note:** Store on the customer/party entity (e.g. `defaultPriceListId`) or in a dedicated table keyed by `(orgId, customerId)`.

---

## 3. Permissions

| Permission   | Use |
|-------------|-----|
| `pricing.read`  | GET policies, GET customer default price lists |
| `pricing.write` | POST/PATCH policies, POST customer default price lists, request-approval |

If your RBAC uses different names, map these to your permission set.

---

## 4. Frontend wiring summary

| UI action              | API call |
|------------------------|----------|
| Load discount policies | `GET /api/pricing/policies` |
| “Add policy” (submit)  | `POST /api/pricing/policies` |
| Configure sheet: load assignments | `GET /api/pricing/customer-default-price-lists` |
| “Set default” (submit) | `POST /api/pricing/customer-default-price-lists` |

Price list options for the “Set default” dropdown are currently from the frontend repo/mock (`getPriceListsForConfig()`). When the backend exposes **GET /api/price-lists** or **GET /api/pricing/price-lists**, the frontend can be updated to fetch options from the API.

---

## 5. Optional: List customers for dropdown

The Configure sheet currently uses a **Customer ID** text input. To support a **customer dropdown**, add:

- **GET `/api/parties/customers`** or **GET `/api/sales/customers`** returning `{ items: { id, name, defaultPriceListId? }[] }`.

Then the frontend can be updated to show a select instead of a text field.
