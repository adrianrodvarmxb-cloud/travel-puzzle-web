-- Reseñas de clientes de Travel Puzzle (punto 11, nov 2026). Tabla nueva; no toca datos existentes.
-- status: pending (por moderar) · published (en la ficha del tour) · hidden.
CREATE TABLE "CustomerReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "refNumber" TEXT NOT NULL,
    "tourExternalId" INTEGER,
    "rate" INTEGER NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "displayName" TEXT NOT NULL,
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "language" TEXT NOT NULL DEFAULT 'es',
    "tourDate" TEXT,
    "moderatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "CustomerReview_refNumber_key" ON "CustomerReview"("refNumber");
CREATE INDEX "CustomerReview_tourExternalId_status_idx" ON "CustomerReview"("tourExternalId", "status");
CREATE INDEX "CustomerReview_status_createdAt_idx" ON "CustomerReview"("status", "createdAt");
