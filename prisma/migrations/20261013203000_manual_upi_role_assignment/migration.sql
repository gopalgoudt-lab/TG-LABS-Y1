
-- Development only.
-- Do not apply to Production before security and financial review.
-- Role assignments must be provisioned by a separately authorized process.

CREATE TABLE "ManualUpiRoleAssignment" (
    "id" TEXT NOT NULL,
    "firebaseUid" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "assignedByUid" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ManualUpiRoleAssignment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ManualUpiRoleAssignment_role_check"
        CHECK ("role" IN ('OWNER', 'ADMIN', 'ACCOUNTS_STAFF', 'TECHNICIAN')),
    CONSTRAINT "ManualUpiRoleAssignment_active_not_revoked_check"
        CHECK (NOT ("active" = true AND "revokedAt" IS NOT NULL))
);

CREATE UNIQUE INDEX "ManualUpiRoleAssignment_firebaseUid_key"
    ON "ManualUpiRoleAssignment"("firebaseUid");

CREATE INDEX "ManualUpiRoleAssignment_role_active_idx"
    ON "ManualUpiRoleAssignment"("role", "active");
