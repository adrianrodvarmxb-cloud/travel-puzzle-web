-- Taxonomía T2 (plan docs/plan-taxonomia.md §6.1; REQ-408, REQ-409; gate G-T5 = A, firmado por recomendación 6-11 07:04).
-- Clasificación de Travel Puzzle en tablas PROPIAS: no toca Tour, TourTranslation ni Trip (los datos del proveedor
-- se quedan tal cual) y no entra en el content_hash del sync. Solo crea tablas e índices; no borra ni cambia nada.
-- La escribe el recálculo al cerrar cada sync exitoso (T2b, tras TAXONOMY_SYNC_ENABLED="false"); el sitio lee solo
-- la última corrida con status = 'published' (publicación atómica: si una corrida falla, se sigue leyendo la anterior).
-- CANDADO: la aplica el coordinador con su respaldo, una por publicación. Plan de regreso: las tablas son nuevas y vacías;
-- con la bandera apagada nadie las lee ni las escribe (no hace falta borrarlas).

CREATE TABLE IF NOT EXISTS "ExperienceTaxonomy" (
  "experienceKind" TEXT NOT NULL CHECK ("experienceKind" IN ('tour','trip')),
  "experienceId"   TEXT NOT NULL,            -- Tour.id o Trip.id (ids de Travel Puzzle, nunca el del proveedor)
  "axis"           TEXT NOT NULL CHECK ("axis" IN ('formato','tema','atributo','seccion')),
  "term"           TEXT NOT NULL,            -- slug del diccionario (src/taxonomy/data/dictionary.json)
  "ruleId"         TEXT NOT NULL,            -- regla que lo decidió (#6 precio 0, categoría freetour:12, …)
  "mappingVersion" TEXT NOT NULL,            -- versión del diccionario + mapeos
  "runId"          TEXT NOT NULL,            -- corrida que lo escribió
  "computedAt"     TEXT NOT NULL,
  PRIMARY KEY ("experienceKind","experienceId","axis","term","runId")
);
CREATE INDEX IF NOT EXISTS "ExperienceTaxonomy_term" ON "ExperienceTaxonomy" ("runId","axis","term");
CREATE INDEX IF NOT EXISTS "ExperienceTaxonomy_experience" ON "ExperienceTaxonomy" ("runId","experienceKind","experienceId");

-- Correcciones a mano (agregar o quitar un término a una experiencia); ganan sobre el clasificador.
CREATE TABLE IF NOT EXISTS "ExperienceTaxonomyOverride" (
  "experienceKind" TEXT NOT NULL CHECK ("experienceKind" IN ('tour','trip')),
  "experienceId"   TEXT NOT NULL,
  "axis"           TEXT NOT NULL CHECK ("axis" IN ('formato','tema','atributo','seccion')),
  "term"           TEXT NOT NULL,
  "action"         TEXT NOT NULL CHECK ("action" IN ('add','remove')),
  "note"           TEXT NOT NULL DEFAULT '',
  "by"             TEXT NOT NULL,
  "at"             TEXT NOT NULL,
  PRIMARY KEY ("experienceKind","experienceId","axis","term")
);

-- Bitácora de cada recálculo: conteos, categorías sin mapear (log de por-revisar) y estado.
CREATE TABLE IF NOT EXISTS "TaxonomyRun" (
  "id"             TEXT PRIMARY KEY,
  "startedAt"      TEXT NOT NULL,
  "finishedAt"     TEXT,
  "mappingVersion" TEXT NOT NULL,
  "counts"         TEXT NOT NULL DEFAULT '{}',   -- JSON {formato: {...}, tema: {...}}
  "unmapped"       TEXT NOT NULL DEFAULT '[]',   -- JSON [{provider, categoryId, tours}]
  "unclassified"   INTEGER NOT NULL DEFAULT 0,
  "status"         TEXT NOT NULL DEFAULT 'running' CHECK ("status" IN ('running','published','aborted')),
  "abortReason"    TEXT,
  "cursor"         TEXT NOT NULL DEFAULT '',     -- último Tour.id clasificado (el recálculo va por tandas, una por minuto)
  "tripsDone"      INTEGER NOT NULL DEFAULT 0    -- 1 cuando ya se clasificaron los viajes propios
);
CREATE INDEX IF NOT EXISTS "TaxonomyRun_status" ON "TaxonomyRun" ("status","finishedAt");
