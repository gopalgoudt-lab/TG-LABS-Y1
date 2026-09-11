-- Partner branding metadata for admin-managed laboratory logos.
-- Additive only: no existing partner, offer, booking, payment or serviceability data is changed.

CREATE TABLE "PartnerBranding" (
  "partnerId" TEXT NOT NULL,
  "logoData" TEXT,
  "logoMime" TEXT,
  "logoUpdatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PartnerBranding_pkey" PRIMARY KEY ("partnerId")
);

ALTER TABLE "PartnerBranding"
  ADD CONSTRAINT "PartnerBranding_partnerId_fkey"
  FOREIGN KEY ("partnerId") REFERENCES "DiagnosticPartner"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
