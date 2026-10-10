-- Development-only: durable independent verification and approval metadata.
-- Do not apply to Production until approval authentication and migration are reviewed.
CREATE TABLE "ManualUpiCorrectionApproval" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "originalReceiptHash" TEXT NOT NULL,
  "phonePeReferenceHash" TEXT NOT NULL,
  "bankCreditEvidenceRef" TEXT NOT NULL,
  "paymentVerifiedByUid" TEXT NOT NULL,
  "requestedByUid" TEXT NOT NULL,
  "approvedByUid" TEXT NOT NULL,
  "discountAmount" INTEGER NOT NULL,
  "verifiedPaidAmount" INTEGER NOT NULL,
  "approvalReason" TEXT NOT NULL,
  "paymentVerifiedAt" TIMESTAMP(3) NOT NULL,
  "approvedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ManualUpiCorrectionApproval_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ManualUpiCorrectionApproval_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ManualUpiCorrectionApproval_independent_actors_check"
    CHECK ("requestedByUid" <> "approvedByUid"
      AND "paymentVerifiedByUid" <> "approvedByUid"
      AND "discountAmount" >= 0 AND "verifiedPaidAmount" > 0)
);
CREATE UNIQUE INDEX "ManualUpiCorrectionApproval_bookingId_key"
  ON "ManualUpiCorrectionApproval"("bookingId");
CREATE INDEX "ManualUpiCorrectionApproval_approvedAt_idx"
  ON "ManualUpiCorrectionApproval"("approvedAt");
