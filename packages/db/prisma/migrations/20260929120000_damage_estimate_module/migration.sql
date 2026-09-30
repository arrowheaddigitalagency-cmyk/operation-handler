-- Additive-only migration for Damage Estimate module (SQLite).
-- NO ALTER/DROP on existing tables. Safe to review before apply.
-- Prisma enums map to TEXT on SQLite.

-- CreateTable
CREATE TABLE "DamageEstimateSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT,
    "publicToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "vin" TEXT,
    "vehicleJson" JSON,
    "paintJson" JSON,
    "photosJson" JSON,
    "pricingMode" TEXT NOT NULL DEFAULT 'MIXED',
    "samplePricing" BOOLEAN NOT NULL DEFAULT true,
    "rangeLow" REAL,
    "rangeHigh" REAL,
    "confidence" REAL,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "appointmentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DamageEstimateSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DamageEstimateLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "sourceDetectionId" TEXT,
    "partName" TEXT NOT NULL,
    "partNumber" TEXT,
    "description" TEXT,
    "side" TEXT,
    "damageType" TEXT,
    "severity" TEXT,
    "operation" TEXT NOT NULL,
    "confidence" REAL,
    "bboxJson" JSON,
    "imageIndex" INTEGER,
    "oemPrice" REAL,
    "aftermarketPrice" REAL,
    "recycledPrice" REAL,
    "capaCertified" BOOLEAN NOT NULL DEFAULT false,
    "bodyHours" REAL,
    "structuralHours" REAL,
    "mechanicalHours" REAL,
    "refinishHours" REAL,
    "blendHours" REAL,
    "subletAmount" REAL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "editedByStaff" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DamageEstimateLine_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DamageEstimateSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DamageEstimateVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT,
    "payloadJson" JSON NOT NULL,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DamageEstimateVersion_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DamageEstimateSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DamageEstimateRateSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "bodyRatePerHour" REAL NOT NULL DEFAULT 75,
    "paintRatePerHour" REAL NOT NULL DEFAULT 85,
    "mechanicalRatePerHour" REAL NOT NULL DEFAULT 95,
    "frameRatePerHour" REAL NOT NULL DEFAULT 110,
    "paintMaterialPerRefinishHour" REAL NOT NULL DEFAULT 45,
    "triCoatMultiplier" REAL NOT NULL DEFAULT 1.35,
    "blendMultiplier" REAL NOT NULL DEFAULT 1,
    "taxRate" REAL NOT NULL DEFAULT 0.07,
    "markupPercent" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DamageEstimateRateSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DamageEstimateBooking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "preferredAt" DATETIME,
    "slotLabel" TEXT,
    "notes" TEXT,
    "appointmentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DamageEstimateBooking_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DamageEstimateSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DamageEstimateBenchmark" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT,
    "organizationId" TEXT,
    "label" TEXT,
    "sourceFormat" TEXT,
    "rawExport" TEXT NOT NULL,
    "parsedJson" JSON,
    "comparisonJson" JSON,
    "accuracyScore" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DamageEstimateBenchmark_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DamageEstimateSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DamageEstimateSession_publicToken_key" ON "DamageEstimateSession"("publicToken");
CREATE INDEX "DamageEstimateSession_organizationId_status_idx" ON "DamageEstimateSession"("organizationId", "status");
CREATE INDEX "DamageEstimateSession_createdAt_idx" ON "DamageEstimateSession"("createdAt");
CREATE INDEX "DamageEstimateSession_vin_idx" ON "DamageEstimateSession"("vin");
CREATE INDEX "DamageEstimateLine_sessionId_idx" ON "DamageEstimateLine"("sessionId");
CREATE INDEX "DamageEstimateVersion_sessionId_kind_idx" ON "DamageEstimateVersion"("sessionId", "kind");
CREATE INDEX "DamageEstimateVersion_createdAt_idx" ON "DamageEstimateVersion"("createdAt");
CREATE UNIQUE INDEX "DamageEstimateRateSettings_organizationId_key" ON "DamageEstimateRateSettings"("organizationId");
CREATE INDEX "DamageEstimateBooking_sessionId_idx" ON "DamageEstimateBooking"("sessionId");
CREATE INDEX "DamageEstimateBenchmark_sessionId_idx" ON "DamageEstimateBenchmark"("sessionId");
CREATE INDEX "DamageEstimateBenchmark_createdAt_idx" ON "DamageEstimateBenchmark"("createdAt");
