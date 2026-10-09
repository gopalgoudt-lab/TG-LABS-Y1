# Manual UPI paid-booking correction — design gate

Status: DESIGN ONLY. No production payment records or receipts are modified.

## Incident
- Original package amount: INR 5,280 (AAROGYAM CAMP PROFILE 3, Thyrocare).
- Actual patient collection: INR 2,500 via PhonePe to owner's personal bank account.
- Commercial discount: INR 2,780, requiring documented approval.
- Existing booking and issued receipt incorrectly show INR 5,280 as PAID.
- Original receipt and payment evidence must remain immutable and accessible.

## Before implementation
1. Verify PhonePe success receipt **and** matching bank credit, reference, date and beneficiary; store sensitive proof in access-controlled storage, not Git.
2. Inspect booking/payment/receipt Prisma models, payment creation and receipt generation; identify existing paid transactions and frozen snapshots.
3. Require an authorized reviewer, reason, verified collection reference, and explicit approval; prevent self-approval where possible.
4. Design an append-only financial adjustment or correction ledger, with idempotency key and database transaction. Never change a gateway transaction to pretend it was a manual UPI payment.
5. Issue a versioned corrected receipt referencing the superseded receipt; show gross 5280, discount 2780, net 2500, received 2500, due 0; label owner-collected PhonePe UPI.
6. Reconcile owner-collected funds separately in accounting; preserve workflow status and diagnostic data.
7. Test authorization, duplicate requests, missing proof, amount mismatches, concurrent updates, receipt rendering, and audit rollback on failure in Preview with synthetic records.
8. Keep the original paid-booking reconciliation endpoint disabled for this case; do not merge or deploy until independent financial review.

## Release gate
No Production write or corrected receipt issuance before evidence verification, successful Preview tests, and explicit administrator approval.
