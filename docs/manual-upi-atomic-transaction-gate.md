# Atomic manual UPI correction: implementation gate

**Status (2026-10-19):** Internal serializable adjustment writer and transaction-bound audit exist, but trusted approval issuance is deliberately not implemented. NO enabled financial write endpoint. PR #306 stays Draft.

## Required trusted inputs
- Booking ID and stable correction key, bound to a specific original receipt hash.
- Independently verified PhonePe UTR and matching owner-bank credit (secured references; never raw banking identifiers in source control or public logs).
- Requester, independent verifier and approver identities authenticated server-side, with evidence of authorization and timestamp.
- Approved gross/discount/net amounts and reason. No browser-supplied verification booleans are trusted.

## Atomic transaction contract
1. Require a trusted server-side approval record and check that all evidence is current and specific to the booking. The existing preflight utility is only a pure validation helper, not evidence authentication.
2. In a serializable database transaction, lock or conditionally update the target booking and reject if payment status, total, original receipt hash, or payment transaction evidence changed since review.
3. Reject any pre-existing BookingFinancialAdjustment for the booking. The unique bookingId constraint is a second line of defense against concurrent duplicate requests.
4. Append the adjustment and audit record in the SAME transaction; if any step fails, roll back both. The existing best-effort writeAdminAudit helper is unsuitable for this critical audit.
5. Preserve all historical PaymentTransaction rows and paymentReceiptSnapshot. Do not turn a Razorpay transaction into a PhonePe payment.
6. Record corrected receipt issuance separately, linked to original and correction record. Avoid publishing a receipt until a durable adjustment exists; use an outbox or retry-safe issuance process.
7. Derive effective net/paid totals from the adjustment for patient/admin display, instead of rewriting the original gross line-item price. Verify partner payable and reporting behavior separately.
8. Block any Production execution until migration is reviewed and tested against an isolated database, and both financial reviewer and deploy approver explicitly sign off.

## Verified implementation inventory (2026-10-19)
- `lib/manual-upi-atomic-adjustment.ts` implements an internal serializable Prisma transaction which re-reads the paid booking, checks the frozen receipt hash and stored approval, and creates `BookingFinancialAdjustment` plus `AdminAuditLog` atomically. It is NOT an authorized public write endpoint.
- `lib/manual-upi-approval-issuer.ts` performs trusted-evidence and amount prechecks but intentionally throws `ATOMIC_APPROVAL_PERSISTENCE_NOT_IMPLEMENTED`. There is no completed approval issuance path.
- `lib/manual-upi-approval-issuance-readiness.ts` is read-only and always reports `eligible: false`, including when prechecks pass.
- `lib/manual-upi-bank-evidence-adapter.ts` defines a trusted source interface and validates returned credit evidence. It does not implement an authenticated bank/provider integration.
- `app/api/admin/bookings/[id]/manual-upi-correction/route.ts` remains preparation-only and returns `correctionApplied: false`, `receiptIssued: false`.

## Remaining blockers and next implementation gate
1. Implement and review a real server-side bank reconciliation provider: verify actual settlement, UPI reference, amount in integer paise, beneficiary account, evidence provenance, and one-time reference use across bookings. Reject screenshots and client flags as proof.
2. Design and test trusted approval persistence before enabling it: authenticate OWNER and independently authorized verifier from server-side identities; enforce three distinct actors; bind approval to immutable booking/receipt/evidence/amounts; prohibit unapproved discounts; enforce replay/idempotency and rollback.
3. Review amount-unit consistency between booking amounts and `*Paise` fields before any write. Do not silently assume rupees and paise are interchangeable.
4. Verify that the atomic adjustment caller checks OWNER authorization, approval provenance, payment-ledger state and duplicate requests. Test concurrency, tampered receipt, stale approval, and audit-write rollback in isolated PostgreSQL.
5. Implement separate, versioned corrected-receipt issuance with idempotency and end-to-end Preview UAT. Preserve the original receipt and transaction history.
6. Independently verify the reported ₹2,500 PhonePe credit and receiving account. The ₹2,780 difference from ₹5,280 remains unresolved unless separately approved as a discount.

**Release rule:** A green check validates only the executed tests. No Production migrations, corrected receipts, account provisioning, or live financial changes are authorized. Keep PR #306 Draft.
