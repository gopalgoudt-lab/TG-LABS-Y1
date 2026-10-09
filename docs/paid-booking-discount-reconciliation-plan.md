# Paid booking discount reconciliation — safety specification

## Case under investigation
Original quoted amount: INR 5,280.
Approved discount: INR 2,780.
Final agreed amount and actual cash received: INR 2,500.
Outstanding balance: INR 0.

These figures are user-confirmed but the persisted payment transaction and frozen receipt snapshot have **not** been independently verified. Do not mutate financial records based solely on this specification.

## Mandatory read-only evidence gate
For the exact booking ID, authorized server-side code must read:
- Booking totalAmount, paymentStatus, paymentMode, paidAt and workflowStatus.
- All related payment transactions (amount, status, source, provider and orderId).
- Immutable paymentReceiptSnapshot (total, lines, version).
- Booking tests/packages, charges and any previously approved discounts.
- Existing audit history and any prior reconciliation.

Display a redacted comparison for authorized admins. Never return unnecessary patient personal data. Require a human to confirm the amount actually collected and the method of collection.

## Implementation constraints
1. Do not change the existing paid-booking PATCH lock or weaken report-delivery integrity gates.
2. Do not invoke the existing reconcile-paid-total endpoint to apply a new discount: it only reconciles from existing frozen evidence.
3. Introduce a separate, explicitly authorized adjustment workflow with a reason, approval identity, idempotency key, expected current version and server-calculated totals.
4. Preserve original financial evidence and append a separately auditable correction record. Never silently rewrite a settled provider payment or payment gateway signature. For a collection transaction erroneously recorded as INR 5,280, require a reviewed correction/reversal accounting entry and a verified INR 2,500 collection; do not fabricate a new cash receipt.
5. Generate a corrected customer-facing receipt only from reconciled, approved data, showing original price, discount, final paid amount and zero balance, with versioned history.
6. Use a database transaction, concurrency control and least-privilege authorization; reject duplicate adjustments.
7. Keep patient reports accessible and do not change workflow stage, tests, or patient details as a side effect.

## Preview UAT acceptance criteria
- Existing amount and frozen evidence can be inspected without mutation.
- Conflicting frozen snapshot/transaction amounts block automatic adjustment and show an actionable manual-review state.
- Approved correction computes 5280 - 2780 = 2500 and paid balance 0, only after payment evidence review.
- Existing original payment records and prior receipts remain traceable.
- Unapproved, repeated, stale, unauthorized, or malformed requests are rejected.
- No additional payment is created for an already collected amount.
- Other bookings, receipt snapshots, payment workflows and reports remain unchanged.
- Run typecheck, tests, Preview UAT, then seek explicit approval before merging to Production.
