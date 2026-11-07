-- PROPUESTA, SIN APLICAR (REQ-360…366, plan S6). Fuera de migrations/ a propósito. Para aplicarla: PR aparte que la
-- mueva a migrations/ con el siguiente número libre, OK del PO y publicación a mano con la casilla «migraciones».
--
-- Recrea el índice FTS5 "TourSearch" con una columna nueva "stem" (raíces en español, Snowball, src/search/lib/stem.ts).
-- TourSearch es DERIVADA: se reconstruye desde Tour + TourTranslation sin perder datos (docs/runbook-busqueda.md).
-- Compatible hacia atrás: el código con SEARCH_STEM_ENABLED="false" inserta y busca en las 5 columnas de siempre.
--
-- RESPALDO (la exportación de D1 no soporta tablas virtuales): 1) DROP TABLE "TourSearch"; 2) exportar;
-- 3) aplicar este archivo (que la vuelve a crear y llenar). Time Travel no se ve afectado.
-- Plan de regreso: volver a correr migrations/0011_busqueda_fts.sql DESPUÉS de `DROP TABLE "TourSearch";`.
DROP TABLE IF EXISTS "TourSearch";
CREATE VIRTUAL TABLE IF NOT EXISTS "TourSearch" USING fts5(
  "tourId" UNINDEXED,
  "language" UNINDEXED,
  "title",
  "brief",
  "place",
  "stem",
  tokenize = 'unicode61 remove_diacritics 2',
  prefix = '2 3'
);

-- Llenado inicial sin raíces; las llena la siguiente reconstrucción con SEARCH_STEM_ENABLED="true" (sync diario).
INSERT INTO "TourSearch" ("tourId", "language", "title", "brief", "place", "stem")
   SELECT tr."tourId", tr."language", tr."title", COALESCE(tr."brief", ''),
          COALESCE((SELECT group_concat(value, ' ') FROM json_each(c."translations")), '') || ' ' ||
          COALESCE((SELECT group_concat(value, ' ') FROM json_each(co."translations")), ''), ''
   FROM "TourTranslation" tr
   JOIN "Tour" t ON t."id" = tr."tourId" AND t."isActive" = 1
   LEFT JOIN "City" c ON c."id" = t."cityId"
   LEFT JOIN "Country" co ON co."id" = t."countryId";
