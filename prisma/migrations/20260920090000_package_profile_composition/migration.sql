CREATE TABLE "PackageProfileItem" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,

    CONSTRAINT "PackageProfileItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PackageProfileItem_packageId_profileId_key" ON "PackageProfileItem"("packageId", "profileId");
CREATE INDEX "PackageProfileItem_profileId_idx" ON "PackageProfileItem"("profileId");

ALTER TABLE "PackageProfileItem" ADD CONSTRAINT "PackageProfileItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "DiagnosticPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PackageProfileItem" ADD CONSTRAINT "PackageProfileItem_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "DiagnosticPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
