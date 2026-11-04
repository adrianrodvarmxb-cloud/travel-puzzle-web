/**
 * REQ-035 (INC-003): la lista y la búsqueda de tours se resuelven en memoria sobre un índice
 * compacto del catálogo (una lectura por idioma cada 30 min), en vez de COUNT + LIKE en D1 en cada
 * visita. D1 solo entrega los 20 tours de la página por id. Puro.
 */
import { durationRangeWhere, type DurationRange } from "@/tours/lib/duration";

export interface CatalogEntry {
  id: string; cityId: number; countryId: number; categoryId: number | null;
  price: number | null; rating: number | null; reviews: number; durationMinutes: number | null;
  createdAt: number; updatedAt: number; text: string;
}
export interface CatalogFilters {
  countryId?: number; cityId?: number; categoryId?: number; minPrice?: number; maxPrice?: number;
  durationRange?: DurationRange | null; search?: string;
}
export interface CatalogPage { page?: number; limit?: number; sortBy?: string; sortOrder?: "asc" | "desc" }

export function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

const num = (v: unknown): number | null => (v === null || v === undefined || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null);
const time = (v: unknown): number => (typeof v === "number" ? v : Date.parse(String(v ?? "").replace("+00:00", "Z")) || 0);
function names(json: unknown): string {
  try {
    const o = typeof json === "string" ? JSON.parse(json) : json;
    return o && typeof o === "object" ? Object.values(o as Record<string, unknown>).filter((x) => typeof x === "string").join(" ") : "";
  } catch { return ""; }
}

export function toEntry(r: Record<string, unknown>, _lang: string): CatalogEntry {
  return {
    id: String(r.id), cityId: Number(r.cityId), countryId: Number(r.countryId), categoryId: num(r.categoryId),
    price: num(r.priceValue), rating: num(r.rating), reviews: Number(r.reviewsNumber ?? 0) || 0,
    durationMinutes: num(r.durationMinutes), createdAt: time(r.createdAt), updatedAt: time(r.updatedAt),
    text: normalize([r.title, r.brief, names(r.cityTr), names(r.countryTr)].filter(Boolean).join(" ")),
  };
}

const SORT: Record<string, (x: CatalogEntry) => number | null> = {
  price: (x) => x.price, rating: (x) => x.rating, duration: (x) => x.durationMinutes,
  reviewsNumber: (x) => x.reviews, createdAt: (x) => x.createdAt, updatedAt: (x) => x.updatedAt,
};

export function queryCatalog(entries: CatalogEntry[], f: CatalogFilters, p: CatalogPage) {
  const words = f.search ? normalize(f.search).split(" ").filter(Boolean) : [];
  const dur = f.durationRange ? durationRangeWhere(f.durationRange) : null;
  const hit = entries.filter((x) =>
    (!f.countryId || x.countryId === f.countryId) &&
    (!f.cityId || x.cityId === f.cityId) &&
    (!f.categoryId || x.categoryId === f.categoryId) &&
    (f.minPrice === undefined || f.minPrice === null || (x.price ?? 0) >= f.minPrice) &&
    (f.maxPrice === undefined || f.maxPrice === null || (x.price ?? 0) <= f.maxPrice) &&
    (!dur || (x.durationMinutes !== null && (dur.gt === undefined || x.durationMinutes > dur.gt) && (dur.lte === undefined || x.durationMinutes <= dur.lte))) &&
    words.every((w) => x.text.includes(w)));
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
