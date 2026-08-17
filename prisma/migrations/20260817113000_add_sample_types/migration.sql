ALTER TABLE "DiagnosticTest"
ADD COLUMN "sampleTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "sampleTypeOther" TEXT;

ALTER TABLE "DiagnosticPackage"
ADD COLUMN "sampleTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "sampleTypeOther" TEXT;
