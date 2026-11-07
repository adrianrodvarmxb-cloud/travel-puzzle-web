/**
 * Normalización y palabras clave del clasificador. Misma semántica que el ensayo del plan
 * (scratchpad taxo-ensayo/clasificar.py): minúsculas, sin acentos y solo ASCII; `\b` al inicio de cada palabra;
 * `*` al final = prefijo, si no, `\b` al final. Puro.
 */

export function norm(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\x00-\x7f]/g, "");
}

const cache = new Map<string, RegExp>();

/** Compila una lista de palabras (fragmentos de regex) a una sola expresión. Lista vacía = nunca coincide. */
export function keywordRegex(words: readonly string[]): RegExp | null {
  if (words.length === 0) return null;
  const key = words.join("\u0000");
  let rx = cache.get(key);
  if (!rx) {
    const alts = words.map((w) => (w.endsWith("*") ? w.slice(0, -1) : `${w}\\b`));
    rx = new RegExp(`\\b(${alts.join("|")})`, "i");
    cache.set(key, rx);
  }
  return rx;
}

export function matches(words: readonly string[] | undefined, normalizedText: string): boolean {
  const rx = keywordRegex(words ?? []);
  return rx !== null && rx.test(normalizedText);
}

/** REQ-1253: nombres de ciudad de un JSON de traducciones ({ es, en, … }) o de una lista; sin vacíos ni repetidos. */
export function cityNamesOf(v: unknown): string[] {
  const raw = typeof v === "string" ? (() => { try { return JSON.parse(v); } catch { return [v]; } })() : v;
  const list = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? Object.values(raw as Record<string, unknown>) : [];
  return [...new Set(list.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim()))];
}

const escapeRx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const CITY_TOUR_BEFORE = "(?:tour|recorrido|visita|sightseeing|city tour|lo mejor|lo esencial|la esencia|highlights|best|descubre|discover|explora|explore)";
const CITY_TOUR_ADJ = "(?:turistic[oa]s?|guiad[oa]s?|privad[oa]s?|cultural|completa?|historic[oa]|urban[oa]|panoramic[oa]|esencial)";

/**
 * REQ-1253: ¿el título es un recorrido POR la ciudad base? Solo con la forma de un city tour que nombra la ciudad:
 * «Recorrido turístico por Dubái», «Tour de Bogotá», «Lo mejor de Lima», «Pekín Tour», «Lima en un día». Nombrar la
 * ciudad sin esa forma («Visita a Pérgamo en Esmirna», «Safari a Chitwan») no basta: muchos proveedores ponen como
 * ciudad el destino de la excursión.
 */
export function namesCity(normalizedText: string, cities: readonly string[] | undefined): boolean {
  return (cities ?? []).map(norm).filter((c) => c.length >= 3).some((c) => {
    const city = escapeRx(c);
    return new RegExp(`\\b${CITY_TOUR_BEFORE}(?: ${CITY_TOUR_ADJ})? (?:por|de|en|of|in|around)(?: la ciudad de| the city of)? ${city}\\b`).test(normalizedText)
      || new RegExp(`(?:^|[|:·-] ?)${city}(?: city)? (?:tour|city tour|en un dia|in one day|highlights|esencial)\\b`).test(normalizedText);
  });
}

/** Quita frases excluidas (p. ej. «game of thrones») antes de buscar las palabras de un tema. */
export function without(normalizedText: string, phrases: readonly string[] | undefined): string {
  let out = normalizedText;
  for (const p of phrases ?? []) {
    const rx = keywordRegex([p]);
    if (rx) out = out.replace(new RegExp(rx.source, "gi"), " ");
  }
  return out;
}
