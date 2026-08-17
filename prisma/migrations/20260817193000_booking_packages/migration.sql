CREATE TABLE "BookingPackage" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "packageId" TEXT NOT NULL,
  "price" INTEGER NOT NULL,
  CONSTRAINT "BookingPackage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BookingPackage_bookingId_packageId_key" ON "BookingPackage"("bookingId", "packageId");
CREATE INDEX "BookingPackage_packageId_idx" ON "BookingPackage"("packageId");

ALTER TABLE "BookingPackage" ADD CONSTRAINT "BookingPackage_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookingPackage" ADD CONSTRAINT "BookingPackage_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "DiagnosticPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
