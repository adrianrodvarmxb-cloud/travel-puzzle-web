import { catalogClassifier, FORMATOS_PRESENCIALES, type CatalogClassifier } from "@/taxonomy/lib/publish";
import { DEFAULT_DICTIONARY, DEFAULT_MAPPINGS } from "@/taxonomy/data";
import { Prisma, type PrismaClient } from "@prisma/client";
import { mixRecommendations } from "@/booking/lib/recommendations";
import { pickDestinations, type CityRow, type DestinationCard } from "./lib/destinations";
import { groupByContinent, continentOf, type ContinentSummary } from "./lib/continents";
import { pickVaried } from "./lib/featured";
import { pickHeroSlides, HERO_SEARCH_NAMES, type HeroSlide } from "./lib/hero";
import { FAVORITE_MIN_RATING, FAVORITE_MIN_REVIEWS, pickDistinctTourReviews, pickHighlights } from "@/reviews/lib/highlights";
import type { HighlightRepo } from "@/reviews/repository";
import type { TripCard } from "@/trips/public-load";
import { catalogPrior, REVIEW_PRIOR_M, type Prior } from "./lib/review-score";
import { pickDayTrips, pickMostChosen, HOME_CAROUSEL_SIZE } from "./lib/carousels";
import { mentionsProviderBrand, titlesMentionBrand } from "./lib/brand";
import { catalogTourFormat } from "@/tours/lib/card-format";
import { parseTourRankRows, tripCandidate, type TourCandidate, type TripCandidate } from "./lib/rank-row";

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
  /** REQ-524: operador real (providerTitle); la tarjeta descarta FREETOUR. */
  provider?: string | null;
  /** REQ-522: formato de la taxonomía (src/tours/lib/card-format.ts), calculado aquí en el servidor. */
  formato?: string | null;
  durationMinutes?: number | null;
  /** REQ-523: descripción breve por idioma (si no hay frase de reseña). */
  briefs?: Record<string, string>;
  /** REQ-668: ficha final bajo /destinos (sin el 301 de /tours/{id}); vacío = /tours/{id}. La pone la página. */
  href?: string;
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

/** REQ-453: tarjeta del carrusel «Excursiones de un día» (tour del catálogo o viaje de proveedor). */
export type HomeDayTrip = { type: "tour"; tour: HomeTour } | { type: "trip"; trip: TripCard };

export interface HomeData {
  stats: HomeStats;
  hero: HeroSlide[];
  destinations: DestinationCard[];
  continents: HomeContinent[];
  featured: HomeTour[];
  /** REQ-453: vacío con CARRUSELES_HOME_ENABLED apagada o sin inventario (la sección se oculta). */
  dayTrips: HomeDayTrip[];
  reviews: HomeReview[];
}

export interface HomeDeps {
  prisma: PrismaClient;
  highlights: HighlightRepo;
  includePaid: boolean;
  lang: string;
  /** T3 (REQ-406, REQ-407): con TAXONOMY_PUBLISH_ENABLED, los destacados salen de la taxonomía; sin él, como hoy. */
  taxonomy?: CatalogClassifier;
  /** REQ-450/453: CARRUSELES_HOME_ENABLED — medidor de reseñas en «Los más elegidos» y carrusel de excursiones. */
  carousels?: boolean;
  /** Viajes publicados y visibles (cualquier proveedor); ya cargados por la página. */
  ownTrips?: TripCard[];
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

async function loadFeatured(prisma: PrismaClient, includePaid: boolean, taxonomy?: CatalogClassifier): Promise<HomeTour[]> {
  const base = {
    isActive: true,
    titleImageURL: { startsWith: "https://" },
    reviewsNumber: { gte: FAVORITE_MIN_REVIEWS },
    rating: { gte: FAVORITE_MIN_RATING },
  };
  const select = {
    id: true, externalId: true, cityId: true, titleImageURL: true, priceValue: true, priceCurrency: true, duration: true, rating: true, reviewsNumber: true,
    providerTitle: true, categoryId: true, durationMinutes: true, // REQ-522, REQ-524 (y T3)
    country: { select: { code: true } },
    city: { select: { translations: true } },
    translations: { where: { language: { in: TITLE_LANGS } }, select: { language: true, title: true, brief: true } },
  } as const;
  const order = [{ reviewsNumber: "desc" as const }];
  const [paid, free] = await Promise.all([
    includePaid ? prisma.tour.findMany({ where: { ...base, priceValue: { gt: 0 } }, orderBy: order, take: 60, select }) : Promise.resolve([]),
    prisma.tour.findMany({ where: { ...base, priceValue: 0 }, orderBy: order, take: 60, select }),
  ]);
  // REQ-219: fuera del inicio los tours con «FreeTour» / «Free Tour» en el título (antes de elegir, para llenar los 6).
  // T3: free = formato pieza-libre; de pago = publicable, presencial y no Free tour (sin online, servicios ni traslados).
  const fmt = (t: (typeof free)[number]) => taxonomy?.({ categoryId: t.categoryId, price: Number(t.priceValue), durationMinutes: t.durationMinutes, title: t.translations.map((x) => x.title).join(" | ") }).formato;
  const okFree = (t: (typeof free)[number]) => !taxonomy || fmt(t) === "pieza-libre";
  const okPaid = (t: (typeof free)[number]) => !taxonomy || (FORMATOS_PRESENCIALES.includes(fmt(t)!) && fmt(t) !== "pieza-libre");
  const clean = <T extends (typeof free)[number]>(list: T[]) => list.filter((t) => !titlesMentionBrand(t.translations.map((x) => x.title)) && (Number(t.priceValue) === 0 ? okFree(t) : okPaid(t)));
  const vary = <T extends (typeof free)[number]>(list: T[]) => pickVaried(clean(list).map((t) => ({ ...t, countryCode: t.country.code, reviews: t.reviewsNumber })), 6);
  return mixRecommendations(vary(paid), vary(free), 6, includePaid).flatMap((t): HomeTour[] => {
    const titles = Object.fromEntries(t.translations.map((x) => [x.language, x.title]));
    if (!https(t.titleImageURL) || !Object.keys(titles).length) return [];
    const extras = cardExtras(t as CardExtrasRow); // REQ-522…524 (tipo explícito: la inferencia anidada desborda tsc)
    return [{
      id: t.id, externalId: t.externalId, titles, cityNames: asNames(t.city?.translations), image: t.titleImageURL,
      isFree: Number(t.priceValue) === 0, price: Number(t.priceValue), currency: t.priceCurrency, duration: t.duration,
      rating: t.rating ? Number(t.rating) : null, reviews: t.reviewsNumber, ...extras,
    }];
  });
}

const TOUR_SELECT = {
  id: true, externalId: true, titleImageURL: true, priceValue: true, priceCurrency: true, duration: true, rating: true, reviewsNumber: true,
  providerTitle: true, categoryId: true, durationMinutes: true, // REQ-522, REQ-524
  city: { select: { translations: true } },
  translations: { where: { language: { in: TITLE_LANGS } }, select: { language: true, title: true, brief: true } },
} as const;

/** REQ-522…524: lo que la tarjeta única necesita además (proveedor, formato, duración y descripción breve). */
type CardExtrasRow = { providerTitle: string | null; categoryId: number; durationMinutes: number | null; priceValue: unknown; translations: { language: string; title: string; brief: string | null }[] };
function cardExtras(t: CardExtrasRow) {
  return {
    provider: t.providerTitle ?? null,
    formato: catalogTourFormat({ categoryId: t.categoryId, price: Number(t.priceValue), durationMinutes: t.durationMinutes, titles: t.translations.filter((x) => x.language === "es" || x.language === "en").map((x) => x.title) }),
    durationMinutes: t.durationMinutes ?? null,
    briefs: Object.fromEntries(t.translations.filter((x) => x.brief && x.brief.trim()).map((x) => [x.language, x.brief as string])),
  };
}

/** REQ-450: C del medidor = promedio del catálogo ponderado por reseñas. */
async function loadPrior(prisma: PrismaClient): Promise<Prior> {
  const [r] = await prisma.$queryRaw<{ s: unknown; v: unknown }[]>`
    SELECT SUM(CAST(rating AS REAL) * reviewsNumber) AS s, SUM(reviewsNumber) AS v
    FROM Tour WHERE isActive = 1 AND reviewsNumber > 0 AND rating IS NOT NULL AND CAST(rating AS REAL) BETWEEN 1 AND 5`;
  return { m: REVIEW_PRIOR_M, C: catalogPrior(Number(r?.s ?? 0), Number(r?.v ?? 0)) };
}

/**
 * REQ-450/453: candidatas del catálogo de tours (cualquier providerId). El SQL solo PREFILTRA y preordena con la misma
 * fórmula (lib/review-score.ts → bayesScore); el orden final, el formato y la diversidad los decide la lib.
 * Fuera desde aquí: 8 y 31 (fuera), 29 (traslado), 30 (transporte), 26 (alquiler). Sin PAID_TOURS_ENABLED, solo precio 0
 * (no se recomienda lo que no se puede reservar, recommendations.ts).
 */
async function loadTourCandidates(prisma: PrismaClient, prior: Prior, includePaid: boolean, dayTripsOnly: boolean, taxonomy?: CatalogClassifier): Promise<TourCandidate[]> {
  // Banderas como parámetros (no fragmentos Prisma.sql): la consulta no depende del cliente generado.
  const paid = includePaid ? 1 : 0;
  const day = dayTripsOnly ? 1 : 0;
  const rows = await prisma.$queryRaw<unknown[]>`
    SELECT t.id AS id, t.externalId AS externalId, t.cityId AS cityId, json_extract(c.translations, '$.en') AS cityName,
      co.code AS countryCode, t.categoryId AS categoryId, t.durationMinutes AS durationMinutes,
      CAST(t.priceValue AS REAL) AS price, CAST(t.rating AS REAL) AS rating, t.reviewsNumber AS reviews,
      (SELECT x.title FROM TourTranslation x WHERE x.tourId = t.id AND x.language = 'es') AS titleEs,
      (SELECT x.title FROM TourTranslation x WHERE x.tourId = t.id AND x.language = 'en') AS titleEn
    FROM Tour t JOIN Country co ON co.id = t.countryId LEFT JOIN City c ON c.id = t.cityId
    WHERE t.isActive = 1 AND t.titleImageURL LIKE 'https://%' AND t.reviewsNumber > 0 AND t.rating IS NOT NULL
      AND t.categoryId NOT IN (8, 31, 29, 30, 26)
      AND (${paid} = 1 OR CAST(t.priceValue AS REAL) = 0)
      AND (${day} = 0 OR t.durationMinutes >= 360 OR (t.categoryId = 4 AND t.durationMinutes IS NULL))
    ORDER BY (t.reviewsNumber * CAST(t.rating AS REAL) + ${prior.m * prior.C}) / (t.reviewsNumber + ${prior.m}) DESC
    LIMIT ${dayTripsOnly ? 600 : 300}`;
  const { ok, dropped } = parseTourRankRows(rows, { taxonomy }); // REQ-219: también salta los títulos que dicen «free tour»; REQ-270: y lo que la taxonomía no publica
  if (dropped) console.error(`[home] ${dropped} fila(s) de tours descartadas por datos inválidos`);
  return ok;
}

/** Tarjetas del home para los tours elegidos, en el orden dado. */
async function hydrateTours(prisma: PrismaClient, ids: string[]): Promise<Map<string, HomeTour>> {
  if (!ids.length) return new Map();
  const rows = await prisma.tour.findMany({ where: { id: { in: ids } }, select: TOUR_SELECT });
  const out = new Map<string, HomeTour>();
  for (const t of rows) {
    const titles = Object.fromEntries(t.translations.map((x) => [x.language, x.title]));
    if (!https(t.titleImageURL) || !Object.keys(titles).length || titlesMentionBrand(titles)) continue; // REQ-219
    out.set(t.id, {
      id: t.id, externalId: t.externalId, titles, cityNames: asNames(t.city?.translations), image: t.titleImageURL,
      isFree: Number(t.priceValue) === 0, price: Number(t.priceValue), currency: t.priceCurrency, duration: t.duration,
      rating: t.rating ? Number(t.rating) : null, reviews: t.reviewsNumber, ...cardExtras(t),
    });
  }
  return out;
}

/** REQ-450 + REQ-453: «Los más elegidos» y «Excursiones de un día» con el medidor de reseñas. */
async function loadRankedCarousels(prisma: PrismaClient, includePaid: boolean, ownTrips: TripCard[], taxonomy?: CatalogClassifier): Promise<{ featured: HomeTour[]; dayTrips: HomeDayTrip[] }> {
  const prior = await loadPrior(prisma);
  const [all, days] = await Promise.all([
    loadTourCandidates(prisma, prior, includePaid, false, taxonomy),
    loadTourCandidates(prisma, prior, includePaid, true, taxonomy),
  ]);
  const trips: TripCandidate[] = ownTrips.filter((t) => t.image && !mentionsProviderBrand(t.title)).map((t) => tripCandidate(t)); // REQ-219
  // Lo que no se puede pintar (sin foto o título, o un título en otro idioma dice «free tour», REQ-219) se salta y se vuelve
  // a elegir, para que entre la siguiente y la diversidad se respete. Máx. 3 vueltas.
  const skip = new Set<string>();
  let mostChosen: (TourCandidate | TripCandidate)[] = [];
  let dayPicked: (TourCandidate | TripCandidate)[] = [];
  let tours = new Map<string, HomeTour>();
  for (let round = 0; round < 3; round++) {
    const keep = <T extends TourCandidate | TripCandidate>(x: T) => !skip.has(x.key);
    mostChosen = pickMostChosen<TourCandidate | TripCandidate>([...all, ...trips].filter(keep), prior, HOME_CAROUSEL_SIZE);
    // REQ-453: lo que ya sale en «Los más elegidos» no se repite en las excursiones.
    const shown = new Set(mostChosen.slice(0, HOME_CAROUSEL_SIZE).map((x) => x.key));
    dayPicked = pickDayTrips<TourCandidate | TripCandidate>([...days, ...trips].filter((x) => keep(x) && !shown.has(x.key)), prior, HOME_CAROUSEL_SIZE);
    const ids = [...new Set([...mostChosen, ...dayPicked].filter((x) => x.source === "tour").map((x) => x.id))].filter((id) => !tours.has(id));
    const more = await hydrateTours(prisma, ids);
    tours = new Map([...tours, ...more]);
    const missing = [...mostChosen, ...dayPicked].filter((x) => x.source === "tour" && !tours.has(x.id));
    if (!missing.length) break;
    for (const x of missing) skip.add(x.key);
  }
  const tripById = new Map(ownTrips.map((t) => [t.id, t]));
  // Hoy ningún viaje propio tiene reseñas: «Los más elegidos» solo puede traer tours; si un día las tienen, entran aquí.
  const featured = mostChosen.flatMap((x) => (x.source === "tour" && tours.get(x.id) ? [tours.get(x.id)!] : []));
  const dayTrips = dayPicked.flatMap((x): HomeDayTrip[] => {
    if (x.source === "tour") { const t = tours.get(x.id); return t ? [{ type: "tour", tour: t }] : []; }
    const t = tripById.get(x.id); return t ? [{ type: "trip", trip: t }] : [];
  });
  return { featured, dayTrips };
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
  // REQ-219: se piden de más; la reseña cuyo tour lleva la marca en el título se descarta y entra la siguiente.
  const picked = pickDistinctTourReviews(await repo.listRecentFiveStar(200), lang, 30);
  if (!picked.length) return [];
  const tours = await prisma.tour.findMany({
    where: { externalId: { in: picked.map((r) => r.tourExternalId) } },
    select: { id: true, externalId: true, city: { select: { translations: true } }, translations: { where: { language: { in: TITLE_LANGS } }, select: { language: true, title: true } } },
  });
  const byExt = new Map(tours.map((t) => [t.externalId, t]));
  // REQ-803 (C7): sin su tour, la reseña no sale (quedaría como reseña suelta del sitio).
  const shown = picked.filter((r) => { const t = byExt.get(r.tourExternalId); return !!t && !titlesMentionBrand(t.translations.map((x) => x.title)); }).slice(0, 6);
  return shown.map((r) => {
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
export async function loadHomeData({ prisma, highlights, includePaid, lang, carousels = false, ownTrips = [], taxonomy }: HomeDeps): Promise<HomeData> {
  // Frase destacada de cada tour (si falla, salen sin frase)
  const withQuotes = async (tours: HomeTour[]) => {
    const quotes = await highlights.listFiveStarForTours(tours.map((t) => t.externalId)).then((r) => pickHighlights(r, lang)).catch(() => new Map());
    return tours.map((t) => ({ ...t, quote: quotes.get(t.externalId)?.text ?? null }));
  };
  const ranked = carousels ? loadRankedCarousels(prisma, includePaid, ownTrips, taxonomy) : null; // REQ-270
  const [hero, dest, feat, sc, reviews, days] = await Promise.allSettled([
    loadHero(prisma),
    loadDestinations(prisma),
    // Si el medidor falla, «Los más elegidos» vuelve a la regla anterior en vez de desaparecer.
    (ranked
      ? ranked.then((r) => r.featured).catch((e) => { console.error("[home] medidor de reseñas sin datos:", e); return loadFeatured(prisma, includePaid, taxonomy); })
      : loadFeatured(prisma, includePaid, taxonomy)
    ).then(withQuotes),
    loadStatsAndContinents(prisma),
    loadReviews(prisma, highlights, lang),
    ranked
      ? ranked.then(async (r) => {
          const quoted = new Map((await withQuotes(r.dayTrips.flatMap((d) => (d.type === "tour" ? [d.tour] : [])))).map((t) => [t.id, t]));
          return r.dayTrips.map((d): HomeDayTrip => (d.type === "tour" ? { type: "tour", tour: quoted.get(d.tour.id) ?? d.tour } : d));
        })
      : Promise.resolve([] as HomeDayTrip[]),
  ]);
  const statsC = settle(sc, { stats: { tours: 0, cities: 0, countries: 0, rating: null, reviews: 0 }, continents: [] as HomeContinent[] });
  return {
    hero: settle(hero, []),
    destinations: settle(dest, []),
    featured: settle(feat, []),
    dayTrips: settle(days, []),
    stats: statsC.stats,
    continents: statsC.continents,
    reviews: settle(reviews, []),
  };
}

/** T3: clasificador de la taxonomía para el inicio, solo con TAXONOMY_PUBLISH_ENABLED. */
export function homeTaxonomy(enabled: boolean): CatalogClassifier | undefined {
  return enabled ? catalogClassifier(DEFAULT_DICTIONARY, DEFAULT_MAPPINGS) : undefined;
}
