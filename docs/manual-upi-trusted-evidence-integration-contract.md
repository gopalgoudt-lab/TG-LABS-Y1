# Manual UPI trusted-evidence integration contract (Draft PR #306)

## Scope and status
This document is a design gate, not an enabled payment correction feature. Keep PR #306 Draft. No production database migrations, payment changes, or receipt replacements are authorized by this document.

## Source-of-truth boundary
- The HTTP request may identify a booking and submit a proposed correction, but must not supply authoritative `verified`, `approved`, `bankCreditConfirmed`, or discount-authorization flags.
- A server-side evidence adapter must obtain immutable payment evidence from a verified provider response or independently reconciled bank statement. A personal PhonePe screenshot alone is not proof of settlement.
- Store a provider/bank reference or digest, evidence source, verification timestamp, amount in integer paise, destination account identity, and reconciliation status; never store bank credentials or sensitive account details in the audit log.
- Bind each evidence record to a specific booking, expected payment reference, and receiving account. Reject reused references across bookings and conflicting amount/currency/account matches.
- Evidence from a personal account collected on behalf of the business requires documented business authorization and separate reconciliation; it must not be treated as Razorpay collection.

## Independent review
- Enforce server-authenticated identities and role authorization for requester, payment verifier, and approver. All three identities must be distinct.
- Verify the original frozen receipt hash, original booking total, existing transaction ledger, discount authority, and exact arithmetic before approval.
- Approval issuance must be a trusted server-side operation that persists who approved, when, and what immutable evidence was reviewed. The pure `assessTrustedManualUpiApproval` function is necessary but does not itself authenticate evidence or issue approval.
- Reject missing, expired, contradictory, duplicated, or untrusted evidence. Never default unknown states to verified.

## Atomic adjustment and audit
- In one serializable database transaction, re-read booking, frozen receipt, trusted approval, payment records, and correction idempotency key; create one adjustment and its audit record or roll back both.
- Preserve the original receipt snapshot. Generate a separately identifiable corrected statement only after an authorized adjustment, showing original price, actual amount received, and independently authorized discount/outstanding balance.
- Concurrent requests with the same key must be idempotent; a different key for an already adjusted booking must be rejected.
- If audit insertion fails, adjustment creation must fail as well. Do not rewrite payment history to claim uncollected funds were received.

## Required isolated tests before release
1. Reject forged browser-provided approval or bank-verification flags.
2. Reject mismatched booking, UPI reference, destination account, amount, currency, and duplicate references.
3. Reject same-person requester/verifier/approver and unauthorized roles.
4. Reject missing bank credit, unsupported discount, changed frozen receipt, and stale approval.
5. Assert receipt immutability, atomic rollback, and concurrent idempotency.
6. Confirm that no code path creates an approval from self-attested browser JSON.
7. Run isolated PostgreSQL integration tests and PR validation on the exact proposed commit; review the migration and rollback plan before any staging deployment.

## Example: current disputed booking
Original gross ₹5,280; reported personal PhonePe collection ₹2,500; difference ₹2,780. Do not label ₹2,780 a discount unless separately approved and evidenced. If no approved discount exists, show ₹2,780 as unresolved/outstanding subject to reconciliation, not as paid.

## Release gate
A green GitHub check confirms the checked tests ran; it does not establish real bank settlement. Remain Draft until a trusted evidence source, independent approval issuance, audited atomic correction, and staging UAT are implemented and reviewed.
