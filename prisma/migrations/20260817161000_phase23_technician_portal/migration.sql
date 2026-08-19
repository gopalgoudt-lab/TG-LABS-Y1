ALTER TABLE "Technician" ADD COLUMN "loginPinHash" TEXT;

CREATE TABLE "TechnicianSession" (
    "id" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TechnicianSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TechnicianSession_tokenHash_key" ON "TechnicianSession"("tokenHash");
CREATE INDEX "TechnicianSession_technicianId_idx" ON "TechnicianSession"("technicianId");
CREATE INDEX "TechnicianSession_expiresAt_idx" ON "TechnicianSession"("expiresAt");
ALTER TABLE "TechnicianSession" ADD CONSTRAINT "TechnicianSession_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Booking" ADD COLUMN "technicianAcceptedAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "technicianOnTheWayAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "technicianReachedAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "technicianNotes" TEXT;
