/**
 * REQ-363/364: consulta FTS5 con raíz (columna `stem`) y sinónimos (plan S6), tras SEARCH_STEM_ENABLED (apagado;
 * requiere la migración propuesta que recrea TourSearch con `stem`). Puro.
 * Mismos gates que REQ-122: exacta primero (con su raíz y sus sinónimos), prefijo solo en la última palabra, respaldo
 * de prefijo en todas; el destino limita a la columna `place`. La coincidencia exacta pesa más que la raíz en bm25.
 */
import { MAX_WORDS } from "./fts-query";
import { searchTokens, singular, STOPWORDS } from "./words";
import { stemEs, STEM_VERSION } from "./stem";
import { expandSynonyms, type QueryPart, type SynonymMap } from "./synonyms";

/** Pesos bm25 por columna (tourId, language, title, brief, place, stem): título exacto > resumen > raíz > lugar. */
export const BM25_WEIGHTS = [0, 0, 10, 4, 1, 2] as const;

const quote = (s: string) => `"${s.replace(/"/g, "")}"`;

function exact(p: QueryPart): string {
  if (p.kind === "phrase") return `(${p.phrases.map((x) => quote(x)).join(" OR ")})`;
  const w = p.word, s = singular(w), st = stemEs(w);
  const forms = [quote(w), ...(s ? [quote(s)] : []), ...(st && st.length >= 3 ? [`stem : ${quote(st)}`] : [])];
  return forms.length > 1 ? `(${forms.join(" OR ")})` : forms[0];
}
const prefix = (p: QueryPart) => (p.kind === "phrase" ? exact(p) : `${quote(p.word)}*`);

// REQ-363 REQ-364
export function ftsStemQueries(text: string, place: string | null | undefined, synonyms: SynonymMap): string[] {
  const all = searchTokens(text).slice(0, MAX_WORDS * 2);
  if (!all.length) return [];
  // los sinónimos se buscan en el texto completo («tour a pie» lleva una palabra vacía); luego se quitan las sueltas
  const expanded = expandSynonyms(all, synonyms);
  const content = expanded.filter((p) => p.kind === "phrase" || !STOPWORDS.has(p.word));
  const parts = (content.length ? content : expanded).slice(0, MAX_WORDS);
  const head = parts.slice(0, -1).map(exact);
  const last = parts[parts.length - 1];
  const where = place ? searchTokens(place).join(" ") : "";
  const scope = where ? [`place : ${quote(where)}`] : [];
  const list = [parts.map(exact), [...head, prefix(last)], parts.map(prefix)].map((q) => [...q, ...scope].join(" AND "));
  return [...new Set(list)];
}

/**
 * Ids por relevancia con pesos por columna (la exacta pesa más que la raíz). bm25() no se puede usar dentro de un
 * GROUP BY («unable to use function bm25 in the requested context», y una subconsulta se aplana): se fijan los pesos
 * para esta consulta con `rank MATCH 'bm25(…)'` (FTS5) y se agrupa con MIN(rank), como SEARCH_SQL.
 */
export const SEARCH_STEM_SQL = `SELECT "tourId" FROM "TourSearch" WHERE "TourSearch" MATCH ?1 AND rank MATCH 'bm25(${BM25_WEIGHTS.map((w) => w.toFixed(1)).join(", ")})'
  GROUP BY "tourId" ORDER BY MAX("language" = ?2) DESC, MIN(rank) LIMIT ?3`;

/** Igual que REBUILD_SQL pero con la columna stem vacía; la llena `stemRows` en JS (D1 no admite tokenizadores propios). */
export const REBUILD_STEM_SQL = [
  `DELETE FROM "TourSearch"`,
  `INSERT INTO "TourSearch" ("tourId", "language", "title", "brief", "place", "stem")
   SELECT tr."tourId", tr."language", tr."title", COALESCE(tr."brief", ''),
          COALESCE((SELECT group_concat(value, ' ') FROM json_each(c."translations")), '') || ' ' ||
          COALESCE((SELECT group_concat(value, ' ') FROM json_each(co."translations")), ''), ''
   FROM "TourTranslation" tr
   JOIN "Tour" t ON t."id" = tr."tourId" AND t."isActive" = 1
   LEFT JOIN "City" c ON c."id" = t."cityId"
   LEFT JOIN "Country" co ON co."id" = t."countryId"`,
];
/** Filas en español a las que se les calcula la raíz. */
export const STEM_SOURCE_SQL = `SELECT rowid AS "rid", "title", "brief" FROM "TourSearch" WHERE "language" = 'es'`;
export const STEM_UPDATE_SQL = `UPDATE "TourSearch" SET "stem" = ?1 WHERE rowid = ?2`;

/** Texto → raíces separadas por espacio (sin palabras vacías ni repetidas). Solo español. */
// REQ-360
export function stemText(text: string): string {
  return [...new Set(searchTokens(text).filter((w) => !STOPWORDS.has(w)).map(stemEs).filter((s) => s.length >= 2))].join(" ");
}

/** Interruptor SEARCH_STEM_ENABLED (apagado por defecto). */
export const isSearchStem = (v: string | undefined) => v === "true";
export { STEM_VERSION };
