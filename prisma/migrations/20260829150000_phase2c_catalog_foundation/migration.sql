CREATE TYPE "DiagnosticPackageType" AS ENUM ('PACKAGE', 'PROFILE');

ALTER TABLE "DiagnosticTest"
  ADD COLUMN "catalogCode" TEXT,
  ADD COLUMN "aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "preparation" TEXT,
  ADD COLUMN "fastingHours" INTEGER,
  ADD COLUMN "parameterCount" INTEGER,
  ADD COLUMN "organTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "conditionTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "genderRelevance" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "ageRelevance" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "seoTitle" TEXT,
  ADD COLUMN "seoDescription" TEXT;

ALTER TABLE "DiagnosticPackage"
  ADD COLUMN "catalogCode" TEXT,
  ADD COLUMN "packageType" "DiagnosticPackageType" NOT NULL DEFAULT 'PACKAGE',
  ADD COLUMN "aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "preparation" TEXT,
  ADD COLUMN "fastingHours" INTEGER,
  ADD COLUMN "parameterCount" INTEGER,
  ADD COLUMN "seoTitle" TEXT,
  ADD COLUMN "seoDescription" TEXT;

ALTER TABLE "DiagnosticPartner"
  ADD COLUMN "displayEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "bookingEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "operationalEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "accreditationDisplay" TEXT,
  ADD COLUMN "accreditationReference" TEXT,
  ADD COLUMN "accreditationVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "orderHandoffMethod" TEXT,
  ADD COLUMN "reportIntakeMethod" TEXT;

ALTER TABLE "TestPartnerOffer"
  ADD COLUMN "mrp" INTEGER,
  ADD COLUMN "sourceReference" TEXT,
  ADD COLUMN "lastVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "effectiveFrom" TIMESTAMP(3),
  ADD COLUMN "effectiveTo" TIMESTAMP(3);

ALTER TABLE "BookingPackage"
  ADD COLUMN "offerId" TEXT,
  ADD COLUMN "partnerId" TEXT,
  ADD COLUMN "partnerName" TEXT,
  ADD COLUMN "partnerTat" TEXT,
  ADD COLUMN "partnerAvailability" "PartnerOfferAvailability";

CREATE TABLE "CatalogCategory" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CatalogCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DiagnosticTestCategory" (
  "testId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  CONSTRAINT "DiagnosticTestCategory_pkey" PRIMARY KEY ("testId", "categoryId")
);

CREATE TABLE "DiagnosticPackageCategory" (
  "packageId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  CONSTRAINT "DiagnosticPackageCategory_pkey" PRIMARY KEY ("packageId", "categoryId")
);

CREATE TABLE "PackagePartnerOffer" (
  "id" TEXT NOT NULL,
  "packageId" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "price" INTEGER NOT NULL,
  "mrp" INTEGER,
  "availability" "PartnerOfferAvailability" NOT NULL DEFAULT 'CHECK_AVAILABILITY',
  "tat" TEXT,
  "sourceReference" TEXT,
  "lastVerifiedAt" TIMESTAMP(3),
  "effectiveFrom" TIMESTAMP(3),
  "effectiveTo" TIMESTAMP(3),
  "active" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PackagePartnerOffer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartnerServiceability" (
  "id" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "pincode" TEXT NOT NULL,
  "homeCollectionEnabled" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PartnerServiceability_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DiagnosticTest_catalogCode_key" ON "DiagnosticTest"("catalogCode");
CREATE UNIQUE INDEX "DiagnosticPackage_catalogCode_key" ON "DiagnosticPackage"("catalogCode");
CREATE UNIQUE INDEX "CatalogCategory_slug_key" ON "CatalogCategory"("slug");
CREATE INDEX "CatalogCategory_active_sortOrder_idx" ON "CatalogCategory"("active", "sortOrder");
CREATE INDEX "DiagnosticTestCategory_categoryId_idx" ON "DiagnosticTestCategory"("categoryId");
CREATE INDEX "DiagnosticPackageCategory_categoryId_idx" ON "DiagnosticPackageCategory"("categoryId");
CREATE UNIQUE INDEX "PackagePartnerOffer_packageId_partnerId_key" ON "PackagePartnerOffer"("packageId", "partnerId");
CREATE INDEX "PackagePartnerOffer_partnerId_availability_active_idx" ON "PackagePartnerOffer"("partnerId", "availability", "active");
CREATE INDEX "PackagePartnerOffer_packageId_availability_active_idx" ON "PackagePartnerOffer"("packageId", "availability", "active");
CREATE INDEX "PackagePartnerOffer_eligibility_idx" ON "PackagePartnerOffer"("active", "lastVerifiedAt", "effectiveFrom", "effectiveTo");
CREATE UNIQUE INDEX "PartnerServiceability_partnerId_pincode_key" ON "PartnerServiceability"("partnerId", "pincode");
CREATE INDEX "PartnerServiceability_lookup_idx" ON "PartnerServiceability"("pincode", "active", "homeCollectionEnabled");
CREATE INDEX "DiagnosticPartner_operational_idx" ON "DiagnosticPartner"("active", "bookingEnabled", "operationalEnabled");
CREATE INDEX "TestPartnerOffer_eligibility_idx" ON "TestPartnerOffer"("active", "lastVerifiedAt", "effectiveFrom", "effectiveTo");
CREATE INDEX "BookingPackage_offerId_idx" ON "BookingPackage"("offerId");
CREATE INDEX "BookingPackage_partnerId_idx" ON "BookingPackage"("partnerId");

ALTER TABLE "DiagnosticTestCategory" ADD CONSTRAINT "DiagnosticTestCategory_testId_fkey"
  FOREIGN KEY ("testId") REFERENCES "DiagnosticTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiagnosticTestCategory" ADD CONSTRAINT "DiagnosticTestCategory_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "CatalogCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticPackageCategory" ADD CONSTRAINT "DiagnosticPackageCategory_packageId_fkey"
  FOREIGN KEY ("packageId") REFERENCES "DiagnosticPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiagnosticPackageCategory" ADD CONSTRAINT "DiagnosticPackageCategory_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "CatalogCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PackagePartnerOffer" ADD CONSTRAINT "PackagePartnerOffer_packageId_fkey"
  FOREIGN KEY ("packageId") REFERENCES "DiagnosticPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PackagePartnerOffer" ADD CONSTRAINT "PackagePartnerOffer_partnerId_fkey"
  FOREIGN KEY ("partnerId") REFERENCES "DiagnosticPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartnerServiceability" ADD CONSTRAINT "PartnerServiceability_partnerId_fkey"
  FOREIGN KEY ("partnerId") REFERENCES "DiagnosticPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookingPackage" ADD CONSTRAINT "BookingPackage_offerId_fkey"
  FOREIGN KEY ("offerId") REFERENCES "PackagePartnerOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
