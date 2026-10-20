# Manual UPI correction — two-role financial authorization gate

Status: DESIGN ONLY / NOT PRODUCTION APPROVED
Scope: PR #306, feature/manual-upi-receipt-correction

## Decisions
- Accounts Staff independently reconciles PhonePe and bank settlement evidence, confirming verified collected amount. Accounts Staff cannot approve discounts.
- TG LABS Owner/Admin alone may authorize an explicit discount amount and reason. Admin role must be restricted to the designated owner/authorized discount approver, not every generic admin.
- Requester, independent payment verifier, and discount approver must have separate authenticated identities as applicable. No person may verify or approve their own request. Accounts Staff may not impersonate the owner.
- Discounts are never inferred from the difference between receipt total and amount received.
- Keep the original receipt immutable. Corrected receipts must reference original receipt and immutable financial adjustment/audit records.

## Example
Original gross total INR 5,280; verified PhonePe collected INR 2,500; difference INR 2,780.
Without explicit owner-approved discount: discount INR 0; outstanding INR 2,780.
If owner approves INR 2,780 discount after evidence review: discount INR 2,780; outstanding INR 0.
Record money in integer minor units consistently; validate conversions and prevent negative/over-limit values.

## Required engineering before enabling any writes
1. Independently authenticated trusted back-office provider for bank reconciliation (not browser flags, screenshots, or client-supplied amounts).
2. Role/identity authorization enforced server-side, with separate reviewer and owner approval, signed or tamper-evident provenance and expiry/revocation rules.
3. Transactional approval persistence, adjustment, audit, and corrected-receipt reference in a serializable, idempotent transaction. Fail closed on any error.
4. Staging tests: missing roles, same-person approval, mismatched evidence, expired approval, replay, concurrent corrections, unauthorized discounts, failure rollback, frozen receipt, and payment settlement in a personal account requiring independent evidence.
5. Review schema/migrations and all CI checks, obtain independent financial/security review, and controlled staging sign-off before merging.

## Release gate
PR #306 remains Draft. No Production migrations, financial adjustments, or corrected receipt issuance until all gates are satisfied.
