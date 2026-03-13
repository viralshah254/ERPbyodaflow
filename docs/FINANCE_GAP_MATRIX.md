# Finance Gap Matrix

## Scope
This matrix tracks the finance and reporting surfaces reviewed during the ERP hardening pass and records whether each surface is now connected to live backend contracts or still needs deeper completion.

## Live And Connected
| Surface | Frontend | Backend | Status | Notes |
| --- | --- | --- | --- | --- |
| Journal entries | `/finance/journals` | `/api/documents/journal` | Connected | Uses canonical journal documents instead of hardcoded demo rows. |
| Chart of accounts | `/finance/chart-of-accounts` | `/api/finance/accounts` | Connected | Lists live ledger accounts and supports account creation. |
| Bank accounts | `/treasury/bank-accounts` | `/api/treasury/bank-accounts` | Connected | Uses real ledger-account IDs for GL mapping and shows code/name enrichment from the backend. |
| Report library | `/reports` | `/api/reports`, `/api/reports/exports`, `/api/reports/scheduled`, `/api/reports/saved` | Connected | Library cards and counts are now backend-backed. |
| VAT summary | `/reports/vat-summary` | `/api/reports/vat-summary` | Connected | Pulls live tax totals and supports CSV export. |
| WHT summary | `/reports/wht-summary` | `/api/reports/wht-summary` | Connected | Pulls live withholding totals and supports CSV export. |
| Document truth for finance docs | `/docs/[type]/[id]` | `/api/documents/:type/:id` | Connected | Action buttons are backend-driven instead of hardcoded. |

## Implemented Demo Data Support
| Demo fixture item | Status | Notes |
| --- | --- | --- |
| Core posting accounts | Seeded | CoolCatch now has AR, AP, bank, inventory, GRNI, revenue, and expense accounts. |
| Posting mappings | Seeded | Parent org maps posting keys to seeded ledger accounts. |
| Bank account | Seeded | Parent org has a KES operating account mapped to the main bank ledger. |
| Manual journal | Seeded | CoolCatch includes a posted journal for finance-screen validation. |

## Remaining Priority Gaps
| Area | Gap | Priority |
| --- | --- | --- |
| Statements | Current P&L, balance sheet, and cash flow are still simplified service outputs and need drilldown-grade accounting fidelity. | High |
| VAT and WHT detail | Summary endpoints exist, but line-by-line tax reporting, tax code visibility, and filing-style outputs are still thin. | High |
| AR/AP workspaces | Aging, write-off, disputes, and exception handling need fuller operational surfaces beyond open-invoice/open-bill selection. | High |
| Bank reconciliation | Matching exists, but split/partial match UX, fee lines, transfer detection, and adjustment flows need deeper completion. | High |
| Budgets | `/api/finance/budgets` still returns an empty list. | Medium |
| Export artifacts | Report exports currently return run metadata and JSON payloads; downloadable spreadsheet/PDF output still needs a richer export layer. | Medium |

## Delivery Notes
- The goal of this pass was to remove the most visible finance/reporting mocks and fix the account-mapping contract mismatch without widening scope into payroll, RBAC, or integrations.
- The next finance increment should focus on statement fidelity, AR/AP exception workflows, and reconciliation depth.
