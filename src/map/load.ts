import type { PrismaClient } from "@prisma/client";
import { cityPoints, cardTours } from "./lib/cities";

export interface MapCity {
  cityId: number;
  countryId: number;
  names: Record<string, string>;
  lat: number;
  lng: number;
  tours: number;
}

export interface CityCardTour {
  id: string;
  titles: Record<string, string>;
  image: string | null;
  rating: number | null;
  reviews: number;
  isFree: boolean;
  price: number;
  currency: string;
}

export interface CityCard {
  cityId: number;
  countryId: number;
  names: Record<string, string>;
  tours: number;
  top: CityCardTour[];
}

const asNames = (j: unknown): Record<string, string> => {
  const o = typeof j === "string" ? safeJson(j) : j;
  return o && typeof o === "object" ? (Object.fromEntries(Object.entries(o as Record<string, unknown>).filter(([, v]) => typeof v === "string")) as Record<string, string>) : {};
};
function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/** Ciudades con tours activos y su ubicación (para el mapa del inicio). Si falla, lista vacía. */
export async function loadMapCities({ prisma }: { prisma: PrismaClient }): Promise<MapCity[]> {
  try {
    const rows = await prisma.$queryRaw<{ cityId: number; c: string | null }[]>`
      SELECT cityId, json_extract(meetingPoint, '$.coordinates') AS c FROM Tour WHERE isActive = 1`;
    const points = cityPoints(rows.map((r) => ({ cityId: Number(r.cityId), coords: r.c })));
    const ids = points.map((p) => p.cityId);
    const cities: { id: number; countryId: number; translations: unknown }[] = [];
    for (let i = 0; i < ids.length; i += 90) {
      cities.push(...(await prisma.city.findMany({ where: { id: { in: ids.slice(i, i + 90) } }, select: { id: true, countryId: true, translations: true } })));
    }
    const byId = new Map(cities.map((c) => [c.id, c]));
    return points.flatMap((p) => {
      const c = byId.get(p.cityId);
      return c ? [{ cityId: p.cityId, countryId: c.countryId, names: asNames(c.translations), lat: p.lat, lng: p.lng, tours: p.tours }] : [];
    });
  } catch (error) {
    console.error("[map] sin ciudades:", error);
    return [];
  }
}

const TITLE_LANGS = ["es", "en", "pt", "de", "fr", "it"];

/** Tarjeta de una ciudad: cuántos tours tiene y 3 recomendados (regla 60/40). Null si no hay o falla. */
export async function loadCityCard(cityId: number, { prisma, includePaid }: { prisma: PrismaClient; includePaid: boolean }): Promise<CityCard | null> {
  try {
    const select = {
      id: true, titleImageURL: true, rating: true, reviewsNumber: true, priceValue: true, priceCurrency: true,
      translations: { where: { language: { in: TITLE_LANGS } }, select: { language: true, title: true } },
    } as const;
    const base = { cityId, isActive: true };
    const order = [{ reviewsNumber: "desc" as const }];
    const [city, count, paid, free] = await Promise.all([
      prisma.city.findUnique({ where: { id: cityId }, select: { id: true, countryId: true, translations: true } }),
      prisma.tour.count({ where: base }),
      includePaid ? prisma.tour.findMany({ where: { ...base, priceValue: { gt: 0 } }, orderBy: order, take: 3, select }) : Promise.resolve([]),
      prisma.tour.findMany({ where: { ...base, priceValue: 0 }, orderBy: order, take: 3, select }),
    ]);
    if (!city || count === 0) return null;
    const top = cardTours(paid, free, includePaid).map((t) => ({
      id: t.id,
      titles: Object.fromEntries(t.translations.map((x) => [x.language, x.title])),
      image: t.titleImageURL?.startsWith("https://") ? t.titleImageURL : null,
      rating: t.rating ? Number(t.rating) : null,
      reviews: t.reviewsNumber,
      isFree: Number(t.priceValue) === 0,
      price: Number(t.priceValue),
      currency: t.priceCurrency,
    }));
    return { cityId: city.id, countryId: city.countryId, names: asNames(city.translations), tours: count, top };
  } catch (error) {
    console.error(`[map] sin tarjeta para la ciudad ${cityId}:`, error);
    return null;
  }
}
