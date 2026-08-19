CREATE TABLE "Technician" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "employeeCode" TEXT,
  "pincodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "active" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Technician_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Technician_phone_key" ON "Technician"("phone");
CREATE UNIQUE INDEX "Technician_employeeCode_key" ON "Technician"("employeeCode");
CREATE INDEX "Technician_active_idx" ON "Technician"("active");

ALTER TABLE "Booking" ADD COLUMN "technicianId" TEXT;
CREATE INDEX "Booking_technicianId_idx" ON "Booking"("technicianId");
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;
