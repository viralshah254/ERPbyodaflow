# Workflow Certification Checklist

## Order To Cash

- Quote to sales order preserves party, branch, pricing, and tax context.
- Delivery, invoice, receipt, and allocation update downstream balances correctly.
- Aging and overdue alerts reflect the posted invoice due date and payment term.

## Procure To Pay

- Purchase request, PO, GRN, bill, payment run, payment, and reconciliation remain consistent.
- Supplier payment terms and currency flow through bill and payment screens.

## Inventory Control

- Receipts, transfers, pick/pack, putaway, and cycle counts reconcile stock movements and valuation.
- Cross-branch inventory actions respect branch scope and permissions.

## Payroll And Assets

- Payroll run, approval, posting, payslip, and statutory outputs reconcile to GL.
- Asset acquisition, depreciation, disposal, and reversal retain audit continuity.

## Financial Close

- Journals, bank reconciliation, AR/AP aging, and close/reopen controls are production-authoritative.
- No critical close action relies on local stub persistence.
