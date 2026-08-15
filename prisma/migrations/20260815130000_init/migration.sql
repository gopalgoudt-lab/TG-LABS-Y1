CREATE TYPE "BookingMode" AS ENUM ('HOME', 'CENTRE');
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

CREATE TABLE "Patient" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DiagnosticTest" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DiagnosticTest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Booking" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "mode" "BookingMode" NOT NULL,
  "address" TEXT,
  "collectionDate" TIMESTAMP(3) NOT NULL,
  "slot" TEXT NOT NULL,
  "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
  "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "totalAmount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookingItem" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "testId" TEXT NOT NULL,
  "price" INTEGER NOT NULL,
  CONSTRAINT "BookingItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Patient_phone_key" ON "Patient"("phone");
CREATE UNIQUE INDEX "DiagnosticTest_slug_key" ON "DiagnosticTest"("slug");
CREATE UNIQUE INDEX "BookingItem_bookingId_testId_key" ON "BookingItem"("bookingId", "testId");
CREATE INDEX "Booking_patientId_idx" ON "Booking"("patientId");
CREATE INDEX "Booking_collectionDate_idx" ON "Booking"("collectionDate");
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookingItem" ADD CONSTRAINT "BookingItem_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookingItem" ADD CONSTRAINT "BookingItem_testId_fkey" FOREIGN KEY ("testId") REFERENCES "DiagnosticTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
