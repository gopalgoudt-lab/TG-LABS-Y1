-- Isolated PostgreSQL integration tests only.
-- Prisma db push has already created the table.

ALTER TABLE "ManualUpiRoleAssignment"
ADD CONSTRAINT "ManualUpiRoleAssignment_role_check"
CHECK ("role" IN ('OWNER', 'ADMIN', 'ACCOUNTS_STAFF', 'TECHNICIAN'));

ALTER TABLE "ManualUpiRoleAssignment"
ADD CONSTRAINT "ManualUpiRoleAssignment_active_not_revoked_check"
CHECK (NOT ("active" = true AND "revokedAt" IS NOT NULL));

-- Isolated PostgreSQL integration tests only.
-- Require three independent approval actors.
ALTER TABLE "ManualUpiCorrectionApproval"
DROP CONSTRAINT IF EXISTS "ManualUpiCorrectionApproval_independent_actors_check";
ALTER TABLE "ManualUpiCorrectionApproval"
ADD CONSTRAINT "ManualUpiCorrectionApproval_independent_actors_check"
CHECK (
  "requestedByUid" <> "paymentVerifiedByUid"
  AND "requestedByUid" <> "approvedByUid"
  AND "paymentVerifiedByUid" <> "approvedByUid"
  AND "discountAmount" >= 0
  AND "verifiedPaidAmount" > 0
);
