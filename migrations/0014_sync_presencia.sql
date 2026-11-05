-- Ola 1 «La Primera Pieza» (REQ-071…074, REQ-078): blindaje del sync diario de FREETOUR.
-- Solo AGREGA columnas, tablas e índices; no borra ni modifica datos existentes.
-- El código que las usa va tras SYNC_GUARD_ENABLED="false": con la bandera apagada nada las lee ni escribe.
--
-- Plan de regreso (solo con OK del PO; SQLite >= 3.35 / D1 soporta DROP COLUMN):
--   DROP TABLE IF EXISTS "TourStage";
--   DROP TABLE IF EXISTS "SyncRun";
--   DROP INDEX IF EXISTS "Tour_syncStatus_idx";
--   ALTER TABLE "Tour" DROP COLUMN "contentHash";
--   ALTER TABLE "Tour" DROP COLUMN "syncStatus";
--   ALTER TABLE "Tour" DROP COLUMN "missingRuns";
-- Con la bandera apagada no hace falta revertir: las columnas nuevas quedan con su valor por omisión y nadie las lee.

-- REQ-073 / REQ-074: hash del contenido (sin calificación) y presencia del tour en el feed.
ALTER TABLE "Tour" ADD COLUMN "contentHash" TEXT;
ALTER TABLE "Tour" ADD COLUMN "syncStatus" TEXT NOT NULL DEFAULT 'active'; -- active | missing | removed
ALTER TABLE "Tour" ADD COLUMN "missingRuns" INTEGER NOT NULL DEFAULT 0;    -- corridas exitosas seguidas sin el tour
CREATE INDEX IF NOT EXISTS "Tour_syncStatus_idx" ON "Tour"("syncStatus");

-- REQ-072 / REQ-078: una fila por corrida (log, avance y motivo de aborto).
CREATE TABLE IF NOT EXISTS "SyncRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,                        -- staging | publishing | succeeded | aborted
    "startedAt" DATETIME NOT NULL,
    "finishedAt" DATETIME,
    "nextPage" INTEGER NOT NULL DEFAULT 1,         -- siguiente página de /tours a leer
    "totalPages" INTEGER NOT NULL DEFAULT 0,
    "failures" INTEGER NOT NULL DEFAULT 0,         -- fallos seguidos de la página actual
    "notBefore" DATETIME,                          -- no reintentar antes (429 / Retry-After, espera tras error)
    "publishCursor" INTEGER NOT NULL DEFAULT 0,    -- último externalId publicado (pasos de 100)
    "baseline" INTEGER NOT NULL DEFAULT 0,         -- tours de la última corrida exitosa (barrera del 20 %)
    "seen" INTEGER NOT NULL DEFAULT 0,
    "added" INTEGER NOT NULL DEFAULT 0,
    "changed" INTEGER NOT NULL DEFAULT 0,
    "ratingUpdates" INTEGER NOT NULL DEFAULT 0,
    "missing" INTEGER NOT NULL DEFAULT 0,
    "removed" INTEGER NOT NULL DEFAULT 0,
    "reactivated" INTEGER NOT NULL DEFAULT 0,
    "abortReason" TEXT,
    "updatedAt" DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS "SyncRun_provider_startedAt_idx" ON "SyncRun"("provider", "startedAt");
CREATE INDEX IF NOT EXISTS "SyncRun_provider_status_finishedAt_idx" ON "SyncRun"("provider", "status", "finishedAt");

-- REQ-071 / REQ-072: staging por corrida. Nada pasa a "Tour" hasta que la corrida cruza la barrera de cordura.
-- kind: new | changed | rating | same. payload solo cuando hay algo que publicar.
-- previous: respaldo de la fila de "Tour" (y sus traducciones) justo antes de sobrescribirla.
CREATE TABLE IF NOT EXISTS "TourStage" (
    "runId" TEXT NOT NULL,
    "externalId" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB,
    "previous" JSONB,
    "createdAt" DATETIME NOT NULL,
    PRIMARY KEY ("runId", "externalId")
);
CREATE INDEX IF NOT EXISTS "TourStage_runId_kind_externalId_idx" ON "TourStage"("runId", "kind", "externalId");
