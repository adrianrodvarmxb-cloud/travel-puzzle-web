/**
 * REQ-048: búsqueda de texto completo con FTS5 en D1. Puro: arma la consulta y el SQL.
 * FTS5 da relevancia (bm25), prefijo y búsqueda sin acentos; no corrige errores de dedo.
 */
import { searchTokens, singular, STOPWORDS } from "./words";

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

/**
 * REQ-122 (gates 5 nov 2026, Gate 2 = A): consultas FTS5 en orden; se usa la primera que traiga algo.
 * 1) palabra exacta (con su singular simple: "tours" → "tours" OR "tour"); 2) prefijo solo en la última palabra
 * (se está escribiendo); 3) respaldo: prefijo en todas. Con destino (Gate 1), cada consulta se limita a la columna
 * del lugar para que el resto del texto se busque dentro de ese destino.
 */
// REQ-122
export function ftsQueries(text: string, place?: string | null): string[] {
  const all = searchTokens(text);
  const content = all.filter((w) => !STOPWORDS.has(w));
  const words = (content.length ? content : all).slice(0, MAX_WORDS);
  if (!words.length) return [];
  const exact = (w: string) => { const s = singular(w); return s ? `("${w}" OR "${s}")` : `"${w}"`; };
  const prefix = (w: string) => `"${w}"*`;
  const head = words.slice(0, -1).map(exact);
  const last = words[words.length - 1];
  const where = place ? searchTokens(place).join(" ") : "";
  // AND explícito: FTS5 no acepta AND implícito después de un grupo entre paréntesis
  const scope = where ? [`place : "${where}"`] : [];
  const list = [words.map(exact), [...head, prefix(last)], words.map(prefix)].map((q) => [...q, ...scope].join(" AND "));
  return [...new Set(list)];
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
