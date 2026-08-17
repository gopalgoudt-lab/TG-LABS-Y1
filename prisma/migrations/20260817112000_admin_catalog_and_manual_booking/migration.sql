-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('WEBSITE', 'ADMIN');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('ONLINE', 'CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'OTHER');

-- AlterTable
ALTER TABLE "DiagnosticTest"
ADD COLUMN "mrp" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "imageData" TEXT,
ADD COLUMN "diagnosticPartner" TEXT,
ADD COLUMN "tat" TEXT,
ADD COLUMN "fastingNeeded" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Booking"
ADD COLUMN "source" "BookingSource" NOT NULL DEFAULT 'WEBSITE',
ADD COLUMN "paymentMode" "PaymentMode",
ADD COLUMN "adminNotes" TEXT,
ADD COLUMN "createdByAdmin" TEXT;

-- CreateTable
CREATE TABLE "DiagnosticPackage" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "mrp" INTEGER NOT NULL DEFAULT 0,
  "price" INTEGER NOT NULL,
  "imageData" TEXT,
  "diagnosticPartner" TEXT,
  "tat" TEXT,
  "fastingNeeded" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DiagnosticPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageItem" (
  "id" TEXT NOT NULL,
  "packageId" TEXT NOT NULL,
  "testId" TEXT NOT NULL,
  CONSTRAINT "PackageItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosticPackage_slug_key" ON "DiagnosticPackage"("slug");
CREATE UNIQUE INDEX "PackageItem_packageId_testId_key" ON "PackageItem"("packageId", "testId");
CREATE INDEX "PackageItem_testId_idx" ON "PackageItem"("testId");
CREATE INDEX "Booking_source_idx" ON "Booking"("source");

-- AddForeignKey
ALTER TABLE "PackageItem" ADD CONSTRAINT "PackageItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "DiagnosticPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PackageItem" ADD CONSTRAINT "PackageItem_testId_fkey" FOREIGN KEY ("testId") REFERENCES "DiagnosticTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
