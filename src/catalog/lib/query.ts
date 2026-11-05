/**
 * REQ-035 (INC-003): la lista y la búsqueda de tours se resuelven en memoria sobre un índice
 * compacto del catálogo (una lectura por idioma cada 30 min), en vez de COUNT + LIKE en D1 en cada
 * visita. D1 solo entrega los 20 tours de la página por id. Puro.
 */
import { durationRangeWhere, type DurationRange } from "@/tours/lib/duration";
import { freshSummary } from "@/departures/lib/summary";
import { categoryGroupOf } from "@/tours/lib/extra-filters";

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
export function searchMatcher(entries: CatalogEntry[], search: string | undefined): (x: CatalogEntry) => boolean {
  const q = search ? normalize(search) : "";
  if (!q) return () => true;
  if (entries.some((x) => x.cityNames?.includes(q))) return (x) => !!x.cityNames?.includes(q);
  if (entries.some((x) => x.countryNames?.includes(q))) return (x) => !!x.countryNames?.includes(q);
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
  const textMatch = searchMatcher(entries, f.search);
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
    textMatch(x));
  const key = SORT[p.sortBy ?? ""] ?? SORT.createdAt;
  const dir = (p.sortBy && SORT[p.sortBy] ? p.sortOrder ?? "asc" : "desc") === "asc" ? 1 : -1;
  hit.sort((a, b) => {
    const va = key(a), vb = key(b);
    if (va === null && vb === null) return a.id < b.id ? -1 : 1;
    if (va === null) return 1;
    if (vb === null) return -1;
    return va === vb ? (a.id < b.id ? -1 : 1) : (va - vb) * dir;
  });
  const limit = Math.min(100, Math.max(1, p.limit || 20));
  const page = Math.max(1, p.page || 1);
  return { ids: hit.slice((page - 1) * limit, page * limit).map((x) => x.id), total: hit.length, page, limit };
}

/** REQ-058: firma de la forma de las entradas; va en la llave de caché para que un cambio de forma invalide lo guardado. */
export const CATALOG_SHAPE = Object.keys(toEntry({ id: "x", cityId: 1, countryId: 1 }, "es")).sort().join(",");
