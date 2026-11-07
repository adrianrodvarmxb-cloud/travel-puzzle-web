-- PROPUESTA, SIN APLICAR (REQ-746, Ola R1 «copia exacta»; gate 1 firmado por el PO el 6 nov 2026). Fuera de migrations/
-- a propósito. Para aplicarla: PR aparte que la mueva a migrations/ con el siguiente número libre, OK del PO y publicación
-- a mano con la casilla «migraciones» (runbook docs/runbooks/copia-exacta.md, paso 3).
--
-- Índice en D1 del archivo crudo. La copia exacta vive en R2 PRIVADO (binding propuesto RAW_ARCHIVE); aquí solo van la
-- huella, la clave R2 y los metadatos para ligar cada experiencia con el registro original del proveedor.
-- Solo crea tablas e índices nuevos: no toca Tour, TourTranslation, Trip ni la taxonomía. Con RAW_ARCHIVE_ENABLED="false"
-- nadie las lee ni las escribe. Plan de regreso: apagar la bandera; las tablas pueden quedarse vacías (no hace falta borrarlas).

-- Una fila por versión distinta (huella) de cada registro del proveedor. Sin cambio de huella no hay fila nueva:
-- solo se actualiza "lastSeenAt" cuando el registro vuelve a una versión ya vista.
CREATE TABLE IF NOT EXISTS "ProviderRecord" (
  "id"                TEXT PRIMARY KEY,           -- la clave R2 (raw/<proveedor>/<externalId>/<huella>.json)
  "provider"          TEXT NOT NULL,              -- freetour, extime, bigbus, … (src/ingest/lib/raw-hash.ts)
  "externalId"        TEXT NOT NULL,              -- id del proveedor (FREETOUR id) o referencia del operador (ref)
  "experienceKind"    TEXT CHECK ("experienceKind" IN ('tour','trip')),
  "experienceId"      TEXT,                       -- Trip.id; en FREETOUR va NULL y se liga por Tour.externalId
  "rawHash"           TEXT NOT NULL,              -- sha-256 del JSON canónico sin los campos volátiles del proveedor
  "r2Key"             TEXT NOT NULL,
  "bytes"             INTEGER NOT NULL,
  "schemaOk"          INTEGER NOT NULL DEFAULT 1 CHECK ("schemaOk" IN (0,1)),  -- 0 = no pasó el esquema del crudo (se guarda igual)
  "fetchedAt"         TEXT NOT NULL,              -- primera vez que se vio esta versión
  "lastSeenAt"        TEXT NOT NULL,              -- última vez que esta versión fue la vigente
  "providerUpdatedAt" TEXT,                       -- FREETOUR: updatedAt del item
  "sourceRef"         TEXT,                       -- endpoint (/tours?page=3) o referencia del documento del operador
  "sourceDocKey"      TEXT,                       -- clave R2 del documento original (source/<agencia>/…)
  "sourcePage"        INTEGER,                    -- página del PDF original donde está el viaje
  "originalField"     TEXT,                       -- campo del proveedor con su denominación (lo llena la Ola R2)
  "originalCategory"  TEXT,                       -- denominación original tal cual (lo llena la Ola R2)
  "declaredTaxonomy"  TEXT,                       -- JSON {formato, temas} que el registro declara en vocabulario de Travel Puzzle (imports: campo taxonomia)
  "runId"             TEXT NOT NULL,              -- corrida del sync o de la importación
  UNIQUE ("provider","externalId","rawHash")
);
CREATE INDEX IF NOT EXISTS "ProviderRecord_latest" ON "ProviderRecord" ("provider","externalId","lastSeenAt");
CREATE INDEX IF NOT EXISTS "ProviderRecord_experience" ON "ProviderRecord" ("experienceKind","experienceId");

-- Documentos originales del proveedor (PDF o página web) guardados en R2 privado (gate 4).
CREATE TABLE IF NOT EXISTS "ProviderDocument" (
  "key"         TEXT PRIMARY KEY,                 -- source/<agencia>/<huella8>-<archivo>
  "provider"    TEXT NOT NULL,
  "fileName"    TEXT NOT NULL,                    -- nombre o URL original
  "sha256"      TEXT NOT NULL,
  "bytes"       INTEGER NOT NULL,
  "contentType" TEXT NOT NULL,
  "receivedAt"  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS "ProviderDocument_provider" ON "ProviderDocument" ("provider","receivedAt");
