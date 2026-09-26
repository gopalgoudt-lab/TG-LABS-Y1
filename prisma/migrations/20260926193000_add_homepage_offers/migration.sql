CREATE TABLE "HomepageOffer" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "subtitle" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "imageAlt" TEXT NOT NULL,
  "searchQuery" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HomepageOffer_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "HomepageOffer_active_sortOrder_idx" ON "HomepageOffer"("active", "sortOrder");
