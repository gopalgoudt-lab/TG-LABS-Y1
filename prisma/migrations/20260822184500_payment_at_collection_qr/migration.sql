DO $$ BEGIN
  CREATE TYPE "PaymentTiming" AS ENUM ('ONLINE_NOW', 'SAMPLE_COLLECTION');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "paymentTiming" "PaymentTiming" NOT NULL DEFAULT 'ONLINE_NOW';

CREATE INDEX IF NOT EXISTS "Booking_paymentTiming_idx" ON "Booking"("paymentTiming");

CREATE TABLE IF NOT EXISTS "AppSetting" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);
