import type { TourAPI } from "@/types";

export const LANGUAGES = ["en", "es", "pt", "de", "fr", "it"] as const;
type Lang = (typeof LANGUAGES)[number];

export interface TourRow {
  externalId: number;
  providerTitle: string;
  providerPhone: string | null;
  priceValue: number;
  priceCurrency: string;
  duration: string;
  titleImageURL: string | null;
  categoryId: number;
  rating: number | null;
  reviewsNumber: number;
  cityId: number;
  countryId: number;
  meetingPoint: unknown;
  includes: unknown;
  POIs: unknown;
  images: unknown;
  videoURL: string | null;
  isActive: true;
  lastSeenAt: Date;
}

export interface TranslationRow {
  language: Lang;
  title: string;
  brief: string | null;
  description: string | null;
  url: string;
}

/** Convierte un tour de la API en la fila del tour y sus traducciones. Pura. */
export function toTourRows(api: TourAPI, seenAt: Date): { tour: TourRow; translations: TranslationRow[] } {
  const tour: TourRow = {
    externalId: api.id,
    providerTitle: api.providerTitle,
    providerPhone: api.providerPhone ?? null,
    priceValue: api.price.value,
    priceCurrency: api.price.currency,
    duration: api.length,
    titleImageURL: api.titleImageURL ?? null,
    categoryId: api.categoryId,
    rating: api.rating ?? null,
    reviewsNumber: api.reviewsNumber ?? 0,
    cityId: api.cityId,
    countryId: api.countryId,
    meetingPoint: api.meetingPoint,
    includes: api.includes ?? [],
    POIs: api.POIs ?? null,
    images: api.images ?? [],
    videoURL: api.videoURL ?? null,
    isActive: true,
    lastSeenAt: seenAt,
  };
  const translations = LANGUAGES.filter((l) => api.title?.[l] && api.URLs?.[l]).map((language) => ({
    language,
    title: api.title[language] as string,
    brief: api.brief?.[language] || null,
    description: api.description?.[language] || null,
    url: api.URLs[language],
  }));
  return { tour, translations };
}

/** Ciudades de una página agrupadas por país (sin repetir), para pedir sus nombres. */
export function cityIdsOf(tours: Pick<TourAPI, "cityId" | "countryId">[]): Map<number, number[]> {
  const byCountry = new Map<number, number[]>();
  for (const { cityId, countryId } of tours) {
    const list = byCountry.get(countryId) ?? [];
    if (!list.includes(cityId)) list.push(cityId);
    byCountry.set(countryId, list);
  }
  return byCountry;
}

interface CountryLike {
  id: number;
  shortTitle: string;
  title: Record<Lang, string>;
}

export function countryRow(c: CountryLike) {
  return { id: c.id, code: c.shortTitle.toUpperCase(), translations: c.title };
}

/** Filas de países sin códigos repetidos (en la base el código es único). */
export function countryRows(countries: CountryLike[]) {
  const seen = new Set<string>();
  return countries.map((c) => {
    const row = countryRow(c);
    const code = seen.has(row.code) ? `${row.code}-${c.id}` : row.code;
    seen.add(code);
    return { ...row, code };
  });
}

/** País que Freetour usa pero no vino en la lista: se guarda provisional para no perder sus tours. */
export function placeholderCountry(id: number) {
  return {
    id,
    code: `C${id}`,
    translations: Object.fromEntries(LANGUAGES.map((l) => [l, `País ${id}`])) as Record<string, string>,
  };
}
