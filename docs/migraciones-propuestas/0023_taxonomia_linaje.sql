-- PROPUESTA, SIN APLICAR (REQ-750, Ola R2 «reclasificación con linaje»). Fuera de migrations/ a propósito. Va DESPUÉS de
-- la 0017 (taxonomía) y de la 0022 (ProviderRecord). Para aplicarla: PR aparte que la mueva a migrations/ con el siguiente
-- número libre, OK del PO y publicación a mano con la casilla «migraciones» (docs/runbooks/copia-exacta.md).
--
-- Agrega la procedencia de cada término a la tabla PROPIA de la clasificación (REQ-409: nunca sobre campos del proveedor):
--   origin         quién decidió: manual (ExperienceTaxonomyOverride) > regla (clasificador + mapeo) > proveedor (lo que
--                  el registro declara en vocabulario de Travel Puzzle)
--   sourceField    campo del proveedor que se usó (categoryId, ref, source, original.categoria, title.es|title.en, …)
--   sourceValue    valor original de ese campo (la denominación del proveedor, tal cual)
--   matchedTerm    palabra o código que coincidió (p. ej. «hop-on», «FCH-R»)
--   sourceRawHash  huella del registro crudo en R2 (ProviderRecord.rawHash) del que salió
-- Solo ALTER TABLE ... ADD COLUMN con NULL por omisión: las filas existentes quedan igual y el código con
-- TAXONOMY_LINEAGE_ENABLED="false" no lee ni escribe estas columnas. SQLite no admite IF NOT EXISTS en ADD COLUMN:
-- aplicarla UNA vez. Plan de regreso: apagar la bandera (las columnas pueden quedarse en NULL).
ALTER TABLE "ExperienceTaxonomy" ADD COLUMN "origin" TEXT CHECK ("origin" IN ('manual','regla','proveedor'));
ALTER TABLE "ExperienceTaxonomy" ADD COLUMN "sourceField" TEXT;
ALTER TABLE "ExperienceTaxonomy" ADD COLUMN "sourceValue" TEXT;
ALTER TABLE "ExperienceTaxonomy" ADD COLUMN "matchedTerm" TEXT;
ALTER TABLE "ExperienceTaxonomy" ADD COLUMN "sourceRawHash" TEXT;
