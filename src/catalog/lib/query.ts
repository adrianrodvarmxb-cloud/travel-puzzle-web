/**
 * REQ-035 (INC-003): la lista y la búsqueda de tours se resuelven en memoria sobre un índice
 * compacto del catálogo (una lectura por idioma cada 30 min), en vez de COUNT + LIKE en D1 en cada
 * visita. D1 solo entrega los 20 tours de la página por id. Puro.
 */
import { durationRangeWhere, type DurationRange } from "@/tours/lib/duration";
import { freshSummary } from "@/departures/lib/summary";
import { categoryGroupOf } from "@/tours/lib/extra-filters";
import { GENERIC, searchTokens, STOPWORDS } from "@/search/lib/words";

/** REQ-055: el catálogo se cargó completo el 30-31 oct 2026; antes de esa fecha "alta" no significa "novedad". */
export const CATALOG_LOADED_AT = Date.parse("2026-11-01T00:00:00Z");
export const NOVELTY_DAYS = 30;

export interface CatalogEntry {
  id: string; cityId: number; countryId: number; categoryId: number | null;
  price: number | null; rating: number | null; reviews: number; durationMinutes: number | null;
  createdAt: number; updatedAt: number; text: string;
  /** REQ-049: idiomas del guía y fechas con salida (null = sin dato vigente). */
  languages?: string[] | null; dates?: string[] | null;
  /** REQ-057: nombres del destino en todos los idiomas (normalizados), para reconocer búsquedas por destino. */
  cityNames?: string[]; countryNames?: string[];
}
export interface CatalogFilters {
  countryId?: number; cityId?: number; categoryId?: number; minPrice?: number; maxPrice?: number;
  durationRange?: DurationRange | null; search?: string;
  /** REQ-049: idioma del guía (es, en…) y fecha disponible (YYYY-MM-DD). */
  guideLanguage?: string | null; date?: string | null;
  /** REQ-051..056: tipo de actividad (grupos), cancelación gratuita, privado, recogida, novedad y duración (min). */
  groups?: string[]; freeCancel?: boolean; privateOnly?: boolean; hotelPickup?: boolean; novelty?: boolean;
  durMin?: number | null; durMax?: number | null;
  /** REQ-048: ids por relevancia (FTS5). Si viene, reemplaza la búsqueda por palabras y da el orden por defecto. */
  ranked?: string[] | null;
  /** REQ-122: búsqueda nueva (SEARCH_V2_ENABLED="true"): el destino dentro del texto filtra y el resto se busca dentro. */
  searchV2?: boolean;
}
export interface CatalogPage { page?: number; limit?: number; sortBy?: string; sortOrder?: "asc" | "desc" }

export function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

const num = (v: unknown): number | null => (v === null || v === undefined || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null);
const time = (v: unknown): number => (typeof v === "number" ? v : Date.parse(String(v ?? "").replace("+00:00", "Z")) || 0);
function nameList(json: unknown): string[] {
  try {
    const o = typeof json === "string" ? JSON.parse(json) : json;
    return o && typeof o === "object" ? Object.values(o as Record<string, unknown>).filter((x): x is string => typeof x === "string") : [];
  } catch { return []; }
}
const names = (json: unknown) => nameList(json).join(" ");

const list = (v: unknown): string[] => {
  try { const a = typeof v === "string" ? JSON.parse(v) : v; return Array.isArray(a) ? a.filter((x): x is string => typeof x === "string") : []; } catch { return []; }
};

export function toEntry(r: Record<string, unknown>, _lang: string, now: Date = new Date()): CatalogEntry {
  // REQ-049: el resumen de salidas solo cuenta si está vigente
  const dep = freshSummary({ languages: list(r.guideLanguages), dates: list(r.departureDates) }, r.departuresSyncedAt ? String(r.departuresSyncedAt) : null, now);
  return {
    languages: dep?.languages ?? null, dates: dep?.dates ?? null,
    id: String(r.id), cityId: Number(r.cityId), countryId: Number(r.countryId), categoryId: num(r.categoryId),
    price: num(r.priceValue), rating: num(r.rating), reviews: Number(r.reviewsNumber ?? 0) || 0,
    durationMinutes: num(r.durationMinutes), createdAt: time(r.createdAt), updatedAt: time(r.updatedAt),
    text: normalize([r.title, r.brief, names(r.cityTr), names(r.countryTr)].filter(Boolean).join(" ")),
    cityNames: [...new Set(nameList(r.cityTr).map(normalize))], countryNames: [...new Set(nameList(r.countryTr).map(normalize))],
  };
}

/**
 * REQ-057 (INC-005): búsqueda como los referentes.
 * 1) Si el texto es un destino (ciudad o país en cualquier idioma), solo ese destino.
 * 2) Si no, todas las palabras completas; 3) si nadie las tiene, inicio de palabra (se está escribiendo);
 * 4) último recurso, el pedazo de texto (comportamiento anterior).
 */
/** REQ-057: si el texto es una ciudad o un país (cualquier idioma), el filtro de ese destino; si no, null. */
export function destinationMatcher(entries: CatalogEntry[], search: string | undefined): ((x: CatalogEntry) => boolean) | null {
  const q = search ? normalize(search) : "";
  if (!q) return null;
  if (entries.some((x) => x.cityNames?.includes(q))) return (x) => !!x.cityNames?.includes(q);
  if (entries.some((x) => x.countryNames?.includes(q))) return (x) => !!x.countryNames?.includes(q);
  return null;
}

/** REQ-122: destino encontrado dentro del texto y lo que queda para buscar dentro de él. */
export interface DestinationSplit { kind: "city" | "country"; name: string; rest: string; match: (x: CatalogEntry) => boolean }

const nameKey = (n: string) => searchTokens(n).join(" ");
const keysOf = (names: string[] | undefined) => (names ?? []).map(nameKey);
/** Nombres de destino de hasta 3 palabras ("nueva york", "rio de janeiro"); se prueba primero el más largo. */
export const MAX_DESTINATION_WORDS = 3;

/**
 * REQ-122 (gates 5 nov 2026, Gate 1 = A; Gate 3 = A): si una palabra o grupo de palabras del texto es una ciudad o
 * un país (en cualquiera de las traducciones que ya existen), se filtra a ese destino y el resto del texto se busca
 * dentro de él. Ciudad antes que país; el nombre más largo gana; una palabra sola vacía o genérica no cuenta.
 */
// REQ-122
export function splitDestination(entries: CatalogEntry[], search: string | undefined): DestinationSplit | null {
  const words = searchTokens(search);
  if (!words.length) return null;
  const cities = new Set(entries.flatMap((x) => keysOf(x.cityNames)));
  const countries = new Set(entries.flatMap((x) => keysOf(x.countryNames)));
  for (let n = Math.min(MAX_DESTINATION_WORDS, words.length); n >= 1; n--) {
    for (const [kind, set] of [["city", cities], ["country", countries]] as const) {
      for (let i = 0; i + n <= words.length; i++) {
        const gram = words.slice(i, i + n);
        if (n === 1 && (gram[0].length < 3 || STOPWORDS.has(gram[0]) || GENERIC.has(gram[0]))) continue;
        const name = gram.join(" ");
        if (!set.has(name)) continue;
        const pick = kind === "city" ? (x: CatalogEntry) => x.cityNames : (x: CatalogEntry) => x.countryNames;
        return { kind, name, rest: [...words.slice(0, i), ...words.slice(i + n)].join(" "), match: (x) => keysOf(pick(x)).includes(name) };
      }
    }
  }
  return null;
}

export function searchMatcher(entries: CatalogEntry[], search: string | undefined): (x: CatalogEntry) => boolean {
  const q = search ? normalize(search) : "";
  if (!q) return () => true;
  const dest = destinationMatcher(entries, search);
  if (dest) return dest;
  const words = q.split(" ").filter(Boolean);
  const tokens = (x: CatalogEntry) => x.text.split(/[^a-z0-9\u00c0-\uffff]+/);
  const whole = (x: CatalogEntry) => { const t = new Set(tokens(x)); return words.every((w) => t.has(w)); };
  const prefix = (x: CatalogEntry) => { const t = tokens(x); return words.every((w) => t.some((k) => k.startsWith(w))); };
  const piece = (x: CatalogEntry) => words.every((w) => x.text.includes(w));
  for (const m of [whole, prefix]) if (entries.some(m)) return m;
  return piece;
}

const SORT: Record<string, (x: CatalogEntry) => number | null> = {
  price: (x) => x.price, rating: (x) => x.rating, duration: (x) => x.durationMinutes,
  reviewsNumber: (x) => x.reviews, createdAt: (x) => x.createdAt, updatedAt: (x) => x.updatedAt,
};

export function queryCatalog(entries: CatalogEntry[], f: CatalogFilters, p: CatalogPage, nowMs: number = Date.now()) {
  const newSince = Math.max(CATALOG_LOADED_AT, nowMs - NOVELTY_DAYS * 864e5);
  const rank = f.ranked ? new Map(f.ranked.map((id, i) => [id, i])) : null;
  const textMatch = searchMatcher(entries, f.search);
  // REQ-048 + REQ-057: con relevancia FTS se respeta igual la intención de destino ("Roma" = solo Roma)
  const dest = rank ? destinationMatcher(entries, f.search) : null;
  // REQ-122: con la búsqueda nueva, el destino dentro del texto manda; si el resto no encuentra nada en él, todo el destino
  const split = f.searchV2 ? splitDestination(entries, f.search) : null;
  const narrow = !!(split && rank && entries.some((x) => rank.has(x.id) && split.match(x)));
  const useRank = !!rank && (!split || narrow);
  const dur = f.durationRange ? durationRangeWhere(f.durationRange) : null;
  const hit = entries.filter((x) =>
    (!f.countryId || x.countryId === f.countryId) &&
    (!f.cityId || x.cityId === f.cityId) &&
    (!f.categoryId || x.categoryId === f.categoryId) &&
    (f.minPrice === undefined || f.minPrice === null || (x.price ?? 0) >= f.minPrice) &&
    (f.maxPrice === undefined || f.maxPrice === null || (x.price ?? 0) <= f.maxPrice) &&
    (!dur || (x.durationMinutes !== null && (dur.gt === undefined || x.durationMinutes > dur.gt) && (dur.lte === undefined || x.durationMinutes <= dur.lte))) &&
    (!f.guideLanguage || (x.languages ?? []).includes(f.guideLanguage)) && // REQ-049
    (!f.date || (x.dates ?? []).includes(f.date)) &&
    (!f.groups?.length || f.groups.includes(categoryGroupOf(x.categoryId))) && // REQ-051
    // REQ-052: Freetour cancela gratis (24 h). REQ-053/054: no informa privado ni recogida → no se afirma.
    !f.privateOnly && !f.hotelPickup &&
    (!f.novelty || x.createdAt > newSince) && // REQ-055
    (f.durMin == null || (x.durationMinutes !== null && x.durationMinutes >= f.durMin)) && // REQ-056
    (f.durMax == null || (x.durationMinutes !== null && x.durationMinutes <= f.durMax)) &&
    (split ? split.match(x) && (!narrow || rank!.has(x.id))
      : rank ? rank.has(x.id) && (!dest || dest(x)) : textMatch(x)));
  if (useRank && !(p.sortBy && SORT[p.sortBy])) hit.sort((a, b) => rank.get(a.id)! - rank.get(b.id)!); // REQ-048: relevancia
  else sortBy(hit, p.sortBy === "relevance" ? { sortBy: "reviewsNumber", sortOrder: "desc" } : p); // sin FTS: más reseñas
  const limit = Math.min(100, Math.max(1, p.limit || 20));
  const page = Math.max(1, p.page || 1);
  return { ids: hit.slice((page - 1) * limit, page * limit).map((x) => x.id), total: hit.length, page, limit };
}

function sortBy(hit: CatalogEntry[], p: CatalogPage) {
  const key = SORT[p.sortBy ?? ""] ?? SORT.createdAt;
  const dir = (p.sortBy && SORT[p.sortBy] ? p.sortOrder ?? "asc" : "desc") === "asc" ? 1 : -1;
  hit.sort((a, b) => {
    const va = key(a), vb = key(b);
    if (va === null && vb === null) return a.id < b.id ? -1 : 1;
    if (va === null) return 1;
    if (vb === null) return -1;
    return va === vb ? (a.id < b.id ? -1 : 1) : (va - vb) * dir;
  });
}

/** REQ-058: firma de la forma de las entradas; va en la llave de caché para que un cambio de forma invalide lo guardado. */
export const CATALOG_SHAPE = Object.keys(toEntry({ id: "x", cityId: 1, countryId: 1 }, "es")).sort().join(",");
