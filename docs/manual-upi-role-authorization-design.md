# Manual UPI role authorization design (PR #306)

Status: DESIGN ONLY — NOT PRODUCTION APPROVED. Accounts Staff account provisioning deferred.

## Roles and scope
- OWNER: explicitly assigned to one or more verified Firebase UIDs by a trusted server-side registry. May authorize an explicit discount amount and reason after independent evidence review. Existing ADMIN designation must **not** imply OWNER.
- ADMIN: existing administrative operations only, subject to current endpoint authorization. No automatic financial discount authority.
- ACCOUNTS_STAFF: separate verified Firebase UID, provisioned later. May independently reconcile PhonePe payment and beneficiary bank credit from trusted back-office records, but may not authorize discounts, issue corrected receipts or make financial adjustments.
- TECHNICIAN: existing technician permissions only.

## Migration and backwards compatibility
Keep existing admin sign-in/session behavior for ordinary operations while designing the new authorization layer. Do not grant OWNER or ACCOUNTS_STAFF privileges based solely on ADMIN_PHONE_NUMBERS, phone text, JWT role claims, client JSON, screenshots, or environment flags. Define a server-managed identity-to-role registry keyed by Firebase UID with audited provisioning and revocation. Owner bootstrap requires a separate explicit verified assignment; until assigned, owner-only actions fail closed. Sessions must be validated against current role state (revocation/version) on privileged requests; prevent stale session escalation. Never provision an Accounts Staff account automatically.

## Authorization boundaries
- Existing admin endpoints should continue to require existing authentication; audit each endpoint for minimum privileges, particularly accounts-logistics, which returns patient and financial data.
- Dedicated finance endpoints must check authenticated identity, server-resolved role, action-specific permission, and booking scope on every request.
- Separate requester, independent accounts verifier, and owner discount approver UIDs. Reject identity reuse for the same correction.
- Never allow a client to assert bank verification, settlement evidence, owner approval, verified amounts or role. Obtain trusted evidence server-side, bound to booking ID and frozen original receipt hash.
- Discount requires explicit owner-approved integer minor-unit amount and reason, with timestamp, approval expiry/revocation and audit trail. No inferred discount from gross-minus-collected.
- Preserve original receipt; corrections are append-only, linked to immutable original and audited adjustment.

## Current financial example
Frozen original gross ₹5,280; independently verified collected ₹2,500; difference ₹2,780. Without owner-approved discount: discount ₹0, outstanding ₹2,780. Only after owner approves exactly ₹2,780 discount (if justified) may outstanding become ₹0. Never change original receipt or represent ₹5,280 as received.

## Implementation gates (not yet authorized)
1. Review actual admin-auth/session and all affected API consumers. Add trusted role registry and authorization helpers, with explicit owner bootstrap and revocation tests.
2. Add separate Accounts Staff login after staff identity is supplied; prevent access to broad ADMIN routes.
3. Add trusted bank/PhonePe verification integration and role-scoped server attestations; do not trust browser assertions.
4. Persist approvals, atomic adjustments, audit and receipt references with serializable, idempotent transactions; block until trusted checks complete.
5. Test unauthenticated access, role forgery, ADMIN-to-OWNER escalation, missing staff, self-approval, revoked/expired approval, concurrency, duplicate requests, rollback, stale JWT, and sensitive data leakage in isolated PostgreSQL and staging.
6. Obtain independent financial/security review and explicit staging sign-off. Keep PR #306 Draft; no production merge, migration, correction write or corrected receipt issuance before gates pass.
