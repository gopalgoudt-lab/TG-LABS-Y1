ALTER TABLE "Booking"
ADD COLUMN "workflowStatus" TEXT NOT NULL DEFAULT 'BOOKING_CREATED',
ADD COLUMN "bookingConfirmedAt" TIMESTAMP(3),
ADD COLUMN "technicianAssignedAt" TIMESTAMP(3),
ADD COLUMN "sampleCollectedAt" TIMESTAMP(3),
ADD COLUMN "sampleReceivedAt" TIMESTAMP(3),
ADD COLUMN "processingStartedAt" TIMESTAMP(3),
ADD COLUMN "reportReadyAt" TIMESTAMP(3),
ADD COLUMN "reportDeliveredAt" TIMESTAMP(3);

CREATE INDEX "Booking_workflowStatus_idx" ON "Booking"("workflowStatus");
