CREATE TABLE "ThyrocareCredential" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "passwordSalt" TEXT NOT NULL,
    "iterations" INTEGER NOT NULL DEFAULT 210000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ThyrocareCredential_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ThyrocareCredential_phone_role_key" ON "ThyrocareCredential"("phone", "role");
CREATE INDEX "ThyrocareCredential_phone_idx" ON "ThyrocareCredential"("phone");
CREATE INDEX "ThyrocareCredential_role_idx" ON "ThyrocareCredential"("role");
