/**
 * REQ-122: palabras del buscador. Puro y compartido por FTS (src/search) y el catálogo en memoria (src/catalog).
 */

/** Texto → palabras sin acentos ni mayúsculas (solo letras y números de cualquier alfabeto). */
// REQ-122
export const searchTokens = (text: string | undefined | null): string[] =>
  (text ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

/** Palabras vacías de los idiomas del sitio: no se buscan si queda alguna con contenido ("tours en Roma" → "tours"). */
export const STOPWORDS = new Set([
  "de", "del", "la", "las", "el", "los", "en", "y", "a", "al", "con", "por", "para", "un", "una", // es
  "the", "of", "in", "and", "to", "at", "for", "an", "on", // en
  "do", "da", "dos", "das", "em", "no", "na", "e", "o", // pt
  "le", "les", "des", "du", "et", "au", "aux", // fr
  "il", "di", "della", "nel", // it
  "der", "die", "das", "und", "im", // de
]);

/** Palabras genéricas de la búsqueda que nunca se toman como nombre de destino aunque alguna ciudad se llame así. */
export const GENERIC = new Set(["tour", "tours", "free", "walking", "visita", "visit", "guided", "guiada", "excursion", "trip", "day"]);

/** Plural simple seguro: quita la "s" final (tours → tour, museos → museo); no toca "paris", "bus", "campus". */
// REQ-122
export function singular(w: string): string | null {
  if (w.length < 4 || !w.endsWith("s") || /(ss|us|is)$/.test(w)) return null;
  return w.slice(0, -1);
}
