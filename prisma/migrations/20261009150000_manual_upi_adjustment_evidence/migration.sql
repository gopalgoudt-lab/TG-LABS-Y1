-- Development-only migration. Do not apply to Production until financial review.
-- Append-only adjustment evidence; no existing booking/payment/receipt rows are changed.
CREATE TABLE "BookingFinancialAdjustment" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "correctionKey" TEXT NOT NULL,
  "originalGrossAmount" INTEGER NOT NULL,
  "discountAmount" INTEGER NOT NULL,
  "correctedNetAmount" INTEGER NOT NULL,
  "verifiedPaidAmount" INTEGER NOT NULL,
  "paymentMethod" TEXT NOT NULL,
  "collectionAccountType" TEXT NOT NULL,
  "paymentReferenceHash" TEXT NOT NULL,
  "evidenceReference" TEXT NOT NULL,
  "originalReceiptHash" TEXT,
  "correctedReceiptId" TEXT,
  "reason" TEXT NOT NULL,
  "approvedBy" TEXT NOT NULL,
  "approvedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BookingFinancialAdjustment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BookingFinancialAdjustment_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "BookingFinancialAdjustment_nonnegative_amounts_check"
    CHECK ("originalGrossAmount" > 0 AND "discountAmount" >= 0
      AND "correctedNetAmount" > 0 AND "verifiedPaidAmount" >= 0
      AND "originalGrossAmount" - "discountAmount" = "correctedNetAmount"
      AND "verifiedPaidAmount" = "correctedNetAmount")
);
CREATE UNIQUE INDEX "BookingFinancialAdjustment_correctionKey_key"
  ON "BookingFinancialAdjustment"("correctionKey");
CREATE UNIQUE INDEX "BookingFinancialAdjustment_correctedReceiptId_key"
  ON "BookingFinancialAdjustment"("correctedReceiptId");
CREATE INDEX "BookingFinancialAdjustment_bookingId_createdAt_idx"
  ON "BookingFinancialAdjustment"("bookingId", "createdAt");
CREATE INDEX "BookingFinancialAdjustment_approvedAt_idx"
  ON "BookingFinancialAdjustment"("approvedAt");
