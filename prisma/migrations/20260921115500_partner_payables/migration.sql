CREATE TYPE "PartnerPayableStatus" AS ENUM ('PENDING','INVOICED','APPROVED','PARTIALLY_PAID','PAID','DISPUTED','VOID');
CREATE TABLE "PartnerPayable" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "partnerName" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "status" "PartnerPayableStatus" NOT NULL DEFAULT 'PENDING',
  "sourceReference" TEXT,
  "invoiceNumber" TEXT,
  "invoiceDate" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "paidAmount" INTEGER NOT NULL DEFAULT 0,
  "settledAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PartnerPayable_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PartnerPayable_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PartnerPayable_bookingId_partnerId_key" ON "PartnerPayable"("bookingId","partnerId");
CREATE INDEX "PartnerPayable_partnerId_status_idx" ON "PartnerPayable"("partnerId","status");
CREATE INDEX "PartnerPayable_bookingId_idx" ON "PartnerPayable"("bookingId");
CREATE INDEX "PartnerPayable_invoiceNumber_idx" ON "PartnerPayable"("invoiceNumber");
CREATE INDEX "PartnerPayable_settledAt_idx" ON "PartnerPayable"("settledAt");
ALTER TABLE "PartnerPayable" ADD CONSTRAINT "PartnerPayable_amount_nonnegative" CHECK ("amount" >= 0);
ALTER TABLE "PartnerPayable" ADD CONSTRAINT "PartnerPayable_paidAmount_valid" CHECK ("paidAmount" >= 0 AND "paidAmount" <= "amount");
