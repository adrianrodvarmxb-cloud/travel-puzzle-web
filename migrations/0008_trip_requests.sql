-- Solicitudes de cotización de viajes propios y de agencias (punto 17, ola 2). Tabla nueva; no toca datos existentes.
CREATE TABLE "TripRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ref" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "tripCode" TEXT NOT NULL,
    "tripTitle" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "date" TEXT NOT NULL,
    "endDate" TEXT,
    "time" TEXT NOT NULL DEFAULT '',
    "serviceType" TEXT,
    "optionId" TEXT,
    "optionName" TEXT,
    "adults" INTEGER NOT NULL,
    "children" INTEGER NOT NULL DEFAULT 0,
    "infants" INTEGER NOT NULL DEFAULT 0,
    "childAges" JSONB NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "hotel" TEXT NOT NULL DEFAULT '',
    "comments" TEXT NOT NULL DEFAULT '',
    "language" TEXT NOT NULL DEFAULT 'es',
    "estimate" REAL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "consent" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "TripRequest_ref_key" ON "TripRequest"("ref");
CREATE INDEX "TripRequest_status_createdAt_idx" ON "TripRequest"("status", "createdAt");
CREATE INDEX "TripRequest_tripId_idx" ON "TripRequest"("tripId");
