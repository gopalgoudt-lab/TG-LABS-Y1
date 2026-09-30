-- Phase 6A: structured diagnostic observations for de-identified AI input.
CREATE TABLE "ReportObservation" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "parameterName" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "unit" TEXT,
  "referenceRange" TEXT,
  "flag" TEXT,
  "source" TEXT NOT NULL DEFAULT 'ADMIN_VERIFIED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReportObservation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReportObservation_bookingId_idx" ON "ReportObservation"("bookingId");
CREATE INDEX "ReportObservation_bookingId_parameterName_idx" ON "ReportObservation"("bookingId", "parameterName");
ALTER TABLE "ReportObservation" ADD CONSTRAINT "ReportObservation_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
