-- Viajes propios y de agencias (punto 17, ola 1, nov 2026). Tablas nuevas; no toca datos existentes.
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "contactName" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "Agency_name_key" ON "Agency"("name");

CREATE TABLE "Trip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "agencyId" TEXT,
    "kind" TEXT NOT NULL,
    "purchaseMode" TEXT NOT NULL DEFAULT 'quote',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "titleEs" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL DEFAULT '',
    "summaryEs" TEXT NOT NULL DEFAULT '',
    "summaryEn" TEXT NOT NULL DEFAULT '',
    "descriptionEs" TEXT NOT NULL DEFAULT '',
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "countries" JSONB NOT NULL,
    "cities" JSONB NOT NULL,
    "durationDays" INTEGER,
    "priceFrom" REAL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "priceNote" TEXT NOT NULL DEFAULT '',
    "dates" JSONB NOT NULL,
    "meetingPoints" JSONB NOT NULL,
    "hotelPickup" BOOLEAN NOT NULL DEFAULT false,
    "itinerary" JSONB NOT NULL,
    "includes" JSONB NOT NULL,
    "excludes" JSONB NOT NULL,
    "visaInfo" TEXT NOT NULL DEFAULT '',
    "images" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Trip_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Trip_slug_key" ON "Trip"("slug");
CREATE UNIQUE INDEX "Trip_code_key" ON "Trip"("code");
CREATE INDEX "Trip_status_kind_idx" ON "Trip"("status", "kind");
CREATE INDEX "Trip_agencyId_idx" ON "Trip"("agencyId");
