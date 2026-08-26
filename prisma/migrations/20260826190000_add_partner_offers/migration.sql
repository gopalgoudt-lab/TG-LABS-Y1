CREATE TYPE "PartnerOfferAvailability" AS ENUM ('AVAILABLE', 'CHECK_AVAILABILITY', 'UNAVAILABLE');

CREATE TABLE "DiagnosticPartner" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DiagnosticPartner_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TestPartnerOffer" (
  "id" TEXT NOT NULL,
  "testId" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "price" INTEGER NOT NULL,
  "availability" "PartnerOfferAvailability" NOT NULL DEFAULT 'CHECK_AVAILABILITY',
  "tat" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TestPartnerOffer_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "BookingItem"
  ADD COLUMN "offerId" TEXT,
  ADD COLUMN "partnerId" TEXT,
  ADD COLUMN "partnerName" TEXT,
  ADD COLUMN "partnerTat" TEXT,
  ADD COLUMN "partnerAvailability" "PartnerOfferAvailability";

CREATE UNIQUE INDEX "DiagnosticPartner_slug_key" ON "DiagnosticPartner"("slug");
CREATE UNIQUE INDEX "DiagnosticPartner_name_key" ON "DiagnosticPartner"("name");
CREATE INDEX "DiagnosticPartner_active_idx" ON "DiagnosticPartner"("active");
CREATE UNIQUE INDEX "TestPartnerOffer_testId_partnerId_key" ON "TestPartnerOffer"("testId", "partnerId");
CREATE INDEX "TestPartnerOffer_partnerId_availability_active_idx" ON "TestPartnerOffer"("partnerId", "availability", "active");
CREATE INDEX "TestPartnerOffer_testId_availability_active_idx" ON "TestPartnerOffer"("testId", "availability", "active");
CREATE INDEX "BookingItem_offerId_idx" ON "BookingItem"("offerId");
CREATE INDEX "BookingItem_partnerId_idx" ON "BookingItem"("partnerId");

ALTER TABLE "TestPartnerOffer" ADD CONSTRAINT "TestPartnerOffer_testId_fkey"
  FOREIGN KEY ("testId") REFERENCES "DiagnosticTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TestPartnerOffer" ADD CONSTRAINT "TestPartnerOffer_partnerId_fkey"
  FOREIGN KEY ("partnerId") REFERENCES "DiagnosticPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookingItem" ADD CONSTRAINT "BookingItem_offerId_fkey"
  FOREIGN KEY ("offerId") REFERENCES "TestPartnerOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "DiagnosticPartner" ("id", "slug", "name", "active", "createdAt", "updatedAt")
VALUES ('partner_tg_labs', 'tg-labs-partner', 'TG Labs partner', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "TestPartnerOffer" ("id", "testId", "partnerId", "price", "availability", "tat", "active", "createdAt", "updatedAt")
SELECT 'offer_tg_' || md5("id"), "id", 'partner_tg_labs', "price", 'AVAILABLE', "tat", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "DiagnosticTest";
