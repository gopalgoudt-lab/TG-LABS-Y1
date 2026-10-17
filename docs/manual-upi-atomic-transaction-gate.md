# Atomic manual UPI correction: implementation gate

**Status:** Design for implementation; NO enabled financial write endpoint. PR #306 stays Draft.

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

## Known blockers
- No trusted reviewer-attestation storage or independent approval identity flow yet.
- No atomic adjustment writer or transaction-bound audit implementation yet.
- No PDF issuance integration, reconciliation of existing transaction rows, or end-to-end Preview tests yet.
- Existing booking's PhonePe receipt and matching bank credit have not been independently verified.
