# Dual-currency display convention

## The rule

Every list or detail view that shows **document money** (amounts that originated from an AP Bill, AR Invoice, Purchase Order, GRN, or any document with an `exchangeRate` snapshot) **must** use the `DualCurrencyAmount` component.

```tsx
<DualCurrencyAmount
  amount={row.total}
  currency={row.currency ?? baseCurrency}    // document's original currency
  exchangeRate={row.exchangeRate}            // snapshot stored at save time – never live
  baseCurrency={baseCurrency}               // from useBaseCurrency() hook
  align="right"
  size="sm"
/>
```

- **Primary line (bold):** amount converted to the org's base currency (KES by default) — `amount × exchangeRate`.
- **Secondary line (muted small):** original foreign amount, shown only when `currency !== baseCurrency`.
- **No FX API calls on render.** The rate must come from the document's stored `exchangeRate` field.

## When NOT to use DualCurrencyAmount

| Surface | Why |
|---|---|
| General Ledger | Posting lines are already in base currency |
| Trial Balance | All amounts are in base from `PostingLine` |
| Financial statements (P&L, BS, CF) | Aggregates in base only |
| KPI totals that are already converted server-side | Use `formatMoney(total, baseCurrency)` |

## Getting baseCurrency

```tsx
import { useBaseCurrency } from "@/lib/org/useBaseCurrency";
const baseCurrency = useBaseCurrency(); // "KES" by default from org settings
```

Always pass `baseCurrency` to `DualCurrencyAmount` and include it in `useMemo` dependency arrays when columns are memoized.

## Backend data requirements

Any endpoint that feeds a document-backed list **must** return `exchangeRate` from the source document. Pattern:

```ts
// In a route handler:
const docs = await DocumentModel.find({ _id: { $in: ids } })
  .select({ _id: 1, exchangeRate: 1 })
  .lean();
const rateByDocId = new Map(docs.map((d) => [String(d._id), d.exchangeRate ?? 1]));

// In the response mapper:
exchangeRate: rateByDocId.get(item.documentId) ?? 1,
```

## KPI sums (multi-currency safe)

When summing `openAmount` across items that may be in different currencies, **convert each to base first** using the document snapshot rate — never sum mixed-currency raw values:

```ts
const totalKes = items.reduce((sum, item) => {
  const rate = item.currency === baseCurrency ? 1 : (rateByDocId.get(item.sourceId) ?? 1);
  return sum + item.openAmount * rate;
}, 0);
```

This is already done in `getSubledgerOverview` (returns `arOutstandingTotal` / `apOutstandingTotal`).

## toBaseEquivalent utility

```ts
import { toBaseEquivalent } from "@/lib/money";
// Same formula as kesEquivalent but with configurable base:
toBaseEquivalent(amount, currency, baseCurrency, exchangeRate)
```
