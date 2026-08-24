CREATE TABLE "TechnicianLocation" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "technicianId" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "accuracy" DOUBLE PRECISION,
  "speed" DOUBLE PRECISION,
  "heading" DOUBLE PRECISION,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TechnicianLocation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TechnicianLocation_bookingId_recordedAt_idx" ON "TechnicianLocation"("bookingId", "recordedAt");
CREATE INDEX "TechnicianLocation_technicianId_recordedAt_idx" ON "TechnicianLocation"("technicianId", "recordedAt");

ALTER TABLE "TechnicianLocation"
  ADD CONSTRAINT "TechnicianLocation_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TechnicianLocation"
  ADD CONSTRAINT "TechnicianLocation_technicianId_fkey"
  FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE CASCADE ON UPDATE CASCADE;
