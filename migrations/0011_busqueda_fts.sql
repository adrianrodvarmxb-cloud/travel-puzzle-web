-- REQ-048: índice de texto completo (FTS5) para el buscador de tours. Tabla derivada: se puede borrar y reconstruir
-- desde Tour + TourTranslation sin perder datos. Ojo: la exportación de D1 no soporta tablas virtuales; para exportar,
-- borrar "TourSearch", exportar y volver a crearla (docs/runbook-busqueda.md).
CREATE VIRTUAL TABLE IF NOT EXISTS "TourSearch" USING fts5(
  "tourId" UNINDEXED,
  "language" UNINDEXED,
  "title",
  "brief",
  "place",
  tokenize = 'unicode61 remove_diacritics 2',
  prefix = '2 3'
);

-- Llenado inicial (lo mismo que REBUILD_SQL; después lo rehace el sync diario al cerrar la corrida).
INSERT INTO "TourSearch" ("tourId", "language", "title", "brief", "place")
   SELECT tr."tourId", tr."language", tr."title", COALESCE(tr."brief", ''),
          COALESCE((SELECT group_concat(value, ' ') FROM json_each(c."translations")), '') || ' ' ||
          COALESCE((SELECT group_concat(value, ' ') FROM json_each(co."translations")), '')
   FROM "TourTranslation" tr
   JOIN "Tour" t ON t."id" = tr."tourId" AND t."isActive" = 1
   LEFT JOIN "City" c ON c."id" = t."cityId"
   LEFT JOIN "Country" co ON co."id" = t."countryId";
