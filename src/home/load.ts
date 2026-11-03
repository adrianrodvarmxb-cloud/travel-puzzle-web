import type { PrismaClient } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { mixRecommendations } from "@/booking/lib/recommendations";
import { pickDestinations, type CityRow, type DestinationCard } from "./lib/destinations";
import { groupByContinent, type ContinentSummary } from "./lib/continents";

export interface HomeTour {
  id: string;
  titles: Record<string, string>;
  cityNames: Record<string, string>;
  image: string;
  isFree: boolean;
  price: number;
  currency: string;
  duration: string;
  rating: number | null;
  reviews: number;
}

export interface HomeStats {
  tours: number;
  cities: number;
  countries: number;
  /** Promedio ponderado de calificaciones y total de reseñas de los tours. */
  rating: number | null;
  reviews: number;
}

export interface HomeData {
  stats: HomeStats;
  destinations: DestinationCard[];
  continents: (ContinentSummary & { names: Record<number, Record<string, string>> })[];
  featured: HomeTour[];
}

const asNames = (j: unknown): Record<string, string> =>
  j && typeof j === "object" ? Object.fromEntries(Object.entries(j as Record<string, unknown>).filter(([, v]) => typeof v === "string")) as Record<string, string> : {};

const TITLE_LANGS = ["es", "en", "pt", "de", "fr", "it"];

async function loadDestinations(prisma: PrismaClient) {
  const groups = await prisma.tour.groupBy({
    by: ["cityId"],
    where: { isActive: true },
    _count: { _all: true },
    orderBy: { _count: { cityId: "desc" } },
    take: 40,
  });
  const ids = groups.map((g) => g.cityId);
  if (!ids.length) return [];
  const [cities, samples] = await Promise.all([
    prisma.city.findMany({ where: { id: { in: ids } }, select: { id: true, countryId: true, translations: true, country: { select: { translations: true } } } }),
    prisma.tour.findMany({
      where: { cityId: { in: ids }, isActive: true, titleImageURL: { startsWith: "https://" } },
      orderBy: { reviewsNumber: "desc" },
      select: { cityId: true, titleImageURL: true },
      take: 400,
    }),
  ]);
  const sample = new Map<number, string>();
  for (const s of samples) if (s.titleImageURL && !sample.has(s.cityId)) sample.set(s.cityId, s.titleImageURL);
  const byId = new Map(cities.map((c) => [c.id, c]));
  const rows: CityRow[] = groups.flatMap((g) => {
    const c = byId.get(g.cityId);
    if (!c) return [];
    return [{ cityId: c.id, countryId: c.countryId, tours: g._count._all, cityNames: asNames(c.translations), countryNames: asNames(c.country?.translations), sampleImage: sample.get(c.id) ?? null }];
  });
  return pickDestinations(rows, 8);
}

async function loadFeatured(prisma: PrismaClient, includePaid: boolean): Promise<HomeTour[]> {
  const base = { isActive: true, titleImageURL: { startsWith: "https://" }, reviewsNumber: { gte: 20 } };
  const select = {
    id: true, titleImageURL: true, priceValue: true, priceCurrency: true, duration: true, rating: true, reviewsNumber: true,
    city: { select: { translations: true } },
    translations: { where: { language: { in: TITLE_LANGS } }, select: { language: true, title: true } },
  } as const;
  const order = [{ reviewsNumber: "desc" as const }];
  const [paid, free] = await Promise.all([
    includePaid ? prisma.tour.findMany({ where: { ...base, priceValue: { gt: 0 } }, orderBy: order, take: 6, select }) : Promise.resolve([]),
    prisma.tour.findMany({ where: { ...base, priceValue: 0 }, orderBy: order, take: 6, select }),
  ]);
  return mixRecommendations(paid, free, 6, includePaid).flatMap((t) => {
    const titles = Object.fromEntries(t.translations.map((x) => [x.language, x.title]));
    if (!t.titleImageURL || !Object.keys(titles).length) return [];
    return [{
      id: t.id, titles, cityNames: asNames(t.city?.translations), image: t.titleImageURL,
      isFree: Number(t.priceValue) === 0, price: Number(t.priceValue), currency: t.priceCurrency, duration: t.duration,
      rating: t.rating ? Number(t.rating) : null, reviews: t.reviewsNumber,
    }];
  });
}

async function loadStatsAndContinents(prisma: PrismaClient) {
  const [tours, byCity, byCountry, rated] = await Promise.all([
    prisma.tour.count({ where: { isActive: true } }),
    prisma.tour.groupBy({ by: ["cityId"], where: { isActive: true } }),
    prisma.tour.groupBy({ by: ["countryId"], where: { isActive: true }, _count: { _all: true } }),
    prisma.tour.findMany({ where: { isActive: true, reviewsNumber: { gt: 0 }, rating: { not: null } }, select: { rating: true, reviewsNumber: true } }),
  ]);
  const countries = await prisma.country.findMany({ where: { id: { in: byCountry.map((c) => c.countryId) } }, select: { id: true, code: true, translations: true } });
  const cMap = new Map(countries.map((c) => [c.id, c]));
  const reviews = rated.reduce((s, r) => s + r.reviewsNumber, 0);
  const weighted = rated.reduce((s, r) => s + Number(r.rating) * r.reviewsNumber, 0);
  const stats: HomeStats = { tours, cities: byCity.length, countries: byCountry.length, rating: reviews ? weighted / reviews : null, reviews };
  const grouped = groupByContinent(byCountry.flatMap((g) => {
    const c = cMap.get(g.countryId);
    return c ? [{ countryId: c.id, code: c.code, tours: g._count._all }] : [];
  }));
  const continents = grouped.map((g) => ({ ...g, names: Object.fromEntries(g.top.map((t) => [t.countryId, asNames(cMap.get(t.countryId)?.translations)])) }));
  return { stats, continents };
}

/** Todo lo que el home muestra, leído de nuestro catálogo. Si algo falla, esa sección no aparece. */
export async function loadHomeData(opts: { includePaid: boolean }): Promise<HomeData> {
  const prisma = getPrisma();
  const [dest, feat, sc] = await Promise.allSettled([loadDestinations(prisma), loadFeatured(prisma, opts.includePaid), loadStatsAndContinents(prisma)]);
  for (const r of [dest, feat, sc]) if (r.status === "rejected") console.error("[home] sección sin datos:", r.reason);
  return {
    destinations: dest.status === "fulfilled" ? dest.value : [],
    featured: feat.status === "fulfilled" ? feat.value : [],
    stats: sc.status === "fulfilled" ? sc.value.stats : { tours: 0, cities: 0, countries: 0, rating: null, reviews: 0 },
    continents: sc.status === "fulfilled" ? sc.value.continents : [],
  };
}
