-- Isolated PostgreSQL integration tests only.
-- Prisma db push has already created the table.

ALTER TABLE "ManualUpiRoleAssignment"
ADD CONSTRAINT "ManualUpiRoleAssignment_role_check"
CHECK ("role" IN ('OWNER', 'ADMIN', 'ACCOUNTS_STAFF', 'TECHNICIAN'));

ALTER TABLE "ManualUpiRoleAssignment"
ADD CONSTRAINT "ManualUpiRoleAssignment_active_not_revoked_check"
CHECK (NOT ("active" = true AND "revokedAt" IS NOT NULL));
