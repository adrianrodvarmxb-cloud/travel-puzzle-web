/**
 * REQ-048: búsqueda de texto completo con FTS5 en D1. Puro: arma la consulta y el SQL.
 * FTS5 da relevancia (bm25), prefijo y búsqueda sin acentos; no corrige errores de dedo.
 */
export const MAX_WORDS = 8;

/** Texto del usuario → consulta FTS5 segura: solo letras y números, cada palabra entre comillas y por prefijo. */
// REQ-048
export function ftsQuery(text: string): string | null {
  const words = (text ?? "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .match(/[\p{L}\p{N}]+/gu) ?? [];
  const list = words.slice(0, MAX_WORDS);
  return list.length ? list.map((w) => `"${w}"*`).join(" ") : null;
}

/** Reconstruye el índice desde los tours activos: título y resumen por idioma + nombres del lugar en todos los idiomas. */
export const REBUILD_SQL = [
  `DELETE FROM "TourSearch"`,
  `INSERT INTO "TourSearch" ("tourId", "language", "title", "brief", "place")
   SELECT tr."tourId", tr."language", tr."title", COALESCE(tr."brief", ''),
          COALESCE((SELECT group_concat(value, ' ') FROM json_each(c."translations")), '') || ' ' ||
          COALESCE((SELECT group_concat(value, ' ') FROM json_each(co."translations")), '')
   FROM "TourTranslation" tr
   JOIN "Tour" t ON t."id" = tr."tourId" AND t."isActive" = 1
   LEFT JOIN "City" c ON c."id" = t."cityId"
   LEFT JOIN "Country" co ON co."id" = t."countryId"`,
];

/** Ids por relevancia; busca en todos los idiomas y pone primero lo que coincide en el idioma del visitante. */
export const SEARCH_SQL = `SELECT "tourId" FROM "TourSearch" WHERE "TourSearch" MATCH ?1
  GROUP BY "tourId" ORDER BY MAX("language" = ?2) DESC, MIN(rank) LIMIT ?3`;

/** Interruptor SEARCH_V2_ENABLED (apagado por defecto). */
export const isSearchV2 = (v: string | undefined) => v === "true";

/** Si FTS no encontró nada o falló, se usa la búsqueda por palabras de siempre (nunca una página vacía por un índice vacío). */
// REQ-048
export const rankedOrFallback = (ids: string[] | null | undefined): string[] | null => (ids && ids.length ? ids : null);
