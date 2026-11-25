/**
 * REQ-10873 (ola 15, REQ-1562 TBT y REQ-1563 peso): carga de /tours que viaja al navegador.
 * La página del servidor ya pinta el JSON-LD con las filas completas; al cliente (`ToursPageClient`) solo le llega
 * lo que pintan la tarjeta (`fromCatalogTour`) y el pin del mapa (`toursToPins`). Sin descripción, incluye, puntos
 * de interés, fechas, teléfono del proveedor ni las demás fotos, y la ciudad y el país solo en el idioma de la página
 * y en inglés (el respaldo de `transformDBTourToUITour`). Puro: sin base, sin `fetch`.
 */
import type { CountryWithTranslations } from "@/types";

type Names = Record<string, string> | null;

/** Lo que `transformDBTourToUITour` y el pin leen de una fila. */
export interface SlimTourRow {
  id: string;
  externalId: number;
  providerId?: string | null;
  providerTitle: string;
  priceValue: unknown;
  priceCurrency: string;
  duration: string;
  durationMinutes?: number | null;
  titleImageURL: string | null;
  rating: unknown;
  reviewsNumber: number;
  cityId: number;
  countryId: number;
  meetingPoint: unknown;
  images: unknown;
  isActive: boolean;
  createdAt: Date;
  formato?: string;
  translations: Array<{ language?: string; title: string; brief: string | null; url: string | null }>;
  city: { id: number; translations: Names };
}

export interface ToursPagePayload<R> {
  data: R[];
  pagination?: unknown;
  facets?: unknown;
  priceLabels?: unknown;
  cardFormats?: unknown;
  cardHrefs?: unknown;
}

/** Nombres solo en el idioma de la página y en inglés (el respaldo). */
export function namesFor(names: unknown, lang: string): Names {
  if (!names || typeof names !== "object") return null;
  const all = names as Record<string, string>;
  const out: Record<string, string> = {};
  if (all[lang] !== undefined) out[lang] = all[lang];
  if (all.en !== undefined) out.en = all.en;
  return out;
}

function imageUrl(img: unknown): string {
  return typeof img === "string" ? img : img && typeof img === "object" && typeof (img as { URL?: unknown }).URL === "string" ? (img as { URL: string }).URL : "";
}

/** La tarjeta y el pin usan la portada y, si está vacía, la primera foto no vacía distinta de la portada. */
function firstImage(images: unknown, cover: string | null): unknown[] {
  if (!Array.isArray(images)) return [];
  const first = images.find((img) => { const u = imageUrl(img); return u.trim() !== "" && u !== cover; });
  return first === undefined ? [] : [first];
}

type FullRow = {
  id: string; externalId: number; providerId?: string | null; providerTitle: string; priceValue: unknown; priceCurrency: string;
  duration: string; durationMinutes?: number | null; titleImageURL: string | null; rating: unknown; reviewsNumber: number;
  cityId: number; countryId: number; meetingPoint: unknown; images: unknown; isActive: boolean; createdAt: Date; formato?: string;
  translations: Array<{ language?: string; title: string; brief: string | null; url: string | null }>;
  city: { id: number; translations: unknown };
};

// REQ-10873
export function slimTourRow(r: FullRow, lang: string): SlimTourRow {
  const tr = r.translations[0];
  return {
    id: r.id, externalId: r.externalId, providerId: r.providerId, providerTitle: r.providerTitle,
    priceValue: r.priceValue, priceCurrency: r.priceCurrency, duration: r.duration, durationMinutes: r.durationMinutes,
    titleImageURL: r.titleImageURL, rating: r.rating, reviewsNumber: r.reviewsNumber, cityId: r.cityId, countryId: r.countryId,
    meetingPoint: r.meetingPoint, images: firstImage(r.images, r.titleImageURL), isActive: r.isActive, createdAt: r.createdAt,
    ...(r.formato !== undefined ? { formato: r.formato } : {}),
    translations: tr ? [{ language: tr.language, title: tr.title, brief: tr.brief, url: tr.url }] : [],
    city: { id: r.city.id, translations: namesFor(r.city.translations, lang) },
  };
}

// REQ-10873
export function slimToursPage<R extends FullRow>(page: ToursPagePayload<R> | null, lang: string): ToursPagePayload<SlimTourRow> | null {
  if (!page) return null;
  return { ...page, data: (page.data ?? []).map((r) => slimTourRow(r, lang)) };
}

// REQ-10873: países del filtro (id, código, nombre y conteo).
export function slimCountries(countries: CountryWithTranslations[], lang: string): CountryWithTranslations[] {
  return countries.map((c) => ({ id: c.id, code: c.code, translations: namesFor(c.translations, lang), _count: { tours: c._count?.tours ?? 0 } }));
}
