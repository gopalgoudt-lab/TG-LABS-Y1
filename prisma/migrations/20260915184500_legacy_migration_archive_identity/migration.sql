-- Legacy migration archive identity foundation.
-- Additive only: does not alter Patient phone uniqueness, Booking, catalog, partner,
-- serviceability, payment, authentication, or operational workflow tables.

CREATE TABLE "LegacyPatientArchive" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "legacyPatientId" INTEGER NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "age" INTEGER,
    "gender" TEXT,
    "pincode" TEXT,
    "address" TEXT,
    "sourceCreatedAt" TIMESTAMP(3),
    "sourceUpdatedAt" TIMESTAMP(3),
    "identityStatus" TEXT NOT NULL DEFAULT 'QUARANTINED',
    "identityReason" TEXT,
    "linkedPatientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegacyPatientArchive_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LegacyBookingArchive" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "legacyAppointmentId" INTEGER NOT NULL,
    "legacyPatientId" INTEGER,
    "legacyPackageIds" TEXT,
    "legacyTestIds" TEXT,
    "legacyPartnerPriceIds" TEXT,
    "bookingDateRaw" TEXT,
    "printedReport" BOOLEAN NOT NULL DEFAULT false,
    "legacyStatusId" INTEGER,
    "legacyComment" TEXT,
    "fromPage" TEXT,
    "sourceCreatedAt" TIMESTAMP(3),
    "sourceUpdatedAt" TIMESTAMP(3),
    "archiveStatus" TEXT NOT NULL DEFAULT 'QUARANTINED',
    "archiveReason" TEXT,
    "linkedBookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegacyBookingArchive_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LegacyPatientArchive_source_legacyPatientId_key" ON "LegacyPatientArchive"("source", "legacyPatientId");
CREATE INDEX "LegacyPatientArchive_phone_idx" ON "LegacyPatientArchive"("phone");
CREATE INDEX "LegacyPatientArchive_identityStatus_idx" ON "LegacyPatientArchive"("identityStatus");
CREATE INDEX "LegacyPatientArchive_linkedPatientId_idx" ON "LegacyPatientArchive"("linkedPatientId");

CREATE UNIQUE INDEX "LegacyBookingArchive_source_legacyAppointmentId_key" ON "LegacyBookingArchive"("source", "legacyAppointmentId");
CREATE INDEX "LegacyBookingArchive_legacyPatientId_idx" ON "LegacyBookingArchive"("legacyPatientId");
CREATE INDEX "LegacyBookingArchive_archiveStatus_idx" ON "LegacyBookingArchive"("archiveStatus");
CREATE INDEX "LegacyBookingArchive_linkedBookingId_idx" ON "LegacyBookingArchive"("linkedBookingId");
