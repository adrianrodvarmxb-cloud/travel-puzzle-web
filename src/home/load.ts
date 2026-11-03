import { Prisma, type PrismaClient } from "@prisma/client";
import { mixRecommendations } from "@/booking/lib/recommendations";
import { pickDestinations, type CityRow, type DestinationCard } from "./lib/destinations";
import { groupByContinent, continentOf, type ContinentSummary } from "./lib/continents";
import { pickVaried } from "./lib/featured";
import { pickHeroSlides, HERO_SEARCH_NAMES, type HeroSlide } from "./lib/hero";
import { FAVORITE_MIN_RATING, FAVORITE_MIN_REVIEWS, pickDistinctTourReviews, pickHighlights } from "@/reviews/lib/highlights";
import type { HighlightRepo } from "@/reviews/repository";

export interface HomeTour {
  id: string;
  externalId: number;
  /** Frase de una reseña real de 5 ★ (si la hay). */
  quote?: string | null;
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

export interface HomeReview {
  id: number;
  reviewerName: string;
  title: string | null;
  content: string;
  rate: number;
  addedAt: string;
  tour: { id: string; titles: Record<string, string>; cityNames: Record<string, string> } | null;
}

export type HomeContinent = ContinentSummary & { names: Record<number, Record<string, string>>; images: string[] };

export interface HomeData {
  stats: HomeStats;
  hero: HeroSlide[];
  destinations: DestinationCard[];
  continents: HomeContinent[];
  featured: HomeTour[];
  reviews: HomeReview[];
}

export interface HomeDeps {
  prisma: PrismaClient;
  highlights: HighlightRepo;
  includePaid: boolean;
  lang: string;
}

const asNames = (j: unknown): Record<string, string> =>
  j && typeof j === "object" ? (Object.fromEntries(Object.entries(j as Record<string, unknown>).filter(([, v]) => typeof v === "string")) as Record<string, string>) : {};

const TITLE_LANGS = ["es", "en", "pt", "de", "fr", "it"];
const https = (u: string | null | undefined): u is string => typeof u === "string" && u.startsWith("https://");

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

/** Ciudades del carrusel principal que tienen tours (búsqueda por nombre en inglés). */
async function loadHero(prisma: PrismaClient): Promise<HeroSlide[]> {
  const names = HERO_SEARCH_NAMES.map((n) => n.toLowerCase());
  const rows = await prisma.$queryRaw<{ id: number; countryId: number; translations: string; tours: number }[]>`
    SELECT c.id AS id, c.countryId AS countryId, c.translations AS translations, COUNT(t.id) AS tours
    FROM City c JOIN Tour t ON t.cityId = c.id AND t.isActive = 1
    WHERE lower(json_extract(c.translations, '$.en')) IN (${Prisma.join(names)})
    GROUP BY c.id`;
  return pickHeroSlides(
    rows.map((r) => ({ cityId: Number(r.id), countryId: Number(r.countryId), tours: Number(r.tours), names: asNames(typeof r.translations === "string" ? JSON.parse(r.translations) : r.translations) }))
  );
}

async function loadFeatured(prisma: PrismaClient, includePaid: boolean): Promise<HomeTour[]> {
  const base = {
    isActive: true,
    titleImageURL: { startsWith: "https://" },
    reviewsNumber: { gte: FAVORITE_MIN_REVIEWS },
    rating: { gte: FAVORITE_MIN_RATING },
  };
  const select = {
    id: true, externalId: true, cityId: true, titleImageURL: true, priceValue: true, priceCurrency: true, duration: true, rating: true, reviewsNumber: true,
    country: { select: { code: true } },
    city: { select: { translations: true } },
    translations: { where: { language: { in: TITLE_LANGS } }, select: { language: true, title: true } },
  } as const;
  const order = [{ reviewsNumber: "desc" as const }];
  const [paid, free] = await Promise.all([
    includePaid ? prisma.tour.findMany({ where: { ...base, priceValue: { gt: 0 } }, orderBy: order, take: 60, select }) : Promise.resolve([]),
    prisma.tour.findMany({ where: { ...base, priceValue: 0 }, orderBy: order, take: 60, select }),
  ]);
  const vary = <T extends (typeof free)[number]>(list: T[]) => pickVaried(list.map((t) => ({ ...t, countryCode: t.country.code, reviews: t.reviewsNumber })), 6);
  return mixRecommendations(vary(paid), vary(free), 6, includePaid).flatMap((t) => {
    const titles = Object.fromEntries(t.translations.map((x) => [x.language, x.title]));
    if (!https(t.titleImageURL) || !Object.keys(titles).length) return [];
    return [{
      id: t.id, externalId: t.externalId, titles, cityNames: asNames(t.city?.translations), image: t.titleImageURL,
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
  const countryIds = byCountry.map((c) => c.countryId);
  const countries: { id: number; code: string; translations: unknown }[] = [];
  for (let i = 0; i < countryIds.length; i += 90) {
    countries.push(...(await prisma.country.findMany({ where: { id: { in: countryIds.slice(i, i + 90) } }, select: { id: true, code: true, translations: true } })));
  }
  const cMap = new Map(countries.map((c) => [c.id, c]));
  const reviews = rated.reduce((s, r) => s + r.reviewsNumber, 0);
  const weighted = rated.reduce((s, r) => s + Number(r.rating) * r.reviewsNumber, 0);
  const stats: HomeStats = { tours, cities: byCity.length, countries: byCountry.length, rating: reviews ? weighted / reviews : null, reviews };
  const grouped = groupByContinent(byCountry.flatMap((g) => {
    const c = cMap.get(g.countryId);
    return c ? [{ countryId: c.id, code: c.code, tours: g._count._all }] : [];
  }));

  // Fotos de los tours con más reseñas de los países principales de cada continente (carrusel de cada tarjeta).
  const topIds = grouped.flatMap((g) => g.top.map((t) => t.countryId));
  const pics = topIds.length
    ? await prisma.tour.findMany({
        where: { isActive: true, countryId: { in: topIds }, titleImageURL: { startsWith: "https://" } },
        orderBy: { reviewsNumber: "desc" },
        select: { countryId: true, titleImageURL: true },
        take: 300,
      })
    : [];
  const images = new Map<string, string[]>();
  for (const p of pics) {
    const k = continentOf(cMap.get(p.countryId)?.code);
    if (!k || !https(p.titleImageURL)) continue;
    const list = images.get(k) ?? [];
    if (list.length < 5 && !list.includes(p.titleImageURL)) list.push(p.titleImageURL);
    images.set(k, list);
  }
  const continents: HomeContinent[] = grouped.map((g) => ({
    ...g,
    names: Object.fromEntries(g.top.map((t) => [t.countryId, asNames(cMap.get(t.countryId)?.translations)])),
    images: images.get(g.continent) ?? [],
  }));
  return { stats, continents };
}

/** Reseñas reales de 5 ★ de tours distintos, cada una con su tour. */
async function loadReviews(prisma: PrismaClient, repo: HighlightRepo, lang: string): Promise<HomeReview[]> {
  const picked = pickDistinctTourReviews(await repo.listRecentFiveStar(200), lang, 6);
  if (!picked.length) return [];
  const tours = await prisma.tour.findMany({
    where: { externalId: { in: picked.map((r) => r.tourExternalId) } },
    select: { id: true, externalId: true, city: { select: { translations: true } }, translations: { where: { language: { in: TITLE_LANGS } }, select: { language: true, title: true } } },
  });
  const byExt = new Map(tours.map((t) => [t.externalId, t]));
  return picked.map((r) => {
    const t = byExt.get(r.tourExternalId);
    return {
      id: r.id, reviewerName: r.reviewerName, title: r.title, content: r.content ?? "", rate: r.rate, addedAt: r.addedAt.toISOString(),
      tour: t ? { id: t.id, titles: Object.fromEntries(t.translations.map((x) => [x.language, x.title])), cityNames: asNames(t.city?.translations) } : null,
    };
  });
}

const settle = <T>(r: PromiseSettledResult<T>, fallback: T): T => {
  if (r.status === "fulfilled") return r.value;
  console.error("[home] sección sin datos:", r.reason);
  return fallback;
};

/** Todo lo que el home muestra, leído de nuestro catálogo. Si algo falla, esa sección no aparece. */
export async function loadHomeData({ prisma, highlights, includePaid, lang }: HomeDeps): Promise<HomeData> {
  const [hero, dest, feat, sc, reviews] = await Promise.allSettled([
    loadHero(prisma),
    loadDestinations(prisma),
    loadFeatured(prisma, includePaid).then(async (tours) => {
      // Frase destacada de cada favorito (si falla, salen sin frase)
      const quotes = await highlights.listFiveStarForTours(tours.map((t) => t.externalId)).then((r) => pickHighlights(r, lang)).catch(() => new Map());
      return tours.map((t) => ({ ...t, quote: quotes.get(t.externalId)?.text ?? null }));
    }),
    loadStatsAndContinents(prisma),
    loadReviews(prisma, highlights, lang),
  ]);
  const statsC = settle(sc, { stats: { tours: 0, cities: 0, countries: 0, rating: null, reviews: 0 }, continents: [] as HomeContinent[] });
  return {
    hero: settle(hero, []),
    destinations: settle(dest, []),
    featured: settle(feat, []),
    stats: statsC.stats,
    continents: statsC.continents,
    reviews: settle(reviews, []),
  };
}
